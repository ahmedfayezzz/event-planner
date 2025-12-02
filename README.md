# EventPilot

A professional event management platform for weekly networking sessions, built with Flask and designed for Arabic RTL support.

## Prerequisites

- Python 3.10+
- PostgreSQL (or SQLite for testing)
- Git

## Installation

### 1. Extract Project

```bash
# If you downloaded EventPilot.tar.gz
tar -xzf EventPilot.tar.gz
cd EventPilot
```

### 2. Create Virtual Environment

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Environment Variables

Create a `.env` file or set these variables:

```bash
# Required
export DATABASE_URL="postgresql://user:password@localhost:5432/eventpilot"
export SESSION_SECRET="your-secret-key-here"

# Optional (for full features)
export OPENAI_API_KEY="sk-..."
export SMTP_SERVER="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USERNAME="your-email@gmail.com"
export SMTP_PASSWORD="your-app-password"
```

For SQLite (simpler testing):

```bash
export DATABASE_URL="sqlite:///eventpilot.db"
```

### 5. Initialize Database

```bash
python -c "from app import app, db; app.app_context().push(); db.create_all()"
```

### 6. Run the Application

```bash
# Development
python -m flask run --host=0.0.0.0 --port=5000

# OR Production-style
gunicorn --bind 0.0.0.0:5000 --reload main:app
```

### 7. Access the App

Open browser: http://localhost:5000
