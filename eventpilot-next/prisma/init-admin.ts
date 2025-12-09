import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Initialize Super Admin User for Production
 *
 * This script creates a super admin user with full permissions.
 * Run this ONCE when deploying to production.
 *
 * Usage:
 *   npx tsx prisma/init-admin.ts
 *
 * Environment Variables (optional - has defaults for initial setup):
 *   ADMIN_EMAIL    - Admin email (default: admin@thlothyah.com)
 *   ADMIN_USERNAME - Admin username (default: admin)
 *   ADMIN_PASSWORD - Admin password (REQUIRED - no default for security)
 *   ADMIN_NAME     - Admin display name (default: مدير النظام)
 *   ADMIN_PHONE    - Admin phone (default: +966500000000)
 */

const prisma = new PrismaClient();

async function main() {
  console.log("🔐 Initializing Super Admin User...\n");

  // Get credentials from environment variables
  const email = "admin@thlothyah.com";
  const username = "admin";
  const password = "w";
  const name = "مدير النظام";
  const phone = "+966500000000";

  // Validate required fields
  if (!password) {
    console.error("❌ Error: ADMIN_PASSWORD environment variable is required!");
    console.error("\nUsage:");
    console.error(
      "  ADMIN_PASSWORD=your_secure_password npx tsx prisma/init-admin.ts"
    );
    console.error("\nOr set all variables:");
    console.error("  ADMIN_EMAIL=admin@example.com \\");
    console.error("  ADMIN_USERNAME=admin \\");
    console.error("  ADMIN_PASSWORD=your_secure_password \\");
    console.error('  ADMIN_NAME="مدير النظام" \\');
    console.error("  ADMIN_PHONE=+966500000000 \\");
    console.error("  npx tsx prisma/init-admin.ts");
    process.exit(1);
  }

  // Check password strength
  if (password.length < 8) {
    console.error("❌ Error: Password must be at least 8 characters long!");
    process.exit(1);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create or update super admin
  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "SUPER_ADMIN",
      isActive: true,
      canAccessDashboard: true,
      canAccessSessions: true,
      canAccessUsers: true,
      canAccessHosts: true,
      canAccessAnalytics: true,
      canAccessCheckin: true,
      canAccessSettings: true,
    },
    create: {
      name,
      username,
      email,
      phone,
      passwordHash,
      role: "SUPER_ADMIN",
      isActive: true,
      isApproved: true,
      companyName: "ثلوثية الأعمال",
      position: "مدير النظام الرئيسي",
      canAccessDashboard: true,
      canAccessSessions: true,
      canAccessUsers: true,
      canAccessHosts: true,
      canAccessAnalytics: true,
      canAccessCheckin: true,
      canAccessSettings: true,
    },
  });

  console.log("✅ Super Admin created/updated successfully!");
  console.log("\n" + "=".repeat(50));
  console.log("📋 Admin Credentials:");
  console.log("=".repeat(50));
  console.log(`   Email:    ${superAdmin.email}`);
  console.log(`   Username: ${superAdmin.username}`);
  console.log(`   Name:     ${superAdmin.name}`);
  console.log(`   Role:     ${superAdmin.role}`);
  console.log("=".repeat(50));
  console.log("\n⚠️  Make sure to store the password securely!");
  console.log("🔐 You can now log in at /admin/login");
}

main()
  .catch((e) => {
    console.error("❌ Failed to create admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
