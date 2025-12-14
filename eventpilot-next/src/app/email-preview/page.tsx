"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

// Sample data for email previews
const SAMPLE_SESSION = {
  title: "ثلوثية الأعمال - لقاء رواد الأعمال",
  sessionNumber: 42,
  date: new Date("2025-01-21T18:00:00"),
  location: "فندق الريتز كارلتون، الرياض",
  slug: "business-tuesday-42",
  id: "sample-session-id",
};

const SAMPLE_NAME = "أحمد محمد";
const SAMPLE_EMAIL = "ahmed@example.com";
const SAMPLE_COMPANION_NAME = "خالد علي";
const SAMPLE_REGISTRANT_NAME = "سارة أحمد";

// Email template types
const EMAIL_TYPES = [
  { id: "confirmation", label: "تأكيد التسجيل", description: "يُرسل عند تسجيل عضو (بدون موافقة)" },
  { id: "pending", label: "استلام التسجيل", description: "يُرسل عند تسجيل ضيف (قيد المراجعة)" },
  { id: "confirmed", label: "تأكيد الموافقة", description: "يُرسل عند الموافقة على التسجيل" },
  { id: "confirmed-qr", label: "تأكيد مع QR", description: "تأكيد الموافقة مع رمز QR" },
  { id: "companion", label: "إشعار المرافق", description: "يُرسل للمرافق عند التسجيل" },
  { id: "companion-approved", label: "تأكيد المرافق", description: "يُرسل للمرافق بعد الموافقة" },
  { id: "welcome", label: "ترحيب بالعضو", description: "يُرسل عند إنشاء حساب جديد" },
  { id: "password-reset", label: "إعادة تعيين كلمة المرور", description: "يُرسل عند طلب استعادة كلمة المرور" },
  { id: "invitation", label: "دعوة خاصة", description: "دعوة للتسجيل في حدث" },
] as const;

type EmailType = typeof EMAIL_TYPES[number]["id"];

// Generate email HTML based on type
function generateEmailHtml(type: EmailType): string {
  const siteName = "ثلوثية الأعمال";
  const contactEmail = "thlothyah@tda.sa";
  const contactPhone = "+966 50 000 0000";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const dateStr = SAMPLE_SESSION.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const dateOnly = SAMPLE_SESSION.date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const timeOnly = SAMPLE_SESSION.date.toLocaleTimeString("ar-SA", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Content based on email type
  let content = "";
  let buttonText = "";
  let buttonUrl = "";
  let extraContent = "";

  switch (type) {
    case "confirmation":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_NAME}</strong>,</p>
        <p style="margin: 0 0 16px 0; line-height: 1.7;">
          يسعدنا إبلاغك بأن تسجيلك قد تم بنجاح. أنت الآن مسجّل رسمياً في الحدث القادم، ونحن متحمسون لاستقبالك.
        </p>
        <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${SAMPLE_SESSION.title}</strong></p>

        <!-- Event Details Box -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
            <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
              <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
              <p style="margin: 0;"><strong>المكان:</strong> ${SAMPLE_SESSION.location}</p>
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
      break;

    case "pending":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_NAME}</strong>,</p>
        <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${SAMPLE_SESSION.title}</strong></p>

        <!-- Event Details Box -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${BRAND.accent}; width: 4px;"></td>
            <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
              <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
              <p style="margin: 0;"><strong>المكان:</strong> ${SAMPLE_SESSION.location}</p>
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
                سعدنا باهتمامك بالتسجيل في ${SAMPLE_SESSION.title}.<br/>
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
      break;

    case "confirmed":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_NAME}</strong>,</p>
        <p style="margin: 0 0 8px 0; padding: 12px 16px; background-color: #E8F5E9; border-radius: 8px; color: #2E7D32; border: 1px solid #C8E6C9;">
          تم تأكيد تسجيلك بنجاح!
        </p>
        <p style="margin: 0 0 16px 0; line-height: 1.7;">
          يسرّنا إبلاغك بأنه تمت الموافقة على طلب تسجيلك. أنت الآن مؤكد للحضور، ونتطلع لرؤيتك في الحدث.
        </p>
        <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${SAMPLE_SESSION.title}</strong></p>

        <!-- Event Details Box -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
            <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
              <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
              <p style="margin: 0;"><strong>المكان:</strong> ${SAMPLE_SESSION.location}</p>
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
      break;

    case "confirmed-qr":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_NAME}</strong>,</p>
        <p style="margin: 0 0 8px 0; padding: 12px 16px; background-color: #E8F5E9; border-radius: 8px; color: #2E7D32; border: 1px solid #C8E6C9;">
          تم تأكيد تسجيلك بنجاح!
        </p>
        <p style="margin: 0 0 16px 0; line-height: 1.7;">
          يسرّنا إبلاغك بأنه تمت الموافقة على طلب تسجيلك. أنت الآن مؤكد للحضور، ونتطلع لرؤيتك في الحدث.
        </p>
        <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${SAMPLE_SESSION.title}</strong></p>

        <!-- Event Details Box -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
            <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
              <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
              <p style="margin: 0;"><strong>المكان:</strong> ${SAMPLE_SESSION.location}</p>
            </td>
          </tr>
        </table>

        <!-- QR Instructions -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 20px 0 0 0; width: 100%;">
          <tr>
            <td style="padding: 16px; background-color: ${BRAND.highlightBg}; border-radius: 8px; border-right: 4px solid ${BRAND.accent};">
              <p style="margin: 0 0 8px 0; font-weight: bold; color: ${BRAND.primary};">رمز الدخول</p>
              <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px;">أظهر رمز QR أدناه عند الوصول للدخول السريع</p>
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
      // QR placeholder for preview
      extraContent = `
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 24px auto; text-align: center;" align="center">
          <tr>
            <td align="center" style="padding: 20px; background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); border-radius: 12px;">
              <div style="width: 200px; height: 200px; background: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
                <div style="padding: 20px; text-align: center;">
                  <p style="margin: 0; color: ${BRAND.textMuted}; font-size: 14px;">رمز QR</p>
                  <p style="margin: 8px 0 0 0; color: ${BRAND.textLight}; font-size: 12px;">${SAMPLE_SESSION.title}</p>
                  <p style="margin: 4px 0 0 0; color: ${BRAND.textLight}; font-size: 12px;">${dateOnly} - ${timeOnly}</p>
                  <p style="margin: 4px 0 0 0; color: ${BRAND.primary}; font-size: 12px; font-weight: bold;">${SAMPLE_NAME}</p>
                </div>
              </div>
            </td>
          </tr>
        </table>
      `;
      break;

    case "companion":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_COMPANION_NAME}</strong>,</p>
        <p style="margin: 0 0 16px 0;">تم تسجيلك كمرافق للأستاذ/ة <strong>${SAMPLE_REGISTRANT_NAME}</strong> في:</p>
        <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${SAMPLE_SESSION.title}</strong></p>

        <!-- Event Details Box -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${BRAND.accent}; width: 4px;"></td>
            <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
              <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
              <p style="margin: 0;"><strong>المكان:</strong> ${SAMPLE_SESSION.location}</p>
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
                سعدنا باهتمامك بالتسجيل في ${SAMPLE_SESSION.title}.<br/>
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
      break;

    case "companion-approved":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_COMPANION_NAME}</strong>,</p>
        <p style="margin: 0 0 16px 0;">تم تسجيلك كمرافق للأستاذ/ة <strong>${SAMPLE_REGISTRANT_NAME}</strong> في:</p>
        <p style="margin: 0 0 8px 0; padding: 12px 16px; background-color: #E8F5E9; border-radius: 8px; color: #2E7D32; border: 1px solid #C8E6C9;">
          تم تأكيد تسجيلك بنجاح!
        </p>
        <p style="margin: 16px 0 8px 0;"><strong style="font-size: 18px; color: ${BRAND.primary};">${SAMPLE_SESSION.title}</strong></p>

        <!-- Event Details Box -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
            <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
              <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateStr}</p>
              <p style="margin: 0;"><strong>المكان:</strong> ${SAMPLE_SESSION.location}</p>
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
      break;

    case "welcome":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_NAME}</strong>,</p>
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
      buttonText = "تسجيل الدخول";
      buttonUrl = `${baseUrl}/user/login`;
      break;

    case "password-reset":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً <strong>${SAMPLE_NAME}</strong>,</p>
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
      buttonText = "إعادة تعيين كلمة المرور";
      buttonUrl = `${baseUrl}/user/reset-password/sample-token`;
      break;

    case "invitation":
      content = `
        <p style="margin: 0 0 16px 0;">مرحباً،</p>
        <p style="margin: 0 0 16px 0; line-height: 1.7;">
          يسرّنا دعوتك لحضور <strong style="color: ${BRAND.primary};">"${SAMPLE_SESSION.title}"</strong> ضمن فعاليات ${siteName}. هذه دعوة خاصة مقدّمة لك، ونتشرف بحضورك.
        </p>

        <!-- Event Details Box -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 16px 0; width: 100%; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: ${BRAND.primary}; width: 4px;"></td>
            <td style="padding: 16px; background-color: ${BRAND.infoBoxBg};">
              <p style="margin: 0 0 8px 0;"><strong>التاريخ:</strong> ${dateOnly}</p>
              <p style="margin: 0 0 8px 0;"><strong>الوقت:</strong> ${timeOnly}</p>
              <p style="margin: 0;"><strong>المكان:</strong> ${SAMPLE_SESSION.location}</p>
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
      buttonText = "التسجيل الآن";
      buttonUrl = `${baseUrl}/event/${SAMPLE_SESSION.slug}/register?token=sample-invitation-token`;
      break;
  }

  // Build button HTML
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

  // Social links
  const socialLinksHtml = `
    <a href="https://instagram.com/thlothyah" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">Instagram</a> &nbsp;|&nbsp;
    <a href="https://twitter.com/thlothyah" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">X</a> &nbsp;|&nbsp;
    <a href="https://snapchat.com/add/thlothyah" style="color: ${BRAND.primary}; text-decoration: none; font-weight: 500;">Snapchat</a>
  `;

  return `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ثلوثية الأعمال</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.background}; font-family: 'Cairo', Arial, Helvetica, sans-serif;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${BRAND.background};">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td align="center" style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); padding: 28px 24px; border-radius: 12px 12px 0 0;">
              <div style="width: 60px; height: 3px; background-color: ${BRAND.accent}; margin: 0 auto 16px auto; border-radius: 2px;"></div>
              <img
                src="${baseUrl}/logo.png"
                alt="${siteName}"
                width="80"
                height="80"
                style="display: block; margin: 0 auto 12px auto; border-radius: 50%; max-width: 80px; background: white;"
              />
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
                <tr>
                  <td align="center" style="padding-top: 12px; border-top: 1px solid ${BRAND.border};">
                    <p style="margin: 12px 0 0 0; color: ${BRAND.textLight}; font-size: 13px;">
                      تابعونا: ${socialLinksHtml}
                    </p>
                  </td>
                </tr>
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

export default function EmailPreviewPage() {
  const [selectedEmail, setSelectedEmail] = useState<EmailType>("confirmation");
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  const emailHtml = generateEmailHtml(selectedEmail);
  const selectedEmailInfo = EMAIL_TYPES.find((e) => e.id === selectedEmail);

  return (
    <div className="min-h-screen bg-gray-100" dir="rtl">
      {/* Header */}
      <div className="bg-[#001421] text-white py-6 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">معاينة قوالب البريد الإلكتروني</h1>
          <p className="text-gray-300 text-sm">
            هذه الصفحة لمعاينة واعتماد قوالب البريد الإلكتروني من قبل فريق التسويق
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-6 px-4">
        <div className="grid lg:grid-cols-[300px_1fr] gap-6">
          {/* Sidebar - Email Types */}
          <div className="bg-white rounded-xl shadow-sm p-4 h-fit">
            <h2 className="font-semibold text-lg mb-4 text-gray-800">أنواع الرسائل</h2>
            <div className="space-y-2">
              {EMAIL_TYPES.map((email) => (
                <button
                  key={email.id}
                  onClick={() => setSelectedEmail(email.id)}
                  className={cn(
                    "w-full text-right p-3 rounded-lg transition-all",
                    selectedEmail === email.id
                      ? "bg-[#001421] text-white"
                      : "hover:bg-gray-100 text-gray-700"
                  )}
                >
                  <p className="font-medium">{email.label}</p>
                  <p
                    className={cn(
                      "text-xs mt-1",
                      selectedEmail === email.id ? "text-gray-300" : "text-gray-500"
                    )}
                  >
                    {email.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Main Content - Email Preview */}
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg text-gray-800">
                  {selectedEmailInfo?.label}
                </h2>
                <p className="text-sm text-gray-500">{selectedEmailInfo?.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode("desktop")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === "desktop"
                      ? "bg-[#001421] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  سطح المكتب
                </button>
                <button
                  onClick={() => setViewMode("mobile")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    viewMode === "mobile"
                      ? "bg-[#001421] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  )}
                >
                  الجوال
                </button>
              </div>
            </div>

            {/* Email Preview Frame */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div
                className={cn(
                  "mx-auto transition-all duration-300 bg-gray-200 rounded-lg overflow-hidden",
                  viewMode === "desktop" ? "w-full max-w-[700px]" : "w-[375px]"
                )}
              >
                <iframe
                  srcDoc={emailHtml}
                  title="Email Preview"
                  className="w-full border-0"
                  style={{
                    height: viewMode === "desktop" ? "800px" : "700px",
                  }}
                />
              </div>
            </div>

            {/* Subject Line Preview */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="font-medium text-gray-700 mb-2">عنوان الرسالة:</h3>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg" dir="rtl">
                {selectedEmail === "confirmation" && `تأكيد التسجيل - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "pending" && `استلام التسجيل - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "confirmed" && `تأكيد التسجيل - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "confirmed-qr" && `تأكيد التسجيل - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "companion" && `تم تسجيلك كمرافق - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "companion-approved" && `تم تسجيلك كمرافق - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "welcome" && "مرحباً بك في ثلوثية الأعمال"}
                {selectedEmail === "password-reset" && "إعادة تعيين كلمة المرور - ثلوثية الأعمال"}
                {selectedEmail === "invitation" && `دعوة خاصة - ${SAMPLE_SESSION.title}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-200 py-4 px-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-600">
          صفحة داخلية لمعاينة قوالب البريد الإلكتروني • EventPilot
        </div>
      </div>
    </div>
  );
}
