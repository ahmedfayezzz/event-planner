import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs/promises";
import { generateQRCodeBuffer } from "./qr";
import { BRAND } from "./brand";

// RTL text options for PDFKit - enables Arabic text shaping
const RTL_OPTIONS: PDFKit.Mixins.TextOptions = { features: ["rtla"] };

/**
 * Check if text contains Arabic characters
 */
function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

/**
 * Get text options based on content - only apply RTL for Arabic text
 */
function getTextOptions(text: string): PDFKit.Mixins.TextOptions {
  return containsArabic(text) ? RTL_OPTIONS : {};
}

// PDF dimensions (matching the branded image)
const PAGE_WIDTH = 400;
const PAGE_HEIGHT = 540;
const QR_SIZE = 180;
const LOGO_SIZE = 55;
const BORDER_WIDTH = 3;
const CORNER_RADIUS = 16;

// Cache for font buffers
let cairoRegularBuffer: Buffer | null = null;
let cairoBoldBuffer: Buffer | null = null;
let logoBuffer: Buffer | null = null;

/**
 * Load and cache fonts and logo (fonts are required, logo is optional)
 */
async function loadAssets(): Promise<{
  regular: Buffer;
  bold: Buffer;
  logo: Buffer | null;
}> {
  if (cairoRegularBuffer && cairoBoldBuffer) {
    return {
      regular: cairoRegularBuffer,
      bold: cairoBoldBuffer,
      logo: logoBuffer,
    };
  }

  const regularFontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "Cairo-Regular.ttf"
  );
  const boldFontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "Cairo-Bold.ttf"
  );
  const logoPath = path.join(process.cwd(), "public", "logo.png");

  // Cairo fonts are required - throw if not found
  const [regularData, boldData] = await Promise.all([
    fs.readFile(regularFontPath),
    fs.readFile(boldFontPath),
  ]);
  cairoRegularBuffer = regularData;
  cairoBoldBuffer = boldData;

  // Try to load logo (optional)
  try {
    logoBuffer = await fs.readFile(logoPath);
  } catch {
    console.warn("Logo not found for PDF");
    logoBuffer = null;
  }

  return {
    regular: cairoRegularBuffer,
    bold: cairoBoldBuffer,
    logo: logoBuffer,
  };
}

export interface BrandedQRPdfOptions {
  sessionTitle: string;
  sessionDate: string;
  sessionTime?: string;
  attendeeName?: string;
  location?: string;
  locationUrl?: string;
}

/**
 * Generate branded QR code as PDF with clickable location link
 */
export async function generateBrandedQRPdf(
  qrData: string,
  options: BrandedQRPdfOptions
): Promise<Buffer | null> {
  try {
    // 1. Generate base QR code as PNG
    const qrBuffer = await generateQRCodeBuffer(qrData);
    if (!qrBuffer) {
      console.error("Failed to generate base QR code for PDF");
      return null;
    }

    // 2. Load fonts and assets
    const assets = await loadAssets();

    // 3. Create PDF document with autoFirstPage: false to prevent Helvetica initialization
    const doc = new PDFDocument({
      size: [PAGE_WIDTH, PAGE_HEIGHT],
      margin: 0,
      autoFirstPage: false, // Prevent pdfkit from initializing with Helvetica
      info: {
        Title: `QR - ${options.sessionTitle}`,
        Author: "TDA - ثلوثية الأعمال",
        Subject: "QR Code for Event Attendance",
      },
    });

    // Collect PDF chunks
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Register Cairo fonts BEFORE adding any page
    doc.registerFont("Cairo", assets.regular);
    doc.registerFont("Cairo-Bold", assets.bold);

    // Now add the first page manually
    doc.addPage();

    // Set font AFTER page is added (avoids Helvetica.afm loading)
    doc.font("Cairo");

    // Always use Cairo fonts
    const fontRegular = "Cairo";
    const fontBold = "Cairo-Bold";

    // Background color (cream)
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill("#FAF8F5");

    // Main border with rounded corners (accent color)
    doc
      .roundedRect(
        BORDER_WIDTH / 2,
        BORDER_WIDTH / 2,
        PAGE_WIDTH - BORDER_WIDTH,
        PAGE_HEIGHT - BORDER_WIDTH,
        CORNER_RADIUS
      )
      .lineWidth(BORDER_WIDTH)
      .stroke(BRAND.accent);

    // Inner decorative border
    doc
      .roundedRect(8, 8, PAGE_WIDTH - 16, PAGE_HEIGHT - 16, 12)
      .lineWidth(1)
      .strokeOpacity(0.15)
      .stroke(BRAND.primary);

    // Corner decorations
    const cornerSize = 18;
    doc.strokeOpacity(1).lineWidth(2).strokeColor(BRAND.accent);

    // Top-left corner
    doc
      .moveTo(12, 12 + cornerSize)
      .lineTo(12, 12)
      .lineTo(12 + cornerSize, 12)
      .stroke();
    // Top-right corner
    doc
      .moveTo(PAGE_WIDTH - 12 - cornerSize, 12)
      .lineTo(PAGE_WIDTH - 12, 12)
      .lineTo(PAGE_WIDTH - 12, 12 + cornerSize)
      .stroke();
    // Bottom-left corner
    doc
      .moveTo(12, PAGE_HEIGHT - 12 - cornerSize)
      .lineTo(12, PAGE_HEIGHT - 12)
      .lineTo(12 + cornerSize, PAGE_HEIGHT - 12)
      .stroke();
    // Bottom-right corner
    doc
      .moveTo(PAGE_WIDTH - 12 - cornerSize, PAGE_HEIGHT - 12)
      .lineTo(PAGE_WIDTH - 12, PAGE_HEIGHT - 12)
      .lineTo(PAGE_WIDTH - 12, PAGE_HEIGHT - 12 - cornerSize)
      .stroke();

    // Corner decoration dots
    doc.fillOpacity(0.4).circle(22, 22, 2).fill(BRAND.accent);
    doc.circle(PAGE_WIDTH - 22, 22, 2).fill(BRAND.accent);
    doc.circle(22, PAGE_HEIGHT - 22, 2).fill(BRAND.accent);
    doc.circle(PAGE_WIDTH - 22, PAGE_HEIGHT - 22, 2).fill(BRAND.accent);
    doc.fillOpacity(1);

    // Calculate positions (matching branded image)
    const logoY = 24;
    const titleY = logoY + LOGO_SIZE + 8;
    let currentY = titleY;

    // Logo (if available)
    if (assets.logo) {
      const logoX = (PAGE_WIDTH - LOGO_SIZE) / 2;
      doc.image(assets.logo, logoX, logoY, {
        width: LOGO_SIZE,
        height: LOGO_SIZE,
      });
    }

    // Title: ثلوثية الأعمال (font size 20, bold)
    doc.font(fontBold).fontSize(20).fillColor(BRAND.primary);
    const titleText = "ثلوثية الأعمال";
    const titleWidth = doc.widthOfString(titleText);
    doc.text(titleText, (PAGE_WIDTH - titleWidth) / 2, currentY, RTL_OPTIONS);
    currentY += 40; // Extra space before greeting

    // Welcome text and attendee name
    if (options.attendeeName) {
      doc.font(fontRegular).fontSize(14).fillColor(BRAND.textMuted);
      const welcomeText = "مرحباً";
      const welcomeWidth = doc.widthOfString(welcomeText);
      doc.text(
        welcomeText,
        (PAGE_WIDTH - welcomeWidth) / 2,
        currentY,
        RTL_OPTIONS
      );
      currentY += 22;

      doc.font(fontBold).fontSize(18).fillColor(BRAND.textDark);
      const nameWidth = doc.widthOfString(options.attendeeName);
      doc.text(
        options.attendeeName,
        (PAGE_WIDTH - nameWidth) / 2,
        currentY,
        getTextOptions(options.attendeeName)
      );
      currentY += 40;
    }

    // QR Code
    const qrX = (PAGE_WIDTH - QR_SIZE) / 2;
    doc.image(qrBuffer, qrX, currentY, { width: QR_SIZE, height: QR_SIZE });
    currentY += QR_SIZE + 16;

    // Scan instruction (font size 12)
    doc.font(fontRegular).fontSize(12).fillColor(BRAND.textMuted);
    const scanText = "امسح للتحقق من الحضور";
    const scanWidth = doc.widthOfString(scanText);
    doc.text(scanText, (PAGE_WIDTH - scanWidth) / 2, currentY, RTL_OPTIONS);
    currentY += 28;

    // Session title (font size 14, bold)
    doc.font(fontBold).fontSize(14).fillColor(BRAND.primary);
    const sessionTitleWidth = doc.widthOfString(options.sessionTitle);
    doc.text(
      options.sessionTitle,
      (PAGE_WIDTH - sessionTitleWidth) / 2,
      currentY,
      getTextOptions(options.sessionTitle)
    );
    currentY += 24;

    // Date and time - render date and time as separate centered texts
    // to avoid bidirectional text issues with mixed Arabic/numbers
    doc.font(fontRegular).fontSize(13).fillColor(BRAND.textMuted);
    if (options.sessionTime) {
      const fullText = `${options.sessionTime} • ${options.sessionDate}`;
      const fullWidth = doc.widthOfString(fullText);
      doc.text(fullText, (PAGE_WIDTH - fullWidth) / 2, currentY);
    } else {
      const dateWidth = doc.widthOfString(options.sessionDate);
      doc.text(options.sessionDate, (PAGE_WIDTH - dateWidth) / 2, currentY);
    }
    currentY += 30;

    // Location (with clickable link if locationUrl provided)
    if (options.location) {
      doc.font(fontRegular).fontSize(13);
      const locationTextOptions = getTextOptions(options.location);

      if (options.locationUrl) {
        // Make location clickable - underline + color indicates link
        doc.fillColor(BRAND.primary);
        const locationWidth = doc.widthOfString(options.location);
        const locationX = (PAGE_WIDTH - locationWidth) / 2;

        doc.text(options.location, locationX, currentY, {
          ...locationTextOptions,
          link: options.locationUrl,
          underline: true,
        });

        // Draw small external link icon before the text (left side, pointing left)
        const arrowSize = 7;
        const arrowX = locationX - 8;
        const arrowY = currentY + 14;
        doc
          .strokeColor(BRAND.primary)
          .lineWidth(1.2)
          // Horizontal arrow line (pointing left)
          .moveTo(arrowX, arrowY)
          .lineTo(arrowX - arrowSize, arrowY)
          .stroke()
          // Arrow head (pointing left)
          .moveTo(arrowX - arrowSize + 3, arrowY - 3)
          .lineTo(arrowX - arrowSize, arrowY)
          .lineTo(arrowX - arrowSize + 3, arrowY + 3)
          .stroke();
      } else {
        doc.fillColor(BRAND.textMuted);
        const locationWidth = doc.widthOfString(options.location);
        doc.text(
          options.location,
          (PAGE_WIDTH - locationWidth) / 2,
          currentY,
          locationTextOptions
        );
      }
      currentY += 40;
    }

    // Bottom decorative dots
    doc
      .fillOpacity(0.6)
      .circle(PAGE_WIDTH / 2 - 30, currentY, 3)
      .fill(BRAND.primary);
    doc
      .fillOpacity(1)
      .circle(PAGE_WIDTH / 2, currentY, 3)
      .fill(BRAND.accent);
    doc
      .fillOpacity(0.6)
      .circle(PAGE_WIDTH / 2 + 30, currentY, 3)
      .fill(BRAND.primary);
    doc.fillOpacity(1);

    // Finalize PDF
    doc.end();

    // Wait for PDF to complete
    return new Promise((resolve, reject) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve(pdfBuffer);
      });
      doc.on("error", (error) => {
        console.error("PDF document error:", error);
        reject(error);
      });
    });
  } catch (error) {
    console.error("Failed to generate branded QR PDF:", error);
    return null;
  }
}

/**
 * Generate branded QR PDF as base64 data URL
 */
export async function generateBrandedQRPdfDataUrl(
  qrData: string,
  options: BrandedQRPdfOptions
): Promise<string | null> {
  const buffer = await generateBrandedQRPdf(qrData, options);
  if (!buffer) return null;
  return `data:application/pdf;base64,${buffer.toString("base64")}`;
}
