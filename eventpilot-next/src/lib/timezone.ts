/**
 * Timezone utilities for Saudi Arabia (Asia/Riyadh, UTC+3)
 *
 * This application is designed for Saudi Arabia use only.
 * All dates are stored in UTC in the database but displayed in Saudi time.
 */

import { toZonedTime, fromZonedTime, formatInTimeZone } from "date-fns-tz";

export const SAUDI_TIMEZONE = "Asia/Riyadh";

/**
 * Convert a UTC date to Saudi Arabia time for display
 * Use this when reading dates from the database
 */
export function toSaudiTime(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  return toZonedTime(new Date(date), SAUDI_TIMEZONE);
}

/**
 * Convert a Saudi Arabia local time to UTC for storage
 * Use this when saving dates to the database from form inputs
 */
export function fromSaudiTime(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  return fromZonedTime(new Date(date), SAUDI_TIMEZONE);
}

/**
 * Get the current time in Saudi Arabia timezone
 * Use this instead of new Date() for time comparisons
 */
export function nowInSaudi(): Date {
  return toZonedTime(new Date(), SAUDI_TIMEZONE);
}

/**
 * Format a date in Saudi timezone using a custom format string
 * Common formats:
 * - "yyyy-MM-dd" -> "2025-01-15"
 * - "HH:mm" -> "18:30"
 * - "yyyy-MM-dd'T'HH:mm" -> "2025-01-15T18:30"
 */
export function formatInSaudiTime(
  date: Date | string | null | undefined,
  format: string
): string {
  if (!date) return "";
  return formatInTimeZone(new Date(date), SAUDI_TIMEZONE, format);
}

/**
 * Get start of day in Saudi timezone (for date filtering)
 * Returns UTC date that corresponds to 00:00:00 Saudi time
 */
export function startOfDayInSaudi(date?: Date): Date {
  const saudiDate = date ? toZonedTime(date, SAUDI_TIMEZONE) : nowInSaudi();
  const startOfDay = new Date(
    saudiDate.getFullYear(),
    saudiDate.getMonth(),
    saudiDate.getDate(),
    0, 0, 0, 0
  );
  return fromZonedTime(startOfDay, SAUDI_TIMEZONE);
}

/**
 * Get end of day in Saudi timezone (for date filtering)
 * Returns UTC date that corresponds to 23:59:59.999 Saudi time
 */
export function endOfDayInSaudi(date?: Date): Date {
  const saudiDate = date ? toZonedTime(date, SAUDI_TIMEZONE) : nowInSaudi();
  const endOfDay = new Date(
    saudiDate.getFullYear(),
    saudiDate.getMonth(),
    saudiDate.getDate(),
    23, 59, 59, 999
  );
  return fromZonedTime(endOfDay, SAUDI_TIMEZONE);
}

/**
 * Get start of week (Sunday) in Saudi timezone
 */
export function startOfWeekInSaudi(date?: Date): Date {
  const saudiDate = date ? toZonedTime(date, SAUDI_TIMEZONE) : nowInSaudi();
  const dayOfWeek = saudiDate.getDay();
  const startOfWeek = new Date(
    saudiDate.getFullYear(),
    saudiDate.getMonth(),
    saudiDate.getDate() - dayOfWeek,
    0, 0, 0, 0
  );
  return fromZonedTime(startOfWeek, SAUDI_TIMEZONE);
}

/**
 * Get end of week (Saturday) in Saudi timezone
 */
export function endOfWeekInSaudi(date?: Date): Date {
  const saudiDate = date ? toZonedTime(date, SAUDI_TIMEZONE) : nowInSaudi();
  const dayOfWeek = saudiDate.getDay();
  const endOfWeek = new Date(
    saudiDate.getFullYear(),
    saudiDate.getMonth(),
    saudiDate.getDate() + (6 - dayOfWeek),
    23, 59, 59, 999
  );
  return fromZonedTime(endOfWeek, SAUDI_TIMEZONE);
}

/**
 * Get start of month in Saudi timezone
 */
export function startOfMonthInSaudi(date?: Date): Date {
  const saudiDate = date ? toZonedTime(date, SAUDI_TIMEZONE) : nowInSaudi();
  const startOfMonth = new Date(
    saudiDate.getFullYear(),
    saudiDate.getMonth(),
    1,
    0, 0, 0, 0
  );
  return fromZonedTime(startOfMonth, SAUDI_TIMEZONE);
}

/**
 * Get end of month in Saudi timezone
 */
export function endOfMonthInSaudi(date?: Date): Date {
  const saudiDate = date ? toZonedTime(date, SAUDI_TIMEZONE) : nowInSaudi();
  const endOfMonth = new Date(
    saudiDate.getFullYear(),
    saudiDate.getMonth() + 1,
    0, // Last day of current month
    23, 59, 59, 999
  );
  return fromZonedTime(endOfMonth, SAUDI_TIMEZONE);
}

/**
 * Parse a date string from form input (assumed to be in Saudi time)
 * and convert to UTC for database storage
 *
 * @param dateStr - Date string in "YYYY-MM-DD" format
 * @param timeStr - Optional time string in "HH:mm" format
 * @returns UTC Date for database storage
 */
export function parseFormDateToUTC(dateStr: string, timeStr?: string): Date {
  const dateTimeStr = timeStr ? `${dateStr}T${timeStr}` : `${dateStr}T00:00`;
  const localDate = new Date(dateTimeStr);
  return fromZonedTime(localDate, SAUDI_TIMEZONE);
}

/**
 * Format a UTC date for display in form inputs (as Saudi time)
 *
 * @param date - UTC date from database
 * @returns Object with date and time strings for form inputs
 */
export function formatDateForForm(date: Date | string | null | undefined): {
  date: string;
  time: string;
} {
  if (!date) return { date: "", time: "" };

  return {
    date: formatInSaudiTime(date, "yyyy-MM-dd"),
    time: formatInSaudiTime(date, "HH:mm"),
  };
}

/**
 * Format a UTC date for datetime-local input (as Saudi time)
 */
export function formatDateTimeForForm(date: Date | string | null | undefined): string {
  if (!date) return "";
  return formatInSaudiTime(date, "yyyy-MM-dd'T'HH:mm");
}
