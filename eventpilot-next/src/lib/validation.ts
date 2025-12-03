import { db } from "@/server/db";

/**
 * Generate a unique username from name
 */
export async function generateUsername(name: string): Promise<string> {
  // Clean name and create base username
  const cleanName = name.replace(/[^\w\s\u0600-\u06FF]/g, "").trim();
  const baseUsername = cleanName.replace(/\s+/g, "_").toLowerCase();

  // Ensure uniqueness
  let username = baseUsername;
  let counter = 1;

  while (await db.user.findUnique({ where: { username } })) {
    username = `${baseUsername}_${counter}`;
    counter++;
  }

  return username;
}

/**
 * Format phone number to Saudi +966 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, "");

  // Handle Saudi numbers
  if (cleanPhone.startsWith("966")) {
    return `+${cleanPhone}`;
  } else if (cleanPhone.startsWith("05")) {
    return `+966${cleanPhone.slice(1)}`;
  } else if (cleanPhone.length === 9 && cleanPhone.startsWith("5")) {
    return `+966${cleanPhone}`;
  }

  return `+${cleanPhone}`;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

/**
 * Validate social media URL format
 */
export function validateSocialMediaUrl(
  url: string | null | undefined,
  platform: "instagram" | "snapchat" | "twitter"
): boolean {
  if (!url) return true; // Empty URLs are allowed

  const patterns: Record<string, RegExp> = {
    instagram: /^(https?:\/\/)?(www\.)?(instagram\.com\/)/i,
    snapchat: /^(https?:\/\/)?(www\.)?(snapchat\.com\/add\/)/i,
    twitter: /^(https?:\/\/)?(www\.)?(twitter\.com\/|x\.com\/)/i,
  };

  const pattern = patterns[platform];
  return pattern ? pattern.test(url) : false;
}

/**
 * Validate Saudi phone number format
 */
export function validateSaudiPhone(phone: string): boolean {
  const cleanPhone = phone.replace(/\D/g, "");

  // Valid formats:
  // 05xxxxxxxx (10 digits starting with 05)
  // 5xxxxxxxx (9 digits starting with 5)
  // 9665xxxxxxxx (12 digits starting with 9665)
  // +9665xxxxxxxx

  if (cleanPhone.length === 10 && cleanPhone.startsWith("05")) {
    return true;
  }
  if (cleanPhone.length === 9 && cleanPhone.startsWith("5")) {
    return true;
  }
  if (cleanPhone.length === 12 && cleanPhone.startsWith("9665")) {
    return true;
  }

  return false;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push("يجب أن تكون كلمة المرور 6 أحرف على الأقل");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if email is already registered
 */
export async function isEmailTaken(email: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return !!user;
}

/**
 * Check if phone is already registered
 */
export async function isPhoneTaken(phone: string): Promise<boolean> {
  const formattedPhone = formatPhoneNumber(phone);
  const user = await db.user.findUnique({
    where: { phone: formattedPhone },
  });
  return !!user;
}

/**
 * Check if username is already taken
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const user = await db.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  return !!user;
}
