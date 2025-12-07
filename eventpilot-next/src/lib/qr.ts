import QRCode from "qrcode";

/**
 * Generate QR code as base64 data URL
 */
export async function generateQRCode(data: string): Promise<string | null> {
  try {
    const dataUrl = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "L",
      margin: 4,
      width: 200,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return dataUrl;
  } catch (error) {
    console.error("QR code generation failed:", error);
    return null;
  }
}

/**
 * Generate QR code as Buffer (for server-side use)
 */
export async function generateQRCodeBuffer(data: string): Promise<Buffer | null> {
  try {
    return await QRCode.toBuffer(data, {
      errorCorrectionLevel: "L",
      margin: 4,
      width: 200,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.error("QR code buffer generation failed:", error);
    return null;
  }
}

/**
 * QR data format for attendance check-in
 * Each registration (direct or invited) gets its own QR code
 */
export interface QRCheckInData {
  type: "attendance";
  registrationId: string;
  sessionId: string;
}

/**
 * Generate QR data string for check-in
 */
export function createQRCheckInData(data: QRCheckInData): string {
  return JSON.stringify(data);
}

/**
 * Parse QR code data for check-in
 */
export function parseQRData(data: string): QRCheckInData | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === "attendance" && parsed.registrationId && parsed.sessionId) {
      return parsed as QRCheckInData;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate unique session code for QR verification
 */
export function generateSessionCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
