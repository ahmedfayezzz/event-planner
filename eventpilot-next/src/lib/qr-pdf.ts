import { PDFDocument, rgb, PDFName, PDFArray, PDFString } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { generateQRCodeBuffer } from "./qr";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

// Register Abar fonts using @napi-rs/canvas GlobalFonts
const abarBoldPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "AbarHigh-Bold.ttf"
);
const abarRegularPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "AbarLow-Regular.ttf"
);

// Register Abar fonts
if (fsSync.existsSync(abarBoldPath)) {
  GlobalFonts.registerFromPath(abarBoldPath, "AbarBold");
}
if (fsSync.existsSync(abarRegularPath)) {
  GlobalFonts.registerFromPath(abarRegularPath, "Abar");
}

// Colors matching the design
const NAVY_HEX = "#001421";

export interface BrandedQRPdfOptions {
  sessionTitle: string;
  sessionDate: string; // "١٦ ديسمبر" (date + month only)
  sessionDayName?: string; // "الثلاثاء" (day name, displayed below date)
  sessionTime?: string; // "٨:٣٠ مساءً"
  attendeeName?: string; // "أ.محمد الكلبي"
  location?: string; // "منابت" (line 1 - venue name)
  locationLine2?: string; // "العمارية" (line 2 - area/city)
  locationUrl?: string; // Keep for API compatibility (not used in template)
}

// Cache for template
let templateBuffer: Buffer | null = null;

/**
 * Render Arabic text to a PNG buffer using canvas
 * Canvas properly handles Arabic shaping and RTL automatically
 */
function renderArabicTextToImage(
  text: string,
  options: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    padding?: number;
    maxWidth?: number;
  } = {}
): { buffer: Buffer; width: number; height: number } {
  const {
    fontFamily = "AbarBold",
    fontSize = 25,
    color = NAVY_HEX,
    padding = 10,
    maxWidth = 800,
  } = options;

  // Create a temporary canvas to measure text
  const measureCanvas = createCanvas(1, 1);
  const measureCtx = measureCanvas.getContext("2d");
  const fontString = `${fontSize}px "${fontFamily}"`;
  measureCtx.font = fontString;

  // Measure the text
  const metrics = measureCtx.measureText(text);
  const textWidth = Math.min(metrics.width, maxWidth);
  const textHeight = fontSize * 1.4; // Approximate height with buffer

  // Create the actual canvas with proper dimensions
  const canvasWidth = Math.ceil(textWidth + padding * 2);
  const canvasHeight = Math.ceil(textHeight + padding * 2);

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Set text properties
  ctx.font = fontString;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw text centered
  ctx.fillText(text, canvasWidth / 2, canvasHeight / 2);

  return {
    buffer: canvas.toBuffer("image/png"),
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * Load and cache template
 */
async function loadTemplate(): Promise<Buffer> {
  if (templateBuffer) {
    return templateBuffer;
  }

  const templatePath = path.join(process.cwd(), "public", "دعوة خاصة (1).pdf");
  templateBuffer = await fs.readFile(templatePath);
  return templateBuffer;
}

/**
 * Generate branded QR code PDF using template overlay
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

    // 3. Load template PDF
    const template = await loadTemplate();
    const pdfDoc = await PDFDocument.load(template);

    // 4. Register fontkit (kept for potential future non-Arabic text)
    pdfDoc.registerFontkit(fontkit);

    // 5. Get first page and dimensions
    const page = pdfDoc.getPages()[0];
    if (!page) {
      console.error("No pages found in template PDF");
      return null;
    }
    const { width, height } = page.getSize();

    // 6. Embed QR code image
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    // ====================================
    // POSITION CALIBRATION (Template: 1080x1920 points)
    // ====================================

    // Attendee name position (below "دعوة خاصة" title, ~38% from top)
    const nameY = height * 0.6; // 62% from bottom = 38% from top
    const nameFontSize = 25;

    // QR Code position and size (~center of page)
    const qrSize = 150;
    const qrX = (width - qrSize) / 2;
    const qrY = height * 0.3; // 30% from bottom

    // Footer info positions (date, location, time from right to left)
    const footerY = height * 0.14;
    const footerFontSize = 30;

    // Three columns for footer
    const dateX = width * 0.68;
    const locationX = width * 0.5;
    const timeX = width * 0.35;

    // ====================================
    // DRAW DYNAMIC CONTENT
    // ====================================

    // Draw attendee name (centered) - RENDERED AS IMAGE FOR PROPER ARABIC
    if (options.attendeeName) {
      const greeting = `حياك الله ${options.attendeeName}`;
      const nameImageData = renderArabicTextToImage(greeting, {
        fontFamily: "AbarBold",
        fontSize: nameFontSize,
        color: NAVY_HEX,
      });

      const nameImage = await pdfDoc.embedPng(nameImageData.buffer);

      // Center the image horizontally
      const nameImageX = (width - nameImageData.width) / 2;
      // Adjust Y to account for image height (PDF Y is from bottom)
      const nameImageY = nameY - nameImageData.height / 2;

      page.drawImage(nameImage, {
        x: nameImageX,
        y: nameImageY,
        width: nameImageData.width,
        height: nameImageData.height,
      });
    }

    // Draw QR Code
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Draw date (right column) - RENDERED AS IMAGE
    // if (options.sessionDate) {
    //   const lineSpacing = 40;
    //   const dateY = options.sessionDayName
    //     ? footerY + lineSpacing * 0.6
    //     : footerY;

    //   // Render date as image
    //   const dateImageData = renderArabicTextToImage(options.sessionDate, {
    //     fontFamily: "AbarRegular",
    //     fontSize: footerFontSize,
    //     color: NAVY_HEX,
    //   });
    //   const dateImage = await pdfDoc.embedPng(dateImageData.buffer);

    //   page.drawImage(dateImage, {
    //     x: dateX - dateImageData.width / 2,
    //     y: dateY - dateImageData.height / 2,
    //     width: dateImageData.width,
    //     height: dateImageData.height,
    //   });

    //   // Render day name as image
    //   if (options.sessionDayName) {
    //     const dayImageData = renderArabicTextToImage(options.sessionDayName, {
    //       fontFamily: "AbarRegular",
    //       fontSize: footerFontSize,
    //       color: NAVY_HEX,
    //     });
    //     const dayImage = await pdfDoc.embedPng(dayImageData.buffer);

    //     page.drawImage(dayImage, {
    //       x: dateX - dayImageData.width / 2,
    //       y: dateY - lineSpacing - dayImageData.height / 2,
    //       width: dayImageData.width,
    //       height: dayImageData.height,
    //     });
    //   }
    // }

    // Draw location (middle column) - RENDERED AS IMAGE
    // if (options.location) {
    //   const lineSpacingLoc = 40;
    //   const locY = options.locationLine2
    //     ? footerY + lineSpacingLoc * 0.6
    //     : footerY;

    //   // Render location line 1 as image
    //   const locImageData = renderArabicTextToImage(options.location, {
    //     fontFamily: "AbarRegular",
    //     fontSize: footerFontSize,
    //     color: NAVY_HEX,
    //   });
    //   const locImage = await pdfDoc.embedPng(locImageData.buffer);

    //   page.drawImage(locImage, {
    //     x: locationX - locImageData.width / 2,
    //     y: locY - locImageData.height / 2,
    //     width: locImageData.width,
    //     height: locImageData.height,
    //   });

    //   // Render location line 2 as image
    //   if (options.locationLine2) {
    //     const loc2ImageData = renderArabicTextToImage(options.locationLine2, {
    //       fontFamily: "AbarRegular",
    //       fontSize: footerFontSize,
    //       color: NAVY_HEX,
    //     });
    //     const loc2Image = await pdfDoc.embedPng(loc2ImageData.buffer);

    //     page.drawImage(loc2Image, {
    //       x: locationX - loc2ImageData.width / 2,
    //       y: locY - lineSpacingLoc - loc2ImageData.height / 2,
    //       width: loc2ImageData.width,
    //       height: loc2ImageData.height,
    //     });
    //   }
    // }

    // Add clickable link annotation over existing location text in template
    if (options.locationUrl) {
      const linkWidth = 150;
      const linkHeight = 80;
      const linkX = locationX - linkWidth / 2;
      const linkY = footerY - 20;

      const actionDict = pdfDoc.context.obj({
        Type: "Action",
        S: "URI",
        URI: PDFString.of(options.locationUrl),
      });

      const linkAnnotation = pdfDoc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [linkX, linkY, linkX + linkWidth, linkY + linkHeight],
        Border: [0, 0, 0],
        A: actionDict,
      });

      const existingAnnots = page.node.lookup(PDFName.of("Annots"), PDFArray);
      if (existingAnnots) {
        existingAnnots.push(linkAnnotation);
      } else {
        page.node.set(
          PDFName.of("Annots"),
          pdfDoc.context.obj([linkAnnotation])
        );
      }
    }

    // Draw time (left column) - RENDERED AS IMAGE
    // if (options.sessionTime) {
    //   const timeImageData = renderArabicTextToImage(options.sessionTime, {
    //     fontFamily: "AbarRegular",
    //     fontSize: footerFontSize,
    //     color: NAVY_HEX,
    //   });
    //   const timeImage = await pdfDoc.embedPng(timeImageData.buffer);

    //   page.drawImage(timeImage, {
    //     x: timeX - timeImageData.width / 2,
    //     y: footerY - timeImageData.height / 2,
    //     width: timeImageData.width,
    //     height: timeImageData.height,
    //   });
    // }

    // 7. Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
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
