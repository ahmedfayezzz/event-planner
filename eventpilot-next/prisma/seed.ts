import { PrismaClient, User, Session, EventCatering } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database with production-like data...\n");

  const defaultPassword = await bcrypt.hash("password123", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  // ============== SUPER ADMIN USER ==============
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@eventpilot.com" },
    update: {
      role: "SUPER_ADMIN",
      // Super Admin has all permissions by default (the code handles this)
      canAccessDashboard: true,
      canAccessSessions: true,
      canAccessUsers: true,
      canAccessHosts: true,
      canAccessAnalytics: true,
      canAccessCheckin: true,
      canAccessSettings: true,
    },
    create: {
      name: "مدير النظام الرئيسي",
      username: "admin",
      email: "admin@eventpilot.com",
      phone: "+966500000000",
      passwordHash: adminPassword,
      role: "SUPER_ADMIN",
      isActive: true,
      companyName: "ثلوثية الأعمال",
      position: "مدير النظام الرئيسي",
      // Super Admin has all permissions by default
      canAccessDashboard: true,
      canAccessSessions: true,
      canAccessUsers: true,
      canAccessHosts: true,
      canAccessAnalytics: true,
      canAccessCheckin: true,
      canAccessSettings: true,
    },
  });
  console.log(`✅ Created super admin: ${superAdmin.email}`);

  // ============== REGULAR ADMIN USER (for testing permissions) ==============
  const regularAdmin = await prisma.user.upsert({
    where: { email: "moderator@eventpilot.com" },
    update: {
      role: "ADMIN",
      canAccessDashboard: true,
      canAccessSessions: true,
      canAccessCheckin: true,
      // Limited access - no users, hosts, analytics, or settings
      canAccessUsers: false,
      canAccessHosts: false,
      canAccessAnalytics: false,
      canAccessSettings: false,
    },
    create: {
      name: "مشرف الأحداث",
      username: "moderator",
      email: "moderator@eventpilot.com",
      phone: "+966500000001",
      passwordHash: adminPassword,
      role: "ADMIN",
      isActive: true,
      companyName: "ثلوثية الأعمال",
      position: "مشرف أحداث",
      // Limited permissions - only dashboard, sessions, and checkin
      canAccessDashboard: true,
      canAccessSessions: true,
      canAccessUsers: false,
      canAccessHosts: false,
      canAccessAnalytics: false,
      canAccessCheckin: true,
      canAccessSettings: false,
    },
  });
  console.log(`✅ Created admin (limited): ${regularAdmin.email}`);

  // ============== SAMPLE USERS ==============
  const usersData = [
    {
      name: "أحمد محمد السعيد",
      username: "ahmed_saeed",
      email: "ahmed.saeed@example.com",
      phone: "+966501234567",
      instagram: "ahmed_business",
      companyName: "شركة السعيد للتقنية",
      position: "مدير عام",
      activityType: "التقنية والبرمجة",
      gender: "male",
      goal: "تطوير تطبيقات ذكية للشركات السعودية وتوسيع شبكة العلاقات التجارية",
      aiDescription: "رائد أعمال متخصص في مجال التقنية مع خبرة تتجاوز 10 سنوات في تطوير الحلول الرقمية للمؤسسات الكبرى.",
      wantsToHost: true,
      hostingTypes: ["dinner", "beverage"],
    },
    {
      name: "فاطمة عبدالله النور",
      username: "fatima_noor",
      email: "fatima.noor@example.com",
      phone: "+966502345678",
      instagram: "fatima_entrepreneur",
      snapchat: "fatima_biz",
      companyName: "مؤسسة النور للاستشارات",
      position: "مؤسسة ومديرة تنفيذية",
      activityType: "الاستشارات الإدارية",
      gender: "female",
      goal: "مساعدة الشركات الناشئة على النمو وتحقيق أهدافها التجارية",
      aiDescription: "مستشارة إدارية متميزة تساعد الشركات الناشئة في بناء استراتيجيات نمو فعالة.",
      wantsToHost: true,
      hostingTypes: ["dessert", "beverage"],
    },
    {
      name: "خالد عبدالعزيز الرشيد",
      username: "khalid_rashid",
      email: "khalid.rashid@example.com",
      phone: "+966503456789",
      twitter: "khalid_marketer",
      instagram: "khalid_digital",
      companyName: "وكالة الرشيد الرقمية",
      position: "خبير تسويق رقمي",
      activityType: "التسويق الرقمي",
      gender: "male",
      goal: "بناء علامات تجارية قوية في العالم الرقمي وزيادة المبيعات",
      aiDescription: "خبير في التسويق الرقمي وصناعة المحتوى مع سجل حافل في إدارة حملات إعلانية ناجحة.",
    },
    {
      name: "نورا سالم الحربي",
      username: "nora_harbi",
      email: "nora.harbi@example.com",
      phone: "+966504567890",
      instagram: "nora_finance",
      companyName: "مكتب الحربي المالي",
      position: "مستشارة مالية",
      activityType: "الاستشارات المالية",
      gender: "female",
      goal: "تقديم حلول مالية مبتكرة للأفراد والشركات",
      aiDescription: "مستشارة مالية معتمدة تساعد العملاء في التخطيط المالي والاستثماري.",
    },
    {
      name: "محمد صالح العثمان",
      username: "mohammed_othman",
      email: "mohammed.othman@example.com",
      phone: "+966505678901",
      instagram: "mohammed_ecommerce",
      snapchat: "mo_business",
      companyName: "متجر العثمان الإلكتروني",
      position: "مؤسس",
      activityType: "التجارة الإلكترونية",
      gender: "male",
      goal: "تطوير منصات تجارية إلكترونية تخدم السوق السعودي",
      aiDescription: "رائد في التجارة الإلكترونية مع خبرة واسعة في إدارة المتاجر الرقمية.",
    },
    {
      name: "ريم أحمد القحطاني",
      username: "reem_qahtani",
      email: "reem.qahtani@example.com",
      phone: "+966506789012",
      instagram: "reem_content",
      twitter: "reem_creator",
      companyName: "استوديو القحطاني الإبداعي",
      position: "مديرة إبداعية",
      activityType: "إنتاج المحتوى",
      gender: "female",
      goal: "إنتاج محتوى عربي عالي الجودة يلهم جيل المؤثرين",
      aiDescription: "مديرة إبداعية متخصصة في إنتاج محتوى بصري مبتكر للعلامات التجارية.",
    },
    {
      name: "عبدالرحمن طلال الشهري",
      username: "abdulrahman_shehri",
      email: "abdulrahman.shehri@example.com",
      phone: "+966507890123",
      instagram: "abdulrahman_realestate",
      companyName: "مجموعة الشهري العقارية",
      position: "مطور عقاري",
      activityType: "التطوير العقاري",
      gender: "male",
      goal: "تطوير مشاريع عقارية مبتكرة تواكب رؤية المملكة 2030",
      aiDescription: "مطور عقاري يعمل على مشاريع سكنية وتجارية كبرى في المملكة.",
    },
    {
      name: "سارة عبدالله المطيري",
      username: "sara_mutairi",
      email: "sara.mutairi@example.com",
      phone: "+966508901234",
      instagram: "sara_wellness",
      companyName: "مركز المطيري للصحة",
      position: "أخصائية تغذية",
      activityType: "الصحة واللياقة",
      gender: "female",
      goal: "نشر الوعي الصحي وتقديم برامج تغذية متخصصة",
      aiDescription: "أخصائية تغذية معتمدة تساعد الأفراد على تبني نمط حياة صحي.",
    },
    {
      name: "يوسف مشعل الدوسري",
      username: "yousef_dosari",
      email: "yousef.dosari@example.com",
      phone: "+966509012345",
      twitter: "yousef_coach",
      instagram: "yousef_leadership",
      companyName: "أكاديمية الدوسري للقيادة",
      position: "مدرب قيادة",
      activityType: "التدريب والتطوير",
      gender: "male",
      goal: "تطوير قادة المستقبل في المملكة العربية السعودية",
      aiDescription: "مدرب قيادة معتمد دولياً مع خبرة في تطوير القدرات القيادية.",
    },
    {
      name: "هند فهد العنزي",
      username: "hind_anezi",
      email: "hind.anezi@example.com",
      phone: "+966510123456",
      instagram: "hind_fashion",
      snapchat: "hind_style",
      companyName: "دار العنزي للأزياء",
      position: "مصممة أزياء",
      activityType: "تصميم الأزياء",
      gender: "female",
      goal: "إحياء التراث السعودي من خلال تصاميم عصرية مبتكرة",
      aiDescription: "مصممة أزياء مبدعة تمزج بين التراث السعودي والأناقة العصرية.",
    },
    {
      name: "عبدالله سعود الغامدي",
      username: "abdullah_ghamdi",
      email: "abdullah.ghamdi@example.com",
      phone: "+966511234567",
      instagram: "abdullah_tech",
      companyName: "شركة الغامدي للحلول التقنية",
      position: "مدير تقنية المعلومات",
      activityType: "تقنية المعلومات",
      gender: "male",
      goal: "تقديم حلول تقنية متكاملة للشركات",
      aiDescription: "خبير في تقنية المعلومات مع تخصص في الأمن السيبراني والبنية التحتية.",
    },
    {
      name: "منال عادل الزهراني",
      username: "manal_zahrani",
      email: "manal.zahrani@example.com",
      phone: "+966512345678",
      instagram: "manal_hr",
      companyName: "شركة الزهراني للموارد البشرية",
      position: "مديرة موارد بشرية",
      activityType: "الموارد البشرية",
      gender: "female",
      goal: "تطوير بيئات عمل محفزة وجاذبة للمواهب",
      aiDescription: "متخصصة في إدارة الموارد البشرية وتطوير الكفاءات.",
    },
    {
      name: "فيصل ناصر البقمي",
      username: "faisal_bugami",
      email: "faisal.bugami@example.com",
      phone: "+966513456789",
      twitter: "faisal_investor",
      companyName: "صندوق البقمي الاستثماري",
      position: "مستثمر",
      activityType: "الاستثمار",
      gender: "male",
      goal: "دعم رواد الأعمال والشركات الناشئة الواعدة",
      aiDescription: "مستثمر ملائكي يدعم الشركات الناشئة في مراحلها الأولى.",
    },
    {
      name: "لمى حسن العمري",
      username: "lama_amri",
      email: "lama.amri@example.com",
      phone: "+966514567890",
      instagram: "lama_events",
      companyName: "شركة العمري لتنظيم الفعاليات",
      position: "مديرة فعاليات",
      activityType: "تنظيم الفعاليات",
      gender: "female",
      goal: "تنظيم فعاليات استثنائية تترك أثراً إيجابياً",
      aiDescription: "منظمة فعاليات محترفة مع خبرة في إدارة المؤتمرات والمعارض الكبرى.",
    },
    {
      name: "سلطان محمد الشمري",
      username: "sultan_shamri",
      email: "sultan.shamri@example.com",
      phone: "+966515678901",
      instagram: "sultan_food",
      companyName: "مجموعة الشمري للمطاعم",
      position: "مؤسس ومدير",
      activityType: "قطاع المطاعم",
      gender: "male",
      goal: "توسيع سلسلة المطاعم في المملكة والخليج",
      aiDescription: "رائد أعمال في قطاع الضيافة مع سلسلة مطاعم ناجحة.",
      wantsToHost: true,
      hostingTypes: ["dinner", "beverage", "dessert"],
    },
    {
      name: "دانة خالد النصار",
      username: "dana_nassar",
      email: "dana.nassar@example.com",
      phone: "+966516789012",
      instagram: "dana_media",
      twitter: "dana_pr",
      companyName: "وكالة النصار للعلاقات العامة",
      position: "مديرة علاقات عامة",
      activityType: "العلاقات العامة",
      gender: "female",
      goal: "بناء صورة ذهنية إيجابية للعلامات التجارية",
      aiDescription: "خبيرة في العلاقات العامة والتواصل المؤسسي مع خبرة إقليمية.",
    },
    {
      name: "بدر عبدالرحمن السبيعي",
      username: "badr_subaie",
      email: "badr.subaie@example.com",
      phone: "+966517890123",
      instagram: "badr_legal",
      companyName: "مكتب السبيعي للمحاماة",
      position: "محامي ومستشار قانوني",
      activityType: "الاستشارات القانونية",
      gender: "male",
      goal: "تقديم خدمات قانونية متميزة للشركات ورواد الأعمال",
      aiDescription: "محامي متخصص في قانون الشركات والعقود التجارية.",
    },
    {
      name: "نوف سعد الحربي",
      username: "nouf_harbi",
      email: "nouf.harbi@example.com",
      phone: "+966518901234",
      instagram: "nouf_design",
      companyName: "استوديو الحربي للتصميم الداخلي",
      position: "مصممة داخلية",
      activityType: "التصميم الداخلي",
      gender: "female",
      goal: "خلق مساحات معمارية ملهمة وعملية",
      aiDescription: "مصممة داخلية مبدعة تجمع بين الجمال والوظيفية في تصاميمها.",
    },
    {
      name: "راشد فهد المالكي",
      username: "rashed_malki",
      email: "rashed.malki@example.com",
      phone: "+966519012345",
      twitter: "rashed_logistics",
      companyName: "شركة المالكي للخدمات اللوجستية",
      position: "مدير عمليات",
      activityType: "الخدمات اللوجستية",
      gender: "male",
      goal: "تطوير حلول لوجستية مبتكرة للتجارة الإلكترونية",
      aiDescription: "متخصص في إدارة سلاسل الإمداد والعمليات اللوجستية.",
    },
    {
      name: "ريما عبدالله القرني",
      username: "rima_qarni",
      email: "rima.qarni@example.com",
      phone: "+966520123456",
      instagram: "rima_edu",
      companyName: "أكاديمية القرني التعليمية",
      position: "مؤسسة ومديرة",
      activityType: "التعليم والتدريب",
      gender: "female",
      goal: "تقديم برامج تعليمية مبتكرة للأطفال",
      aiDescription: "رائدة في مجال التعليم مع شغف بتطوير أساليب التعلم الحديثة.",
    },
  ];

  const users: User[] = [];
  for (const userData of usersData) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        passwordHash: defaultPassword,
        role: "USER",
        isActive: true,
        isApproved: true,
      },
    });
    users.push(user);
  }
  console.log(`✅ Created ${users.length} users`);

  // ============== SESSIONS ==============
  const now = new Date();

  const sessionsData = [
    // Completed sessions (past)
    {
      sessionNumber: 1,
      title: "التجمع التأسيسي - بناء شبكة المؤثرين",
      description: "أول تجمع لمؤسسي ثلوثية الأعمال لوضع الأسس ومناقشة الرؤية والأهداف. جلسة تاريخية شهدت انطلاقة مجتمع رواد الأعمال.",
      date: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      guestName: "المهندس عبدالعزيز الراجحي",
      guestProfile: "رائد أعمال ومؤسس عدة شركات ناجحة في مجال التقنية",
      location: "فندق الفور سيزونز - الرياض",
      locationUrl: "https://maps.google.com/?q=Four+Seasons+Hotel+Riyadh",
      status: "completed",
      maxParticipants: 40,
      maxCompanions: 3,
    },
    {
      sessionNumber: 2,
      title: "ريادة الأعمال في العصر الرقمي",
      description: "مناقشة التحولات الرقمية وتأثيرها على ريادة الأعمال والاستثمار. تعرف على أحدث التوجهات في عالم التقنية.",
      date: new Date(now.getTime() - 75 * 24 * 60 * 60 * 1000), // 75 days ago
      guestName: "المهندسة نورا الغامدي",
      guestProfile: "رئيسة تنفيذية لشركة تقنية ناشئة حققت نمواً بنسبة 300%",
      location: "مركز الملك عبدالعزيز للحوار الوطني",
      locationUrl: "https://maps.google.com/?q=King+Abdulaziz+Center+for+National+Dialogue+Riyadh",
      status: "completed",
      maxParticipants: 50,
      maxCompanions: 5,
    },
    {
      sessionNumber: 3,
      title: "التسويق الرقمي والوصول للعملاء",
      description: "استراتيجيات التسويق الحديثة وكيفية بناء علاقات قوية مع العملاء في عالم رقمي متسارع.",
      date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
      guestName: "الأستاذ خالد العمري",
      guestProfile: "خبير تسويق رقمي ومؤلف كتاب 'التسويق بالذكاء'",
      location: "قاعة الأمير سلطان - جامعة الملك سعود",
      status: "completed",
      maxParticipants: 45,
      maxCompanions: 2,
    },
    {
      sessionNumber: 4,
      title: "الاستثمار والتمويل للشركات الناشئة",
      description: "كيفية الحصول على التمويل وجذب المستثمرين للمشاريع الناشئة. نصائح عملية من خبراء الاستثمار.",
      date: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
      guestName: "الدكتور أحمد المالكي",
      guestProfile: "خبير في الاستثمار ومدير صندوق رؤية الأعمال",
      location: "مركز الرياض الدولي للمؤتمرات",
      status: "completed",
      maxParticipants: 55,
      maxCompanions: 4,
    },
    {
      sessionNumber: 5,
      title: "القيادة والإدارة في المؤسسات الحديثة",
      description: "تطوير مهارات القيادة وإدارة الفرق في بيئة العمل المعاصرة. كيف تكون قائداً ملهماً.",
      date: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      guestName: "الدكتورة ريم الشمري",
      guestProfile: "استشارية قيادة ومدربة معتمدة دولياً",
      location: "فندق الريتز كارلتون - الرياض",
      status: "completed",
      maxParticipants: 50,
      maxCompanions: 3,
    },
    {
      sessionNumber: 6,
      title: "الابتكار والتطوير المستدام",
      description: "كيفية تطوير حلول مبتكرة تساهم في التنمية المستدامة ورؤية المملكة 2030.",
      date: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      guestName: "المهندس فهد الشهراني",
      guestProfile: "مدير الابتكار في أرامكو السعودية",
      location: "واحة الملك سلمان للعلوم",
      status: "completed",
      maxParticipants: 60,
      maxCompanions: 5,
    },
    // Upcoming sessions (future)
    {
      sessionNumber: 7,
      title: "الذكاء الاصطناعي في عالم الأعمال",
      description: "استكشاف تطبيقات الذكاء الاصطناعي وكيفية الاستفادة منها في تطوير الأعمال وزيادة الإنتاجية.",
      date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      guestName: "الدكتور سامي العتيبي",
      guestProfile: "خبير في الذكاء الاصطناعي ومؤسس شركة AI Solutions",
      location: "فندق الفيصلية - الرياض",
      locationUrl: "https://maps.google.com/?q=Al+Faisaliah+Hotel+Riyadh",
      status: "open",
      maxParticipants: 50,
      maxCompanions: 3,
      showCountdown: true,
    },
    {
      sessionNumber: 8,
      title: "التجارة الإلكترونية والتوسع الإقليمي",
      description: "فرص التوسع في أسواق الخليج والشرق الأوسط من خلال التجارة الإلكترونية.",
      date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      guestName: "الأستاذة منى الدوسري",
      guestProfile: "مؤسسة منصة التسوق 'سوق الخليج'",
      location: "مركز الملك عبدالله المالي",
      locationUrl: "https://maps.google.com/?q=King+Abdullah+Financial+District+Riyadh",
      status: "open",
      maxParticipants: 45,
      maxCompanions: 4,
      showCountdown: true,
    },
    {
      sessionNumber: 9,
      title: "بناء العلامة التجارية الشخصية",
      description: "كيف تبني علامتك التجارية الشخصية وتصبح مؤثراً في مجالك.",
      date: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
      guestName: "الأستاذ ماجد القحطاني",
      guestProfile: "خبير في العلامات التجارية ومستشار لكبرى الشركات",
      location: "فندق الحياة ريجنسي - الرياض",
      status: "open",
      maxParticipants: 40,
      maxCompanions: 2,
      showCountdown: true,
    },
    {
      sessionNumber: 10,
      title: "الصحة النفسية لرواد الأعمال",
      description: "التوازن بين العمل والحياة الشخصية وكيفية التعامل مع ضغوط ريادة الأعمال.",
      date: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000), // 28 days from now
      guestName: "الدكتورة هالة الحربي",
      guestProfile: "أخصائية نفسية متخصصة في ضغوط العمل",
      location: "مركز التنمية الذاتية - الرياض",
      status: "open",
      maxParticipants: 35,
      maxCompanions: 2,
      showCountdown: true,
    },
  ];

  const sessions: Session[] = [];
  for (const sessionData of sessionsData) {
    const session = await prisma.session.upsert({
      where: { sessionNumber: sessionData.sessionNumber },
      update: {},
      create: {
        ...sessionData,
        showParticipantCount: true,
        requiresApproval: false,
        embedEnabled: true,
        sendQrInEmail: true,
        showGuestProfile: true,
      },
    });
    sessions.push(session);
  }
  console.log(`✅ Created ${sessions.length} sessions`);

  // ============== REGISTRATIONS & ATTENDANCE ==============
  const companionNames = [
    { name: "عمر سعد الغامدي", company: "شركة الغامدي للتجارة", title: "مدير مبيعات", email: "omar.ghamdi@example.com" },
    { name: "لينا محمد العتيبي", company: "مكتب العتيبي للمحاماة", title: "محامية", email: "lina.otaibi@example.com" },
    { name: "ماجد خالد السبيعي", company: "مؤسسة السبيعي", title: "مدير عام", email: "majed.subaie@example.com" },
    { name: "دانا عبدالله الحربي", company: "وكالة الحربي الإعلامية", title: "مديرة إبداعية", email: "dana.harbi@example.com" },
    { name: "راشد فيصل المطيري", company: "شركة المطيري التقنية", title: "مهندس برمجيات", email: "rashed.mutairi@example.com" },
    { name: "منى سالم القحطاني", company: "استشارات القحطاني", title: "مستشارة مالية", email: "mona.qahtani@example.com" },
    { name: "بدر عبدالرحمن الزهراني", company: "مجموعة الزهراني", title: "مطور أعمال", email: "badr.zahrani@example.com" },
    { name: "ريما حسن الشمري", company: "دار الشمري للتصميم", title: "مصممة", email: "rima.shamri@example.com" },
    { name: "سعود محمد الدخيل", company: "شركة الدخيل العقارية", title: "مدير تطوير", email: "saud.dakhil@example.com" },
    { name: "هيا فهد النصار", company: "مؤسسة النصار للتدريب", title: "مدربة معتمدة", email: "haya.nassar@example.com" },
  ];

  let totalRegistrations = 0;
  let totalAttendances = 0;
  let totalCompanions = 0;
  let totalPendingRegistrations = 0;
  let totalInvitedAttendances = 0;

  for (const session of sessions) {
    // Register users for each session (random selection)
    const numRegistrants = Math.floor(Math.random() * 10) + 8; // 8-17 registrants
    const shuffledUsers = [...users].sort(() => Math.random() - 0.5);
    const selectedUsers = shuffledUsers.slice(0, Math.min(numRegistrants, users.length));

    for (let userIndex = 0; userIndex < selectedUsers.length; userIndex++) {
      const user = selectedUsers[userIndex];

      // Check if registration already exists
      const existingReg = await prisma.registration.findUnique({
        where: {
          userId_sessionId: {
            userId: user.id,
            sessionId: session.id,
          },
        },
      });

      if (!existingReg) {
        // Mix of approved and pending registrations (90% approved, 10% pending for open sessions)
        const isApproved = session.status === "completed" || Math.random() < 0.9;

        const registration = await prisma.registration.create({
          data: {
            userId: user.id,
            sessionId: session.id,
            isApproved,
            approvalNotes: !isApproved ? "في انتظار مراجعة الإدارة" : null,
            registeredAt: new Date(session.date.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000),
          },
        });
        totalRegistrations++;
        if (!isApproved) totalPendingRegistrations++;

        // Add invited registrations (companions) - 40% chance for approved registrations
        if (isApproved && Math.random() < 0.4 && session.maxCompanions > 0) {
          const numCompanions = Math.floor(Math.random() * Math.min(3, session.maxCompanions)) + 1;
          const shuffledCompanions = [...companionNames].sort(() => Math.random() - 0.5);

          for (let i = 0; i < numCompanions; i++) {
            const comp = shuffledCompanions[i];
            // 80% of companions are approved when parent is approved
            const companionApproved = Math.random() < 0.8;

            const invitedReg = await prisma.registration.create({
              data: {
                sessionId: session.id,
                invitedByRegistrationId: registration.id,
                guestName: comp.name,
                guestCompanyName: comp.company,
                guestPosition: comp.title,
                guestPhone: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
                guestEmail: comp.email,
                isApproved: companionApproved,
                approvalNotes: !companionApproved ? "في انتظار تأكيد المرافق" : null,
                registeredAt: registration.registeredAt,
              },
            });
            totalCompanions++;
            if (!companionApproved) totalPendingRegistrations++;

            // Create attendance for approved invited registrations in completed sessions
            if (session.status === "completed" && companionApproved) {
              const attended = Math.random() < 0.75; // 75% attendance rate for companions
              await prisma.attendance.create({
                data: {
                  registrationId: invitedReg.id,
                  sessionId: session.id,
                  attended,
                  checkInTime: attended ? new Date(session.date.getTime() + Math.random() * 45 * 60 * 1000) : null,
                  qrVerified: attended && Math.random() < 0.8, // 80% QR verified
                },
              });
              if (attended) totalInvitedAttendances++;
            }
          }
        }

        // Create attendance for completed sessions (parent registration)
        if (session.status === "completed" && isApproved) {
          const attended = Math.random() < 0.85; // 85% attendance rate
          await prisma.attendance.create({
            data: {
              registrationId: registration.id,
              sessionId: session.id,
              attended,
              checkInTime: attended ? new Date(session.date.getTime() + Math.random() * 30 * 60 * 1000) : null,
              qrVerified: attended,
            },
          });
          if (attended) totalAttendances++;
        }
      }
    }
  }

  // Add diverse guest registrations for open sessions
  const guestRegistrations = [
    // Approved guest with companions
    {
      guestName: "طارق عبدالله الحسني",
      guestEmail: "tariq.hasani@example.com",
      guestPhone: "+966521234567",
      guestCompanyName: "مؤسسة الحسني للاستيراد",
      guestPosition: "مدير عام",
      guestActivityType: "التجارة",
      guestGender: "male",
      guestGoal: "توسيع شبكة العلاقات التجارية",
      guestWantsToHost: true,
      guestHostingTypes: ["beverage", "other"],
      isApproved: true,
      withCompanions: true,
    },
    // Approved guest without companions
    {
      guestName: "غادة فهد النصار",
      guestEmail: "ghada.nassar@example.com",
      guestPhone: "+966522345678",
      guestInstagram: "ghada_business",
      guestCompanyName: "مشروع النصار",
      guestPosition: "مؤسسة",
      guestActivityType: "ريادة الأعمال",
      guestGender: "female",
      guestGoal: "التعرف على مستثمرين محتملين",
      guestWantsToHost: true,
      guestHostingTypes: ["dessert"],
      isApproved: true,
      withCompanions: false,
    },
    // Pending guest registration
    {
      guestName: "سلطان مشاري الدخيل",
      guestEmail: "sultan.dakhil@example.com",
      guestPhone: "+966523456789",
      guestTwitter: "sultan_dakhil",
      guestCompanyName: "وكالة الدخيل الرقمية",
      guestPosition: "مدير تسويق",
      guestActivityType: "التسويق",
      guestGender: "male",
      guestGoal: "تعلم استراتيجيات جديدة في التسويق",
      isApproved: false,
      withCompanions: false,
    },
    // Another pending guest
    {
      guestName: "نادية محمد الحربي",
      guestEmail: "nadia.harbi@example.com",
      guestPhone: "+966524567890",
      guestInstagram: "nadia_design",
      guestCompanyName: "استوديو الحربي للتصميم",
      guestPosition: "مصممة جرافيك",
      guestActivityType: "التصميم",
      guestGender: "female",
      guestGoal: "التواصل مع رواد الأعمال",
      isApproved: false,
      withCompanions: true,
    },
    // Approved guest with hosting preferences
    {
      guestName: "فهد سعود العتيبي",
      guestEmail: "fahad.otaibi@example.com",
      guestPhone: "+966525678901",
      guestSnapchat: "fahad_biz",
      guestCompanyName: "مجموعة العتيبي التجارية",
      guestPosition: "رئيس مجلس الإدارة",
      guestActivityType: "التجارة",
      guestGender: "male",
      guestGoal: "استكشاف فرص استثمارية جديدة",
      guestWantsToHost: true,
      guestHostingTypes: ["dinner", "beverage", "dessert"],
      isApproved: true,
      withCompanions: true,
    },
  ];

  const openSessions = sessions.filter(s => s.status === "open");
  for (const guestData of guestRegistrations) {
    const { withCompanions, ...registrationData } = guestData;
    const randomSession = openSessions[Math.floor(Math.random() * openSessions.length)];

    const guestReg = await prisma.registration.create({
      data: {
        sessionId: randomSession.id,
        approvalNotes: !registrationData.isApproved ? "في انتظار الموافقة" : null,
        ...registrationData,
      },
    });
    totalRegistrations++;
    if (!registrationData.isApproved) totalPendingRegistrations++;

    // Add companions for guests that have them
    if (withCompanions && registrationData.isApproved) {
      const numCompanions = Math.floor(Math.random() * 2) + 1;
      const shuffledCompanions = [...companionNames].sort(() => Math.random() - 0.5);

      for (let i = 0; i < numCompanions; i++) {
        const comp = shuffledCompanions[i];
        await prisma.registration.create({
          data: {
            sessionId: randomSession.id,
            invitedByRegistrationId: guestReg.id,
            guestName: comp.name,
            guestCompanyName: comp.company,
            guestPosition: comp.title,
            guestPhone: `+9665${Math.floor(10000000 + Math.random() * 90000000)}`,
            guestEmail: comp.email,
            isApproved: true,
            registeredAt: guestReg.registeredAt,
          },
        });
        totalCompanions++;
      }
    }
  }

  // Add some invites for invite-only testing (if needed in future)
  const inviteEmails = [
    "invited1@example.com",
    "invited2@example.com",
    "invited3@example.com",
  ];

  let totalInvites = 0;
  for (const email of inviteEmails) {
    const randomSession = openSessions[Math.floor(Math.random() * openSessions.length)];
    const token = `invite_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

    await prisma.invite.create({
      data: {
        email,
        sessionId: randomSession.id,
        token,
        expiresAt,
        used: Math.random() < 0.3, // 30% used
      },
    });
    totalInvites++;
  }

  console.log(`✅ Created ${totalRegistrations} registrations (${totalPendingRegistrations} pending)`);
  console.log(`✅ Created ${totalCompanions} invited registrations (companions)`);
  console.log(`✅ Created ${totalAttendances} attendance records (direct)`);
  console.log(`✅ Created ${totalInvitedAttendances} attendance records (invited/companions)`);
  console.log(`✅ Created ${totalInvites} session invites`);

  // ============== EVENT CATERING ==============
  // Add sample catering assignments for some sessions
  const cateringAssignments: EventCatering[] = [];

  // Find users who want to host
  const hostsWhoWantToHost = users.filter(u => u.wantsToHost);

  // Assign hosts to some completed sessions
  const completedSessions = sessions.filter(s => s.status === "completed");
  for (let i = 0; i < Math.min(3, completedSessions.length); i++) {
    const session = completedSessions[i];
    const host = hostsWhoWantToHost[i % hostsWhoWantToHost.length];

    // Each session can have multiple catering items
    const cateringTypes = ["dinner", "beverage", "dessert"];
    const numCatering = Math.floor(Math.random() * 2) + 1; // 1-2 catering items per session

    for (let j = 0; j < numCatering; j++) {
      const hostingType = cateringTypes[j % cateringTypes.length];
      const useHost = Math.random() < 0.7; // 70% with host, 30% self-catering

      const catering = await prisma.eventCatering.create({
        data: {
          sessionId: session.id,
          hostId: useHost ? host.id : null,
          hostingType,
          isSelfCatering: !useHost,
          notes: useHost
            ? `تم التنسيق مع ${host.name} لتقديم ${hostingType === "dinner" ? "العشاء" : hostingType === "beverage" ? "المشروبات" : "الحلويات"}`
            : "سيتم التوفير من قبل الإدارة",
        },
      });
      cateringAssignments.push(catering);
    }
  }

  // Add some catering for upcoming sessions
  const upcomingSessions = sessions.filter(s => s.status === "open");
  for (let i = 0; i < Math.min(2, upcomingSessions.length); i++) {
    const session = upcomingSessions[i];
    const host = hostsWhoWantToHost[(i + 3) % hostsWhoWantToHost.length];

    const catering = await prisma.eventCatering.create({
      data: {
        sessionId: session.id,
        hostId: host.id,
        hostingType: i === 0 ? "dinner" : "beverage",
        isSelfCatering: false,
        notes: `تم التأكيد مع ${host.name}`,
      },
    });
    cateringAssignments.push(catering);
  }

  console.log(`✅ Created ${cateringAssignments.length} catering assignments`);

  // ============== SUMMARY ==============
  console.log("\n" + "=".repeat(50));
  console.log("📊 Database Seeding Summary:");
  console.log("=".repeat(50));
  console.log(`👑 Super Admin user: 1`);
  console.log(`👤 Admin user (limited): 1`);
  console.log(`👥 Regular users: ${users.length}`);
  console.log(`📅 Sessions: ${sessions.length} (${sessions.filter(s => s.status === "completed").length} completed, ${sessions.filter(s => s.status === "open").length} open)`);
  console.log(`📝 Registrations: ${totalRegistrations} (${totalPendingRegistrations} pending approval)`);
  console.log(`👥 Invited registrations (companions): ${totalCompanions}`);
  console.log(`✅ Attendance records: ${totalAttendances + totalInvitedAttendances} (${totalAttendances} direct, ${totalInvitedAttendances} companions)`);
  console.log(`📧 Session invites: ${totalInvites}`);
  console.log(`🍽️  Event catering assignments: ${cateringAssignments.length}`);
  console.log("=".repeat(50));
  console.log("\n📋 Login Credentials:");
  console.log("─".repeat(50));
  console.log("Super Admin:  admin@eventpilot.com / admin123 (full access)");
  console.log("Admin:        moderator@eventpilot.com / admin123 (limited: dashboard, sessions, checkin)");
  console.log("Users:        [any user email] / password123");
  console.log("─".repeat(50));
  console.log("\n🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
