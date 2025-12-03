import re
import qrcode
import io
import base64
import smtplib
import email.mime.text
import email.mime.multipart
from models import User
import os
import random
import string
from datetime import datetime, timedelta
import secrets

def generate_username(name):
    """Generate a unique username from name"""
    # Clean name and create base username
    clean_name = re.sub(r'[^\w\s]', '', name).strip()
    base_username = re.sub(r'\s+', '_', clean_name.lower())
    
    # Ensure uniqueness
    username = base_username
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username}_{counter}"
        counter += 1
    
    return username

def generate_qr_code(data):
    """Generate QR code for the given data"""
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        buffer.seek(0)
        
        img_str = base64.b64encode(buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_str}"
        
    except Exception as e:
        print(f"QR code generation failed: {e}")
        return None

def send_confirmation_email(email, name, session):
    """Send confirmation email to participant"""
    try:
        # Email configuration
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        
        if not all([smtp_username, smtp_password]):
            print("SMTP credentials not configured")
            return False
        
        # Create message
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = f"تأكيد التسجيل - {session.title}"
        
        body = f"""
        مرحباً {name},
        
        تم تأكيد تسجيلك في:
        {session.title}
        التجمع رقم {session.session_number}
        
        التاريخ: {session.date.strftime('%Y-%m-%d %H:%M')}
        المكان: {session.location or 'سيتم الإعلان عنه لاحقاً'}
        
        نتطلع لرؤيتك معنا!
        
        فريق ثلوثية الأعمال
        """
        
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()
        
        return True
        
    except Exception as e:
        print(f"Email sending failed: {e}")
        return False


def send_registration_pending_email(email, name, session):
    """Send registration received email (pending approval)"""
    try:
        # Email configuration
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")

        if not all([smtp_username, smtp_password]):
            print("SMTP credentials not configured")
            return False

        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = f"استلام التسجيل - {session.title}"

        body = f"""
مرحباً {name},

شكراً لتسجيلك في:
{session.title}
التجمع رقم {session.session_number}

التاريخ: {session.date.strftime('%Y-%m-%d %H:%M')}
المكان: {session.location or 'سيتم الإعلان عنه لاحقاً'}

تسجيلك قيد المراجعة وسيتم إخطارك بالموافقة قريباً.

فريق ثلوثية الأعمال
        """

        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()

        return True

    except Exception as e:
        print(f"Registration pending email sending failed: {e}")
        return False


def send_registration_confirmed_email(email, name, session, qr_data=None):
    """Send registration confirmed email with optional QR code"""
    try:
        # Email configuration
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")

        if not all([smtp_username, smtp_password]):
            print("SMTP credentials not configured")
            return False

        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.image import MIMEImage

        msg = MIMEMultipart('related')
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = f"تأكيد التسجيل - {session.title}"

        # Build HTML body with optional QR code
        qr_section = ""
        if qr_data and session.send_qr_in_email:
            qr_section = """
<br><br>
<p style="text-align: center;"><strong>رمز الحضور الخاص بك:</strong></p>
<p style="text-align: center;"><img src="cid:qrcode" alt="QR Code" style="max-width: 200px;"></p>
<p style="text-align: center; font-size: 12px;">أظهر هذا الرمز عند الحضور</p>
"""

        html_body = f"""
<html>
<head>
<meta charset="utf-8">
</head>
<body dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
<p>مرحباً {name},</p>

<p>تم تأكيد تسجيلك في:</p>
<p><strong>{session.title}</strong><br>
التجمع رقم {session.session_number}</p>

<p>التاريخ: {session.date.strftime('%Y-%m-%d %H:%M')}<br>
المكان: {session.location or 'سيتم الإعلان عنه لاحقاً'}</p>
{qr_section}
<p>نتطلع لرؤيتك معنا!</p>

<p>فريق ثلوثية الأعمال</p>
</body>
</html>
        """

        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        # Plain text version
        plain_body = f"""
مرحباً {name},

تم تأكيد تسجيلك في:
{session.title}
التجمع رقم {session.session_number}

التاريخ: {session.date.strftime('%Y-%m-%d %H:%M')}
المكان: {session.location or 'سيتم الإعلان عنه لاحقاً'}

نتطلع لرؤيتك معنا!

فريق ثلوثية الأعمال
        """

        msg_alternative.attach(MIMEText(plain_body, 'plain', 'utf-8'))
        msg_alternative.attach(MIMEText(html_body, 'html', 'utf-8'))

        # Attach QR code image if provided
        if qr_data and session.send_qr_in_email:
            # Extract base64 data from data URI
            if qr_data.startswith('data:image/png;base64,'):
                img_data = base64.b64decode(qr_data.split(',')[1])
                img = MIMEImage(img_data)
                img.add_header('Content-ID', '<qrcode>')
                img.add_header('Content-Disposition', 'inline', filename='qrcode.png')
                msg.attach(img)

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()

        return True

    except Exception as e:
        print(f"Registration confirmed email sending failed: {e}")
        return False


def send_companion_registered_email(email, companion_name, registrant_name, session, is_approved=False, qr_data=None):
    """Send email to companion notifying them of registration"""
    try:
        # Email configuration
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")

        if not all([smtp_username, smtp_password]):
            print("SMTP credentials not configured")
            return False

        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.image import MIMEImage

        msg = MIMEMultipart('related')
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = f"تم تسجيلك كمرافق - {session.title}"

        # Build status message and optional QR
        if is_approved:
            status_message = "نتطلع لرؤيتك معنا!"
            qr_section = ""
            if qr_data and session.send_qr_in_email:
                qr_section = """
<br><br>
<p style="text-align: center;"><strong>رمز الحضور الخاص بك:</strong></p>
<p style="text-align: center;"><img src="cid:qrcode" alt="QR Code" style="max-width: 200px;"></p>
<p style="text-align: center; font-size: 12px;">أظهر هذا الرمز عند الحضور</p>
"""
        else:
            status_message = "تسجيلك قيد المراجعة وسيتم إخطارك بالموافقة قريباً."
            qr_section = ""

        html_body = f"""
<html>
<head>
<meta charset="utf-8">
</head>
<body dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
<p>مرحباً {companion_name},</p>

<p>تم تسجيلك كمرافق للأستاذ/ة {registrant_name} في:</p>
<p><strong>{session.title}</strong><br>
التجمع رقم {session.session_number}</p>

<p>التاريخ: {session.date.strftime('%Y-%m-%d %H:%M')}<br>
المكان: {session.location or 'سيتم الإعلان عنه لاحقاً'}</p>
{qr_section}
<p>{status_message}</p>

<p>فريق ثلوثية الأعمال</p>
</body>
</html>
        """

        msg_alternative = MIMEMultipart('alternative')
        msg.attach(msg_alternative)

        # Plain text version
        plain_body = f"""
مرحباً {companion_name},

تم تسجيلك كمرافق للأستاذ/ة {registrant_name} في:
{session.title}
التجمع رقم {session.session_number}

التاريخ: {session.date.strftime('%Y-%m-%d %H:%M')}
المكان: {session.location or 'سيتم الإعلان عنه لاحقاً'}

{status_message}

فريق ثلوثية الأعمال
        """

        msg_alternative.attach(MIMEText(plain_body, 'plain', 'utf-8'))
        msg_alternative.attach(MIMEText(html_body, 'html', 'utf-8'))

        # Attach QR code image if provided
        if is_approved and qr_data and session.send_qr_in_email:
            if qr_data.startswith('data:image/png;base64,'):
                img_data = base64.b64decode(qr_data.split(',')[1])
                from email.mime.image import MIMEImage
                img = MIMEImage(img_data)
                img.add_header('Content-ID', '<qrcode>')
                img.add_header('Content-Disposition', 'inline', filename='qrcode.png')
                msg.attach(img)

        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()

        return True

    except Exception as e:
        print(f"Companion registered email sending failed: {e}")
        return False


def send_password_reset_email(email, name, reset_url):
    """Send password reset email to user"""
    try:
        # Email configuration
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")

        if not all([smtp_username, smtp_password]):
            print("SMTP credentials not configured")
            return False

        # Create message
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = "إعادة تعيين كلمة المرور - ثلوثية الأعمال"

        body = f"""
        مرحباً {name},

        لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.

        اضغط على الرابط التالي لإعادة تعيين كلمة المرور:
        {reset_url}

        هذا الرابط صالح لمدة ساعة واحدة فقط.

        إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.

        فريق ثلوثية الأعمال
        """

        msg.attach(MIMEText(body, 'plain', 'utf-8'))

        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()

        return True

    except Exception as e:
        print(f"Password reset email sending failed: {e}")
        return False


def send_whatsapp_message(phone, message):
    """Send WhatsApp message (placeholder for Twilio integration)"""
    try:
        # This would integrate with Twilio WhatsApp API
        # For now, just log the message
        print(f"WhatsApp to {phone}: {message}")
        return True

    except Exception as e:
        print(f"WhatsApp sending failed: {e}")
        return False

def export_to_csv(data, filename):
    """Export data to CSV format"""
    try:
        import csv
        import io
        
        output = io.StringIO()
        writer = csv.writer(output)
        
        if data:
            # Write headers
            headers = list(data[0].keys())
            writer.writerow(headers)
            
            # Write data
            for row in data:
                writer.writerow([row[header] for header in headers])
        
        return output.getvalue()
        
    except Exception as e:
        print(f"CSV export failed: {e}")
        return ""

def validate_social_media_url(url, platform):
    """Validate social media URL format"""
    if not url:
        return True  # Empty URLs are allowed
    
    patterns = {
        'instagram': r'(https?://)?(www\.)?(instagram\.com/)',
        'snapchat': r'(https?://)?(www\.)?(snapchat\.com/add/)',
        'twitter': r'(https?://)?(www\.)?(twitter\.com/|x\.com/)'
    }
    
    pattern = patterns.get(platform.lower())
    if pattern and re.match(pattern, url, re.IGNORECASE):
        return True
    
    return False

def format_phone_number(phone):
    """Format phone number to Saudi format"""
    # Remove all non-digit characters
    clean_phone = re.sub(r'\D', '', phone)
    
    # Handle Saudi numbers
    if clean_phone.startswith('966'):
        return f"+{clean_phone}"
    elif clean_phone.startswith('05'):
        return f"+966{clean_phone[1:]}"
    elif len(clean_phone) == 9 and clean_phone.startswith('5'):
        return f"+966{clean_phone}"
    
    return f"+{clean_phone}"

def generate_session_code():
    """Generate unique session code for QR verification"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def calculate_age_from_date(birth_date):
    """Calculate age from birth date"""
    if not birth_date:
        return None
    
    today = datetime.now().date()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

def format_arabic_date(date_obj):
    """Format date in Arabic"""
    if not date_obj:
        return ""
    
    arabic_months = {
        1: "يناير", 2: "فبراير", 3: "مارس", 4: "أبريل",
        5: "مايو", 6: "يونيو", 7: "يوليو", 8: "أغسطس",
        9: "سبتمبر", 10: "أكتوبر", 11: "نوفمبر", 12: "ديسمبر"
    }
    
    arabic_days = {
        0: "الاثنين", 1: "الثلاثاء", 2: "الأربعاء", 3: "الخميس",
        4: "الجمعة", 5: "السبت", 6: "الأحد"
    }
    
    day_name = arabic_days[date_obj.weekday()]
    month_name = arabic_months[date_obj.month]
    
    return f"{day_name} {date_obj.day} {month_name} {date_obj.year}"

def sanitize_input(text):
    """Sanitize user input to prevent XSS"""
    if not text:
        return ""
    
    # Remove potentially dangerous characters
    dangerous_chars = ['<', '>', '"', "'", '&']
    for char in dangerous_chars:
        text = text.replace(char, '')
    
    return text.strip()

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def generate_invite_token():
    """Generate secure random token for invitations"""
    return secrets.token_urlsafe(32)

def send_invitation_email(email, session, token, custom_message=None):
    """Send invitation email with registration link"""
    try:
        # Email configuration
        smtp_server = os.environ.get("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.environ.get("SMTP_PORT", "587"))
        smtp_username = os.environ.get("SMTP_USERNAME", "")
        smtp_password = os.environ.get("SMTP_PASSWORD", "")
        
        if not all([smtp_username, smtp_password]):
            print("SMTP credentials not configured")
            return False
        
        # Create message
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        msg = MIMEMultipart()
        msg['From'] = smtp_username
        msg['To'] = email
        msg['Subject'] = f"دعوة خاصة - {session.title}"
        
        # Generate registration link
        registration_link = f"{os.environ.get('BASE_URL', 'https://your-domain.com')}/event/{session.slug or session.id}/register?token={token}"
        
        # Use custom message or default
        if custom_message:
            body = custom_message.replace('[رابط التسجيل]', registration_link)
        else:
            body = f"""
مرحباً،

نود دعوتك لحضور جلسة "{session.title}" في ثلوثية الأعمال.

تفاصيل الجلسة:
📅 التاريخ: {session.date.strftime('%Y-%m-%d')}
🕐 الوقت: {session.date.strftime('%H:%M')}
📍 المكان: {session.location or 'سيتم الإعلان عنه لاحقاً'}

هذه دعوة خاصة. استخدم الرابط أدناه للتسجيل:
{registration_link}

نتطلع لرؤيتك معنا!

فريق ثلوثية الأعمال
            """
        
        msg.attach(MIMEText(body, 'plain', 'utf-8'))
        
        # Send email
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_username, smtp_password)
        text = msg.as_string()
        server.sendmail(smtp_username, email, text)
        server.quit()
        
        return True
        
    except Exception as e:
        print(f"Invitation email sending failed: {e}")
        return False
