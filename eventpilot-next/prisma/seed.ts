import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default admin user
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@eventpilot.com" },
    update: {},
    create: {
      name: "مدير النظام",
      username: "admin",
      email: "admin@eventpilot.com",
      phone: "+966500000000",
      passwordHash: adminPassword,
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create a sample session
  const nextTuesday = new Date();
  nextTuesday.setDate(nextTuesday.getDate() + ((2 - nextTuesday.getDay() + 7) % 7 || 7));
  nextTuesday.setHours(18, 0, 0, 0);

  const session = await prisma.session.upsert({
    where: { sessionNumber: 1 },
    update: {},
    create: {
      sessionNumber: 1,
      title: "ثلوثية الأعمال الأولى",
      description: "أول لقاء لمجتمع رواد الأعمال. انضم إلينا لتبادل الخبرات وبناء شبكة علاقات مهنية.",
      date: nextTuesday,
      location: "فندق الريتز كارلتون - الرياض",
      maxParticipants: 50,
      maxCompanions: 2,
      status: "open",
      showCountdown: true,
      showParticipantCount: true,
      requiresApproval: false,
      embedEnabled: true,
      sendQrInEmail: true,
    },
  });

  console.log(`✅ Created sample session: ${session.title}`);

  // Create a sample regular user
  const userPassword = await bcrypt.hash("user123", 10);

  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      name: "أحمد محمد",
      username: "ahmed",
      email: "user@example.com",
      phone: "+966501234567",
      passwordHash: userPassword,
      role: "USER",
      isActive: true,
      companyName: "شركة التقنية المتقدمة",
      position: "مدير تطوير الأعمال",
      activityType: "تقنية المعلومات",
      gender: "male",
    },
  });

  console.log(`✅ Created sample user: ${user.email}`);

  console.log("\n📋 Login credentials:");
  console.log("Admin: admin@eventpilot.com / admin123");
  console.log("User:  user@example.com / user123");
  console.log("\n🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
