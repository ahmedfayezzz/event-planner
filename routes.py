from flask import render_template, request, redirect, url_for, flash, jsonify, make_response, session as flask_session
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Session, Registration, Attendance, Admin, AIAnalytics
from ai_service import generate_professional_description, analyze_participant_data, search_participants
from utils import generate_username, send_confirmation_email, generate_qr_code, export_to_csv
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta
import json
import csv
import io

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
        goal = request.form.get('goal')
        session_id = request.form.get('session_id')
        
        # Validate required fields
        if not all([name, email, phone, goal]):
            flash('جميع الحقول المطلوبة يجب ملؤها', 'error')
            return redirect(url_for('register'))
        
        # Check if email exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            user = existing_user
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
                    try:
                        send_confirmation_email(user.email, user.name, session_obj)
                    except Exception as e:
                        app.logger.error(f"Email sending failed: {e}")
                    
                    flash('تم التسجيل بنجاح! ستتلقى تأكيداً عبر البريد الإلكتروني.', 'success')
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
    
    return render_template('register.html', session=session_obj)

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
def mark_attendance(session_id, user_id):
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

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500
