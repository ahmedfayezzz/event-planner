import { Resend } from "resend";
import { generateBrandedQRCode } from "./qr-branded";
import { db } from "@/server/db";
import { toSaudiTime } from "./timezone";
import {
  createEmailTemplate,
  generateConfirmationContent,
  generatePendingContent,
  generateConfirmedContent,
  generateCompanionContent,
  generateWelcomeContent,
  generatePasswordResetContent,
  generateInvitationContent,
  generateQrSection,
  type EmailSettings,
  type SessionInfo,
} from "./email-templates";

// Re-export types for external use
export type { EmailSettings, SessionInfo };

const resend = new Resend(process.env.RESEND_API_KEY);

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
  content_id?: string;
}

interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
}

/**
 * Base email sending function using Resend
 */
export async function sendEmail({
  to,
  subject,
  text,
  html,
  attachments,
}: SendEmailParams): Promise<boolean> {
  const recipient = Array.isArray(to) ? to : [to];

  try {
    const fromEmail = process.env.FROM_EMAIL;

    if (!process.env.RESEND_API_KEY) {
      console.warn(`RESEND_API_KEY not configured - email not sent to ${recipient.join(", ")}`);
      return false;
    }

    if (!fromEmail) {
      console.warn(`FROM_EMAIL not configured - email not sent to ${recipient.join(", ")}`);
      return false;
    }

    const mappedAttachments = attachments
      ? attachments.map((a) => ({
          filename: a.filename,
          content: Buffer.from(a.content, "base64"),
        }))
      : undefined;

    console.log(`Sending email to ${recipient.join(", ")}: ${subject}`);

    // Resend requires at least one of: text, html, or react template
    const response = await resend.emails.send({
      from: fromEmail,
      to: recipient,
      subject,
      text: text ?? "",
      html,
      attachments: mappedAttachments,
    });

    console.log(`Email sent successfully to ${recipient.join(", ")} (id: ${response.data?.id ?? "unknown"})`);
    return true;
  } catch (error) {
    console.error(`Email sending failed to ${recipient.join(", ")}:`, error);
    return false;
  }
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
  });
}

function formatTimeOnly(date: Date): string {
  // Convert UTC to Saudi time for email display
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";
  return saudiDate.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  session: SessionInfo
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
  });
}

/**
 * Send registration received email (pending approval)
 */
export async function sendPendingEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo
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
  });
}

/**
 * Send confirmation email with optional QR code (registration approved)
 */
export async function sendConfirmedEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  qrData?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  // Generate QR code if provided and enabled
  let qrSection = "";
  let attachments: EmailAttachment[] | undefined;

  if (qrData && session.sendQrInEmail) {
    try {
      const qrBuffer = await generateBrandedQRCode(qrData, {
        sessionTitle: session.title,
        sessionDate: formatDateOnly(session.date),
        sessionTime: formatTimeOnly(session.date),
        attendeeName: name,
      });
      if (qrBuffer) {
        const qrBase64 = qrBuffer.toString("base64");
        const qrDataUrl = `data:image/png;base64,${qrBase64}`;
        qrSection = generateQrSection(qrDataUrl);
        attachments = [
          {
            filename: "qr-code.png",
            content: qrBase64,
            content_id: "qrcode",
          },
        ];
      }
    } catch (err) {
      console.error("Failed to generate QR code:", err);
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

  const html = createEmailTemplate({ content, extraContent: qrSection, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: emailAddress,
    subject: `تأكيد التسجيل - ${session.title}`,
    html,
    text,
    attachments,
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
  qrData?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  let qrSection = "";
  let attachments: EmailAttachment[] | undefined;

  if (isApproved && qrData && session.sendQrInEmail) {
    try {
      const qrBuffer = await generateBrandedQRCode(qrData, {
        sessionTitle: session.title,
        sessionDate: formatDateOnly(session.date),
        sessionTime: formatTimeOnly(session.date),
        attendeeName: companionName,
      });
      if (qrBuffer) {
        const qrBase64 = qrBuffer.toString("base64");
        const qrDataUrl = `data:image/png;base64,${qrBase64}`;
        qrSection = generateQrSection(qrDataUrl);
        attachments = [
          {
            filename: "qr-code.png",
            content: qrBase64,
            content_id: "qrcode",
          },
        ];
      }
    } catch (err) {
      console.error("Failed to generate companion QR code:", err);
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

  const html = createEmailTemplate({ content, extraContent: qrSection, settings });
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
  });
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  emailAddress: string,
  session: SessionInfo,
  registrationLink: string,
  useHtml: boolean = true
): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";
  const dateStr = formatDateOnly(session.date);
  const timeStr = formatTimeOnly(session.date);

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
  });
}
