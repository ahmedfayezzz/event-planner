import { Resend } from "resend";
// PNG generation kept for future use: import { generateBrandedQRCode } from "./qr-branded";
import { generateBrandedQRPdf } from "./qr-pdf";
import { generateInvitationPdf } from "./invitation-pdf";
import { db } from "@/server/db";
import { toSaudiTime } from "./timezone";
import {
  createEmailTemplate,
  generateConfirmationContent,
  generatePendingContent,
  generateRejectionContent,
  generateConfirmedContent,
  generateCompanionContent,
  generateCompanionApprovedNotificationContent,
  generateWelcomeContent,
  generatePasswordResetContent,
  generateInvitationContent,
  generateQrOnlyContent,
  generateSponsorThankYouContent,
  type EmailSettings,
  type SessionInfo,
} from "./email-templates";

// Re-export types for external use
export type { EmailSettings, SessionInfo };

const resend = new Resend(process.env.RESEND_API_KEY);

// =============================================================================
// RATE LIMITING & RETRY CONFIGURATION
// =============================================================================

// Resend allows 2 requests/second by default
const RATE_LIMIT_DELAY_MS = 500; // 500ms between emails = 2/second max
const MAX_RETRIES = 3;
let lastEmailSentAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// SETTINGS HELPER
// =============================================================================

async function getEmailSettings(): Promise<EmailSettings> {
  const settings = await db.settings.findUnique({
    where: { key: "global" },
    select: {
      siteName: true,
      contactEmail: true,
      contactPhone: true,
      twitterHandle: true,
      instagramHandle: true,
      snapchatHandle: true,
      linkedinUrl: true,
      whatsappNumber: true,
    },
  });

  return {
    siteName: settings?.siteName ?? null,
    contactEmail: settings?.contactEmail ?? null,
    contactPhone: settings?.contactPhone ?? null,
    twitterHandle: settings?.twitterHandle ?? null,
    instagramHandle: settings?.instagramHandle ?? null,
    snapchatHandle: settings?.snapchatHandle ?? null,
    linkedinUrl: settings?.linkedinUrl ?? null,
    whatsappNumber: settings?.whatsappNumber ?? null,
  };
}

interface EmailAttachment {
  filename: string;
  content: string; // base64 encoded
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  // Optional logging context
  type?: string; // "confirmed", "pending", "companion", "welcome", etc.
  registrationId?: string;
  sessionId?: string;
}

/**
 * Base email sending function using Resend
 * Includes rate limiting, retry logic, and DB logging
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
  type = "unknown",
  registrationId,
  sessionId,
}: SendEmailParams): Promise<boolean> {
  const recipient = Array.isArray(to) ? to : [to];
  const recipientStr = recipient.join(", ");

  // Create email log entry
  let logId: string | null = null;
  try {
    const log = await db.emailLog.create({
      data: {
        to: recipientStr,
        subject,
        type,
        status: "pending",
        attempts: 0,
        registrationId,
        sessionId,
      },
    });
    logId = log.id;
  } catch (logError) {
    console.error("Failed to create email log:", logError);
    // Continue sending even if logging fails
  }

  // Check environment configuration
  const fromEmail = process.env.FROM_EMAIL;

  if (!process.env.RESEND_API_KEY) {
    console.warn(`RESEND_API_KEY not configured - email not sent to ${recipientStr}`);
    if (logId) {
      await db.emailLog.update({
        where: { id: logId },
        data: { status: "failed", errorMessage: "RESEND_API_KEY not configured" },
      }).catch(() => {});
    }
    return false;
  }

  if (!fromEmail) {
    console.warn(`FROM_EMAIL not configured - email not sent to ${recipientStr}`);
    if (logId) {
      await db.emailLog.update({
        where: { id: logId },
        data: { status: "failed", errorMessage: "FROM_EMAIL not configured" },
      }).catch(() => {});
    }
    return false;
  }

  const mappedAttachments = attachments
    ? attachments.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content, "base64"),
      }))
    : undefined;

  // Rate limiting: ensure minimum delay between emails
  const timeSinceLast = Date.now() - lastEmailSentAt;
  if (timeSinceLast < RATE_LIMIT_DELAY_MS) {
    await sleep(RATE_LIMIT_DELAY_MS - timeSinceLast);
  }

  // Retry loop with exponential backoff
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Update attempt count
      if (logId) {
        await db.emailLog.update({
          where: { id: logId },
          data: { attempts: attempt },
        }).catch(() => {});
      }

      console.log(`Sending email to ${recipientStr}: ${subject} (attempt ${attempt}/${MAX_RETRIES})`);

      // Resend requires at least one of: text, html, or react template
      const response = await resend.emails.send({
        from: fromEmail,
        to: recipient,
        subject,
        text: text ?? "",
        html,
        attachments: mappedAttachments,
      });

      // Check for errors in response (Resend returns error objects, not exceptions)
      if (response.error) {
        lastError = response.error.message || "Unknown Resend error";
        console.error(`Email attempt ${attempt} failed:`, response.error);

        // Check for rate limit (429)
        if (response.error.name === "rate_limit_exceeded") {
          // Wait longer on rate limit
          const backoffMs = 2000 * attempt;
          console.log(`Rate limited, waiting ${backoffMs}ms before retry...`);
          await sleep(backoffMs);
          continue;
        }

        // For other errors, use standard backoff
        if (attempt < MAX_RETRIES) {
          await sleep(1000 * attempt);
          continue;
        }
      } else {
        // Success!
        lastEmailSentAt = Date.now();
        console.log(`Email sent successfully to ${recipientStr} (id: ${response.data?.id ?? "unknown"})`);

        if (logId) {
          await db.emailLog.update({
            where: { id: logId },
            data: { status: "sent", sentAt: new Date() },
          }).catch(() => {});
        }
        return true;
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unknown error";
      console.error(`Email attempt ${attempt} exception:`, error);

      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
      }
    }
  }

  // All retries exhausted
  console.error(`Email sending failed to ${recipientStr} after ${MAX_RETRIES} attempts: ${lastError}`);
  if (logId) {
    await db.emailLog.update({
      where: { id: logId },
      data: { status: "failed", errorMessage: lastError },
    }).catch(() => {});
  }
  return false;
}

// =============================================================================
// PLAIN TEXT HELPER
// =============================================================================

/**
 * Create plain text version of email (strips HTML formatting)
 */
function createPlainText(
  content: string,
  buttonText?: string,
  buttonUrl?: string,
  settings?: EmailSettings
): string {
  // Remove HTML tags and decode entities
  const plainContent = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  const buttonSection = buttonText && buttonUrl
    ? `\n\n${buttonText}:\n${buttonUrl}`
    : "";

  const contactEmail = settings?.contactEmail;
  const contactPhone = settings?.contactPhone;

  // Build social links text (no fallback)
  const socialNames: string[] = [];
  if (settings?.instagramHandle) socialNames.push("Instagram");
  if (settings?.twitterHandle) socialNames.push("X");
  if (settings?.snapchatHandle) socialNames.push("Snapchat");
  if (settings?.linkedinUrl) socialNames.push("LinkedIn");
  if (settings?.whatsappNumber) socialNames.push("WhatsApp");
  const socialText = socialNames.length > 0 ? socialNames.join(" | ") : "";

  // Build footer parts conditionally
  const contactSection = contactEmail || contactPhone
    ? `للتواصل والاستفسارات:\n${contactEmail ? contactEmail + "\n" : ""}${contactPhone || ""}`
    : "";
  const socialSection = socialText ? `تابعونا على: ${socialText}` : "";

  const footer = `

---
${contactSection}${contactSection && socialSection ? "\n\n" : ""}${socialSection}

جميع الحقوق محفوظة لـ TDA - https://tda.sa
`;

  return plainContent + buttonSection + footer;
}

// =============================================================================
// DATE FORMATTING (with Saudi timezone)
// =============================================================================

function formatSessionDate(date: Date): string {
  // Convert UTC to Saudi time for email display
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

function formatDateOnly(date: Date): string {
  // Convert UTC to Saudi time for email display
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    numberingSystem: "latn",
  });
}

function formatTimeOnly(date: Date): string {
  // Convert UTC to Saudi time for email display (Latin numerals for PDF - Arabic numerals get reversed)
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
    numberingSystem: "latn",
  });
}

function formatDateForPdf(date: Date): string {
  // Returns "16 ديسمبر" format (day + month, Latin numerals for PDF - Arabic numerals get reversed)
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "long",
    numberingSystem: "latn",
  });
}

function formatDayNameForPdf(date: Date): string {
  // Returns "الثلاثاء" (day name in Arabic)
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleDateString("ar-SA", {
    weekday: "long",
  });
}

function splitLocationForPdf(location: string | null | undefined): {
  line1: string | undefined;
  line2: string | undefined;
} {
  if (!location) return { line1: undefined, line2: undefined };

  // Try splitting by " - " first (e.g., "فندق الحياة - الرياض")
  if (location.includes(" - ")) {
    const parts = location.split(" - ");
    return { line1: parts[0]?.trim(), line2: parts.slice(1).join(" - ").trim() };
  }

  // If it's a short location (2 words or less), keep it on one line
  const words = location.trim().split(/\s+/);
  if (words.length <= 2) {
    return { line1: location, line2: undefined };
  }

  // For longer locations, split roughly in half
  const midPoint = Math.ceil(words.length / 2);
  return {
    line1: words.slice(0, midPoint).join(" "),
    line2: words.slice(midPoint).join(" "),
  };
}

// =============================================================================
// EMAIL FUNCTIONS
// =============================================================================

/**
 * Send confirmation email to participant (simple, no approval needed)
 */
export async function sendConfirmationEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  registrationId?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  const content = generateConfirmationContent(
    name,
    session.title,
    dateStr,
    session.location
  );

  const html = createEmailTemplate({ content, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: emailAddress,
    subject: `تأكيد التسجيل - ${session.title}`,
    html,
    text,
    type: "confirmation",
    registrationId,
    sessionId: session.id,
  });
}

/**
 * Send registration received email (pending approval)
 */
export async function sendPendingEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  registrationId?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  const content = generatePendingContent(
    name,
    session.title,
    dateStr,
    session.location
  );

  const html = createEmailTemplate({ content, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: emailAddress,
    subject: `استلام التسجيل - ${session.title}`,
    html,
    text,
    type: "pending",
    registrationId,
    sessionId: session.id,
  });
}

/**
 * Send rejection email (registration rejected)
 */
export async function sendRejectionEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  registrationId?: string,
  reason?: string | null
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  const content = generateRejectionContent(
    name,
    session.title,
    dateStr,
    session.location,
    reason
  );

  const html = createEmailTemplate({ content, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: emailAddress,
    subject: `${session.title} | حياكم الله`,
    html,
    text,
    type: "rejection",
    registrationId,
    sessionId: session.id,
  });
}

/**
 * Send confirmation email with optional QR code (registration approved)
 */
export async function sendConfirmedEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  qrData?: string,
  registrationId?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  // Generate QR code as attachment only (not embedded)
  let attachments: EmailAttachment[] | undefined;

  if (qrData && session.sendQrInEmail) {
    try {
      // Fetch sponsors for this session
      const eventSponsorships = await db.eventSponsorship.findMany({
        where: { sessionId: session.id },
        orderBy: { displayOrder: "asc" },
        include: { sponsor: true },
      });
      const sponsors = eventSponsorships
        .filter((es) => es.sponsor)
        .map((es) => ({
          name: es.sponsor!.name,
          logoUrl: es.sponsor!.logoUrl,
          type: es.sponsorshipType,
        }));

      const pdfBuffer = await generateBrandedQRPdf(qrData, {
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDate: session.date,
        attendeeName: name,
        locationUrl: session.locationUrl ?? undefined,
        sponsors,
      });
      if (pdfBuffer) {
        const pdfBase64 = pdfBuffer.toString("base64");
        attachments = [
          {
            filename: "qr-code.pdf",
            content: pdfBase64,
          },
        ];
      }
    } catch (err) {
      console.error("Failed to generate QR PDF:", err);
    }
  }

  const showQrInstructions = !!qrData && !!session.sendQrInEmail;
  const content = generateConfirmedContent(
    name,
    session.title,
    dateStr,
    session.location,
    showQrInstructions
  );

  const html = createEmailTemplate({ content, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: emailAddress,
    subject: `تأكيد التسجيل - ${session.title}`,
    html,
    text,
    attachments,
    type: "confirmed",
    registrationId,
    sessionId: session.id,
  });
}

/**
 * Send email to companion notifying them of registration
 */
export async function sendCompanionEmail(
  companionEmail: string,
  companionName: string,
  registrantName: string,
  session: SessionInfo,
  isApproved: boolean,
  qrData?: string,
  registrationId?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  // Generate QR code as attachment only (not embedded)
  let attachments: EmailAttachment[] | undefined;

  if (isApproved && qrData && session.sendQrInEmail) {
    try {
      // Fetch sponsors for this session
      const eventSponsorships = await db.eventSponsorship.findMany({
        where: { sessionId: session.id },
        orderBy: { displayOrder: "asc" },
        include: { sponsor: true },
      });
      const sponsors = eventSponsorships
        .filter((es) => es.sponsor)
        .map((es) => ({
          name: es.sponsor!.name,
          logoUrl: es.sponsor!.logoUrl,
          type: es.sponsorshipType,
        }));

      const pdfBuffer = await generateBrandedQRPdf(qrData, {
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDate: session.date,
        attendeeName: companionName,
        locationUrl: session.locationUrl ?? undefined,
        sponsors,
      });
      if (pdfBuffer) {
        const pdfBase64 = pdfBuffer.toString("base64");
        attachments = [
          {
            filename: "qr-code.pdf",
            content: pdfBase64,
          },
        ];
      }
    } catch (err) {
      console.error("Failed to generate companion QR PDF:", err);
    }
  }

  const showQrInstructions = isApproved && !!qrData && !!session.sendQrInEmail;
  const content = generateCompanionContent(
    companionName,
    registrantName,
    session.title,
    dateStr,
    session.location,
    isApproved,
    showQrInstructions
  );

  const html = createEmailTemplate({ content, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  const subject = isApproved
    ? `تأكيد التسجيل كمرافق - ${session.title}`
    : `استلام التسجيل كمرافق - ${session.title}`;

  return sendEmail({
    to: companionEmail,
    subject,
    html,
    text,
    attachments,
    type: isApproved ? "companion_confirmed" : "companion_pending",
    registrationId,
    sessionId: session.id,
  });
}

/**
 * Send notification to inviter when their companion is approved
 */
export async function sendCompanionApprovedNotification(
  inviterEmail: string,
  inviterName: string,
  companionName: string,
  session: SessionInfo,
  registrationId?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  const content = generateCompanionApprovedNotificationContent(
    inviterName,
    companionName,
    session.title,
    dateStr,
    session.location
  );

  const html = createEmailTemplate({ content, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: inviterEmail,
    subject: `تم تأكيد تسجيل المرافق - ${session.title}`,
    html,
    text,
    type: "companion_approved_notification",
    registrationId,
    sessionId: session.id,
  });
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(
  emailAddress: string,
  name: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const loginUrl = `${baseUrl}/user/login`;

  const content = generateWelcomeContent(name, siteName);

  const html = createEmailTemplate({
    content,
    buttonText: "تسجيل الدخول",
    buttonUrl: loginUrl,
    settings,
  });
  const text = createPlainText(content, "تسجيل الدخول", loginUrl, settings);

  return sendEmail({
    to: emailAddress,
    subject: `مرحباً بك في ${siteName}`,
    html,
    text,
    type: "welcome",
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  emailAddress: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const settings = await getEmailSettings();

  const content = generatePasswordResetContent(name);

  const html = createEmailTemplate({
    content,
    buttonText: "إعادة تعيين كلمة المرور",
    buttonUrl: resetUrl,
    settings,
  });
  const text = createPlainText(content, "إعادة تعيين كلمة المرور", resetUrl, settings);

  return sendEmail({
    to: emailAddress,
    subject: "إعادة تعيين كلمة المرور",
    html,
    text,
    type: "password_reset",
  });
}

interface InvitationEmailOptions {
  attachPdf?: boolean;
  sponsors?: Array<{
    name: string;
    logoUrl?: string | null;
    type: string;
    socialMediaLinks?: Record<string, string> | null;
  }>;
  sessionGuests?: Array<{
    name: string;
    title?: string | null;
    jobTitle?: string | null;
    company?: string | null;
    imageUrl?: string | null;
  }>;
  useHtml?: boolean;
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  emailAddress: string,
  session: SessionInfo,
  registrationLink: string,
  options: InvitationEmailOptions | boolean = true
): Promise<boolean> {
  // Handle backwards compatibility: if options is a boolean, treat it as useHtml
  const opts: InvitationEmailOptions = typeof options === 'boolean'
    ? { useHtml: options }
    : options;
  const { attachPdf = false, sponsors = [], sessionGuests = [], useHtml = true } = opts;

  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";
  const dateStr = formatDateOnly(session.date);
  const timeStr = formatTimeOnly(session.date);

  // Generate invitation PDF attachment if requested
  let attachments: EmailAttachment[] | undefined;
  if (attachPdf) {
    try {
      const pdfBuffer = await generateInvitationPdf({
        sessionId: session.id,
        sessionTitle: session.title,
        sessionDate: session.date,
        location: session.location ?? undefined,
        locationUrl: session.locationUrl ?? undefined,
        sponsors,
        sessionGuests,
      });
      if (pdfBuffer) {
        attachments = [
          {
            filename: "invitation.pdf",
            content: pdfBuffer.toString("base64"),
          },
        ];
      }
    } catch (err) {
      console.error("Failed to generate invitation PDF:", err);
    }
  }

  // Plain text fallback
  if (!useHtml) {
    const body = `مرحباً،

يسرّنا دعوتك لحضور "${session.title}" ضمن فعاليات ${siteName}.

التاريخ: ${dateStr}
الوقت: ${timeStr}
المكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}

للتسجيل: ${registrationLink}

هذه دعوة خاصة. نتطلع لرؤيتك معنا!

فريق ${siteName}
`;
    return sendEmail({
      to: emailAddress,
      subject: `دعوة خاصة - ${session.title}`,
      text: body,
      attachments,
      type: "invitation",
      sessionId: session.id,
    });
  }

  const content = generateInvitationContent(
    session.title,
    siteName,
    dateStr,
    timeStr,
    session.location
  );

  const html = createEmailTemplate({
    content,
    buttonText: "التسجيل الآن",
    buttonUrl: registrationLink,
    settings,
  });
  const text = createPlainText(content, "التسجيل الآن", registrationLink, settings);

  return sendEmail({
    to: emailAddress,
    subject: `دعوة خاصة - ${session.title}`,
    html,
    text,
    attachments,
    type: "invitation",
    sessionId: session.id,
  });
}

/**
 * Send QR-only email (minimal - for manually registered guests)
 */
export async function sendQrOnlyEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  qrData: string,
  registrationId?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  // Generate QR code as attachment only (not embedded)
  let attachments: EmailAttachment[] | undefined;

  try {
    // Fetch sponsors for this session
    const eventSponsorships = await db.eventSponsorship.findMany({
      where: { sessionId: session.id },
      orderBy: { displayOrder: "asc" },
      include: { sponsor: true },
    });
    const sponsors = eventSponsorships
      .filter((es) => es.sponsor)
      .map((es) => ({
        name: es.sponsor!.name,
        logoUrl: es.sponsor!.logoUrl,
        type: es.sponsorshipType,
      }));

    const pdfBuffer = await generateBrandedQRPdf(qrData, {
      sessionTitle: session.title,
      sessionDate: session.date,
      attendeeName: name,
      locationUrl: session.locationUrl ?? undefined,
      sponsors,
    });
    if (pdfBuffer) {
      const pdfBase64 = pdfBuffer.toString("base64");
      attachments = [
        {
          filename: "qr-code.pdf",
          content: pdfBase64,
        },
      ];
    }
  } catch (err) {
    console.error("Failed to generate QR PDF for guest:", err);
  }

  const content = generateQrOnlyContent(
    name,
    session.title,
    dateStr,
    session.location
  );

  const html = createEmailTemplate({
    content,
    settings,
  });
  const text = `مرحباً ${name}،\n\nتم تأكيد حضورك في ${session.title}.\n\nالتاريخ: ${dateStr}\nالمكان: ${session.location || "سيتم الإعلان عنه لاحقاً"}\n\nيرجى إظهار رمز QR المرفق عند الوصول.`;

  return sendEmail({
    to: emailAddress,
    subject: `تأكيد الحضور - ${session.title}`,
    html,
    text,
    attachments,
    type: "qr_only",
    registrationId,
    sessionId: session.id,
  });
}

/**
 * Send thank you email to sponsor interest form submitter
 */
export async function sendSponsorThankYouEmail(
  emailAddress: string,
  name: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";

  const content = generateSponsorThankYouContent(name, siteName);

  const html = createEmailTemplate({ content, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: emailAddress,
    subject: `شكراً لاهتمامك بالرعاية - ${siteName}`,
    html,
    text,
    type: "sponsor_thank_you",
  });
}

// =============================================================================
// VALET EMAIL FUNCTIONS
// =============================================================================

interface ValetParkedEmailParams {
  to: string;
  guestName: string;
  eventName: string;
  vehicleInfo: string;
  parkingSlot: string;
  ticketNumber?: number;
  trackingUrl?: string;
}

/**
 * Send email when vehicle is parked by valet
 */
export async function sendValetParkedEmail({
  to,
  guestName,
  eventName,
  vehicleInfo,
  parkingSlot,
  ticketNumber,
  trackingUrl,
}: ValetParkedEmailParams): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";

  const ticketSection = ticketNumber !== undefined
    ? `<p style="margin: 5px 0;"><strong>رقم التذكرة:</strong> ${ticketNumber}</p>`
    : "";

  const trackingSection = trackingUrl
    ? `
    <div style="margin-top: 20px; text-align: center;">
      <a href="${trackingUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
        تتبع سيارتك وطلب الاسترجاع
      </a>
    </div>
    <p style="margin-top: 15px; text-align: center; font-size: 14px; color: #666;">
      أو انسخ هذا الرابط: <a href="${trackingUrl}" style="color: #10b981;">${trackingUrl}</a>
    </p>
    `
    : "";

  const content = `
    <h2 style="margin: 0 0 20px; color: #333;">تم ركن سيارتك</h2>
    <p>مرحباً ${guestName}،</p>
    <p>تم ركن سيارتك بنجاح من قِبَل فريق الفاليه.</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      ${ticketSection}
      <p style="margin: 5px 0;"><strong>السيارة:</strong> ${vehicleInfo || "غير محدد"}</p>
      <p style="margin: 5px 0;"><strong>موقع الركن:</strong> ${parkingSlot}</p>
    </div>
    ${trackingSection}
    <p style="margin-top: 20px;">سيتم إخطارك عندما تكون سيارتك جاهزة للاستلام.</p>
  `;

  const html = createEmailTemplate({ content, settings });
  const trackingText = trackingUrl ? `\n\nلتتبع سيارتك وطلب الاسترجاع: ${trackingUrl}` : "";
  const ticketText = ticketNumber !== undefined ? `رقم التذكرة: ${ticketNumber}\n` : "";
  const text = `مرحباً ${guestName}،\n\nتم ركن سيارتك بنجاح.\n\n${ticketText}السيارة: ${vehicleInfo || "غير محدد"}\nموقع الركن: ${parkingSlot}${trackingText}\n\nسيتم إخطارك عندما تكون سيارتك جاهزة للاستلام.\n\nفريق ${siteName}`;

  return sendEmail({
    to,
    subject: `تم ركن سيارتك - ${eventName}`,
    html,
    text,
    type: "valet_parked",
  });
}

interface ValetReadyEmailParams {
  to: string;
  guestName: string;
  eventName: string;
  vehicleInfo: string;
}

/**
 * Send email when vehicle is ready for pickup
 */
export async function sendValetReadyEmail({
  to,
  guestName,
  eventName,
  vehicleInfo,
}: ValetReadyEmailParams): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";

  const content = `
    <h2 style="margin: 0 0 20px; color: #333;">🚗 سيارتك جاهزة!</h2>
    <p>مرحباً ${guestName}،</p>
    <p>سيارتك جاهزة للاستلام!</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>السيارة:</strong> ${vehicleInfo || "غير محدد"}</p>
      <p style="margin: 5px 0;"><strong>موقع الاستلام:</strong> منطقة الفاليه الرئيسية</p>
    </div>
    <p>يرجى التوجه إلى منطقة الاستلام في أقرب وقت ممكن.</p>
  `;

  const html = createEmailTemplate({ content, settings });
  const text = `مرحباً ${guestName}،\n\nسيارتك جاهزة للاستلام!\n\nالسيارة: ${vehicleInfo || "غير محدد"}\nموقع الاستلام: منطقة الفاليه الرئيسية\n\nيرجى التوجه إلى منطقة الاستلام.\n\nفريق ${siteName}`;

  return sendEmail({
    to,
    subject: `سيارتك جاهزة! - ${eventName}`,
    html,
    text,
    type: "valet_ready",
  });
}

interface ValetBroadcastEmailParams {
  to: string;
  guestName: string;
  eventName: string;
  message: string;
}

/**
 * Send broadcast message to valet guests
 */
export async function sendValetBroadcastEmail({
  to,
  guestName,
  eventName,
  message,
}: ValetBroadcastEmailParams): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";

  const content = `
    <h2 style="margin: 0 0 20px; color: #333;">إشعار الفاليه</h2>
    <p>مرحباً ${guestName}،</p>
    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0; white-space: pre-wrap;">${message}</p>
    </div>
  `;

  const html = createEmailTemplate({ content, settings });
  const text = `مرحباً ${guestName}،\n\n${message}\n\nفريق ${siteName}`;

  return sendEmail({
    to,
    subject: `تحديث الفاليه - ${eventName}`,
    html,
    text,
    type: "valet_broadcast",
  });
}
