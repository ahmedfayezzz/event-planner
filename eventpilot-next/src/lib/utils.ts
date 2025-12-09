import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomBytes } from "crypto";
import { toSaudiTime } from "./timezone";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate secure random token for invitations and password reset
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Arabic month names
 */
const ARABIC_MONTHS: Record<number, string> = {
  1: "يناير",
  2: "فبراير",
  3: "مارس",
  4: "أبريل",
  5: "مايو",
  6: "يونيو",
  7: "يوليو",
  8: "أغسطس",
  9: "سبتمبر",
  10: "أكتوبر",
  11: "نوفمبر",
  12: "ديسمبر",
};

/**
 * Arabic day names
 */
const ARABIC_DAYS: Record<number, string> = {
  0: "الأحد",
  1: "الاثنين",
  2: "الثلاثاء",
  3: "الأربعاء",
  4: "الخميس",
  5: "الجمعة",
  6: "السبت",
};

/**
 * Format date in Arabic (displays in Saudi Arabia timezone)
 */
export function formatArabicDate(date: Date | null | undefined): string {
  if (!date) return "";

  // Convert UTC date to Saudi time for display
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";

  const dayName = ARABIC_DAYS[saudiDate.getDay()];
  const monthName = ARABIC_MONTHS[saudiDate.getMonth() + 1];

  return `${dayName} ${saudiDate.getDate()} ${monthName} ${saudiDate.getFullYear()}`;
}

/**
 * Format time in Arabic (12-hour format, displays in Saudi Arabia timezone)
 */
export function formatArabicTime(date: Date | null | undefined): string {
  if (!date) return "";

  // Convert UTC date to Saudi time for display
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";

  const hours24 = saudiDate.getHours();
  const hours12 = hours24 % 12 || 12;
  const minutes = saudiDate.getMinutes().toString().padStart(2, "0");
  const period = hours24 < 12 ? "ص" : "م";

  return `${hours12}:${minutes} ${period}`;
}

/**
 * Format date and time in Arabic
 */
export function formatArabicDateTime(date: Date | null | undefined): string {
  if (!date) return "";

  return `${formatArabicDate(date)} - ${formatArabicTime(date)}`;
}

/**
 * Sanitize user input to prevent XSS
 * Note: React already escapes content, but this is useful for server-side processing
 */
export function sanitizeInput(text: string | null | undefined): string {
  if (!text) return "";

  // Remove potentially dangerous characters
  const dangerousChars = ["<", ">", '"', "'", "&"];
  let sanitized = text;

  for (const char of dangerousChars) {
    sanitized = sanitized.split(char).join("");
  }

  return sanitized.trim();
}

/**
 * Calculate age from birth date
 */
export function calculateAge(birthDate: Date | null | undefined): number | null {
  if (!birthDate) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age;
}

/**
 * Generate slug from Arabic or English text
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers?: { key: keyof T; label: string }[]
): string {
  if (!data.length) return "";

  const keys = headers?.map((h) => h.key) ?? (Object.keys(data[0]) as (keyof T)[]);
  const headerLabels = headers?.map((h) => h.label) ?? keys.map(String);

  const rows = [
    headerLabels.join(","),
    ...data.map((row) =>
      keys
        .map((key) => {
          const value = row[key];
          // Escape quotes and wrap in quotes if contains comma
          const str = String(value ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    ),
  ];

  return rows.join("\n");
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share on X (Twitter)
 */
export function shareOnTwitter(url: string, text: string): void {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  window.open(twitterUrl, "_blank", "width=550,height=420");
}

/**
 * Share on WhatsApp
 */
export function shareOnWhatsApp(url: string, text: string): void {
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
  window.open(whatsappUrl, "_blank");
}

/**
 * Clean and format phone number for WhatsApp
 * @param phone Phone number (will be cleaned and formatted)
 * @returns Cleaned phone number with country code
 */
function cleanPhoneForWhatsApp(phone: string): string {
  // Remove all non-digit characters except + at the start
  let cleanPhone = phone.replace(/[^\d+]/g, "");

  // Remove leading + and any leading zeros
  if (cleanPhone.startsWith("+")) {
    cleanPhone = cleanPhone.substring(1);
  }

  // If starts with 0, replace with Saudi Arabia code (966)
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "966" + cleanPhone.substring(1);
  }

  // If doesn't start with country code, assume Saudi Arabia
  if (!cleanPhone.startsWith("966") && cleanPhone.length <= 10) {
    cleanPhone = "966" + cleanPhone;
  }

  return cleanPhone;
}

/**
 * Generate WhatsApp direct message URL (Regular WhatsApp)
 * @param phone Phone number (will be cleaned and formatted)
 * @param message Optional message text
 * @returns WhatsApp URL using wa.me
 */
export function getWhatsAppUrl(phone: string, message?: string): string {
  const cleanPhone = cleanPhoneForWhatsApp(phone);
  const baseUrl = `https://wa.me/${cleanPhone}`;
  if (message) {
    return `${baseUrl}?text=${encodeURIComponent(message)}`;
  }
  return baseUrl;
}

/**
 * Get current page URL (for sharing)
 */
export function getCurrentUrl(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}
