# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EventPilot is a professional event management platform for weekly networking sessions ("Business Tuesdays"). It's a full-stack Flask web application with Arabic RTL support and OpenAI integration.

## Commands

### Development
```bash
# Install dependencies
uv sync

# Run development server (http://localhost:5000)
python main.py

# Create sample data for testing
python create_sample_data.py
```

### Production
```bash
gunicorn --bind 0.0.0.0:5000 main:app
```

### No Test Framework
This project does not have a test suite configured.

## Architecture

**Entry Points:**
- `main.py` - Application entry point, runs Flask dev server
- `app.py` - Flask app initialization, database configuration, SQLAlchemy setup

**Core Modules:**
- `routes.py` - All HTTP endpoints (public, user, admin, API)
- `models.py` - SQLAlchemy models: User, Session, Registration, Attendance, Admin, Invite, AIAnalytics
- `ai_service.py` - OpenAI integration for Arabic text generation and analytics
- `utils.py` - Helper functions (email, QR codes, validation)

**Frontend:**
- `templates/` - Jinja2 templates with `templates/admin/` for admin panel
- `static/css/style.css` - RTL Arabic styling with CSS variables
- `static/js/` - Vanilla JavaScript (main.js, analytics.js, qr-scanner.js)

## Key Routes

| Path | Purpose |
|------|---------|
| `/` | Homepage with countdown |
| `/register` | User registration |
| `/user/login` | Login via email+phone |
| `/session/<id>` | Session details |
| `/admin/login` | Admin panel (default: admin/admin123) |
| `/api/analytics/*` | AI-powered analytics endpoints |

## Environment Variables

```bash
SESSION_SECRET=<secret-key>
DATABASE_URL=postgresql://...  # Default: sqlite:///business_tuesdays.db
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...          # Resend API key for email sending
FROM_EMAIL=noreply@yourdomain.com  # Verified sender email in Resend
BASE_URL=https://yourdomain.com    # Base URL for email links
```

## Important Conventions

- **Language:** Arabic-first UI with RTL layout (Bootstrap 5 RTL, Cairo font)
- **Auth:** Flask-Login for admin; simple email+phone for users (no passwords)
- **Database:** Tables auto-created via `db.create_all()` on startup
- **AI:** GPT-5 for generating Arabic professional descriptions from user goals

## Feature Documentation

See `guide.txt` (Arabic) or `guide_en.md` (English) for detailed feature requirements.
