import { Resend } from "resend";
import { generateBrandedQRCode } from "./qr-branded";
import { db } from "@/server/db";
import { toSaudiTime } from "./timezone";

const resend = new Resend(process.env.RESEND_API_KEY);

// =============================================================================
// SETTINGS HELPER
// =============================================================================

interface EmailSettings {
  siteName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  linkedinUrl: string | null;
  whatsappNumber: string | null;
}

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
// EMAIL TEMPLATE
// =============================================================================

interface EmailTemplateOptions {
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  extraContent?: string; // For QR codes or additional content after button
  settings?: EmailSettings;
}

// =============================================================================
// BRAND COLORS (matching website theme)
// =============================================================================
const BRAND = {
  // Primary: Deep Emerald Green
  primary: "#166534",
  primaryDark: "#14532d",
  // Accent: Gold/Bronze
  accent: "#D4A853",
  accentLight: "#E8D5A8",
  // Backgrounds
  background: "#FAF8F5", // Cream
  cardBg: "#ffffff",
  footerBg: "#F5F3EF", // Light cream
  // Text
  textDark: "#1a2e1a", // Dark emerald-tinted
  textMuted: "#4B5563",
  textLight: "#6B7280",
  // Borders
  border: "#E8E4DC",
} as const;

/**
 * Create a unified branded email template
 * Uses table-based layout for maximum email client compatibility
 * Colors match the website's Emerald Green + Gold theme
 */
function createEmailTemplate({
  content,
  buttonText,
  buttonUrl,
  extraContent,
  settings,
}: EmailTemplateOptions): string {
  const siteName = settings?.siteName ?? "ثلوثية الأعمال";
  const contactEmail = settings?.contactEmail ?? "thlothyah@tda.sa";
  const contactPhone = settings?.contactPhone ?? "+966 50 000 0000";

  // Build social links array
  const socialLinks: { name: string; url: string }[] = [];
  if (settings?.instagramHandle) {
    socialLinks.push({
      name: "Instagram",
      url: `https://instagram.com/${settings.instagramHandle.replace("@", "")}`,
    });
  }
  if (settings?.twitterHandle) {
    socialLinks.push({
      name: "X",
      url: `https://twitter.com/${settings.twitterHandle.replace("@", "")}`,
    });
  }
  if (settings?.snapchatHandle) {
    socialLinks.push({
      name: "Snapchat",
      url: `https://snapchat.com/add/${settings.snapchatHandle.replace("@", "")}`,
    });
  }
  if (settings?.linkedinUrl) {
    socialLinks.push({ name: "LinkedIn", url: settings.linkedinUrl });
  }
  if (settings?.whatsappNumber) {
    socialLinks.push({
      name: "WhatsApp",
      url: `https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, "")}`,
    });
  }

  // Fallback to default social if none configured
  if (socialLinks.length === 0) {
    socialLinks.push(
      { name: "Instagram", url: "https://instagram.com/thlothyah" },
      { name: "X", url: "https://twitter.com/thlothyah" },
      { name: "Snapchat", url: "https://snapchat.com/add/thlothyah" }
    );
  }

  const socialLinksHtml = socialLinks
    .map(
      (link, i) =>
        `<a href="${link.url}" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">${link.name}</a>${i < socialLinks.length - 1 ? " &nbsp;|&nbsp; " : ""}`
    )
    .join("");
  const buttonHtml = buttonText && buttonUrl
    ? `
    <tr>
      <td align="center" style="padding: 24px 0 8px 0;">
        <table border="0" cellpadding="0" cellspacing="0" role="presentation">
          <tr>
            <td align="center" style="background-color: ${BRAND.primary}; border-radius: 8px;">
              <a href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: bold; color: #ffffff; text-decoration: none;">
                ${buttonText}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    `
    : "";

  const extraContentHtml = extraContent
    ? `<tr><td style="padding: 16px 0 0 0;">${extraContent}</td></tr>`
    : "";

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ثلوثية الأعمال</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Cairo', Arial, Helvetica, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND.background};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Main Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">

          <!-- Header with Emerald Green -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); padding: 28px 24px; border-radius: 12px 12px 0 0;">
              <!-- Gold decorative line -->
              <div style="width: 60px; height: 3px; background-color: ${BRAND.accent}; margin: 0 auto 16px auto; border-radius: 2px;"></div>

              <!-- Logo -->
              <img
                src="${process.env.BASE_URL || 'http://localhost:3000'}/logo.png"
                alt="${siteName}"
                width="80"
                height="80"
                style="display: block; margin: 0 auto 12px auto; border-radius: 50%; max-width: 80px;"
              />

              <!-- Brand Name -->
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #ffffff;">
                ${siteName}
              </h1>

              <div style="width: 60px; height: 3px; background-color: ${BRAND.accent}; margin: 16px auto 0 auto; border-radius: 2px;"></div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: ${BRAND.cardBg}; padding: 32px 28px; border-left: 1px solid ${BRAND.border}; border-right: 1px solid ${BRAND.border};">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="color: ${BRAND.textDark}; font-size: 16px; line-height: 1.7; text-align: right;">
                    ${content}
                  </td>
                </tr>
                ${buttonHtml}
                ${extraContentHtml}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.footerBg}; padding: 24px 28px; border-radius: 0 0 12px 12px; border: 1px solid ${BRAND.border}; border-top: none;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <!-- Contact Info -->
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 14px;">
                      للتواصل والاستفسارات
                    </p>
                    <p style="margin: 0 0 4px 0; color: ${BRAND.textMuted}; font-size: 14px;">
                      ${contactEmail}
                    </p>
                    <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px; direction: ltr;">
                      ${contactPhone}
                    </p>
                  </td>
                </tr>
                <!-- Social Links -->
                <tr>
                  <td align="center" style="padding-top: 12px; border-top: 1px solid ${BRAND.border};">
                    <p style="margin: 12px 0 0 0; color: ${BRAND.textLight}; font-size: 13px;">
                      تابعونا: ${socialLinksHtml}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

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

  const contactEmail = settings?.contactEmail ?? "thlothyah@tda.sa";
  const contactPhone = settings?.contactPhone ?? "+966 50 000 0000";

  // Build social links text
  const socialNames: string[] = [];
  if (settings?.instagramHandle) socialNames.push("Instagram");
  if (settings?.twitterHandle) socialNames.push("X");
  if (settings?.snapchatHandle) socialNames.push("Snapchat");
  if (settings?.linkedinUrl) socialNames.push("LinkedIn");
  if (settings?.whatsappNumber) socialNames.push("WhatsApp");
  const socialText = socialNames.length > 0 ? socialNames.join(" | ") : "Instagram | X | Snapchat - @thlothyah";

  const footer = `

---
للتواصل والاستفسارات:
${contactEmail}
${contactPhone}

تابعونا على: ${socialText}
`;

  return plainContent + buttonSection + footer;
}

// =============================================================================
// SESSION INFO
// =============================================================================

interface SessionInfo {
  title: string;
  sessionNumber: number;
  date: Date;
  location: string | null;
  slug: string | null;
  id: string;
  sendQrInEmail?: boolean;
}

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

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">تم تأكيد تسجيلك في:</p>
    <p style="margin: 0 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${session.title}</strong></p>
    <p style="margin: 0 0 16px 0; color: ${BRAND.textLight};">التجمع رقم ${session.sessionNumber}</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: ${BRAND.footerBg}; border-radius: 8px; width: 100%; border: 1px solid ${BRAND.border};">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${session.location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 16px 0 0 0;">نتطلع لرؤيتك معنا!</p>
  `;

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

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">شكراً لتسجيلك في:</p>
    <p style="margin: 0 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${session.title}</strong></p>
    <p style="margin: 0 0 16px 0; color: ${BRAND.textLight};">التجمع رقم ${session.sessionNumber}</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: ${BRAND.footerBg}; border-radius: 8px; width: 100%; border: 1px solid ${BRAND.border};">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${session.location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 16px 0 0 0; padding: 12px 16px; background-color: ${BRAND.accentLight}; border-radius: 8px; color: #78621f; border: 1px solid ${BRAND.accent};">
      تسجيلك قيد المراجعة وسيتم إخطارك بالموافقة قريباً.
    </p>
  `;

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
 * Send registration confirmed email with optional branded QR code
 * @param qrCheckInData - The raw QR check-in data (JSON string) to encode in the QR
 */
export async function sendConfirmedEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  qrCheckInData?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  let qrSection = "";
  let attachments: EmailAttachment[] | undefined;

  // Generate branded QR code if data provided and enabled
  if (qrCheckInData && session.sendQrInEmail) {
    const brandedQrBuffer = await generateBrandedQRCode(qrCheckInData, {
      sessionTitle: session.title,
      sessionDate: formatDateOnly(session.date),
      sessionTime: formatTimeOnly(session.date),
      attendeeName: name,
    });

    if (brandedQrBuffer) {
      qrSection = `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto; text-align: center;" align="center">
          <tr>
            <td align="center" style="padding: 0;">
              <img src="cid:qrcode" alt="QR Code" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 12px;">
            </td>
          </tr>
        </table>
      `;
      attachments = [
        {
          filename: "qrcode.png",
          content: brandedQrBuffer.toString("base64"),
          content_id: "qrcode",
        },
      ];
    }
  }

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">تم تأكيد تسجيلك في:</p>
    <p style="margin: 0 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${session.title}</strong></p>
    <p style="margin: 0 0 16px 0; color: ${BRAND.textLight};">التجمع رقم ${session.sessionNumber}</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: ${BRAND.footerBg}; border-radius: 8px; width: 100%; border: 1px solid ${BRAND.border};">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${session.location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 16px 0 0 0;">نتطلع لرؤيتك معنا!</p>
  `;

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
 * @param qrCheckInData - The raw QR check-in data (JSON string) to encode in the QR
 */
export async function sendCompanionEmail(
  emailAddress: string,
  companionName: string,
  registrantName: string,
  session: SessionInfo,
  isApproved = false,
  qrCheckInData?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const dateStr = formatSessionDate(session.date);

  let statusMessage: string;
  let qrSection = "";
  let attachments: EmailAttachment[] | undefined;

  if (isApproved) {
    statusMessage = `<p style="margin: 16px 0 0 0;">نتطلع لرؤيتك معنا!</p>`;

    // Generate branded QR code if data provided and enabled
    if (qrCheckInData && session.sendQrInEmail) {
      const brandedQrBuffer = await generateBrandedQRCode(qrCheckInData, {
        sessionTitle: session.title,
        sessionDate: formatDateOnly(session.date),
        sessionTime: formatTimeOnly(session.date),
        attendeeName: companionName,
      });

      if (brandedQrBuffer) {
        qrSection = `
          <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto; text-align: center;" align="center">
            <tr>
              <td align="center" style="padding: 0;">
                <img src="cid:qrcode" alt="QR Code" style="max-width: 400px; width: 100%; height: auto; display: block; margin: 0 auto; border-radius: 12px;">
              </td>
            </tr>
          </table>
        `;
        attachments = [
          {
            filename: "qrcode.png",
            content: brandedQrBuffer.toString("base64"),
            content_id: "qrcode",
          },
        ];
      }
    }
  } else {
    statusMessage = `
      <p style="margin: 16px 0 0 0; padding: 12px 16px; background-color: ${BRAND.accentLight}; border-radius: 8px; color: #78621f; border: 1px solid ${BRAND.accent};">
        تسجيلك قيد المراجعة وسيتم إخطارك بالموافقة قريباً.
      </p>
    `;
  }

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${companionName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">تم تسجيلك كمرافق للأستاذ/ة <strong>${registrantName}</strong> في:</p>
    <p style="margin: 0 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${session.title}</strong></p>
    <p style="margin: 0 0 16px 0; color: ${BRAND.textLight};">التجمع رقم ${session.sessionNumber}</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: ${BRAND.footerBg}; border-radius: 8px; width: 100%; border: 1px solid ${BRAND.border};">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${session.location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>
    ${statusMessage}
  `;

  const html = createEmailTemplate({ content, extraContent: qrSection, settings });
  const text = createPlainText(content, undefined, undefined, settings);

  return sendEmail({
    to: emailAddress,
    subject: `تم تسجيلك كمرافق - ${session.title}`,
    html,
    text,
    attachments,
  });
}

/**
 * Send welcome email to newly registered user
 */
export async function sendWelcomeEmail(
  emailAddress: string,
  name: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const loginUrl = `${baseUrl}/user/login`;

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">أهلاً بك في <strong style="color: ${BRAND.primary};">${siteName}</strong>!</p>
    <p style="margin: 0 0 12px 0;">تم إنشاء حسابك بنجاح. يمكنك الآن:</p>
    <ul style="margin: 0 0 16px 0; padding-right: 20px; color: ${BRAND.textMuted};">
      <li style="margin-bottom: 8px;">التسجيل في الأحداث القادمة</li>
      <li style="margin-bottom: 8px;">متابعة حالة تسجيلاتك</li>
      <li>استعراض سجل حضورك</li>
    </ul>
    <p style="margin: 16px 0 0 0;">نتطلع لرؤيتك في أحداثنا القادمة!</p>
  `;

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
 * Send password reset email to user
 */
export async function sendPasswordResetEmail(
  emailAddress: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.</p>
    <p style="margin: 0 0 16px 0;">اضغط على الزر أدناه لإعادة تعيين كلمة المرور:</p>
    <p style="margin: 24px 0; padding: 12px 16px; background-color: ${BRAND.accentLight}; border-radius: 8px; color: #78621f; font-size: 14px; border: 1px solid ${BRAND.accent};">
      هذا الرابط صالح لمدة ساعة واحدة فقط.
    </p>
    <p style="margin: 16px 0 0 0; color: ${BRAND.textLight}; font-size: 14px;">
      إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة.
    </p>
  `;

  const html = createEmailTemplate({
    content,
    buttonText: "إعادة تعيين كلمة المرور",
    buttonUrl: resetUrl,
    settings,
  });
  const text = createPlainText(content, "إعادة تعيين كلمة المرور", resetUrl, settings);

  return sendEmail({
    to: emailAddress,
    subject: `إعادة تعيين كلمة المرور - ${siteName}`,
    html,
    text,
  });
}

/**
 * Send invitation email with registration link
 */
export async function sendInvitationEmail(
  emailAddress: string,
  session: SessionInfo,
  token: string,
  customMessage?: string
): Promise<boolean> {
  const settings = await getEmailSettings();
  const siteName = settings.siteName ?? "ثلوثية الأعمال";
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const registrationLink = `${baseUrl}/event/${session.slug || session.id}/register?token=${token}`;

  const saudiDate = toSaudiTime(session.date);
  const dateStr = saudiDate?.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }) ?? "";
  const timeStr = saudiDate?.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  }) ?? "";

  if (customMessage) {
    // For custom messages, use simple format with link replacement
    const body = customMessage.replace("[رابط التسجيل]", registrationLink);
    return sendEmail({
      to: emailAddress,
      subject: `دعوة خاصة - ${session.title}`,
      text: body,
    });
  }

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً،</p>
    <p style="margin: 0 0 16px 0;">نود دعوتك لحضور حدث <strong style="color: ${BRAND.primary};">"${session.title}"</strong> في ${siteName}.</p>
    <p style="margin: 0 0 12px 0; font-weight: bold;">تفاصيل الحدث:</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 0 16px 0; background-color: ${BRAND.footerBg}; border-radius: 8px; width: 100%; border: 1px solid ${BRAND.border};">
      <tr>
        <td style="padding: 16px;">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>الوقت:</strong> ${timeStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${session.location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>
    <p style="margin: 0 0 16px 0; padding: 12px 16px; background-color: #e8f5e9; border-radius: 8px; color: ${BRAND.primaryDark}; border: 1px solid ${BRAND.primary};">
      هذه دعوة خاصة. استخدم الزر أدناه للتسجيل.
    </p>
    <p style="margin: 16px 0 0 0;">نتطلع لرؤيتك معنا!</p>
  `;

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
