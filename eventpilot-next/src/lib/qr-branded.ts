import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import { generateQRCodeBuffer } from "./qr";

// Brand colors matching email.ts
const BRAND = {
  primary: "#166534",
  primaryLight: "#22c55e",
  accent: "#D4A853",
  accentLight: "#E8D5A8",
  background: "#FAF8F5",
  textDark: "#1a2e1a",
  textMuted: "#4B5563",
};

// Template dimensions
const TEMPLATE_WIDTH = 400;
const TEMPLATE_HEIGHT = 540;
const QR_SIZE = 180;
const LOGO_SIZE = 55;
const BORDER_WIDTH = 3;
const PADDING = 28;

interface BrandedQROptions {
  sessionTitle: string;
  sessionDate: string;
  sessionTime?: string;
  attendeeName?: string;
}

/**
 * Creates an SVG text element for Arabic text rendering
 */
function createTextSVG(
  text: string,
  fontSize: number,
  color: string,
  width: number,
  fontWeight: "normal" | "bold" = "normal"
): Buffer {
  // Cairo font with RTL direction for Arabic
  const svg = `
    <svg width="${width}" height="${fontSize + 10}" xmlns="http://www.w3.org/2000/svg">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&amp;display=swap');
        text {
          font-family: 'Cairo', 'Arial', sans-serif;
          font-size: ${fontSize}px;
          font-weight: ${fontWeight === "bold" ? 700 : 400};
          fill: ${color};
          direction: rtl;
          text-anchor: middle;
        }
      </style>
      <text x="${width / 2}" y="${fontSize}" dominant-baseline="middle">${escapeXml(text)}</text>
    </svg>
  `;
  return Buffer.from(svg);
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generate branded QR code with EventPilot branding and session info
 */
export async function generateBrandedQRCode(
  qrData: string,
  options: BrandedQROptions
): Promise<Buffer | null> {
  try {
    // 1. Generate base QR code
    const qrBuffer = await generateQRCodeBuffer(qrData);
    if (!qrBuffer) {
      console.error("Failed to generate base QR code");
      return null;
    }

    // Resize QR code to desired size
    const qrResized = await sharp(qrBuffer)
      .resize(QR_SIZE, QR_SIZE, { fit: "contain" })
      .toBuffer();

    // 2. Load logo
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    let logoBuffer: Buffer;
    try {
      const logoData = await fs.readFile(logoPath);
      logoBuffer = await sharp(logoData)
        .resize(LOGO_SIZE, LOGO_SIZE, { fit: "contain" })
        .toBuffer();
    } catch {
      // If logo not found, create a placeholder
      console.warn("Logo not found, using placeholder");
      logoBuffer = await sharp({
        create: {
          width: LOGO_SIZE,
          height: LOGO_SIZE,
          channels: 4,
          background: { r: 22, g: 101, b: 52, alpha: 1 }, // Primary green
        },
      })
        .png()
        .toBuffer();
    }

    // 3. Create text SVGs
    const titleText = "ثلوثية الأعمال";
    const welcomeText = "مرحباً";
    const scanText = "امسح للتحقق من الحضور";
    const dateTimeText = options.sessionTime
      ? `${options.sessionDate} - ${options.sessionTime}`
      : options.sessionDate;

    const contentWidth = TEMPLATE_WIDTH - PADDING * 2;
    const titleSvg = createTextSVG(titleText, 20, BRAND.primary, contentWidth, "bold");
    const welcomeSvg = options.attendeeName
      ? createTextSVG(welcomeText, 14, BRAND.textMuted, contentWidth)
      : null;
    const attendeeNameSvg = options.attendeeName
      ? createTextSVG(options.attendeeName, 18, BRAND.textDark, contentWidth, "bold")
      : null;
    const scanSvg = createTextSVG(scanText, 12, BRAND.textMuted, contentWidth);
    const sessionTitleSvg = createTextSVG(
      options.sessionTitle,
      14,
      BRAND.primary,
      contentWidth,
      "bold"
    );
    const dateTimeSvg = createTextSVG(dateTimeText, 13, BRAND.textMuted, contentWidth);

    // 4. Create background
    const background = await sharp({
      create: {
        width: TEMPLATE_WIDTH,
        height: TEMPLATE_HEIGHT,
        channels: 4,
        background: { r: 250, g: 248, b: 245, alpha: 1 }, // Cream background
      },
    })
      .png()
      .toBuffer();

    // Calculate positions
    const logoX = Math.round((TEMPLATE_WIDTH - LOGO_SIZE) / 2);
    const logoY = 24;
    const titleY = logoY + LOGO_SIZE + 8;

    // Welcome + Name section (or just QR if no name)
    const qrX = Math.round((TEMPLATE_WIDTH - QR_SIZE) / 2);
    let currentY = titleY + 38;

    const welcomeY = currentY;
    const attendeeNameY = options.attendeeName ? welcomeY + 22 : welcomeY;
    const qrY = options.attendeeName ? attendeeNameY + 32 : currentY;

    const scanTextY = qrY + QR_SIZE + 16;
    const sessionTitleY = scanTextY + 28;
    const dateTimeY = sessionTitleY + 24;

    // 5. Create decorative overlay with border and brand elements
    const decorativeSvg = `
      <svg width="${TEMPLATE_WIDTH}" height="${TEMPLATE_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Gold gradient for accents -->
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${BRAND.accentLight};stop-opacity:0" />
            <stop offset="50%" style="stop-color:${BRAND.accent};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${BRAND.accentLight};stop-opacity:0" />
          </linearGradient>
          <!-- Corner pattern -->
          <pattern id="cornerPattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="${BRAND.accent}" opacity="0.3"/>
          </pattern>
        </defs>

        <!-- Main border with rounded corners -->
        <rect
          x="${BORDER_WIDTH / 2}"
          y="${BORDER_WIDTH / 2}"
          width="${TEMPLATE_WIDTH - BORDER_WIDTH}"
          height="${TEMPLATE_HEIGHT - BORDER_WIDTH}"
          fill="none"
          stroke="${BRAND.accent}"
          stroke-width="${BORDER_WIDTH}"
          rx="16"
        />

        <!-- Inner decorative border -->
        <rect
          x="8"
          y="8"
          width="${TEMPLATE_WIDTH - 16}"
          height="${TEMPLATE_HEIGHT - 16}"
          fill="none"
          stroke="${BRAND.primary}"
          stroke-width="1"
          stroke-opacity="0.15"
          rx="12"
        />

        <!-- Top decorative gold line -->
        <line
          x1="${PADDING + 40}"
          y1="${titleY + 32}"
          x2="${TEMPLATE_WIDTH - PADDING - 40}"
          y2="${titleY + 32}"
          stroke="url(#goldGradient)"
          stroke-width="2"
        />

        <!-- Corner decorations - top left -->
        <path d="M 12 30 L 12 12 L 30 12" fill="none" stroke="${BRAND.accent}" stroke-width="2" stroke-linecap="round"/>

        <!-- Corner decorations - top right -->
        <path d="M ${TEMPLATE_WIDTH - 12} 30 L ${TEMPLATE_WIDTH - 12} 12 L ${TEMPLATE_WIDTH - 30} 12" fill="none" stroke="${BRAND.accent}" stroke-width="2" stroke-linecap="round"/>

        <!-- Corner decorations - bottom left -->
        <path d="M 12 ${TEMPLATE_HEIGHT - 30} L 12 ${TEMPLATE_HEIGHT - 12} L 30 ${TEMPLATE_HEIGHT - 12}" fill="none" stroke="${BRAND.accent}" stroke-width="2" stroke-linecap="round"/>

        <!-- Corner decorations - bottom right -->
        <path d="M ${TEMPLATE_WIDTH - 12} ${TEMPLATE_HEIGHT - 30} L ${TEMPLATE_WIDTH - 12} ${TEMPLATE_HEIGHT - 12} L ${TEMPLATE_WIDTH - 30} ${TEMPLATE_HEIGHT - 12}" fill="none" stroke="${BRAND.accent}" stroke-width="2" stroke-linecap="round"/>

        <!-- Decorative dots pattern in corners -->
        <circle cx="22" cy="22" r="2" fill="${BRAND.accent}" opacity="0.4"/>
        <circle cx="${TEMPLATE_WIDTH - 22}" cy="22" r="2" fill="${BRAND.accent}" opacity="0.4"/>
        <circle cx="22" cy="${TEMPLATE_HEIGHT - 22}" r="2" fill="${BRAND.accent}" opacity="0.4"/>
        <circle cx="${TEMPLATE_WIDTH - 22}" cy="${TEMPLATE_HEIGHT - 22}" r="2" fill="${BRAND.accent}" opacity="0.4"/>

        <!-- Bottom decorative gold line -->
        <line
          x1="${PADDING + 40}"
          y1="${dateTimeY + 28}"
          x2="${TEMPLATE_WIDTH - PADDING - 40}"
          y2="${dateTimeY + 28}"
          stroke="url(#goldGradient)"
          stroke-width="2"
        />

        <!-- Small emerald accent dots along bottom -->
        <circle cx="${TEMPLATE_WIDTH / 2 - 30}" cy="${dateTimeY + 28}" r="3" fill="${BRAND.primary}" opacity="0.6"/>
        <circle cx="${TEMPLATE_WIDTH / 2}" cy="${dateTimeY + 28}" r="3" fill="${BRAND.accent}"/>
        <circle cx="${TEMPLATE_WIDTH / 2 + 30}" cy="${dateTimeY + 28}" r="3" fill="${BRAND.primary}" opacity="0.6"/>
      </svg>
    `;

    // 6. Composite all elements
    const compositeElements: sharp.OverlayOptions[] = [
      // Decorative overlay
      { input: Buffer.from(decorativeSvg), top: 0, left: 0 },
      // Logo
      { input: logoBuffer, top: logoY, left: logoX },
      // Title "ثلوثية الأعمال"
      { input: titleSvg, top: titleY, left: PADDING },
      // QR Code
      { input: qrResized, top: qrY, left: qrX },
      // "امسح للتحقق من الحضور"
      { input: scanSvg, top: scanTextY, left: PADDING },
      // Session title
      { input: sessionTitleSvg, top: sessionTitleY, left: PADDING },
      // Date/Time
      { input: dateTimeSvg, top: dateTimeY, left: PADDING },
    ];

    // Add welcome and attendee name if provided
    if (welcomeSvg && attendeeNameSvg) {
      // Insert welcome and name before QR code
      compositeElements.splice(3, 0,
        { input: welcomeSvg, top: welcomeY, left: PADDING },
        { input: attendeeNameSvg, top: attendeeNameY, left: PADDING }
      );
    }

    const result = await sharp(background)
      .composite(compositeElements)
      .png()
      .toBuffer();

    return result;
  } catch (error) {
    console.error("Failed to generate branded QR code:", error);
    return null;
  }
}

/**
 * Generate branded QR code as base64 data URL
 */
export async function generateBrandedQRCodeDataUrl(
  qrData: string,
  options: BrandedQROptions
): Promise<string | null> {
  const buffer = await generateBrandedQRCode(qrData, options);
  if (!buffer) return null;
  return `data:image/png;base64,${buffer.toString("base64")}`;
}
