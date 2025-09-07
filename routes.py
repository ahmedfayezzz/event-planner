from flask import render_template, request, redirect, url_for, flash, jsonify, make_response, session as flask_session
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Session, Registration, Attendance, Admin
from sqlalchemy import func
from ai_service import generate_professional_description, analyze_participant_data, search_participants
from utils import generate_username, send_confirmation_email, generate_qr_code, export_to_csv
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta
import json
import csv
import io
import re

@app.route('/')
def index():
    # Get next session
    next_session = Session.query.filter(
        Session.date > datetime.utcnow(),
        Session.status == 'open'
    ).order_by(Session.date.asc()).first()
    
    # Get upcoming 3 sessions
    upcoming_sessions = Session.query.filter(
        Session.date > datetime.utcnow()
    ).order_by(Session.date.asc()).limit(3).all()
    
    return render_template('index.html', 
                         next_session=next_session, 
                         upcoming_sessions=upcoming_sessions)

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        # Get form data
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        instagram = request.form.get('instagram')
        snapchat = request.form.get('snapchat')
        twitter = request.form.get('twitter')
        company_name = request.form.get('company_name')
        position = request.form.get('position')
        activity_type = request.form.get('activity_type')
        gender = request.form.get('gender')
        goal = request.form.get('goal')
        session_id = request.form.get('session_id')
        
        # Validate required fields
        if not all([name, email, phone, goal]):
            flash('جميع الحقول المطلوبة يجب ملؤها', 'error')
            return redirect(url_for('register'))
        
        # Check if email exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash(f'يوجد حساب مسجل بهذا البريد الإلكتروني. يرجى تسجيل الدخول من <a href="{url_for("user_login")}" class="alert-link">هنا</a>', 'info')
            return redirect(url_for('user_login'))
        else:
            # Generate unique username
            username = generate_username(name)
            
            # Generate AI description if goal is provided
            ai_description = ""
            if goal:
                try:
                    ai_description = generate_professional_description(goal, activity_type or "")
                except Exception as e:
                    app.logger.error(f"AI description generation failed: {e}")
            
            # Create new user
            user = User(
                name=name,
                username=username,
                email=email,
                phone=phone,
                instagram=instagram,
                snapchat=snapchat,
                twitter=twitter,
                company_name=company_name,
                position=position,
                activity_type=activity_type,
                gender=gender,
                goal=goal,
                ai_description=ai_description
            )
            db.session.add(user)
            db.session.commit()
        
        # Register for session if specified
        if session_id:
            session_obj = Session.query.get(session_id)
            if session_obj and session_obj.can_register():
                # Check if already registered
                existing_reg = Registration.query.filter_by(
                    user_id=user.id, 
                    session_id=session_id
                ).first()
                
                if not existing_reg:
                    registration = Registration(
                        user_id=user.id,
                        session_id=session_id,
                        is_approved=not session_obj.requires_approval
                    )
                    db.session.add(registration)
                    db.session.commit()
                    
                    # Send confirmation email
                    email_sent = False
                    try:
                        email_sent = send_confirmation_email(user.email, user.name, session_obj)
                    except Exception as e:
                        app.logger.error(f"Email sending failed: {e}")
                    
                    if email_sent:
                        flash('تم التسجيل بنجاح! تم إرسال تأكيد عبر البريد الإلكتروني.', 'success')
                    else:
                        flash('تم التسجيل بنجاح! لم نتمكن من إرسال تأكيد البريد الإلكتروني حالياً.', 'warning')
                else:
                    flash('أنت مسجل مسبقاً في هذه الجلسة.', 'info')
            else:
                flash('عذراً، هذه الجلسة مكتملة أو مغلقة.', 'error')
        else:
            flash('تم إنشاء الملف الشخصي بنجاح!', 'success')
        
        return redirect(url_for('profile', username=user.username))
    
    # GET request
    session_id = request.args.get('session_id')
    session_obj = None
    if session_id:
        session_obj = Session.query.get(session_id)
    
    return render_template('register.html', selected_session=session_obj)

@app.route('/u/<username>')
def profile(username):
    user = User.query.filter_by(username=username).first_or_404()
    if not user.is_active:
        flash('هذا الملف الشخصي غير متاح حالياً.', 'error')
        return redirect(url_for('index'))
    
    # Get user's registered sessions
    registrations = Registration.query.filter_by(
        user_id=user.id, 
        is_approved=True
    ).join(Session).order_by(Session.date.desc()).all()
    
    return render_template('profile.html', user=user, registrations=registrations)

@app.route('/user/login', methods=['GET', 'POST'])
def user_login():
    if request.method == 'POST':
        email = request.form.get('email')
        phone = request.form.get('phone')
        
        # Find user by email and phone (simple authentication)
        user = User.query.filter_by(email=email).first()
        
        if user:
            # Clean and normalize both phone numbers for comparison
            user_phone_clean = re.sub(r'\D', '', user.phone)[-9:]  # Last 9 digits
            input_phone_clean = re.sub(r'\D', '', phone)[-9:]      # Last 9 digits
            
            if user_phone_clean == input_phone_clean:
                flask_session['user_id'] = user.id
                flash('تم تسجيل الدخول بنجاح!', 'success')
                return redirect(url_for('user_dashboard'))
        
        flash('البيانات غير صحيحة. تأكد من البريد الإلكتروني ورقم الجوال.', 'error')
    
    return render_template('user_login.html')

@app.route('/user/dashboard')
def user_dashboard():
    if 'user_id' not in flask_session:
        flash('يجب تسجيل الدخول أولاً', 'error')
        return redirect(url_for('user_login'))
    
    user = User.query.get_or_404(flask_session['user_id'])
    return render_template('user_dashboard.html', user=user)

@app.route('/user/logout')
def user_logout():
    flask_session.pop('user_id', None)
    flash('تم تسجيل الخروج بنجاح', 'success')
    return redirect(url_for('index'))

@app.route('/my-qr/<int:session_id>')
def my_qr_code(session_id):
    if 'user_id' not in flask_session:
        return jsonify({'error': 'غير مصرح'}), 401
    
    user_id = flask_session['user_id']
    session_obj = Session.query.get_or_404(session_id)
    
    # Check if user is registered for this session
    registration = Registration.query.filter_by(
        user_id=user_id,
        session_id=session_id,
        is_approved=True
    ).first()
    
    if not registration:
        return jsonify({'error': 'غير مسجل في هذه الجلسة'}), 403
    
    # Generate QR code for this specific user and session
    qr_data = f"user:{user_id},session:{session_id},reg:{registration.id}"
    qr_code = generate_qr_code(qr_data)
    return jsonify({'qr_code': qr_code})

@app.route('/sessions')
def sessions():
    all_sessions = Session.query.order_by(Session.date.desc()).all()
    return render_template('sessions.html', sessions=all_sessions)

@app.route('/session/<int:session_id>/register')
def session_register(session_id):
    session_obj = Session.query.get_or_404(session_id)
    return redirect(url_for('register', session_id=session_id))

# Admin Routes
@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        admin = Admin.query.filter_by(username=username).first()
        
        if admin and check_password_hash(admin.password_hash, password):
            login_user(admin)
            admin.last_login = datetime.utcnow()
            db.session.commit()
            return redirect(url_for('admin_dashboard'))
        else:
            flash('اسم المستخدم أو كلمة المرور غير صحيحة', 'error')
    
    return render_template('admin/login.html')

@app.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    return redirect(url_for('index'))

@app.route('/admin')
@login_required
def admin_dashboard():
    # Get statistics
    total_users = User.query.count()
    total_sessions = Session.query.count()
    pending_approvals = Registration.query.filter_by(is_approved=False).count()
    
    # Get recent registrations
    recent_registrations = Registration.query.join(User).join(Session).order_by(
        Registration.registered_at.desc()
    ).limit(10).all()
    
    # Get upcoming sessions
    upcoming_sessions = Session.query.filter(
        Session.date > datetime.utcnow()
    ).order_by(Session.date.asc()).limit(5).all()
    
    return render_template('admin/dashboard.html',
                         total_users=total_users,
                         total_sessions=total_sessions,
                         pending_approvals=pending_approvals,
                         recent_registrations=recent_registrations,
                         upcoming_sessions=upcoming_sessions)

@app.route('/admin/sessions')
@login_required
def admin_sessions():
    sessions = Session.query.order_by(Session.date.desc()).all()
    return render_template('admin/sessions.html', sessions=sessions)

@app.route('/admin/sessions/new', methods=['GET', 'POST'])
@login_required
def admin_new_session():
    if request.method == 'POST':
        # Get the highest session number
        last_session = Session.query.order_by(Session.session_number.desc()).first()
        session_number = (last_session.session_number + 1) if last_session else 1
        
        session = Session(
            session_number=session_number,
            title=request.form.get('title'),
            description=request.form.get('description'),
            date=datetime.strptime(request.form.get('date'), '%Y-%m-%dT%H:%M'),
            guest_name=request.form.get('guest_name'),
            guest_profile=request.form.get('guest_profile'),
            location=request.form.get('location'),
            max_participants=int(request.form.get('max_participants', 50)),
            requires_approval=bool(request.form.get('requires_approval')),
            show_participant_count=bool(request.form.get('show_participant_count')),
            show_countdown=bool(request.form.get('show_countdown')),
            show_guest_profile=bool(request.form.get('show_guest_profile')),
            enable_mini_view=bool(request.form.get('enable_mini_view')),
            embed_enabled=bool(request.form.get('embed_enabled')),
            invite_only=bool(request.form.get('invite_only'))
        )
        
        db.session.add(session)
        db.session.commit()
        
        flash('تم إنشاء الجلسة بنجاح!', 'success')
        return redirect(url_for('admin_sessions'))
    
    return render_template('admin/new_session.html')

@app.route('/admin/sessions/<int:session_id>/edit', methods=['GET', 'POST'])
@login_required
def admin_edit_session(session_id):
    session_obj = Session.query.get_or_404(session_id)
    
    if request.method == 'POST':
        session_obj.title = request.form.get('title')
        session_obj.description = request.form.get('description')
        session_obj.date = datetime.strptime(request.form.get('date'), '%Y-%m-%dT%H:%M')
        session_obj.guest_name = request.form.get('guest_name')
        session_obj.guest_profile = request.form.get('guest_profile')
        session_obj.location = request.form.get('location')
        session_obj.max_participants = int(request.form.get('max_participants', 50))
        session_obj.requires_approval = bool(request.form.get('requires_approval'))
        session_obj.show_participant_count = bool(request.form.get('show_participant_count'))
        session_obj.show_countdown = bool(request.form.get('show_countdown'))
        session_obj.show_guest_profile = bool(request.form.get('show_guest_profile'))
        session_obj.enable_mini_view = bool(request.form.get('enable_mini_view'))
        session_obj.embed_enabled = bool(request.form.get('embed_enabled'))
        session_obj.invite_only = bool(request.form.get('invite_only'))
        session_obj.status = request.form.get('status')
        
        db.session.commit()
        flash('تم تحديث الجلسة بنجاح!', 'success')
        return redirect(url_for('admin_sessions'))
    
    return render_template('admin/edit_session.html', session=session_obj)

@app.route('/event/<path:identifier>')
def event_page(identifier):
    # Try to find session by slug first, then by ID
    session_obj = Session.query.filter_by(slug=identifier).first()
    if not session_obj and identifier.isdigit():
        session_obj = Session.query.get(int(identifier))
    
    if not session_obj:
        flash('الجلسة غير موجودة', 'error')
        return redirect(url_for('sessions'))
    
    return redirect(url_for('register', session_id=session_obj.id))

@app.route('/event/<path:identifier>/embed')
def event_embed(identifier):
    # Try to find session by slug first, then by ID
    session_obj = Session.query.filter_by(slug=identifier).first()
    if not session_obj and identifier.isdigit():
        session_obj = Session.query.get(int(identifier))
    
    if not session_obj or not session_obj.embed_enabled:
        return "هذه الجلسة غير متاحة للتضمين", 404
    
    # Check if mini view is enabled
    template = 'embed_mini.html' if session_obj.enable_mini_view else 'embed_full.html'
    
    return render_template(template, session=session_obj)

@app.route('/admin/sessions/<int:session_id>/embed-code')
@login_required
def get_embed_code(session_id):
    session_obj = Session.query.get_or_404(session_id)
    
    # Generate slug if not exists
    if not session_obj.slug:
        session_obj.generate_slug()
        db.session.commit()
    
    embed_url = request.url_root.rstrip('/') + session_obj.get_embed_url()
    iframe_code = f'<iframe src="{embed_url}" width="100%" height="400" frameborder="0"></iframe>'
    
    return jsonify({
        'iframe_code': iframe_code,
        'embed_url': embed_url,
        'public_url': request.url_root.rstrip('/') + session_obj.get_public_url()
    })

@app.route('/admin/analytics')
@login_required
def admin_analytics():
    # Generate AI analytics
    try:
        demographics = analyze_participant_data('demographics')
        trends = analyze_participant_data('trends')
        insights = analyze_participant_data('insights')
    except Exception as e:
        app.logger.error(f"Analytics generation failed: {e}")
        demographics = trends = insights = None
    
    return render_template('admin/analytics.html',
                         demographics=demographics,
                         trends=trends,
                         insights=insights)

@app.route('/admin/search', methods=['POST'])
@login_required
def admin_search():
    query = request.form.get('query')
    if not query:
        return jsonify({'error': 'استعلام مطلوب'})
    
    try:
        results = search_participants(query)
        return jsonify({'results': results})
    except Exception as e:
        app.logger.error(f"Search failed: {e}")
        return jsonify({'error': 'فشل في البحث'})

@app.route('/admin/export/<export_type>')
@login_required
def admin_export(export_type):
    if export_type == 'users':
        users = User.query.all()
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Headers
        writer.writerow(['الاسم', 'البريد الإلكتروني', 'الهاتف', 'النشاط', 'الشركة', 'المنصب', 'عدد الحضور'])
        
        # Data
        for user in users:
            writer.writerow([
                user.name,
                user.email,
                user.phone,
                user.activity_type or '',
                user.company_name or '',
                user.position or '',
                user.get_attendance_count()
            ])
        
        response = make_response(output.getvalue())
        response.headers['Content-Type'] = 'text/csv; charset=utf-8'
        response.headers['Content-Disposition'] = 'attachment; filename=users.csv'
        return response
    
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/session/<int:session_id>/qr')
@login_required
def session_qr(session_id):
    session_obj = Session.query.get_or_404(session_id)
    qr_code = generate_qr_code(f"{request.url_root}admin/checkin/{session_id}")
    return jsonify({'qr_code': qr_code})

@app.route('/admin/session/<int:session_id>/attendees')
@login_required
def session_attendees(session_id):
    session_obj = Session.query.get_or_404(session_id)
    registrations = Registration.query.filter_by(session_id=session_id).join(User).all()
    attendances = Attendance.query.filter_by(session_id=session_id).all()
    
    # Create attendance lookup
    attendance_dict = {a.user_id: a.attended for a in attendances}
    
    return render_template('admin/session_attendees.html', 
                         session_obj=session_obj, 
                         registrations=registrations,
                         attendance_dict=attendance_dict)

@app.route('/admin/registration/<int:registration_id>/approve', methods=['POST'])
@login_required
def approve_registration(registration_id):
    try:
        registration = Registration.query.get_or_404(registration_id)
        registration.is_approved = True
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        app.logger.error(f"Registration approval failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/attendance', methods=['POST'])
@login_required  
def mark_attendance():
    try:
        data = request.json
        session_id = data.get('session_id')
        user_id = data.get('user_id')
        attended = data.get('attended', True)
        
        # Check if attendance record exists
        attendance = Attendance.query.filter_by(
            session_id=session_id,
            user_id=user_id
        ).first()
        
        if attendance:
            attendance.attended = attended
            if attended:
                attendance.check_in_time = datetime.utcnow()
        else:
            attendance = Attendance(
                session_id=session_id,
                user_id=user_id,
                attended=attended,
                check_in_time=datetime.utcnow() if attended else None
            )
            db.session.add(attendance)
        
        db.session.commit()
        return jsonify({'success': True})
        
    except Exception as e:
        app.logger.error(f"Attendance marking failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/session/<int:session_id>/approve-all', methods=['POST'])
@login_required
def approve_all_registrations(session_id):
    try:
        registrations = Registration.query.filter_by(
            session_id=session_id,
            is_approved=False
        ).all()
        
        for registration in registrations:
            registration.is_approved = True
        
        db.session.commit()
        return jsonify({'success': True, 'count': len(registrations)})
        
    except Exception as e:
        app.logger.error(f"Bulk approval failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/checkin/<int:session_id>')
@login_required
def admin_checkin(session_id):
    session_obj = Session.query.get_or_404(session_id)
    registrations = Registration.query.filter_by(
        session_id=session_id,
        is_approved=True
    ).join(User).all()
    
    return render_template('admin/checkin.html', 
                         session=session_obj, 
                         registrations=registrations)

@app.route('/admin/checkin/<int:session_id>/<int:user_id>', methods=['POST'])
@login_required
def mark_attendance_qr(session_id, user_id):
    # Check if attendance record exists
    attendance = Attendance.query.filter_by(
        session_id=session_id,
        user_id=user_id
    ).first()
    
    if not attendance:
        attendance = Attendance(
            session_id=session_id,
            user_id=user_id
        )
        db.session.add(attendance)
    
    attendance.attended = True
    attendance.check_in_time = datetime.utcnow()
    attendance.qr_verified = request.json.get('qr_verified', False)
    
    db.session.commit()
    
    return jsonify({'success': True})

# API Routes for AJAX
@app.route('/api/sessions/upcoming')
def api_upcoming_sessions():
    sessions = Session.query.filter(
        Session.date > datetime.utcnow(),
        Session.status == 'open'
    ).order_by(Session.date.asc()).limit(3).all()
    
    return jsonify([{
        'id': s.id,
        'title': s.title,
        'date': s.date.isoformat(),
        'session_number': s.session_number,
        'registration_count': s.get_registration_count(),
        'max_participants': s.max_participants
    } for s in sessions])

@app.route('/api/countdown/<int:session_id>')
def api_countdown(session_id):
    session_obj = Session.query.get_or_404(session_id)
    now = datetime.utcnow()
    
    if session_obj.date > now:
        delta = session_obj.date - now
        return jsonify({
            'days': delta.days,
            'hours': delta.seconds // 3600,
            'minutes': (delta.seconds % 3600) // 60,
            'seconds': delta.seconds % 60
        })
    else:
        return jsonify({'expired': True})

# Analytics API Routes
@app.route('/api/analytics/demographics')
@login_required
def api_analytics_demographics():
    try:
        result = analyze_participant_data('demographics')
        if result:
            return jsonify(result)
        else:
            return jsonify({'error': 'فشل في تحليل البيانات الديموغرافية'})
    except Exception as e:
        app.logger.error(f"Demographics API error: {e}")
        return jsonify({'error': 'خطأ في الخادم'}), 500

@app.route('/api/analytics/trends')
@login_required
def api_analytics_trends():
    try:
        result = analyze_participant_data('trends')
        if result:
            return jsonify(result)
        else:
            return jsonify({'error': 'فشل في تحليل الاتجاهات'})
    except Exception as e:
        app.logger.error(f"Trends API error: {e}")
        return jsonify({'error': 'خطأ في الخادم'}), 500

@app.route('/api/analytics/participant-insights')
@login_required
def api_analytics_insights():
    try:
        result = analyze_participant_data('insights')
        if result:
            return jsonify(result)
        else:
            return jsonify({'error': 'فشل في تحليل رؤى المشاركين'})
    except Exception as e:
        app.logger.error(f"Insights API error: {e}")
        return jsonify({'error': 'خطأ في الخادم'}), 500

@app.route('/api/analytics/session-performance')
@login_required
def api_session_performance():
    try:
        # Get session performance metrics
        sessions = Session.query.all()
        performance_data = []
        
        for session in sessions:
            registrations = session.get_registration_count()
            attendances = len([a for a in session.attendances if a.attended])
            attendance_rate = (attendances / registrations * 100) if registrations > 0 else 0
            
            performance_data.append({
                'session_id': session.id,
                'title': session.title,
                'session_number': session.session_number,
                'registrations': registrations,
                'attendances': attendances,
                'attendance_rate': attendance_rate,
                'date': session.date.strftime('%Y-%m-%d')
            })
        
        # Sort by attendance rate
        performance_data.sort(key=lambda x: x['attendance_rate'], reverse=True)
        
        return jsonify({
            'sessions': performance_data,
            'average_attendance_rate': sum([s['attendance_rate'] for s in performance_data]) / len(performance_data) if performance_data else 0,
            'total_sessions': len(sessions),
            'best_performing_session': performance_data[0] if performance_data else None
        })
        
    except Exception as e:
        app.logger.error(f"Session performance API error: {e}")
        return jsonify({'error': 'خطأ في الخادم'}), 500

@app.route('/api/analytics/recommendations')
@login_required
def api_recommendations():
    try:
        # Generate AI-powered recommendations
        users_count = User.query.count()
        sessions_count = Session.query.count()
        avg_attendance = 0
        
        if sessions_count > 0:
            total_attendances = db.session.query(func.count(Attendance.id)).filter(Attendance.attended == True).scalar() or 0
            avg_attendance = total_attendances / sessions_count
        
        recommendations = []
        
        # Content-based recommendations
        if users_count < 50:
            recommendations.append({
                'type': 'growth',
                'title': 'زيادة المشاركين',
                'description': f'لديك حالياً {users_count} مشارك. يمكن زيادة الترويج لجذب المزيد من المؤثرين.',
                'priority': 'high'
            })
        
        if avg_attendance < 10:
            recommendations.append({
                'type': 'engagement',
                'title': 'تحسين معدل الحضور',
                'description': f'متوسط الحضور {avg_attendance:.1f}. اعتبر إضافة محتوى أكثر تفاعلاً.',
                'priority': 'medium'
            })
        
        if sessions_count < 5:
            recommendations.append({
                'type': 'content',
                'title': 'إضافة المزيد من الجلسات',
                'description': 'قم بجدولة المزيد من الجلسات لزيادة المشاركة والتفاعل.',
                'priority': 'high'
            })
        
        # AI-generated recommendations based on participant goals
        users_with_goals = User.query.filter(User.goal.isnot(None)).all()
        if users_with_goals:
            common_goals = []
            for user in users_with_goals[:10]:  # Analyze top 10 for performance
                if user.goal and len(user.goal.split()) > 2:
                    common_goals.append(user.goal)
            
            if common_goals:
                recommendations.append({
                    'type': 'ai_insight',
                    'title': 'توجيه المحتوى حسب اهتمامات المشاركين',
                    'description': 'يمكن تطوير جلسات متخصصة بناءً على أهداف المشاركين الشائعة.',
                    'priority': 'medium'
                })
        
        return jsonify({
            'recommendations': recommendations,
            'summary': f'تم إنشاء {len(recommendations)} توصية بناءً على تحليل البيانات',
            'generated_at': datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        app.logger.error(f"Recommendations API error: {e}")
        return jsonify({'error': 'خطأ في الخادم'}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500
