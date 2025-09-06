# Business Tuesdays Platform (ثلوثية الأعمال)

## Overview

Business Tuesdays Platform is a weekly networking platform designed specifically for Arabic-speaking influencers and business owners. The platform facilitates weekly Tuesday gatherings aimed at building professional relationships, business opportunities, and meaningful collaborations. The system handles user registration, session management, attendance tracking, and provides AI-powered insights for better community engagement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: Flask with Jinja2 templating engine
- **UI Framework**: Bootstrap 5 RTL for Arabic language support
- **Styling**: Custom CSS with Arabic fonts (Cairo font family)
- **JavaScript**: Vanilla JavaScript with Chart.js for analytics visualization
- **Responsive Design**: Mobile-first approach with RTL support for Arabic interface

### Backend Architecture
- **Framework**: Flask (Python web framework)
- **Database ORM**: SQLAlchemy with Flask-SQLAlchemy integration
- **Authentication**: Flask-Login for admin session management
- **File Structure**: Modular design separating models, routes, and utilities
- **API Design**: RESTful endpoints for analytics and data export

### Data Models
- **User Model**: Stores participant information including social media profiles, company details, and goals
- **Session Model**: Manages Tuesday gathering sessions with titles, dates, and capacity limits
- **Registration Model**: Links users to specific sessions they've registered for
- **Attendance Model**: Tracks actual attendance at sessions for analytics
- **Admin Model**: Handles administrative user authentication

### AI Integration
- **AI Service**: OpenAI GPT-5 integration for generating professional Arabic descriptions
- **Smart Analytics**: AI-powered participant data analysis and insights
- **Natural Language Processing**: Arabic language processing for goal analysis and description generation

### Authentication & Authorization
- **Admin Authentication**: Flask-Login based session management
- **User Registration**: Public registration without authentication required
- **Session Management**: Secure admin panel access with username/password authentication

### Core Features
- **QR Code Generation**: Automated QR code creation for participant check-ins
- **Email Integration**: Confirmation emails for registrations
- **Analytics Dashboard**: Real-time statistics and AI-powered insights
- **Export Functionality**: CSV export capabilities for user and session data
- **Multilingual Support**: Arabic-first design with RTL layout support

## External Dependencies

### AI Services
- **OpenAI API**: GPT-5 model integration for Arabic text generation and participant data analysis
- **API Key Management**: Environment-based configuration for OpenAI API access

### Database
- **SQLite**: Default development database (configured for easy migration to PostgreSQL)
- **SQLAlchemy**: Database abstraction layer supporting multiple database backends

### Frontend Libraries
- **Bootstrap 5 RTL**: Arabic/RTL layout framework
- **Font Awesome**: Icon library for UI elements
- **Chart.js**: Data visualization for analytics dashboard
- **Google Fonts**: Cairo font family for Arabic typography

### Email Services
- **SMTP Integration**: Email sending capabilities for registration confirmations
- **Environment Configuration**: Configurable email service integration

### Development Tools
- **Flask Debug Mode**: Development environment configuration
- **Logging**: Built-in Python logging for error tracking and debugging
- **Environment Variables**: Configuration management for sensitive data

### Deployment Considerations
- **WSGI**: Flask application ready for production deployment
- **ProxyFix**: Reverse proxy support for production environments
- **Database Migration**: SQLAlchemy schema management for production deployment