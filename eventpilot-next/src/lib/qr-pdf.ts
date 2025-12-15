import { PDFDocument, rgb, PDFName, PDFArray, PDFString } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import path from "path";
import { generateQRCodeBuffer } from "./qr";

// Colors matching the design
const NAVY = rgb(0, 0.078, 0.129); // #001421

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

// Cache for fonts
let abarBoldBuffer: Buffer | null = null;
let abarRegularBuffer: Buffer | null = null;
let templateBuffer: Buffer | null = null;

/**
 * Load and cache fonts and template
 */
async function loadAssets(): Promise<{
  bold: Buffer;
  regular: Buffer;
  template: Buffer;
}> {
  if (abarBoldBuffer && abarRegularBuffer && templateBuffer) {
    return {
      bold: abarBoldBuffer,
      regular: abarRegularBuffer,
      template: templateBuffer,
    };
  }

  const boldFontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "AbarHigh-Bold.ttf"
  );
  const regularFontPath = path.join(
    process.cwd(),
    "public",
    "fonts",
    "AbarLow-Regular.ttf"
  );
  const templatePath = path.join(process.cwd(), "public", "دعوة خاصة (1).pdf");

  const [boldData, regularData, templateData] = await Promise.all([
    fs.readFile(boldFontPath),
    fs.readFile(regularFontPath),
    fs.readFile(templatePath),
  ]);

  abarBoldBuffer = boldData;
  abarRegularBuffer = regularData;
  templateBuffer = templateData;

  return {
    bold: abarBoldBuffer,
    regular: abarRegularBuffer,
    template: templateBuffer,
  };
}

/**
 * Calculate centered X position for text
 */
function centerText(
  text: string,
  font: Awaited<ReturnType<typeof PDFDocument.prototype.embedFont>>,
  fontSize: number,
  pageWidth: number
): number {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  return (pageWidth - textWidth) / 2;
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

    // 2. Load assets
    const assets = await loadAssets();

    // 3. Load template PDF
    const pdfDoc = await PDFDocument.load(assets.template);

    // 4. Register fontkit for custom fonts
    pdfDoc.registerFontkit(fontkit);

    // 5. Embed fonts
    const abarBold = await pdfDoc.embedFont(assets.bold);
    const abarRegular = await pdfDoc.embedFont(assets.regular);

    // 6. Get first page and dimensions
    const page = pdfDoc.getPages()[0];
    if (!page) {
      console.error("No pages found in template PDF");
      return null;
    }
    const { width, height } = page.getSize();

    // 7. Embed QR code image
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
    // The icons are at ~10% from bottom, text should be below them
    const footerY = height * 0.14; // ~10% from bottom (below icons)
    const footerFontSize = 30;

    // Three columns for footer (right to left: date, location, time)
    // Adjusted to match icon positions in template
    const dateX = width * 0.68; // Right column (date - under calendar icon)
    const locationX = width * 0.5; // Middle column (location - under pin icon)
    const timeX = width * 0.35; // Left column (time - under clock icon)

    // ====================================
    // DRAW DYNAMIC CONTENT (with Arabic text processing)
    // ====================================

    // Draw attendee name (centered)
    if (options.attendeeName) {
      const greeting = `حياك الله ${options.attendeeName}`;
      const nameX = centerText(greeting, abarBold, nameFontSize, width);
      page.drawText(greeting, {
        x: nameX,
        y: nameY,
        size: nameFontSize,
        font: abarBold,
        color: NAVY,
      });
    }

    // Draw QR Code
    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });

    // Draw date (right column, centered) - two lines: date+month on top, day name below
    // if (options.sessionDate) {
    //   const lineSpacing = 40; // Space between the two lines
    //   // When we have two lines, center them vertically around footerY
    //   const dateY = options.sessionDayName
    //     ? footerY + lineSpacing * 0.6
    //     : footerY;

    //   // Draw date (e.g., "١٦ ديسمبر")
    //   const dateTextWidth = abarRegular.widthOfTextAtSize(
    //     options.sessionDate,
    //     footerFontSize
    //   );
    //   page.drawText(options.sessionDate, {
    //     x: dateX - dateTextWidth / 2,
    //     y: dateY,
    //     size: footerFontSize,
    //     font: abarRegular,
    //     color: NAVY,
    //   });

    //   // Draw day name below (e.g., "الثلاثاء")
    //   if (options.sessionDayName) {
    //     const dayNameWidth = abarRegular.widthOfTextAtSize(
    //       options.sessionDayName,
    //       footerFontSize
    //     );
    //     page.drawText(options.sessionDayName, {
    //       x: dateX - dayNameWidth / 2,
    //       y: dateY - lineSpacing,
    //       size: footerFontSize,
    //       font: abarRegular,
    //       color: NAVY,
    //     });
    //   }
    // }

    // Draw location (middle column, centered) - two lines like date
    // if (options.location) {
    //   const lineSpacingLoc = 40;
    //   // When we have two lines, center them vertically around footerY
    //   const locY = options.locationLine2
    //     ? footerY + lineSpacingLoc * 0.6
    //     : footerY;

    //   // Draw location line 1 (e.g., "منابت")
    //   const locationTextWidth = abarRegular.widthOfTextAtSize(
    //     options.location,
    //     footerFontSize
    //   );
    //   const loc1X = locationX - locationTextWidth / 2;
    //   page.drawText(options.location, {
    //     x: loc1X,
    //     y: locY,
    //     size: footerFontSize,
    //     font: abarRegular,
    //     color: NAVY,
    //   });

    //   // Track bounds for link annotation
    //   let linkMinX = loc1X;
    //   let linkMaxX = loc1X + locationTextWidth;
    //   let linkMinY = locY;
    //   const linkMaxY = locY + footerFontSize;

    //   // Draw location line 2 below (e.g., "العمارية")
    //   if (options.locationLine2) {
    //     const loc2Width = abarRegular.widthOfTextAtSize(
    //       options.locationLine2,
    //       footerFontSize
    //     );
    //     const loc2X = locationX - loc2Width / 2;
    //     page.drawText(options.locationLine2, {
    //       x: loc2X,
    //       y: locY - lineSpacingLoc,
    //       size: footerFontSize,
    //       font: abarRegular,
    //       color: NAVY,
    //     });

    //     // Expand link bounds to include second line
    //     linkMinX = Math.min(linkMinX, loc2X);
    //     linkMaxX = Math.max(linkMaxX, loc2X + loc2Width);
    //     linkMinY = locY - lineSpacingLoc;
    //   }

    //   // Add clickable link annotation if locationUrl is provided
    //   if (options.locationUrl) {
    //     // Create the action dictionary
    //     const actionDict = pdfDoc.context.obj({
    //       Type: "Action",
    //       S: "URI",
    //       URI: PDFString.of(options.locationUrl),
    //     });

    //     // Create the link annotation
    //     const linkAnnotation = pdfDoc.context.obj({
    //       Type: "Annot",
    //       Subtype: "Link",
    //       Rect: [linkMinX - 10, linkMinY - 5, linkMaxX + 10, linkMaxY + 5],
    //       Border: [0, 0, 0],
    //       A: actionDict,
    //     });

    //     // Add annotation to page
    //     const existingAnnots = page.node.lookup(PDFName.of("Annots"), PDFArray);
    //     if (existingAnnots) {
    //       existingAnnots.push(linkAnnotation);
    //     } else {
    //       page.node.set(
    //         PDFName.of("Annots"),
    //         pdfDoc.context.obj([linkAnnotation])
    //       );
    //     }
    //   }
    // }

    // Add clickable link annotation over existing location text in template
    if (options.locationUrl) {
      // Define clickable area over the location section (middle column)
      const linkWidth = 150;
      const linkHeight = 80;
      const linkX = locationX - linkWidth / 2;
      const linkY = footerY - 20;

      // Create the action dictionary
      const actionDict = pdfDoc.context.obj({
        Type: "Action",
        S: "URI",
        URI: PDFString.of(options.locationUrl),
      });

      // Create the link annotation
      const linkAnnotation = pdfDoc.context.obj({
        Type: "Annot",
        Subtype: "Link",
        Rect: [linkX, linkY, linkX + linkWidth, linkY + linkHeight],
        Border: [0, 0, 0],
        A: actionDict,
      });

      // Add annotation to page
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

    // Draw time (left column, centered)
    // if (options.sessionTime) {
    //   const timeTextWidth = abarRegular.widthOfTextAtSize(
    //     options.sessionTime,
    //     footerFontSize
    //   );
    //   const reversedTime = options.sessionTime.split("").reverse().join(""); // Simple reversal for Arabic time display
    //   // remove م or ص characters from reversedTime before drawing
    //   const cleanedTime = reversedTime.replace(/[مص]/g, "");
    //   page.drawText(cleanedTime, {
    //     x: timeX - timeTextWidth / 2,
    //     y: footerY,
    //     size: footerFontSize,
    //     font: abarRegular,
    //     color: NAVY,
    //   });
    //   // add ً after مساء or صباح
    //   // if it includes م or ص
    //   if (reversedTime.includes("م")) {
    //     const ampmX =
    //       timeX - abarRegular.widthOfTextAtSize("م", footerFontSize) - 45;
    //     page.drawText("م", {
    //       x: ampmX,
    //       y: footerY,
    //       size: footerFontSize,
    //       font: abarRegular,
    //       color: NAVY,
    //     });
    //   } else if (reversedTime.includes("ص")) {
    //     const ampmX =
    //       timeX - abarRegular.widthOfTextAtSize("ص", footerFontSize) - 45;
    //     page.drawText("ص", {
    //       x: ampmX,
    //       y: footerY,
    //       size: footerFontSize,
    //       font: abarRegular,
    //       color: NAVY,
    //     });
    //   }
    // }

    // 8. Save and return
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
