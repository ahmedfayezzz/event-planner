from app import db
from flask_login import UserMixin
from datetime import datetime
from sqlalchemy import func
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    instagram = db.Column(db.String(200))
    snapchat = db.Column(db.String(200))
    twitter = db.Column(db.String(200))
    company_name = db.Column(db.String(100))
    position = db.Column(db.String(100))
    activity_type = db.Column(db.String(100))
    gender = db.Column(db.String(10))
    goal = db.Column(db.Text)
    ai_description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_approved = db.Column(db.Boolean, default=True)
    is_active = db.Column(db.Boolean, default=True)

    # Password reset fields
    reset_token = db.Column(db.String(128))
    reset_token_expires = db.Column(db.DateTime)

    # Remember me / refresh token fields
    refresh_token = db.Column(db.String(128))
    refresh_token_expires = db.Column(db.DateTime)

    # Relationships
    registrations = db.relationship('Registration', backref='user', lazy=True)
    attendances = db.relationship('Attendance', backref='user', lazy=True)

    def set_password(self, password):
        """Hash and set the user's password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check if the provided password matches the hash"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)

    def get_attendance_count(self):
        return len([a for a in self.attendances if a.attended])

    def get_profile_url(self):
        return f"/u/{self.username}"

class Session(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.DateTime, nullable=False)
    guest_name = db.Column(db.String(100))
    guest_profile = db.Column(db.String(200))
    max_participants = db.Column(db.Integer, default=50)
    max_companions = db.Column(db.Integer, default=5)  # Max companions per registration
    status = db.Column(db.String(20), default='open')  # open, closed, completed
    requires_approval = db.Column(db.Boolean, default=False)
    show_participant_count = db.Column(db.Boolean, default=True)
    location = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Advanced Settings
    registration_deadline = db.Column(db.DateTime)  # Close registration before this time
    show_countdown = db.Column(db.Boolean, default=True)  # Show countdown timer
    show_guest_profile = db.Column(db.Boolean, default=True)  # Show guest info
    enable_mini_view = db.Column(db.Boolean, default=False)  # Enable embed mini view
    custom_confirmation_message = db.Column(db.Text)  # Custom confirmation message
    embed_enabled = db.Column(db.Boolean, default=True)  # Allow embedding
    slug = db.Column(db.String(100))  # URL slug for pretty URLs
    invite_only = db.Column(db.Boolean, default=False)  # Invite-only registration
    invite_message = db.Column(db.Text)  # Custom invitation message
    
    # Relationships
    registrations = db.relationship('Registration', backref='session', lazy=True)
    attendances = db.relationship('Attendance', backref='session', lazy=True)
    
    def get_registration_count(self):
        return len([r for r in self.registrations if r.is_approved])
    
    def is_full(self):
        return self.get_registration_count() >= self.max_participants
    
    def can_register(self):
        # Check if registration is open and not full
        if self.status != 'open' or self.is_full():
            return False
        
        # Check registration deadline
        if self.registration_deadline and datetime.utcnow() > self.registration_deadline:
            return False
            
        return True
    
    def get_embed_url(self):
        """Get the embed URL for this session"""
        if self.slug:
            return f"/event/{self.slug}/embed"
        return f"/event/{self.id}/embed"
    
    def get_public_url(self):
        """Get the public URL for this session"""
        if self.slug:
            return f"/event/{self.slug}"
        return f"/session/{self.id}/register"
    
    def generate_slug(self):
        """Generate URL slug from title"""
        import re
        if not self.slug and self.title:
            # Simple slug generation
            slug = re.sub(r'[^\w\s-]', '', self.title).strip()
            slug = re.sub(r'[\s_-]+', '-', slug)[:50]
            self.slug = f"{slug}-{self.session_number}"
        return self.slug

class Registration(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Nullable for guest registrations
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_approved = db.Column(db.Boolean, default=True)
    approval_notes = db.Column(db.Text)

    # Guest registration fields (used when user_id is NULL)
    guest_name = db.Column(db.String(100))
    guest_email = db.Column(db.String(120))
    guest_phone = db.Column(db.String(20))
    guest_instagram = db.Column(db.String(200))
    guest_snapchat = db.Column(db.String(200))
    guest_twitter = db.Column(db.String(200))
    guest_company_name = db.Column(db.String(100))
    guest_position = db.Column(db.String(100))
    guest_activity_type = db.Column(db.String(100))
    guest_gender = db.Column(db.String(10))
    guest_goal = db.Column(db.Text)

    # Relationships
    companions = db.relationship('Companion', backref='registration', lazy=True, cascade='all, delete-orphan')

    def is_guest_registration(self):
        """Check if this is a guest registration (no user account)"""
        return self.user_id is None

    def get_registrant_name(self):
        """Get the name of the registrant (user or guest)"""
        if self.user_id:
            return self.user.name
        return self.guest_name

    def get_registrant_email(self):
        """Get the email of the registrant (user or guest)"""
        if self.user_id:
            return self.user.email
        return self.guest_email

    def get_registrant_phone(self):
        """Get the phone of the registrant (user or guest)"""
        if self.user_id:
            return self.user.phone
        return self.guest_phone

    def get_companion_count(self):
        """Get the number of companions for this registration"""
        return len(self.companions)

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
    attended = db.Column(db.Boolean, default=False)
    check_in_time = db.Column(db.DateTime)
    qr_verified = db.Column(db.Boolean, default=False)


class Companion(db.Model):
    """Companion attached to a registration"""
    id = db.Column(db.Integer, primary_key=True)
    registration_id = db.Column(db.Integer, db.ForeignKey('registration.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    company = db.Column(db.String(100))
    title = db.Column(db.String(100))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))  # Optional, for future invite functionality
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # For invitation tracking (admin can invite companions to create accounts)
    invite_sent = db.Column(db.Boolean, default=False)
    invite_sent_at = db.Column(db.DateTime)
    invite_token = db.Column(db.String(128))
    converted_to_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    # Relationships
    converted_user = db.relationship('User', foreign_keys=[converted_to_user_id])


class Admin(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)

class Invite(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    token = db.Column(db.String(128), unique=True, nullable=False)
    used = db.Column(db.Boolean, default=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    sent_at = db.Column(db.DateTime)
    
    # Relationship
    session = db.relationship('Session', backref='invites')

class AIAnalytics(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    analysis_type = db.Column(db.String(50), nullable=False)  # demographics, trends, insights
    data = db.Column(db.JSON)
    generated_at = db.Column(db.DateTime, default=datetime.utcnow)
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=True)
