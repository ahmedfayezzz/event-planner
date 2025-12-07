import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
}: EmailTemplateOptions): string {
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
              <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">
                ثلوثية الأعمال
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
                      thlothyah@tda.sa
                    </p>
                    <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px; direction: ltr;">
                      +966 50 000 0000
                    </p>
                  </td>
                </tr>
                <!-- Social Links -->
                <tr>
                  <td align="center" style="padding-top: 12px; border-top: 1px solid ${BRAND.border};">
                    <p style="margin: 12px 0 0 0; color: ${BRAND.textLight}; font-size: 13px;">
                      تابعونا:
                      <a href="https://instagram.com/thlothyah" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">Instagram</a>
                      &nbsp;|&nbsp;
                      <a href="https://twitter.com/thlothyah" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">X</a>
                      &nbsp;|&nbsp;
                      <a href="https://snapchat.com/add/thlothyah" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">Snapchat</a>
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
function createPlainText(content: string, buttonText?: string, buttonUrl?: string): string {
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

  const footer = `

---
للتواصل والاستفسارات:
thlothyah@tda.sa
+966 50 000 0000

تابعونا على: Instagram | X | Snapchat - @thlothyah
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
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
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

  const html = createEmailTemplate({ content });
  const text = createPlainText(content);

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

  const html = createEmailTemplate({ content });
  const text = createPlainText(content);

  return sendEmail({
    to: emailAddress,
    subject: `استلام التسجيل - ${session.title}`,
    html,
    text,
  });
}

/**
 * Send registration confirmed email with optional QR code
 */
export async function sendConfirmedEmail(
  emailAddress: string,
  name: string,
  session: SessionInfo,
  qrData?: string
): Promise<boolean> {
  const dateStr = formatSessionDate(session.date);

  let qrSection = "";
  if (qrData && session.sendQrInEmail) {
    qrSection = `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto; text-align: center;" align="center">
        <tr>
          <td align="center" style="padding: 20px; background-color: ${BRAND.footerBg}; border-radius: 12px; border: 1px solid ${BRAND.border};">
            <p style="margin: 0 0 12px 0; font-weight: bold; color: ${BRAND.textDark};">رمز الحضور الخاص بك:</p>
            <img src="cid:qrcode" alt="QR Code" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
            <p style="margin: 12px 0 0 0; font-size: 13px; color: ${BRAND.textLight};">أظهر هذا الرمز عند الحضور</p>
          </td>
        </tr>
      </table>
    `;
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

  const html = createEmailTemplate({ content, extraContent: qrSection });
  const text = createPlainText(content);

  // Build attachments if QR code provided
  let attachments: EmailAttachment[] | undefined;
  if (qrData && session.sendQrInEmail) {
    if (qrData.startsWith("data:image/png;base64,")) {
      const qrBase64 = qrData.split(",")[1];
      attachments = [
        {
          filename: "qrcode.png",
          content: qrBase64,
          content_id: "qrcode",
        },
      ];
    }
  }

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
  emailAddress: string,
  companionName: string,
  registrantName: string,
  session: SessionInfo,
  isApproved = false,
  qrData?: string
): Promise<boolean> {
  const dateStr = formatSessionDate(session.date);

  let statusMessage: string;
  let qrSection = "";

  if (isApproved) {
    statusMessage = `<p style="margin: 16px 0 0 0;">نتطلع لرؤيتك معنا!</p>`;
    if (qrData && session.sendQrInEmail) {
      qrSection = `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto; text-align: center;" align="center">
          <tr>
            <td align="center" style="padding: 20px; background-color: ${BRAND.footerBg}; border-radius: 12px; border: 1px solid ${BRAND.border};">
              <p style="margin: 0 0 12px 0; font-weight: bold; color: ${BRAND.textDark};">رمز الحضور الخاص بك:</p>
              <img src="cid:qrcode" alt="QR Code" style="max-width: 180px; height: auto; display: block; margin: 0 auto;">
              <p style="margin: 12px 0 0 0; font-size: 13px; color: ${BRAND.textLight};">أظهر هذا الرمز عند الحضور</p>
            </td>
          </tr>
        </table>
      `;
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

  const html = createEmailTemplate({ content, extraContent: qrSection });
  const text = createPlainText(content);

  // Build attachments if QR code provided
  let attachments: EmailAttachment[] | undefined;
  if (isApproved && qrData && session.sendQrInEmail) {
    if (qrData.startsWith("data:image/png;base64,")) {
      const qrBase64 = qrData.split(",")[1];
      attachments = [
        {
          filename: "qrcode.png",
          content: qrBase64,
          content_id: "qrcode",
        },
      ];
    }
  }

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
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const loginUrl = `${baseUrl}/user/login`;

  const content = `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0;">أهلاً بك في <strong style="color: ${BRAND.primary};">ثلوثية الأعمال</strong>!</p>
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
  });
  const text = createPlainText(content, "تسجيل الدخول", loginUrl);

  return sendEmail({
    to: emailAddress,
    subject: "مرحباً بك في ثلوثية الأعمال",
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
  });
  const text = createPlainText(content, "إعادة تعيين كلمة المرور", resetUrl);

  return sendEmail({
    to: emailAddress,
    subject: "إعادة تعيين كلمة المرور - ثلوثية الأعمال",
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
  const baseUrl = process.env.BASE_URL || "http://localhost:3000";
  const registrationLink = `${baseUrl}/event/${session.slug || session.id}/register?token=${token}`;

  const dateStr = session.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = session.date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

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
    <p style="margin: 0 0 16px 0;">نود دعوتك لحضور حدث <strong style="color: ${BRAND.primary};">"${session.title}"</strong> في ثلوثية الأعمال.</p>
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
  });
  const text = createPlainText(content, "التسجيل الآن", registrationLink);

  return sendEmail({
    to: emailAddress,
    subject: `دعوة خاصة - ${session.title}`,
    html,
    text,
  });
}
