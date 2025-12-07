import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing all database data...\n");

  // Delete in order of dependencies (children first)
  const attendance = await prisma.attendance.deleteMany({});
  console.log(`Deleted ${attendance.count} attendance records`);

  const registration = await prisma.registration.deleteMany({});
  console.log(`Deleted ${registration.count} registrations`);

  const invite = await prisma.invite.deleteMany({});
  console.log(`Deleted ${invite.count} invites`);

  const session = await prisma.session.deleteMany({});
  console.log(`Deleted ${session.count} sessions`);

  const user = await prisma.user.deleteMany({});
  console.log(`Deleted ${user.count} users`);

  console.log("\n✅ All data cleared successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Clear failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
