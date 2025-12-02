import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_login import LoginManager

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# Create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# Configure the database
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///business_tuesdays.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'admin_login'
login_manager.login_message = 'يرجى تسجيل الدخول للوصول إلى هذه الصفحة.'

@login_manager.user_loader
def load_user(user_id):
    from models import Admin
    return Admin.query.get(int(user_id))

# Arabic date/number filters
def to_arabic_numerals(text):
    """Convert Western numerals to Arabic-Indic numerals"""
    arabic_numerals = {'0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
                       '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'}
    return ''.join(arabic_numerals.get(c, c) for c in str(text))

@app.template_filter('arabic_date')
def arabic_date_filter(date_obj):
    """Format date in Arabic with Arabic numerals"""
    if not date_obj:
        return ""
    arabic_days = {
        0: "الاثنين", 1: "الثلاثاء", 2: "الأربعاء", 3: "الخميس",
        4: "الجمعة", 5: "السبت", 6: "الأحد"
    }
    arabic_months = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
        5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
        9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
    }
    day_name = arabic_days[date_obj.weekday()]
    month_name = arabic_months[date_obj.month]
    day = to_arabic_numerals(date_obj.day)
    year = to_arabic_numerals(date_obj.year)
    return f"{day_name} {day} {month_name} {year}"

@app.template_filter('arabic_time')
def arabic_time_filter(date_obj):
    """Format time with Arabic numerals"""
    if not date_obj:
        return ""
    return to_arabic_numerals(date_obj.strftime('%H:%M'))

@app.template_filter('arabic_num')
def arabic_num_filter(num):
    """Convert number to Arabic numerals"""
    return to_arabic_numerals(num)

with app.app_context():
    # Import models and routes
    import models
    import routes
    
    # Create all tables
    db.create_all()
    
    # Create default admin if not exists
    from models import Admin
    from werkzeug.security import generate_password_hash
    
    if not Admin.query.filter_by(username='admin').first():
        admin = Admin(
            username='admin',
            email='admin@businesstuesdays.com',
            password_hash=generate_password_hash('admin123')
        )
        db.session.add(admin)
        db.session.commit()
        print("Default admin created: username=admin, password=admin123")
