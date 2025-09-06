#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script to create sample data for ثلوثية الأعمال (Business Tuesdays Platform)
This will populate the database with realistic test data for demonstration purposes
"""

from app import app, db
from models import User, Session, Registration, Attendance
from datetime import datetime, timedelta
import random

def create_sample_data():
    """Create sample data for testing and demonstration"""
    
    with app.app_context():
        print("🔄 إنشاء بيانات تجريبية لمنصة ثلوثية الأعمال...")
        
        # Sample users with Arabic names and realistic data
        sample_users = [
            {
                'name': 'أحمد محمد السعيد',
                'email': 'ahmed.mohammed@example.com',
                'phone': '+966501234567',
                'instagram': 'ahmed_business',
                'company_name': 'شركة السعيد للتقنية',
                'position': 'مدير عام',
                'activity_type': 'التقنية والبرمجة',
                'goal': 'تطوير تطبيقات ذكية للشركات السعودية وتوسيع شبكة العلاقات التجارية'
            },
            {
                'name': 'فاطمة عبدالله النور',
                'email': 'fatima.nour@example.com', 
                'phone': '+966502345678',
                'instagram': 'fatima_entrepreneur',
                'snapchat': 'fatima_biz',
                'company_name': 'مؤسسة النور للاستشارات',
                'position': 'مؤسسة ومديرة تنفيذية',
                'activity_type': 'الاستشارات الإدارية',
                'goal': 'مساعدة الشركات الناشئة على النمو وتحقيق أهدافها التجارية'
            },
            {
                'name': 'خالد عبدالعزيز الرشيد',
                'email': 'khalid.rashid@example.com',
                'phone': '+966503456789',
                'twitter': 'khalid_marketer',
                'instagram': 'khalid_digital',
                'company_name': 'وكالة الرشيد الرقمية',
                'position': 'خبير تسويق رقمي',
                'activity_type': 'التسويق الرقمي',
                'goal': 'بناء علامات تجارية قوية في العالم الرقمي وزيادة المبيعات'
            },
            {
                'name': 'نورا سالم الحربي',
                'email': 'nora.harbi@example.com',
                'phone': '+966504567890',
                'instagram': 'nora_finance',
                'company_name': 'مكتب الحربي المالي',
                'position': 'مستشارة مالية',
                'activity_type': 'الاستشارات المالية',
                'goal': 'تقديم حلول مالية مبتكرة للأفراد والشركات'
            },
            {
                'name': 'محمد صالح العثمان',
                'email': 'mohammed.othman@example.com',
                'phone': '+966505678901',
                'instagram': 'mohammed_ecommerce',
                'snapchat': 'mo_business',
                'company_name': 'متجر العثمان الإلكتروني',
                'position': 'مؤسس',
                'activity_type': 'التجارة الإلكترونية',
                'goal': 'تطوير منصات تجارية إلكترونية تخدم السوق السعودي'
            },
            {
                'name': 'ريم أحمد القحطاني',
                'email': 'reem.qahtani@example.com',
                'phone': '+966506789012',
                'instagram': 'reem_content',
                'twitter': 'reem_creator',
                'company_name': 'استوديو القحطاني الإبداعي',
                'position': 'مديرة إبداعية',
                'activity_type': 'إنتاج المحتوى',
                'goal': 'إنتاج محتوى عربي عالي الجودة يلهم جيل المؤثرين'
            },
            {
                'name': 'عبدالرحمن طلال الشهري',
                'email': 'abdulrahman.shehri@example.com',
                'phone': '+966507890123',
                'instagram': 'abdulrahman_real_estate',
                'company_name': 'مجموعة الشهري العقارية',
                'position': 'مطور عقاري',
                'activity_type': 'التطوير العقاري',
                'goal': 'تطوير مشاريع عقارية مبتكرة تواكب رؤية المملكة 2030'
            },
            {
                'name': 'سارة عبدالله المطيري',
                'email': 'sara.mutairi@example.com',
                'phone': '+966508901234',
                'instagram': 'sara_wellness',
                'company_name': 'مركز المطيري للصحة',
                'position': 'أخصائية تغذية',
                'activity_type': 'الصحة واللياقة',
                'goal': 'نشر الوعي الصحي وتقديم برامج تغذية متخصصة'
            },
            {
                'name': 'يوسف مشعل الدوسري',
                'email': 'yousef.dosari@example.com',
                'phone': '+966509012345',
                'twitter': 'yousef_coach',
                'instagram': 'yousef_leadership',
                'company_name': 'أكاديمية الدوسري للقيادة',
                'position': 'مدرب قيادة',
                'activity_type': 'التدريب والتطوير',
                'goal': 'تطوير قادة المستقبل في المملكة العربية السعودية'
            },
            {
                'name': 'هند فهد العنزي',
                'email': 'hind.anezi@example.com',
                'phone': '+966510123456',
                'instagram': 'hind_fashion',
                'snapchat': 'hind_style',
                'company_name': 'دار العنزي للأزياء',
                'position': 'مصممة أزياء',
                'activity_type': 'تصميم الأزياء',
                'goal': 'إحياء التراث السعودي من خلال تصاميم عصرية مبتكرة'
            }
        ]
        
        # Create users
        users = []
        for user_data in sample_users:
            # Generate username from name
            name_parts = user_data['name'].split()
            username = f"{name_parts[0]}_{name_parts[1]}_{random.randint(100, 999)}"
            
            user = User(
                name=user_data['name'],
                username=username,
                email=user_data['email'],
                phone=user_data['phone'],
                instagram=user_data.get('instagram'),
                snapchat=user_data.get('snapchat'),
                twitter=user_data.get('twitter'),
                company_name=user_data['company_name'],
                position=user_data['position'],
                activity_type=user_data['activity_type'],
                goal=user_data['goal'],
                ai_description=f"خبير في مجال {user_data['activity_type']} مع خبرة واسعة في {user_data['position'].lower()}. يسعى لتحقيق أهداف طموحة في السوق السعودي.",
                created_at=datetime.utcnow() - timedelta(days=random.randint(1, 30))
            )
            users.append(user)
            db.session.add(user)
        
        # Create sample sessions
        sessions_data = [
            {
                'session_number': 1,
                'title': 'التجمع التأسيسي - بناء شبكة المؤثرين',
                'description': 'أول تجمع لمؤسسي ثلوثية الأعمال لوضع الأسس ومناقشة الرؤية والأهداف',
                'date': datetime.utcnow() - timedelta(days=21),
                'guest_name': 'المهندس عبدالعزيز الراجحي',
                'guest_profile': 'رائد أعمال ومؤسس عدة شركات ناجحة',
                'location': 'فندق الفور سيزونز - الرياض',
                'status': 'completed'
            },
            {
                'session_number': 2,
                'title': 'ريادة الأعمال في العصر الرقمي',
                'description': 'مناقشة التحولات الرقمية وتأثيرها على ريادة الأعمال والاستثمار',
                'date': datetime.utcnow() - timedelta(days=14),
                'guest_name': 'المهندسة نورا الغامدي',
                'guest_profile': 'رئيسة تنفيذية لشركة تقنية ناشئة',
                'location': 'مركز الملك عبدالعزيز للحوار الوطني',
                'status': 'completed'
            },
            {
                'session_number': 3,
                'title': 'التسويق الرقمي والوصول للعملاء',
                'description': 'استراتيجيات التسويق الحديثة وكيفية بناء علاقات قوية مع العملاء',
                'date': datetime.utcnow() - timedelta(days=7),
                'guest_name': 'الأستاذ خالد العمري',
                'guest_profile': 'خبير تسويق رقمي ومؤلف كتاب "التسويق بالذكاء"',
                'location': 'قاعة الأمير سلطان - جامعة الملك سعود',
                'status': 'completed'
            },
            {
                'session_number': 4,
                'title': 'الاستثمار والتمويل للشركات الناشئة',
                'description': 'كيفية الحصول على التمويل وجذب المستثمرين للمشاريع الناشئة',
                'date': datetime.utcnow() + timedelta(days=7),
                'guest_name': 'الدكتور أحمد المالكي',
                'guest_profile': 'خبير في الاستثمار ومدير صندوق رؤية الأعمال',
                'location': 'مركز الرياض الدولي للمؤتمرات والمعارض',
                'status': 'open'
            },
            {
                'session_number': 5,
                'title': 'القيادة والإدارة في المؤسسات الحديثة',
                'description': 'تطوير مهارات القيادة وإدارة الفرق في بيئة العمل المعاصرة',
                'date': datetime.utcnow() + timedelta(days=14),
                'guest_name': 'الدكتورة ريم الشمري',
                'guest_profile': 'استشارية قيادة ومدربة معتمدة دولياً',
                'location': 'فندق الريتز كارلتون - الرياض',
                'status': 'open'
            },
            {
                'session_number': 6,
                'title': 'الابتكار والتطوير المستدام',
                'description': 'كيفية تطوير حلول مبتكرة تساهم في التنمية المستدامة',
                'date': datetime.utcnow() + timedelta(days=21),
                'guest_name': 'المهندس فهد الشهراني',
                'guest_profile': 'مدير الابتكار في أرامكو السعودية',
                'location': 'واحة الملك سلمان للعلوم',
                'status': 'open'
            }
        ]
        
        # Create sessions
        sessions = []
        for session_data in sessions_data:
            session = Session(
                session_number=session_data['session_number'],
                title=session_data['title'],
                description=session_data['description'],
                date=session_data['date'],
                guest_name=session_data['guest_name'],
                guest_profile=session_data['guest_profile'],
                location=session_data['location'],
                status=session_data['status'],
                max_participants=random.randint(40, 60)
            )
            sessions.append(session)
            db.session.add(session)
        
        # Commit users and sessions first
        db.session.commit()
        print(f"✅ تم إنشاء {len(users)} مشارك و {len(sessions)} جلسة")
        
        # Create registrations and attendances
        total_registrations = 0
        total_attendances = 0
        
        for session in sessions:
            # Randomly register users for each session
            num_registrants = random.randint(5, min(len(users), session.max_participants))
            selected_users = random.sample(users, num_registrants)
            
            for user in selected_users:
                registration = Registration(
                    user_id=user.id,
                    session_id=session.id,
                    registered_at=session.date - timedelta(days=random.randint(1, 14)),
                    is_approved=True
                )
                db.session.add(registration)
                total_registrations += 1
                
                # Create attendance for completed sessions
                if session.status == 'completed':
                    # 80% attendance rate on average
                    attended = random.random() < 0.8
                    
                    attendance = Attendance(
                        user_id=user.id,
                        session_id=session.id,
                        attended=attended,
                        check_in_time=session.date + timedelta(minutes=random.randint(-10, 30)) if attended else None,
                        qr_verified=attended
                    )
                    db.session.add(attendance)
                    
                    if attended:
                        total_attendances += 1
        
        # Commit all registrations and attendances
        db.session.commit()
        
        print(f"✅ تم إنشاء {total_registrations} تسجيل و {total_attendances} حضور")
        print("🎉 تم إكمال إنشاء البيانات التجريبية بنجاح!")
        
        # Display summary
        print("\n📊 ملخص البيانات المنشأة:")
        print(f"👥 إجمالي المشاركين: {len(users)}")
        print(f"📅 إجمالي الجلسات: {len(sessions)}")
        print(f"✅ الجلسات المكتملة: {sum(1 for s in sessions if s.status == 'completed')}")
        print(f"🔄 الجلسات المفتوحة: {sum(1 for s in sessions if s.status == 'open')}")
        print(f"📝 إجمالي التسجيلات: {total_registrations}")
        print(f"🎯 إجمالي الحضور: {total_attendances}")
        print(f"📈 معدل الحضور: {(total_attendances / total_registrations * 100):.1f}%")

if __name__ == '__main__':
    create_sample_data()