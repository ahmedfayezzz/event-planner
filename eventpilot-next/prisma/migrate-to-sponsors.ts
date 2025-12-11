/**
 * Migration Script: Migrate existing host/catering data to the new Sponsor model
 *
 * This script migrates:
 * 1. Users with wantsToHost=true → Creates Sponsor record linked to User
 * 2. Registrations with guestWantsToHost=true → Updates to new wantsToSponsor fields
 * 3. EventCatering entries → Creates EventSponsorship entries
 *
 * Run with: npx tsx prisma/migrate-to-sponsors.ts
 *
 * IMPORTANT: This is a one-time migration script. Run it after deploying the new schema.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Map old hosting types to new sponsorship types (they're the same values)
function mapHostingTypesToSponsorshipTypes(hostingTypes: string[]): string[] {
  return hostingTypes.filter((type) =>
    ["dinner", "beverage", "dessert", "other"].includes(type)
  );
}

async function migrateUserHostsToSponsors() {
  console.log("\n🔄 Migrating User hosts to Sponsors...");

  // Find all users who want to host and don't already have a sponsor record
  const usersWhoWantToHost = await prisma.user.findMany({
    where: {
      wantsToHost: true,
      sponsor: null, // Don't create duplicate sponsors
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      hostingTypes: true,
      companyName: true,
    },
  });

  console.log(`   Found ${usersWhoWantToHost.length} users who want to host without sponsor records`);

  let created = 0;
  for (const user of usersWhoWantToHost) {
    try {
      await prisma.sponsor.create({
        data: {
          userId: user.id,
          name: user.companyName || user.name, // Use company name if available
          email: user.email,
          phone: user.phone,
          type: "person", // Default to person for existing hosts
          sponsorshipTypes: mapHostingTypesToSponsorshipTypes(user.hostingTypes),
          sponsorshipOtherText: null,
          isActive: true,
        },
      });
      created++;
      console.log(`   ✅ Created sponsor for user: ${user.name} (${user.email})`);
    } catch (error) {
      console.error(`   ❌ Failed to create sponsor for user ${user.email}:`, error);
    }
  }

  console.log(`   Created ${created} sponsor records from users`);
  return created;
}

async function migrateGuestRegistrationHostingToSponsorship() {
  console.log("\n🔄 Migrating guest registration hosting data to sponsorship fields...");

  // Find registrations with old hosting data that haven't been migrated
  const registrations = await prisma.registration.findMany({
    where: {
      guestWantsToHost: true,
      wantsToSponsor: false, // Not yet migrated
    },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestHostingTypes: true,
    },
  });

  console.log(`   Found ${registrations.length} registrations with guest hosting data to migrate`);

  let updated = 0;
  for (const reg of registrations) {
    try {
      await prisma.registration.update({
        where: { id: reg.id },
        data: {
          wantsToSponsor: true,
          sponsorshipTypes: mapHostingTypesToSponsorshipTypes(reg.guestHostingTypes),
          sponsorType: "person", // Default to person
        },
      });
      updated++;
      console.log(`   ✅ Migrated registration: ${reg.guestName || reg.id}`);
    } catch (error) {
      console.error(`   ❌ Failed to migrate registration ${reg.id}:`, error);
    }
  }

  console.log(`   Updated ${updated} registration records`);
  return updated;
}

async function migrateEventCateringToSponsorship() {
  console.log("\n🔄 Migrating EventCatering to EventSponsorship...");

  // Get all existing catering entries
  const caterings = await prisma.eventCatering.findMany({
    include: {
      host: {
        include: {
          sponsor: true,
        },
      },
      session: true,
    },
  });

  console.log(`   Found ${caterings.length} EventCatering entries to migrate`);

  let created = 0;
  let skipped = 0;

  for (const catering of caterings) {
    try {
      // Check if this sponsorship already exists
      const existingSponsorship = await prisma.eventSponsorship.findFirst({
        where: {
          sessionId: catering.sessionId,
          sponsorshipType: catering.hostingType,
          // Match either by sponsorId or self-sponsored flag
          OR: [
            { sponsorId: catering.host?.sponsor?.id || null },
            { isSelfSponsored: catering.isSelfCatering },
          ],
        },
      });

      if (existingSponsorship) {
        skipped++;
        console.log(`   ⏭️  Skipped existing sponsorship for session ${catering.session?.sessionNumber}, type: ${catering.hostingType}`);
        continue;
      }

      // If catering has a host, we need to ensure they have a sponsor record
      let sponsorId: string | null = null;

      if (catering.host && !catering.isSelfCatering) {
        // Check if user already has a sponsor
        if (catering.host.sponsor) {
          sponsorId = catering.host.sponsor.id;
        } else {
          // Create sponsor record for the host
          const newSponsor = await prisma.sponsor.create({
            data: {
              userId: catering.host.id,
              name: catering.host.companyName || catering.host.name,
              email: catering.host.email,
              phone: catering.host.phone,
              type: "person",
              sponsorshipTypes: mapHostingTypesToSponsorshipTypes(catering.host.hostingTypes),
              isActive: true,
            },
          });
          sponsorId = newSponsor.id;
          console.log(`   ➕ Created sponsor for host: ${catering.host.name}`);
        }
      }

      // Create the EventSponsorship record
      await prisma.eventSponsorship.create({
        data: {
          sessionId: catering.sessionId,
          sponsorId,
          sponsorshipType: catering.hostingType,
          isSelfSponsored: catering.isSelfCatering,
          notes: catering.notes,
        },
      });
      created++;
      console.log(`   ✅ Created EventSponsorship for session ${catering.session?.sessionNumber}, type: ${catering.hostingType}`);
    } catch (error) {
      console.error(`   ❌ Failed to migrate catering ${catering.id}:`, error);
    }
  }

  console.log(`   Created ${created} EventSponsorship records (skipped ${skipped} existing)`);
  return created;
}

async function printMigrationSummary() {
  console.log("\n" + "=".repeat(60));
  console.log("📊 POST-MIGRATION SUMMARY");
  console.log("=".repeat(60));

  const totalSponsors = await prisma.sponsor.count();
  const linkedSponsors = await prisma.sponsor.count({ where: { userId: { not: null } } });
  const standaloneSponsors = totalSponsors - linkedSponsors;

  const totalEventSponsorships = await prisma.eventSponsorship.count();
  const selfSponsorships = await prisma.eventSponsorship.count({ where: { isSelfSponsored: true } });
  const sponsoredSponsorships = totalEventSponsorships - selfSponsorships;

  const totalEventCaterings = await prisma.eventCatering.count();

  const usersWithHostingEnabled = await prisma.user.count({ where: { wantsToHost: true } });
  const registrationsWithSponsorship = await prisma.registration.count({ where: { wantsToSponsor: true } });

  console.log(`\n🏢 Sponsors:`);
  console.log(`   Total: ${totalSponsors}`);
  console.log(`   ├── Linked to users: ${linkedSponsors}`);
  console.log(`   └── Standalone: ${standaloneSponsors}`);

  console.log(`\n🎉 EventSponsorship records:`);
  console.log(`   Total: ${totalEventSponsorships}`);
  console.log(`   ├── With sponsors: ${sponsoredSponsorships}`);
  console.log(`   └── Self-sponsored: ${selfSponsorships}`);

  console.log(`\n📋 Legacy data (for reference):`);
  console.log(`   EventCatering entries: ${totalEventCaterings}`);
  console.log(`   Users with wantsToHost=true: ${usersWithHostingEnabled}`);
  console.log(`   Registrations with wantsToSponsor=true: ${registrationsWithSponsorship}`);

  console.log("\n" + "=".repeat(60));
}

async function main() {
  console.log("=".repeat(60));
  console.log("🚀 SPONSOR DATA MIGRATION SCRIPT");
  console.log("=".repeat(60));
  console.log("\nThis script will migrate:");
  console.log("  1. Users with wantsToHost=true → Sponsor records");
  console.log("  2. Registration guestWantsToHost → wantsToSponsor fields");
  console.log("  3. EventCatering entries → EventSponsorship records");
  console.log("\n⚠️  This is a non-destructive migration - old data is preserved.");
  console.log("=".repeat(60));

  try {
    // Step 1: Migrate user hosts to sponsors
    const sponsorsCreatedFromUsers = await migrateUserHostsToSponsors();

    // Step 2: Migrate guest registration hosting fields
    const registrationsUpdated = await migrateGuestRegistrationHostingToSponsorship();

    // Step 3: Migrate EventCatering to EventSponsorship
    const sponsorshipsCreated = await migrateEventCateringToSponsorship();

    // Print summary
    await printMigrationSummary();

    console.log("\n✅ Migration completed successfully!");
    console.log(`\nSummary of changes:`);
    console.log(`  - Created ${sponsorsCreatedFromUsers} sponsors from users`);
    console.log(`  - Updated ${registrationsUpdated} registrations`);
    console.log(`  - Created ${sponsorshipsCreated} event sponsorships`);

    console.log("\n📝 Next steps:");
    console.log("  1. Verify the migrated data in the admin panel");
    console.log("  2. Test the sponsor management features");
    console.log("  3. After verification, you can optionally remove the deprecated");
    console.log("     EventCatering table and old hosting fields from User/Registration");

  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error("❌ Migration script error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
