/**
 * Shared Email Templates
 * Used by both email.ts (for sending) and email-preview page (for previewing)
 */

import { BRAND } from "./brand";

// =============================================================================
// TYPES
// =============================================================================

export interface EmailSettings {
  siteName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  twitterHandle: string | null;
  instagramHandle: string | null;
  snapchatHandle: string | null;
  linkedinUrl: string | null;
  whatsappNumber: string | null;
}

export interface SessionInfo {
  title: string;
  sessionNumber: number;
  date: Date;
  location: string | null;
  slug: string | null;
  id: string;
  sendQrInEmail?: boolean;
}

export interface EmailTemplateOptions {
  content: string;
  buttonText?: string;
  buttonUrl?: string;
  extraContent?: string;
  settings?: EmailSettings;
}

// =============================================================================
// DATE FORMATTING (for preview - actual emails use toSaudiTime)
// =============================================================================

export function formatSessionDatePreview(date: Date): string {
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnlyPreview(date: Date): string {
  return date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatTimeOnlyPreview(date: Date): string {
  return date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// EMAIL TEMPLATE WRAPPER
// =============================================================================

/**
 * Create a unified branded email template
 * Uses table-based layout for maximum email client compatibility
 */
export function createEmailTemplate({
  content,
  buttonText,
  buttonUrl,
  extraContent,
  settings,
}: EmailTemplateOptions): string {
  const siteName = settings?.siteName ?? "ثلوثية الأعمال";
  const contactEmail = settings?.contactEmail;
  const contactPhone = settings?.contactPhone;

  // Build social links array (no fallbacks - only show if configured)
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

  // Build social links HTML only if there are links
  const socialLinksHtml = socialLinks.length > 0
    ? socialLinks
        .map(
          (link, i) =>
            `<a href="${link.url}" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">${link.name}</a>${i < socialLinks.length - 1 ? " &nbsp;|&nbsp; " : ""}`
        )
        .join("")
    : "";

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

  const baseUrl = typeof process !== "undefined" && process.env?.BASE_URL
    ? process.env.BASE_URL
    : "http://localhost:3000";

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
                src="${baseUrl}/logo.png"
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

          <!-- Accent Bar -->
          <tr>
            <td style="background: linear-gradient(90deg, ${BRAND.accent} 0%, ${BRAND.accentLight} 50%, ${BRAND.accent} 100%); height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
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
                ${contactEmail || contactPhone ? `
                <!-- Contact Info -->
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <p style="margin: 0 0 8px 0; color: ${BRAND.textLight}; font-size: 14px;">
                      للتواصل والاستفسارات
                    </p>
                    ${contactEmail ? `<p style="margin: 0 0 4px 0; color: ${BRAND.textMuted}; font-size: 14px;">${contactEmail}</p>` : ""}
                    ${contactPhone ? `<p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px; direction: ltr;">${contactPhone}</p>` : ""}
                  </td>
                </tr>
                ` : ""}
                ${socialLinksHtml ? `
                <!-- Social Links -->
                <tr>
                  <td align="center" style="${contactEmail || contactPhone ? `padding-top: 12px; border-top: 1px solid ${BRAND.border};` : ""}">
                    <p style="margin: ${contactEmail || contactPhone ? "12px" : "0"} 0 0 0; color: ${BRAND.textLight}; font-size: 13px;">
                      تابعونا: ${socialLinksHtml}
                    </p>
                  </td>
                </tr>
                ` : ""}
                <!-- Copyright -->
                <tr>
                  <td align="center" style="padding-top: 16px;">
                    <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 12px;">
                      جميع الحقوق محفوظة لـ <a href="https://tda.sa" style="color: ${BRAND.primary}; text-decoration: none;">TDA</a>
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

// =============================================================================
// CONTENT GENERATORS
// =============================================================================

/**
 * Generate confirmation email content (simple registration confirmed)
 */
export function generateConfirmationContent(
  name: string,
  sessionTitle: string,
  dateStr: string,
  location: string | null
): string {
  return `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0; line-height: 1.7;">
      يسعدنا إبلاغك بأن تسجيلك قد تم بنجاح. أنت الآن مسجّل رسمياً في الحدث القادم، ونحن متحمسون لاستقبالك.
    </p>
    <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${sessionTitle}</strong></p>

    <!-- Event Details Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>

    <!-- Decorative Divider -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
      <tr>
        <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
      </tr>
    </table>

    <p style="margin: 0; color: ${BRAND.textLight}; font-style: italic;">نتطلع لرؤيتك معنا .. خلك جاهز لجلسة ملهمة!</p>
  `;
}

/**
 * Generate pending email content (awaiting approval)
 */
export function generatePendingContent(
  name: string,
  sessionTitle: string,
  dateStr: string,
  location: string | null
): string {
  return `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${sessionTitle}</strong></p>

    <!-- Event Details Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.accent}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>

    <!-- Status Message -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.accentLight}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.highlightBg};">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND.accent};">طلبك قيد المراجعة</p>
          <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px; line-height: 1.6;">
            سعدنا باهتمامك بالتسجيل في ${sessionTitle}.<br/>
            تم استلام تسجيلك بنجاح، وحاليًا الطلب قيد المراجعة، وبنرجع لك قريب نأكد لك حالة التسجيل.
          </p>
        </td>
      </tr>
    </table>

    <!-- Decorative Divider -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
      <tr>
        <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
      </tr>
    </table>

    <p style="margin: 0; color: ${BRAND.textLight}; font-style: italic;">خلّك جاهز للجلسة مع الناس الملهمين ..</p>
  `;
}

/**
 * Generate confirmed email content (registration approved)
 */
export function generateConfirmedContent(
  name: string,
  sessionTitle: string,
  dateStr: string,
  location: string | null,
  showQrInstructions: boolean = false
): string {
  const qrInstructions = showQrInstructions ? `
    <!-- QR Instructions -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0; width: 100%;">
      <tr>
        <td style="padding: 16px; background-color: ${BRAND.highlightBg}; border-radius: 8px; border-right: 4px solid ${BRAND.accent};">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND.primary};">رمز الدخول</p>
          <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px;">أظهر رمز QR أدناه عند الوصول للدخول السريع</p>
        </td>
      </tr>
    </table>
  ` : "";

  return `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 8px 0; padding: 12px 16px; background-color: #E8F5E9; border-radius: 8px; color: #2E7D32; border: 1px solid #C8E6C9;">
      تم تأكيد تسجيلك بنجاح!
    </p>
    <p style="margin: 0 0 16px 0; line-height: 1.7;">
      يسرّنا إبلاغك بأنه تمت الموافقة على طلب تسجيلك. أنت الآن مؤكد للحضور، ونتطلع لرؤيتك في الحدث.
    </p>
    <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${sessionTitle}</strong></p>

    <!-- Event Details Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>
    ${qrInstructions}

    <!-- Decorative Divider -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
      <tr>
        <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
      </tr>
    </table>

    <p style="margin: 0; color: ${BRAND.textLight}; font-style: italic;">نتطلع لرؤيتك معنا .. خلك جاهز لجلسة ملهمة!</p>
  `;
}

/**
 * Generate companion email content (pending or approved)
 */
export function generateCompanionContent(
  companionName: string,
  registrantName: string,
  sessionTitle: string,
  dateStr: string,
  location: string | null,
  isApproved: boolean,
  showQrInstructions: boolean = false
): string {
  let statusMessage: string;

  if (isApproved) {
    statusMessage = `
      <p style="margin: 0 0 8px 0; padding: 12px 16px; background-color: #E8F5E9; border-radius: 8px; color: #2E7D32; border: 1px solid #C8E6C9;">
        تم تأكيد تسجيلك بنجاح!
      </p>

      ${showQrInstructions ? `
      <!-- QR Instructions -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0; width: 100%;">
        <tr>
          <td style="padding: 16px; background-color: ${BRAND.highlightBg}; border-radius: 8px; border-right: 4px solid ${BRAND.accent};">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND.primary};">رمز الدخول</p>
            <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px;">أظهر رمز QR أدناه عند الوصول للدخول السريع</p>
          </td>
        </tr>
      </table>
      ` : ""}

      <!-- Decorative Divider -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
        <tr>
          <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
        </tr>
      </table>

      <p style="margin: 0; color: ${BRAND.textLight}; font-style: italic;">نتطلع لرؤيتك معنا .. خلك جاهز لجلسة ملهمة!</p>
    `;
  } else {
    statusMessage = `
      <!-- Status Message -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0; width: 100%; border-radius: 8px; overflow: hidden;">
        <tr>
          <td style="background-color: ${BRAND.accentLight}; width: 4px;"></td>
          <td style="padding: 16px; background-color: ${BRAND.highlightBg};">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND.accent};">طلبك قيد المراجعة</p>
            <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px; line-height: 1.6;">
              سعدنا باهتمامك بالتسجيل في ${sessionTitle}.<br/>
              تم استلام تسجيلك بنجاح، وحاليًا الطلب قيد المراجعة، وبنرجع لك قريب نأكد لك حالة التسجيل.
            </p>
          </td>
        </tr>
      </table>

      <!-- Decorative Divider -->
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
        <tr>
          <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
        </tr>
      </table>

      <p style="margin: 0; color: ${BRAND.textLight}; font-style: italic;">خلّك جاهز للجلسة مع الناس الملهمين ..</p>
    `;
  }

  return `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${companionName}</strong>,</p>
    <p style="margin: 0 0 16px 0;">تم تسجيلك كمرافق للأستاذ/ة <strong>${registrantName}</strong> في:</p>
    <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${sessionTitle}</strong></p>

    <!-- Event Details Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.accent}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>
    ${statusMessage}
  `;
}

/**
 * Generate welcome email content (new user)
 */
export function generateWelcomeContent(
  name: string,
  siteName: string
): string {
  return `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0; line-height: 1.7;">
      أهلاً وسهلاً بك في <strong style="color: ${BRAND.primary};">${siteName}</strong>! تم إنشاء حسابك بنجاح، وأنت الآن جزء من مجتمعنا المميز من رواد الأعمال والمهتمين.
    </p>

    <!-- Features Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
          <p style="margin: 0 0 12px 0; font-weight: bold; color: ${BRAND.primary};">يمكنك الآن:</p>
          <ul style="margin: 0; padding-right: 20px; color: ${BRAND.textMuted};">
            <li style="margin-bottom: 8px;">التسجيل في الأحداث القادمة</li>
            <li style="margin-bottom: 8px;">متابعة حالة تسجيلاتك</li>
            <li>استعراض سجل حضورك</li>
          </ul>
        </td>
      </tr>
    </table>

    <!-- Decorative Divider -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
      <tr>
        <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
      </tr>
    </table>

    <p style="margin: 0; color: ${BRAND.textLight}; font-style: italic;">نتطلع لرؤيتك في أحداثنا القادمة!</p>
  `;
}

/**
 * Generate password reset email content
 */
export function generatePasswordResetContent(
  name: string
): string {
  return `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 16px 0; line-height: 1.7;">
      وصلنا طلب لإعادة تعيين كلمة المرور الخاصة بحسابك. إذا كنت أنت من قدّم هذا الطلب، اضغط على الزر أدناه لإنشاء كلمة مرور جديدة.
    </p>

    <!-- Warning Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.accent}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.highlightBg};">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND.accent};">ملاحظة مهمة</p>
          <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px;">هذا الرابط صالح لمدة ساعة واحدة فقط.</p>
        </td>
      </tr>
    </table>

    <!-- Decorative Divider -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
      <tr>
        <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
      </tr>
    </table>

    <p style="margin: 0; color: ${BRAND.textLight}; font-size: 14px;">
      إذا لم تطلب إعادة تعيين كلمة المرور، يمكنك تجاهل هذه الرسالة بأمان.
    </p>
  `;
}

/**
 * Generate invitation email content
 */
export function generateInvitationContent(
  sessionTitle: string,
  siteName: string,
  dateStr: string,
  timeStr: string,
  location: string | null
): string {
  return `
    <p style="margin: 0 0 16px 0;">مرحباً،</p>
    <p style="margin: 0 0 16px 0; line-height: 1.7;">
      يسرّنا دعوتك لحضور <strong style="color: ${BRAND.primary};">"${sessionTitle}"</strong> ضمن فعاليات ${siteName}. هذه دعوة خاصة مقدّمة لك، ونتشرف بحضورك.
    </p>

    <!-- Event Details Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
          <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0 0 8px 0;"><strong>الوقت:</strong> ${timeStr}</p>
          <p style="margin: 0;"><strong>المكان:</strong> ${location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>

    <!-- Invitation Note -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.accent}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.highlightBg};">
          <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px;">هذه دعوة خاصة. استخدم الزر أدناه للتسجيل.</p>
        </td>
      </tr>
    </table>

    <!-- Decorative Divider -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px 0 16px 0; width: 100%;">
      <tr>
        <td style="border-bottom: 2px dashed ${BRAND.accentLight};">&nbsp;</td>
      </tr>
    </table>

    <p style="margin: 0; color: ${BRAND.textLight}; font-style: italic;">نتطلع لرؤيتك معنا!</p>
  `;
}

/**
 * Generate QR-only email content (minimal - for manually registered guests)
 */
export function generateQrOnlyContent(
  name: string,
  sessionTitle: string,
  dateStr: string,
  location: string | null
): string {
  return `
    <p style="margin: 0 0 16px 0;">مرحباً <strong>${name}</strong>,</p>
    <p style="margin: 0 0 8px 0; padding: 12px 16px; background-color: #E8F5E9; border-radius: 8px; color: #2E7D32; border: 1px solid #C8E6C9;">
      تم تأكيد حضورك!
    </p>
    <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${sessionTitle}</strong></p>

    <!-- Event Details Box -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
      <tr>
        <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
        <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
          <p style="margin: 0 0 8px 0;"><strong>📅 التاريخ:</strong> ${dateStr}</p>
          <p style="margin: 0;"><strong>📍 المكان:</strong> ${location || "سيتم الإعلان عنه لاحقاً"}</p>
        </td>
      </tr>
    </table>

    <!-- QR Instructions -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0; width: 100%;">
      <tr>
        <td style="padding: 16px; background-color: ${BRAND.highlightBg}; border-radius: 8px; border-right: 4px solid ${BRAND.accent};">
          <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND.primary};">رمز الدخول</p>
          <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px;">امسح رمز QR أدناه عند الوصول للتسجيل</p>
        </td>
      </tr>
    </table>
  `;
}

// =============================================================================
// QR CODE SECTION
// =============================================================================

export function generateQrSection(qrDataUrl: string): string {
  return `
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px auto; width: 100%;">
      <tr>
        <td align="center">
          <img src="${qrDataUrl}" alt="QR Code" width="200" height="200" style="display: block; max-width: 200px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);" />
        </td>
      </tr>
    </table>
  `;
}
