import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🗑️  Clearing all database data...\n");

  // Delete in order of dependencies (children first)

  // Valet records and assignments
  const valetRecords = await prisma.valetRecord.deleteMany({});
  console.log(`Deleted ${valetRecords.count} valet records`);

  const valetEmployeeSessions = await prisma.valetEmployeeSession.deleteMany({});
  console.log(`Deleted ${valetEmployeeSessions.count} valet employee sessions`);

  const valetEmployees = await prisma.valetEmployee.deleteMany({});
  console.log(`Deleted ${valetEmployees.count} valet employees`);

  // Email campaign recipients and campaigns
  const emailCampaignRecipients = await prisma.emailCampaignRecipient.deleteMany({});
  console.log(`Deleted ${emailCampaignRecipients.count} email campaign recipients`);

  const emailCampaigns = await prisma.emailCampaign.deleteMany({});
  console.log(`Deleted ${emailCampaigns.count} email campaigns`);

  const emailTemplates = await prisma.emailTemplate.deleteMany({});
  console.log(`Deleted ${emailTemplates.count} email templates`);

  const emailDrafts = await prisma.emailDraft.deleteMany({});
  console.log(`Deleted ${emailDrafts.count} email drafts`);

  const emailLogs = await prisma.emailLog.deleteMany({});
  console.log(`Deleted ${emailLogs.count} email logs`);

  // Suggestions
  const suggestions = await prisma.suggestion.deleteMany({});
  console.log(`Deleted ${suggestions.count} suggestions`);

  // Sponsor attachments and attachments
  const sponsorAttachments = await prisma.sponsorAttachment.deleteMany({});
  console.log(`Deleted ${sponsorAttachments.count} sponsor attachments`);

  const attachments = await prisma.attachment.deleteMany({});
  console.log(`Deleted ${attachments.count} attachments`);

  // Sponsor notes and labels
  const sponsorNotes = await prisma.sponsorNote.deleteMany({});
  console.log(`Deleted ${sponsorNotes.count} sponsor notes`);

  const sponsorLabels = await prisma.sponsorLabel.deleteMany({});
  console.log(`Deleted ${sponsorLabels.count} sponsor labels`);

  // Event sponsorships
  const eventSponsorships = await prisma.eventSponsorship.deleteMany({});
  console.log(`Deleted ${eventSponsorships.count} event sponsorships`);

  // Sponsors
  const sponsors = await prisma.sponsor.deleteMany({});
  console.log(`Deleted ${sponsors.count} sponsors`);

  // Session guests (join table)
  const sessionGuests = await prisma.sessionGuest.deleteMany({});
  console.log(`Deleted ${sessionGuests.count} session guests`);

  // Guests
  const guests = await prisma.guest.deleteMany({});
  console.log(`Deleted ${guests.count} guests`);

  // User notes and labels
  const userNotes = await prisma.userNote.deleteMany({});
  console.log(`Deleted ${userNotes.count} user notes`);

  const userLabels = await prisma.userLabel.deleteMany({});
  console.log(`Deleted ${userLabels.count} user labels`);

  // Event catering (deprecated but still in schema)
  const eventCaterings = await prisma.eventCatering.deleteMany({});
  console.log(`Deleted ${eventCaterings.count} event caterings`);

  // Attendance
  const attendance = await prisma.attendance.deleteMany({});
  console.log(`Deleted ${attendance.count} attendance records`);

  // Registration
  const registration = await prisma.registration.deleteMany({});
  console.log(`Deleted ${registration.count} registrations`);

  // Invites
  const invite = await prisma.invite.deleteMany({});
  console.log(`Deleted ${invite.count} invites`);

  // Sessions
  const session = await prisma.session.deleteMany({});
  console.log(`Deleted ${session.count} sessions`);

  // Settings
  const settings = await prisma.settings.deleteMany({});
  console.log(`Deleted ${settings.count} settings`);

  // Users (last, as many things reference users)
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
