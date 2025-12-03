from flask import render_template, request, redirect, url_for, flash, jsonify, make_response, session as flask_session
from flask_login import login_user, logout_user, login_required, current_user
from app import app, db
from models import User, Session, Registration, Attendance, Admin, Companion, Invite
from sqlalchemy import func
from ai_service import generate_professional_description, analyze_participant_data, search_participants
from utils import (
    generate_username, send_confirmation_email, generate_qr_code, export_to_csv,
    send_registration_pending_email, send_registration_confirmed_email, send_companion_registered_email,
    generate_invite_token, send_invitation_email, format_phone_number
)
from werkzeug.security import check_password_hash, generate_password_hash
from datetime import datetime, timedelta
import json
import csv
import io
import re
import secrets


@app.before_request
def check_refresh_token():
    """Auto-login user if valid refresh token cookie exists"""
    # Skip if user already logged in
    if 'user_id' in flask_session:
        return

    # Skip for static files and certain endpoints
    if request.endpoint in ['static', 'user_login', 'user_logout', 'register']:
        return

    # Check for refresh token cookie
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        return

    # Find user with this refresh token
    user = User.query.filter_by(refresh_token=refresh_token).first()
    if not user:
        return

    # Check if token is expired
    if user.refresh_token_expires and user.refresh_token_expires < datetime.utcnow():
        # Token expired - clear it
        user.refresh_token = None
        user.refresh_token_expires = None
        db.session.commit()
        return

    # Valid token - auto-login user
    flask_session['user_id'] = user.id

    # Refresh the token (extend expiration)
    user.refresh_token_expires = datetime.utcnow() + timedelta(days=30)
    db.session.commit()


def create_companion_guest_registration(companion, session_obj, is_approved):
    """Convert a companion to a guest registration"""
    registration = Registration(
        session_id=session_obj.id,
        guest_name=companion.name,
        guest_email=companion.email,
        guest_phone=companion.phone,
        guest_company_name=companion.company,
        guest_position=companion.title,
        is_approved=is_approved
    )
    db.session.add(registration)
    db.session.commit()
    return registration


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
    # If session_id provided, redirect to session registration
    session_id = request.args.get('session_id')
    if session_id:
        return redirect(url_for('guest_session_register', session_id=session_id))

    # Check if user is already logged in
    if 'user_id' in flask_session:
        return redirect(url_for('user_dashboard'))

    if request.method == 'POST':
        # Get form data
        name = request.form.get('name')
        email = request.form.get('email')
        phone = request.form.get('phone')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        instagram = request.form.get('instagram')
        snapchat = request.form.get('snapchat')
        twitter = request.form.get('twitter')
        company_name = request.form.get('company_name')
        position = request.form.get('position')
        activity_type = request.form.get('activity_type')
        gender = request.form.get('gender')
        goal = request.form.get('goal')
        session_id = request.form.get('session_id')

        # Store form data for re-rendering on error
        form_data = {
            'name': name, 'email': email, 'phone': phone,
            'instagram': instagram, 'snapchat': snapchat, 'twitter': twitter,
            'company_name': company_name, 'position': position,
            'activity_type': activity_type, 'gender': gender, 'goal': goal
        }

        # Validate required fields
        if not all([name, email, phone, password, goal]):
            flash('جميع الحقول المطلوبة يجب ملؤها', 'error')
            return render_template('register.html', selected_session=None, form_data=form_data)

        # Validate password
        if len(password) < 8:
            flash('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error')
            return render_template('register.html', selected_session=None, form_data=form_data)

        if password != confirm_password:
            flash('كلمة المرور وتأكيدها غير متطابقتين', 'error')
            return render_template('register.html', selected_session=None, form_data=form_data)

        # Check if email exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            flash(f'يوجد حساب مسجل بهذا البريد الإلكتروني. يرجى تسجيل الدخول من <a href="{url_for("user_login")}" class="alert-link">هنا</a>', 'info')
            return render_template('register.html', selected_session=None, form_data=form_data)

        # Check if phone exists
        existing_phone = User.query.filter_by(phone=phone).first()
        if existing_phone:
            flash('رقم الجوال مسجل مسبقاً. يرجى استخدام رقم آخر أو تسجيل الدخول', 'error')
            return render_template('register.html', selected_session=None, form_data=form_data)
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
            user.set_password(password)
            db.session.add(user)
            db.session.flush()  # Get user.id

            # Link previous guest registrations to this user account
            guest_registrations = Registration.query.filter(
                Registration.user_id.is_(None),
                db.or_(
                    Registration.guest_email == email,
                    Registration.guest_phone == phone
                )
            ).all()

            for reg in guest_registrations:
                reg.user_id = user.id
                # Clear guest fields since now linked to user
                reg.guest_name = None
                reg.guest_email = None
                reg.guest_phone = None
                reg.guest_instagram = None
                reg.guest_snapchat = None
                reg.guest_twitter = None
                reg.guest_company_name = None
                reg.guest_position = None
                reg.guest_activity_type = None
                reg.guest_gender = None
                reg.guest_goal = None

            db.session.commit()

            if guest_registrations:
                flash(f'تم إنشاء الملف الشخصي وربط {len(guest_registrations)} تسجيل سابق بحسابك!', 'success')
            else:
                flash('تم إنشاء الملف الشخصي بنجاح!', 'success')

        return redirect(url_for('profile', username=user.username))

    # GET request - account creation only (no session)
    return render_template('register.html', selected_session=None)


@app.route('/session/<int:session_id>/guest-register', methods=['GET', 'POST'])
def guest_session_register(session_id):
    """Handle session registration with optional account creation"""
    session_obj = Session.query.get_or_404(session_id)

    # Check if session can accept registrations
    if not session_obj.can_register():
        flash('عذراً، التسجيل مغلق لهذه الجلسة', 'error')
        return redirect(url_for('sessions'))

    # If user is logged in, redirect to session detail to register there
    if 'user_id' in flask_session:
        return redirect(url_for('session_detail', session_id=session_id))

    if request.method == 'POST':
        # Get form data
        email = request.form.get('email')
        name = request.form.get('name')
        phone = request.form.get('phone')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        instagram = request.form.get('instagram')
        snapchat = request.form.get('snapchat')
        twitter = request.form.get('twitter')
        company_name = request.form.get('company_name')
        position = request.form.get('position')
        activity_type = request.form.get('activity_type')
        gender = request.form.get('gender')
        goal = request.form.get('goal')
        create_account = request.form.get('create_account') == 'on'

        # Store form data for re-rendering on error
        form_data = {
            'name': name, 'email': email, 'phone': phone,
            'instagram': instagram, 'snapchat': snapchat, 'twitter': twitter,
            'company_name': company_name, 'position': position,
            'activity_type': activity_type, 'gender': gender, 'goal': goal,
            'create_account': create_account
        }

        # Helper to render with form data
        def render_with_error():
            return render_template('session_register.html', session_obj=session_obj,
                                   max_companions=session_obj.max_companions, form_data=form_data)

        # Validate required fields
        if not all([name, email, phone]):
            flash('الاسم والبريد الإلكتروني ورقم الجوال مطلوبة', 'error')
            return render_with_error()

        # Validate password if creating account
        if create_account:
            if not password:
                flash('كلمة المرور مطلوبة لإنشاء الحساب', 'error')
                return render_with_error()
            if len(password) < 8:
                flash('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error')
                return render_with_error()
            if password != confirm_password:
                flash('كلمة المرور وتأكيدها غير متطابقتين', 'error')
                return render_with_error()

        # Check if email already exists as a user
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            # Check if already registered for this session
            existing_reg = Registration.query.filter_by(
                user_id=existing_user.id,
                session_id=session_id
            ).first()
            if existing_reg:
                flash('هذا البريد الإلكتروني مسجل بالفعل في هذه الجلسة', 'info')
            else:
                flash(f'يوجد حساب مسجل بهذا البريد الإلكتروني. يرجى <a href="{url_for("user_login", next=url_for("session_detail", session_id=session_id))}" class="alert-link">تسجيل الدخول</a> للتسجيل في الجلسة.', 'info')
            return render_with_error()

        # Check for existing guest registration with same email for this session
        existing_guest_reg = Registration.query.filter_by(
            guest_email=email,
            session_id=session_id
        ).first()
        if existing_guest_reg:
            flash('هذا البريد الإلكتروني مسجل بالفعل في هذه الجلسة', 'info')
            return render_with_error()

        # Check if phone exists (only needed when creating account)
        if create_account:
            existing_phone = User.query.filter_by(phone=phone).first()
            if existing_phone:
                flash('رقم الجوال مسجل مسبقاً. يرجى استخدام رقم آخر أو تسجيل الدخول', 'error')
                return render_with_error()

        user = None
        previous_guest_regs = []
        if create_account:
            # Create user account
            username = generate_username(name)
            ai_description = ""
            if goal:
                try:
                    ai_description = generate_professional_description(goal, activity_type or "")
                except Exception as e:
                    app.logger.error(f"AI description generation failed: {e}")

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
            user.set_password(password)
            db.session.add(user)
            db.session.flush()  # Get user.id before creating registration

            # Link previous guest registrations to this user account (excluding current session)
            previous_guest_regs = Registration.query.filter(
                Registration.user_id.is_(None),
                Registration.session_id != session_id,
                db.or_(
                    Registration.guest_email == email,
                    Registration.guest_phone == phone
                )
            ).all()

            for reg in previous_guest_regs:
                reg.user_id = user.id
                # Clear guest fields since now linked to user
                reg.guest_name = None
                reg.guest_email = None
                reg.guest_phone = None
                reg.guest_instagram = None
                reg.guest_snapchat = None
                reg.guest_twitter = None
                reg.guest_company_name = None
                reg.guest_position = None
                reg.guest_activity_type = None
                reg.guest_gender = None
                reg.guest_goal = None

        # Create registration
        registration = Registration(
            user_id=user.id if user else None,
            session_id=session_id,
            is_approved=not session_obj.requires_approval,
            guest_name=name if not user else None,
            guest_email=email if not user else None,
            guest_phone=phone if not user else None,
            guest_instagram=instagram if not user else None,
            guest_snapchat=snapchat if not user else None,
            guest_twitter=twitter if not user else None,
            guest_company_name=company_name if not user else None,
            guest_position=position if not user else None,
            guest_activity_type=activity_type if not user else None,
            guest_gender=gender if not user else None,
            guest_goal=goal if not user else None
        )
        db.session.add(registration)
        db.session.flush()  # Get registration.id for companions

        # Process companions
        companion_count = int(request.form.get('companion_count', 0))
        max_companions = session_obj.max_companions or 5

        for i in range(min(companion_count, max_companions)):
            companion_name = request.form.get(f'companion_name_{i}')
            if companion_name and companion_name.strip():
                companion = Companion(
                    registration_id=registration.id,
                    name=companion_name.strip(),
                    company=request.form.get(f'companion_company_{i}', '').strip() or None,
                    title=request.form.get(f'companion_title_{i}', '').strip() or None,
                    phone=request.form.get(f'companion_phone_{i}', '').strip() or None,
                    email=request.form.get(f'companion_email_{i}', '').strip() or None
                )
                db.session.add(companion)

        db.session.commit()

        # Send appropriate email based on approval requirement
        try:
            if session_obj.requires_approval:
                # Session requires approval - send pending email
                send_registration_pending_email(email, name, session_obj)
                # Send pending notification to companions
                for companion in registration.companions:
                    if companion.email:
                        comp_reg = create_companion_guest_registration(companion, session_obj, is_approved=False)
                        send_companion_registered_email(
                            companion.email, companion.name, name, session_obj,
                            is_approved=False, qr_data=None
                        )
            else:
                # No approval required - send confirmed email with QR
                qr_data = generate_qr_code(f"reg:{registration.id},session:{session_id}")
                send_registration_confirmed_email(email, name, session_obj, qr_data)
                # Create approved guest registrations for companions and send emails
                for companion in registration.companions:
                    if companion.email:
                        comp_reg = create_companion_guest_registration(companion, session_obj, is_approved=True)
                        comp_qr = generate_qr_code(f"reg:{comp_reg.id},session:{session_id}")
                        send_companion_registered_email(
                            companion.email, companion.name, name, session_obj,
                            is_approved=True, qr_data=comp_qr
                        )
        except Exception as e:
            app.logger.error(f"Email sending failed: {e}")

        if user:
            if previous_guest_regs:
                flash(f'تم التسجيل وإنشاء الحساب وربط {len(previous_guest_regs)} تسجيل سابق بحسابك!', 'success')
            else:
                flash('تم التسجيل وإنشاء الحساب بنجاح!', 'success')
            return redirect(url_for('profile', username=user.username))
        else:
            flash('تم التسجيل بنجاح!', 'success')
            return redirect(url_for('registration_confirmation', registration_id=registration.id))

    # GET request
    return render_template('session_register.html',
                         session_obj=session_obj,
                         max_companions=session_obj.max_companions or 5)


@app.route('/registration/<int:registration_id>/confirmation')
def registration_confirmation(registration_id):
    """Show registration confirmation page for guest registrations"""
    registration = Registration.query.get_or_404(registration_id)
    return render_template('registration_confirmation.html', registration=registration)

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
    # Get the next URL to redirect to after login
    next_page = request.args.get('next')

    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember_me = request.form.get('remember_me') == 'on'
        next_page = request.form.get('next')  # Also get from form

        # Find user by email
        user = User.query.filter_by(email=email).first()

        if user and user.check_password(password):
            flask_session['user_id'] = user.id
            flash('تم تسجيل الدخول بنجاح!', 'success')

            # Handle "Remember me" - set refresh token
            response = None
            if remember_me:
                refresh_token = secrets.token_urlsafe(32)
                user.refresh_token = refresh_token
                user.refresh_token_expires = datetime.utcnow() + timedelta(days=30)
                db.session.commit()

                # Determine redirect
                if next_page:
                    response = make_response(redirect(next_page))
                else:
                    response = make_response(redirect(url_for('user_dashboard')))

                # Set HTTP-only cookie
                response.set_cookie(
                    'refresh_token',
                    refresh_token,
                    max_age=30*24*60*60,  # 30 days
                    httponly=True,
                    samesite='Lax'
                )
                return response
            else:
                # Redirect without setting refresh token
                if next_page:
                    return redirect(next_page)
                return redirect(url_for('user_dashboard'))

        flash('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'error')
        # Preserve email on error
        return render_template('user_login.html', next=next_page, form_data={'email': email})

    return render_template('user_login.html', next=next_page)

@app.route('/user/dashboard')
def user_dashboard():
    if 'user_id' not in flask_session:
        flash('يجب تسجيل الدخول أولاً', 'error')
        return redirect(url_for('user_login'))
    
    user = User.query.get_or_404(flask_session['user_id'])
    return render_template('user_dashboard.html', user=user)

@app.route('/user/logout')
def user_logout():
    # Invalidate refresh token in database
    if 'user_id' in flask_session:
        user = User.query.get(flask_session['user_id'])
        if user:
            user.refresh_token = None
            user.refresh_token_expires = None
            db.session.commit()

    flask_session.pop('user_id', None)
    flash('تم تسجيل الخروج بنجاح', 'success')

    # Clear refresh token cookie
    response = make_response(redirect(url_for('index')))
    response.delete_cookie('refresh_token')
    return response

@app.route('/user/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    """Handle forgot password request"""
    if request.method == 'POST':
        email = request.form.get('email')

        if not email:
            flash('يرجى إدخال البريد الإلكتروني', 'error')
            return redirect(url_for('forgot_password'))

        user = User.query.filter_by(email=email).first()

        if user:
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            user.reset_token = reset_token
            user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
            db.session.commit()

            # Send reset email
            try:
                from utils import send_password_reset_email
                reset_url = url_for('reset_password', token=reset_token, _external=True)
                send_password_reset_email(user.email, user.name, reset_url)
            except Exception as e:
                app.logger.error(f"Password reset email failed: {e}")

        # Always show success message (don't reveal if email exists)
        flash('إذا كان البريد الإلكتروني مسجلاً، ستصلك رسالة تحتوي على رابط إعادة تعيين كلمة المرور', 'success')
        return redirect(url_for('user_login'))

    return render_template('forgot_password.html')


@app.route('/user/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """Handle password reset via token"""
    user = User.query.filter_by(reset_token=token).first()

    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        flash('رابط إعادة تعيين كلمة المرور غير صالح أو منتهي الصلاحية', 'error')
        return redirect(url_for('forgot_password'))

    if request.method == 'POST':
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        if not password:
            flash('يرجى إدخال كلمة المرور الجديدة', 'error')
            return redirect(url_for('reset_password', token=token))

        if len(password) < 8:
            flash('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'error')
            return redirect(url_for('reset_password', token=token))

        if password != confirm_password:
            flash('كلمة المرور وتأكيدها غير متطابقتين', 'error')
            return redirect(url_for('reset_password', token=token))

        # Set new password and clear reset token
        user.set_password(password)
        user.reset_token = None
        user.reset_token_expires = None
        db.session.commit()

        flash('تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول', 'success')
        return redirect(url_for('user_login'))

    return render_template('reset_password.html', token=token)


@app.route('/user/change-password', methods=['GET', 'POST'])
def change_password():
    """Handle password change for logged-in users"""
    if 'user_id' not in flask_session:
        flash('يجب تسجيل الدخول أولاً', 'error')
        return redirect(url_for('user_login'))

    user = User.query.get_or_404(flask_session['user_id'])

    if request.method == 'POST':
        current_password = request.form.get('current_password')
        new_password = request.form.get('new_password')
        confirm_password = request.form.get('confirm_password')

        # Verify current password
        if not user.check_password(current_password):
            flash('كلمة المرور الحالية غير صحيحة', 'error')
            return redirect(url_for('change_password'))

        # Validate new password
        if not new_password:
            flash('يرجى إدخال كلمة المرور الجديدة', 'error')
            return redirect(url_for('change_password'))

        if len(new_password) < 8:
            flash('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل', 'error')
            return redirect(url_for('change_password'))

        if new_password != confirm_password:
            flash('كلمة المرور الجديدة وتأكيدها غير متطابقتين', 'error')
            return redirect(url_for('change_password'))

        # Set new password
        user.set_password(new_password)
        db.session.commit()

        flash('تم تغيير كلمة المرور بنجاح!', 'success')
        return redirect(url_for('user_dashboard'))

    return render_template('change_password.html')


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
    
    # If user is logged in, redirect to session detail instead of general registration
    if 'user_id' in flask_session:
        return redirect(url_for('session_detail', session_id=session_id))
    
    return redirect(url_for('register', session_id=session_id))

@app.route('/session/<int:session_id>')
def session_detail(session_id):
    """Show session details with registration option for logged-in users"""
    session_obj = Session.query.get_or_404(session_id)
    
    # If user not logged in, redirect to login with return URL
    if 'user_id' not in flask_session:
        login_url = url_for('user_login', next=request.url)
        flash('يرجى تسجيل الدخول للمتابعة', 'info')
        return redirect(login_url)
    
    user = User.query.get(flask_session['user_id'])
    
    # Check if user is already registered
    existing_registration = Registration.query.filter_by(
        user_id=user.id, 
        session_id=session_id
    ).first()
    
    return render_template('session_detail.html', 
                         session_obj=session_obj, 
                         user=user,
                         existing_registration=existing_registration)

@app.route('/session/<int:session_id>/register', methods=['POST'])
def register_for_session(session_id):
    """Register logged-in user for a specific session"""
    if 'user_id' not in flask_session:
        flash('يجب تسجيل الدخول أولاً', 'error')
        return redirect(url_for('user_login'))
    
    session_obj = Session.query.get_or_404(session_id)
    user_id = flask_session['user_id']
    
    # Check if already registered
    existing_registration = Registration.query.filter_by(
        user_id=user_id, 
        session_id=session_id
    ).first()
    
    if existing_registration:
        flash('أنت مسجل في هذه الجلسة بالفعل', 'info')
        return redirect(url_for('session_detail', session_id=session_id))
    
    # Check if session can accept registration
    if not session_obj.can_register():
        flash('لا يمكن التسجيل في هذه الجلسة', 'error')
        return redirect(url_for('session_detail', session_id=session_id))
    
    # Create registration
    registration = Registration(
        user_id=user_id,
        session_id=session_id,
        is_approved=not session_obj.requires_approval
    )
    db.session.add(registration)
    db.session.commit()

    # Send appropriate email based on approval requirement
    user = User.query.get(user_id)
    try:
        if session_obj.requires_approval:
            send_registration_pending_email(user.email, user.name, session_obj)
        else:
            qr_data = generate_qr_code(f"reg:{registration.id},session:{session_id}")
            send_registration_confirmed_email(user.email, user.name, session_obj, qr_data)
    except Exception as e:
        app.logger.error(f"Email sending failed: {e}")

    if session_obj.requires_approval:
        flash('تم تسجيلك في الجلسة، في انتظار الموافقة من الإدارة', 'success')
    else:
        flash('تم تسجيلك في الجلسة بنجاح!', 'success')

    return redirect(url_for('session_detail', session_id=session_id))

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

        # Calculate registration deadline from hours before session
        session_date = datetime.strptime(request.form.get('date'), '%Y-%m-%dT%H:%M')
        deadline_hours = request.form.get('registration_deadline_hours', '').strip()
        registration_deadline = None
        if deadline_hours and int(deadline_hours) > 0:
            registration_deadline = session_date - timedelta(hours=int(deadline_hours))

        session = Session(
            session_number=session_number,
            title=request.form.get('title'),
            description=request.form.get('description'),
            date=session_date,
            guest_name=request.form.get('guest_name'),
            guest_profile=request.form.get('guest_profile'),
            location=request.form.get('location'),
            max_participants=int(request.form.get('max_participants', 50)),
            max_companions=int(request.form.get('max_companions', 5)),
            registration_deadline=registration_deadline,
            requires_approval='requires_approval' in request.form,
            show_participant_count='show_participant_count' in request.form,
            show_countdown='show_countdown' in request.form,
            show_guest_profile='show_guest_profile' in request.form,
            enable_mini_view='enable_mini_view' in request.form,
            embed_enabled='embed_enabled' in request.form,
            invite_only='invite_only' in request.form,
            send_qr_in_email='send_qr_in_email' in request.form
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
        session_obj.max_companions = int(request.form.get('max_companions', 5))

        # Calculate registration deadline from hours before session
        deadline_hours = request.form.get('registration_deadline_hours', '').strip()
        if deadline_hours and int(deadline_hours) > 0:
            session_obj.registration_deadline = session_obj.date - timedelta(hours=int(deadline_hours))
        else:
            session_obj.registration_deadline = None

        session_obj.requires_approval = 'requires_approval' in request.form
        session_obj.show_participant_count = 'show_participant_count' in request.form
        session_obj.show_countdown = 'show_countdown' in request.form
        session_obj.show_guest_profile = 'show_guest_profile' in request.form
        session_obj.enable_mini_view = 'enable_mini_view' in request.form
        session_obj.embed_enabled = 'embed_enabled' in request.form
        session_obj.invite_only = 'invite_only' in request.form
        session_obj.send_qr_in_email = 'send_qr_in_email' in request.form
        session_obj.status = request.form.get('status')

        db.session.commit()
        flash('تم تحديث الجلسة بنجاح!', 'success')
        return redirect(url_for('admin_sessions'))

    return render_template('admin/edit_session.html', session_obj=session_obj)

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
    
    return render_template(template, session_obj=session_obj)

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

        # Send confirmation email to registrant
        try:
            email = registration.get_registrant_email()
            name = registration.get_registrant_name()
            qr_data = generate_qr_code(f"reg:{registration.id},session:{registration.session_id}")
            send_registration_confirmed_email(email, name, registration.session, qr_data)

            # Handle companions - create guest registrations and send emails
            for companion in registration.companions:
                if companion.email:
                    comp_reg = create_companion_guest_registration(companion, registration.session, is_approved=True)
                    comp_qr = generate_qr_code(f"reg:{comp_reg.id},session:{registration.session_id}")
                    send_companion_registered_email(
                        companion.email, companion.name, name, registration.session,
                        is_approved=True, qr_data=comp_qr
                    )
        except Exception as e:
            app.logger.error(f"Approval email sending failed: {e}")

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
        session_obj = Session.query.get_or_404(session_id)
        registrations = Registration.query.filter_by(
            session_id=session_id,
            is_approved=False
        ).all()

        for registration in registrations:
            registration.is_approved = True

        db.session.commit()

        # Send confirmation emails to all approved registrations
        emails_sent = 0
        for registration in registrations:
            try:
                email = registration.get_registrant_email()
                name = registration.get_registrant_name()
                qr_data = generate_qr_code(f"reg:{registration.id},session:{session_id}")
                send_registration_confirmed_email(email, name, session_obj, qr_data)
                emails_sent += 1

                # Handle companions - create guest registrations and send emails
                for companion in registration.companions:
                    if companion.email:
                        comp_reg = create_companion_guest_registration(companion, session_obj, is_approved=True)
                        comp_qr = generate_qr_code(f"reg:{comp_reg.id},session:{session_id}")
                        send_companion_registered_email(
                            companion.email, companion.name, name, session_obj,
                            is_approved=True, qr_data=comp_qr
                        )
            except Exception as e:
                app.logger.error(f"Bulk approval email failed for {email}: {e}")

        return jsonify({'success': True, 'count': len(registrations), 'emails_sent': emails_sent})

    except Exception as e:
        app.logger.error(f"Bulk approval failed: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/admin/session/<int:session_id>/companions')
@login_required
def admin_session_companions(session_id):
    """View all companions for a session"""
    session_obj = Session.query.get_or_404(session_id)
    registrations = Registration.query.filter_by(session_id=session_id).all()

    companions_data = []
    for reg in registrations:
        for companion in reg.companions:
            companions_data.append({
                'companion': companion,
                'registration': reg,
                'registrant_name': reg.get_registrant_name(),
                'registrant_email': reg.get_registrant_email()
            })

    return render_template('admin/session_companions.html',
                         session_obj=session_obj,
                         companions=companions_data,
                         total_companions=len(companions_data))


@app.route('/admin/checkin/<int:session_id>')
@login_required
def admin_checkin(session_id):
    session_obj = Session.query.get_or_404(session_id)
    registrations = Registration.query.filter_by(
        session_id=session_id,
        is_approved=True
    ).all()

    return render_template('admin/checkin.html',
                         session_obj=session_obj,
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

# Admin API Routes for Invitations
@app.route('/api/admin/users-for-invite/<int:session_id>')
@login_required
def api_users_for_invite(session_id):
    """Get list of users available for invitation to a session"""
    try:
        session_obj = Session.query.get_or_404(session_id)

        # Get all users
        users = User.query.filter_by(is_active=True).all()

        # Get users who are already registered for this session
        registered_user_ids = set(
            r.user_id for r in Registration.query.filter_by(session_id=session_id).all()
            if r.user_id is not None
        )

        # Get users who already have invites for this session
        invited_emails = set(
            i.email.lower() for i in Invite.query.filter_by(session_id=session_id).all()
        )

        users_list = []
        for user in users:
            users_list.append({
                'id': user.id,
                'name': user.name,
                'email': user.email,
                'phone': user.phone,
                'already_registered': user.id in registered_user_ids,
                'already_invited': user.email.lower() in invited_emails
            })

        return jsonify({
            'success': True,
            'users': users_list
        })

    except Exception as e:
        app.logger.error(f"Users for invite API error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/send-invites/<int:session_id>', methods=['POST'])
@login_required
def api_send_invites(session_id):
    """Send email invitations to selected users"""
    try:
        session_obj = Session.query.get_or_404(session_id)
        data = request.get_json()
        user_ids = data.get('user_ids', [])

        if not user_ids:
            return jsonify({'success': False, 'message': 'لم يتم تحديد مستخدمين'}), 400

        sent_count = 0
        for user_id in user_ids:
            user = User.query.get(user_id)
            if not user:
                continue

            # Check if already invited
            existing_invite = Invite.query.filter_by(
                session_id=session_id,
                email=user.email
            ).first()

            if existing_invite:
                continue

            # Create invite record
            token = generate_invite_token()
            invite = Invite(
                session_id=session_id,
                email=user.email,
                token=token,
                expires_at=session_obj.date,  # Invite expires at session time
                sent_at=datetime.utcnow()
            )
            db.session.add(invite)

            # Send invitation email
            if send_invitation_email(user.email, session_obj, token, session_obj.invite_message):
                sent_count += 1

        db.session.commit()

        return jsonify({
            'success': True,
            'sent_count': sent_count
        })

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Send invites API error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/generate-whatsapp-invites/<int:session_id>', methods=['POST'])
@login_required
def api_generate_whatsapp_invites(session_id):
    """Generate WhatsApp links for selected users"""
    try:
        import urllib.parse

        session_obj = Session.query.get_or_404(session_id)
        data = request.get_json()
        user_ids = data.get('user_ids', [])

        if not user_ids:
            return jsonify({'success': False, 'message': 'لم يتم تحديد مستخدمين'}), 400

        links = []
        for user_id in user_ids:
            user = User.query.get(user_id)
            if not user or not user.phone:
                continue

            # Generate invite token for tracking
            token = generate_invite_token()

            # Check if invite exists, if not create one
            existing_invite = Invite.query.filter_by(
                session_id=session_id,
                email=user.email
            ).first()

            if not existing_invite:
                invite = Invite(
                    session_id=session_id,
                    email=user.email,
                    token=token,
                    expires_at=session_obj.date
                )
                db.session.add(invite)
            else:
                token = existing_invite.token

            # Build registration link
            import os
            base_url = os.environ.get('BASE_URL', request.host_url.rstrip('/'))
            registration_link = f"{base_url}/event/{session_obj.slug or session_obj.id}/register?token={token}"

            # Build WhatsApp message
            message = f"""مرحباً {user.name}،

نود دعوتك لحضور جلسة "{session_obj.title}" في ثلوثية الأعمال.

📅 التاريخ: {session_obj.date.strftime('%Y-%m-%d')}
🕐 الوقت: {session_obj.date.strftime('%H:%M')}
📍 المكان: {session_obj.location or 'سيتم الإعلان عنه لاحقاً'}

للتسجيل، استخدم الرابط التالي:
{registration_link}

نتطلع لرؤيتك معنا!"""

            # Format phone number for WhatsApp (remove + and leading zeros)
            formatted_phone = format_phone_number(user.phone)
            # WhatsApp API expects number without + sign
            wa_phone = formatted_phone.replace('+', '')

            # Create WhatsApp URL
            encoded_message = urllib.parse.quote(message)
            whatsapp_url = f"https://wa.me/{wa_phone}?text={encoded_message}"

            links.append({
                'name': user.name,
                'phone': user.phone,
                'whatsapp_url': whatsapp_url
            })

        db.session.commit()

        return jsonify({
            'success': True,
            'links': links
        })

    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Generate WhatsApp invites API error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/admin/session-invites/<int:session_id>')
@login_required
def api_session_invites(session_id):
    """Get all invites for a session"""
    try:
        invites = Invite.query.filter_by(session_id=session_id).order_by(Invite.created_at.desc()).all()

        invites_list = [{
            'id': invite.id,
            'email': invite.email,
            'used': invite.used,
            'sent_at': invite.sent_at.strftime('%Y-%m-%d %H:%M') if invite.sent_at else None,
            'expires_at': invite.expires_at.strftime('%Y-%m-%d %H:%M') if invite.expires_at else None
        } for invite in invites]

        return jsonify({
            'success': True,
            'invites': invites_list
        })

    except Exception as e:
        app.logger.error(f"Session invites API error: {e}")
        return jsonify({'success': False, 'message': str(e)}), 500


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return render_template('404.html'), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return render_template('500.html'), 500
