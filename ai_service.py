import json
import os
from openai import OpenAI
from models import User, Session, Registration, Attendance
from app import db
import logging

# the newest OpenAI model is "gpt-5" which was released August 7, 2025.
# do not change this unless explicitly requested by the user
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "sk-test-key")
openai = OpenAI(api_key=OPENAI_API_KEY)

def generate_professional_description(goal, activity_type=""):
    """Generate a professional Arabic description based on user's goal and activity"""
    try:
        prompt = f"""
        أنت خبير في كتابة الأوصاف المهنية باللغة العربية. 
        
        المعطيات:
        - الهدف: {goal}
        - نوع النشاط: {activity_type}
        
        اكتب وصفاً مهنياً جذاباً ومختصراً (لا يزيد عن 50 كلمة) يعكس شخصية المشارك ونشاطه التجاري.
        يجب أن يكون الوصف:
        - احترافياً ومشوقاً
        - يبرز القيمة المضافة
        - مناسباً لشبكات التواصل المهني
        - باللغة العربية الفصحى المبسطة
        
        أرجع النتيجة في تنسيق JSON بهذا الشكل:
        {"description": "الوصف المهني هنا"}
        """
        
        response = openai.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=200
        )
        
        result = json.loads(response.choices[0].message.content)
        return result.get("description", "")
        
    except Exception as e:
        logging.error(f"AI description generation failed: {e}")
        return ""

def analyze_participant_data(analysis_type):
    """Analyze participant data using AI for insights"""
    try:
        # Initialize data variable
        data = {}
        
        # Get data based on analysis type
        if analysis_type == "demographics":
            users = User.query.all()
            data = {
                "total_users": len(users),
                "activity_types": {},
                "companies": [],
                "goals": []
            }
            
            for user in users:
                if user.activity_type:
                    data["activity_types"][user.activity_type] = data["activity_types"].get(user.activity_type, 0) + 1
                if user.company_name:
                    data["companies"].append(user.company_name)
                if user.goal:
                    data["goals"].append(user.goal)
        
        elif analysis_type == "trends":
            sessions = Session.query.all()
            registrations = Registration.query.all()
            data = {
                "total_sessions": len(sessions),
                "total_registrations": len(registrations),
                "sessions_data": []
            }
            
            for session in sessions:
                data["sessions_data"].append({
                    "title": session.title,
                    "date": session.date.strftime("%Y-%m-%d"),
                    "registrations": session.get_registration_count()
                })
        
        elif analysis_type == "insights":
            attendances = Attendance.query.filter_by(attended=True).all()
            data = {
                "total_attendances": len(attendances),
                "attendance_patterns": {},
                "repeat_attendees": 0
            }
            
            # Calculate repeat attendees
            user_attendance_count = {}
            for attendance in attendances:
                user_attendance_count[attendance.user_id] = user_attendance_count.get(attendance.user_id, 0) + 1
            
            data["repeat_attendees"] = len([count for count in user_attendance_count.values() if count > 1])
        
        else:
            # Fallback for unknown analysis types
            data = {"error": f"Unknown analysis type: {analysis_type}"}
        
        # If no OpenAI API key available, return basic data analysis
        if not OPENAI_API_KEY:
            return {
                "summary": "تحليل البيانات الأساسي",
                "key_insights": ["البيانات متوفرة للمراجعة"],
                "recommendations": ["تفعيل خدمة الذكاء الاصطناعي للحصول على تحليل أعمق"],
                "metrics": data,
                "raw_data": data
            }
        
        # Generate AI analysis
        prompt = f"""
        أنت محلل بيانات خبير. حلل البيانات التالية واستخرج رؤى مفيدة باللغة العربية:
        
        نوع التحليل: {analysis_type}
        البيانات: {json.dumps(data, ensure_ascii=False)}
        
        قدم تحليلاً شاملاً يتضمن:
        1. الملاحظات الرئيسية
        2. الاتجاهات والأنماط
        3. التوصيات للتحسين
        4. نقاط القوة والضعف
        
        أرجع النتيجة في تنسيق JSON بهذا الشكل:
        {{
            "summary": "ملخص عام",
            "key_insights": ["نقطة 1", "نقطة 2", "نقطة 3"],
            "recommendations": ["توصية 1", "توصية 2", "توصية 3"],
            "metrics": {{"metric1": value1, "metric2": value2}}
        }}
        """
        
        response = openai.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_tokens=1000
        )
        
        # Safely parse the JSON response
        content = response.choices[0].message.content
        if content:
            result = json.loads(content)
            result["raw_data"] = data
            return result
        else:
            raise ValueError("Empty response from AI service")
        
    except Exception as e:
        logging.error(f"AI analysis failed: {e}")
        # Return fallback data structure
        return {
            "summary": "حدث خطأ في تحليل البيانات",
            "key_insights": ["يرجى المحاولة مرة أخرى لاحقاً"],
            "recommendations": ["التحقق من اتصال الإنترنت وإعدادات الذكاء الاصطناعي"],
            "metrics": data if 'data' in locals() else {},
            "raw_data": data if 'data' in locals() else {},
            "error": str(e)
        }

def search_participants(query):
    """Intelligent search through participant data using natural language"""
    try:
        # Get all users data
        users = User.query.all()
        users_data = []
        
        for user in users:
            user_info = {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "company": user.company_name or "",
                "position": user.position or "",
                "activity": user.activity_type or "",
                "goal": user.goal or "",
                "attendance_count": user.get_attendance_count()
            }
            users_data.append(user_info)
        
        prompt = f"""
        أنت محرك بحث ذكي للمشاركين. استخدم الاستعلام التالي للبحث في بيانات المشاركين:
        
        الاستعلام: {query}
        بيانات المشاركين: {json.dumps(users_data, ensure_ascii=False)[:3000]}
        
        ابحث وأرجع المشاركين الذين يطابقون الاستعلام. يمكن أن يكون البحث عن:
        - الأسماء أو الشركات
        - أنواع الأنشطة
        - الأهداف أو المهارات
        - عدد مرات الحضور
        - أي معايير أخرى ذات صلة
        
        أرجع النتيجة في تنسيق JSON بهذا الشكل:
        {{
            "matches": [
                {{"id": user_id, "name": "اسم المشارك", "reason": "سبب المطابقة", "relevance": score_0_to_1}}
            ],
            "search_summary": "ملخص نتائج البحث"
        }}
        """
        
        response = openai.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=1000
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        logging.error(f"AI search failed: {e}")
        return {"matches": [], "search_summary": "فشل في البحث"}

def generate_session_insights(session_id):
    """Generate AI insights for a specific session"""
    try:
        session = Session.query.get(session_id)
        if not session:
            return None
        
        registrations = Registration.query.filter_by(session_id=session_id).all()
        attendances = Attendance.query.filter_by(session_id=session_id).all()
        
        session_data = {
            "title": session.title,
            "date": session.date.strftime("%Y-%m-%d"),
            "total_registrations": len(registrations),
            "total_attendances": len([a for a in attendances if a.attended]),
            "participant_types": {},
            "goals": []
        }
        
        for reg in registrations:
            user = reg.user
            if user.activity_type:
                session_data["participant_types"][user.activity_type] = session_data["participant_types"].get(user.activity_type, 0) + 1
            if user.goal:
                session_data["goals"].append(user.goal)
        
        prompt = f"""
        حلل بيانات الجلسة التالية واستخرج رؤى مفيدة:
        
        بيانات الجلسة: {json.dumps(session_data, ensure_ascii=False)}
        
        قدم تحليلاً يتضمن:
        1. تقييم نجاح الجلسة
        2. تنوع المشاركين
        3. معدل الحضور
        4. توصيات للجلسات القادمة
        
        أرجع النتيجة في تنسيق JSON باللغة العربية.
        """
        
        response = openai.chat.completions.create(
            model="gpt-5",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            max_completion_tokens=800
        )
        
        return json.loads(response.choices[0].message.content)
        
    except Exception as e:
        logging.error(f"Session insights generation failed: {e}")
        return None
