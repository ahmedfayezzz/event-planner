import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { randomBytes } from "crypto";

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
 * Format date in Arabic
 */
export function formatArabicDate(date: Date | null | undefined): string {
  if (!date) return "";

  const dayName = ARABIC_DAYS[date.getDay()];
  const monthName = ARABIC_MONTHS[date.getMonth() + 1];

  return `${dayName} ${date.getDate()} ${monthName} ${date.getFullYear()}`;
}

/**
 * Format time in Arabic (24-hour format)
 */
export function formatArabicTime(date: Date | null | undefined): string {
  if (!date) return "";

  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
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
