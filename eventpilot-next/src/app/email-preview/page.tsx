"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import {
  createEmailTemplate,
  generateConfirmationContent,
  generatePendingContent,
  generateConfirmedContent,
  generateCompanionContent,
  generateWelcomeContent,
  generatePasswordResetContent,
  generateInvitationContent,
  formatSessionDatePreview,
  formatDateOnlyPreview,
  formatTimeOnlyPreview,
  type EmailSettings,
} from "@/lib/email-templates";

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
const SAMPLE_COMPANION_NAME = "خالد علي";
const SAMPLE_REGISTRANT_NAME = "سارة أحمد";

// Sample settings for preview (simulates admin settings)
const SAMPLE_SETTINGS: EmailSettings = {
  siteName: "ثلوثية الأعمال",
  contactEmail: "thlothyah@tda.sa",
  contactPhone: "+966 50 000 0000",
  instagramHandle: "thlothyah",
  twitterHandle: "thlothyah",
  snapchatHandle: "thlothyah",
  linkedinUrl: null,
  whatsappNumber: null,
};

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

// Generate QR placeholder for preview
function generateQrPlaceholder(): string {
  const dateOnly = formatDateOnlyPreview(SAMPLE_SESSION.date);
  const timeOnly = formatTimeOnlyPreview(SAMPLE_SESSION.date);

  return `
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
}

// Generate email HTML based on type using shared templates
function generateEmailHtml(type: EmailType): string {
  const siteName = SAMPLE_SETTINGS.siteName ?? "ثلوثية الأعمال";
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

  const dateStr = formatSessionDatePreview(SAMPLE_SESSION.date);
  const dateOnly = formatDateOnlyPreview(SAMPLE_SESSION.date);
  const timeOnly = formatTimeOnlyPreview(SAMPLE_SESSION.date);

  let content = "";
  let buttonText: string | undefined;
  let buttonUrl: string | undefined;
  let extraContent: string | undefined;

  switch (type) {
    case "confirmation":
      content = generateConfirmationContent(
        SAMPLE_NAME,
        SAMPLE_SESSION.title,
        dateStr,
        SAMPLE_SESSION.location
      );
      break;

    case "pending":
      content = generatePendingContent(
        SAMPLE_NAME,
        SAMPLE_SESSION.title,
        dateStr,
        SAMPLE_SESSION.location
      );
      break;

    case "confirmed":
      content = generateConfirmedContent(
        SAMPLE_NAME,
        SAMPLE_SESSION.title,
        dateStr,
        SAMPLE_SESSION.location,
        false
      );
      break;

    case "confirmed-qr":
      content = generateConfirmedContent(
        SAMPLE_NAME,
        SAMPLE_SESSION.title,
        dateStr,
        SAMPLE_SESSION.location,
        true
      );
      extraContent = generateQrPlaceholder();
      break;

    case "companion":
      content = generateCompanionContent(
        SAMPLE_COMPANION_NAME,
        SAMPLE_REGISTRANT_NAME,
        SAMPLE_SESSION.title,
        dateStr,
        SAMPLE_SESSION.location,
        false,
        false
      );
      break;

    case "companion-approved":
      content = generateCompanionContent(
        SAMPLE_COMPANION_NAME,
        SAMPLE_REGISTRANT_NAME,
        SAMPLE_SESSION.title,
        dateStr,
        SAMPLE_SESSION.location,
        true,
        false
      );
      break;

    case "welcome":
      content = generateWelcomeContent(SAMPLE_NAME, siteName);
      buttonText = "تسجيل الدخول";
      buttonUrl = `${baseUrl}/user/login`;
      break;

    case "password-reset":
      content = generatePasswordResetContent(SAMPLE_NAME);
      buttonText = "إعادة تعيين كلمة المرور";
      buttonUrl = `${baseUrl}/user/reset-password/sample-token`;
      break;

    case "invitation":
      content = generateInvitationContent(
        SAMPLE_SESSION.title,
        siteName,
        dateOnly,
        timeOnly,
        SAMPLE_SESSION.location
      );
      buttonText = "التسجيل الآن";
      buttonUrl = `${baseUrl}/event/${SAMPLE_SESSION.slug}/register?token=sample-invitation-token`;
      break;
  }

  return createEmailTemplate({
    content,
    buttonText,
    buttonUrl,
    extraContent,
    settings: SAMPLE_SETTINGS,
  });
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
                {selectedEmail === "companion" && `استلام التسجيل كمرافق - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "companion-approved" && `تأكيد التسجيل كمرافق - ${SAMPLE_SESSION.title}`}
                {selectedEmail === "welcome" && `مرحباً بك في ${SAMPLE_SETTINGS.siteName}`}
                {selectedEmail === "password-reset" && "إعادة تعيين كلمة المرور"}
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
