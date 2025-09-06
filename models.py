from app import db
from flask_login import UserMixin
from datetime import datetime
from sqlalchemy import func

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
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
    
    # Relationships
    registrations = db.relationship('Registration', backref='user', lazy=True)
    attendances = db.relationship('Attendance', backref='user', lazy=True)

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
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_approved = db.Column(db.Boolean, default=True)
    approval_notes = db.Column(db.Text)

class Attendance(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('session.id'), nullable=False)
    attended = db.Column(db.Boolean, default=False)
    check_in_time = db.Column(db.DateTime)
    qr_verified = db.Column(db.Boolean, default=False)

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
