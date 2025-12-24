import { PDFDocument, PDFName, PDFArray, PDFString } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { toSaudiTime } from "./timezone";
import {
  generatePresignedReadUrl,
  extractKeyFromUrl,
  needsPresignedReadUrl,
} from "./s3";

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

// Colors matching the design (cream/white color for text on dark background)
const TEXT_COLOR = "#E8DFC9";
const WHITE_COLOR = "#FFFFFF";

export interface InvitationPdfOptions {
  sessionTitle: string;
  sessionDate: Date;
  location?: string;
  locationUrl?: string;
  sponsors?: Array<{
    name: string;
    logoUrl?: string | null;
    type: string;
    socialMediaLinks?: Record<string, string> | null;
  }>;
}

/**
 * Get the primary sponsor link (website first, then social media)
 */
function getSponsorLink(socialMediaLinks: Record<string, string> | null | undefined): string | null {
  if (!socialMediaLinks) return null;

  // Priority order: website > twitter > instagram > linkedin > other
  const priorityOrder = ["website", "twitter", "instagram", "linkedin"];

  for (const key of priorityOrder) {
    if (socialMediaLinks[key]) return socialMediaLinks[key];
  }

  // Return any other available link
  const values = Object.values(socialMediaLinks).filter(Boolean);
  return values.length > 0 ? values[0] : null;
}

// Cache for template
let templateBuffer: Buffer | null = null;

// Circular cropping - commented out for now
// async function cropImageToCircle(
//   imageBuffer: Buffer,
//   targetSize: number
// ): Promise<Buffer> {
//   const img = await loadImage(imageBuffer);
//   const canvas = createCanvas(targetSize, targetSize);
//   const ctx = canvas.getContext("2d");
//   ctx.clearRect(0, 0, targetSize, targetSize);
//   ctx.beginPath();
//   ctx.arc(targetSize / 2, targetSize / 2, targetSize / 2, 0, Math.PI * 2);
//   ctx.closePath();
//   ctx.clip();
//   const aspectRatio = img.width / img.height;
//   let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
//   if (aspectRatio > 1) {
//     drawHeight = targetSize;
//     drawWidth = targetSize * aspectRatio;
//     drawX = -(drawWidth - targetSize) / 2;
//     drawY = 0;
//   } else {
//     drawWidth = targetSize;
//     drawHeight = targetSize / aspectRatio;
//     drawX = 0;
//     drawY = -(drawHeight - targetSize) / 2;
//   }
//   ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
//   return canvas.toBuffer("image/png");
// }

/**
 * Render Arabic text to a PNG buffer using canvas
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
    color = TEXT_COLOR,
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
  const textHeight = fontSize * 1.4;

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

  const templatePath = path.join(process.cwd(), "public", "invitation.pdf");
  templateBuffer = await fs.readFile(templatePath);
  return templateBuffer;
}

/**
 * Format day name for invitation PDF (e.g., "الثلاثاء")
 */
function formatDayNameForInvitation(date: Date): string {
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";

  return saudiDate.toLocaleDateString("ar-SA", {
    weekday: "long",
  });
}

/**
 * Format date for invitation PDF (e.g., "١٦ ديسمبر" with Arabic numerals, no year)
 */
function formatDateForInvitation(date: Date): string {
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";

  // Use Arabic numerals (numberingSystem: "arab"), no year
  return saudiDate.toLocaleDateString("ar-SA", {
    day: "numeric",
    month: "long",
    numberingSystem: "arab",
  });
}

/**
 * Generate invitation PDF with customized date, location link, and sponsors
 */
export async function generateInvitationPdf(
  options: InvitationPdfOptions
): Promise<Buffer | null> {
  try {
    // Load template PDF
    const template = await loadTemplate();
    const pdfDoc = await PDFDocument.load(template);

    // Register fontkit
    pdfDoc.registerFontkit(fontkit);

    // Get first page and dimensions
    const page = pdfDoc.getPages()[0];
    if (!page) {
      console.error("No pages found in template PDF");
      return null;
    }
    const { width, height } = page.getSize();

    // ====================================
    // POSITION CALIBRATION
    // Template appears to be approximately 1080x1920 points (9:16 ratio)
    // ====================================

    // Date position - based on the image, date appears near bottom, around 15% from bottom
    const dateY = height * 0.313;
    const dateX = width * 0.48; // Right side for date
    const dateFontSize = 30; // Increased font size

    // Location link area - middle section near bottom
    const locationLinkY = dateY;
    const locationLinkX = width * 0.5;

    // ====================================
    // DRAW DATE (Two lines: date on top, day name below)
    // ====================================
    const dayNameText = formatDayNameForInvitation(options.sessionDate);
    const dateText = formatDateForInvitation(options.sessionDate);
    const tightPadding = 2; // Minimal padding for tight spacing

    // Draw date (top line)
    if (dateText) {
      const dateImageData = renderArabicTextToImage(dateText, {
        fontFamily: "AbarBold",
        fontSize: dateFontSize,
        color: WHITE_COLOR,
        padding: tightPadding,
      });
      const dateImage = await pdfDoc.embedPng(dateImageData.buffer);

      // Position date above center
      page.drawImage(dateImage, {
        x: dateX - dateImageData.width / 2,
        y: dateY,
        width: dateImageData.width,
        height: dateImageData.height,
      });
    }

    // Draw day name (bottom line)
    if (dayNameText) {
      const dayNameImageData = renderArabicTextToImage(dayNameText, {
        fontFamily: "AbarBold",
        fontSize: dateFontSize,
        color: WHITE_COLOR,
        padding: tightPadding,
      });
      const dayNameImage = await pdfDoc.embedPng(dayNameImageData.buffer);

      // Position day name directly below date (subtract height + small gap)
      page.drawImage(dayNameImage, {
        x: dateX - dayNameImageData.width / 2,
        y: dateY - dayNameImageData.height - 2,
        width: dayNameImageData.width,
        height: dayNameImageData.height,
      });
    }

    // ====================================
    // ADD LOCATION HYPERLINK
    // ====================================
    if (options.locationUrl) {
      // Create clickable area over the location section
      const linkWidth = 150;
      const linkHeight = 60;
      const linkX = locationLinkX - linkWidth / 2;
      const linkY = locationLinkY - linkHeight / 2;

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

    // ====================================
    // DRAW SPONSORS SECTION (RTL Dynamic Grid)
    // ====================================
    if (options.sponsors && options.sponsors.length > 0) {
      // Filter sponsors that have logos or names
      const validSponsors = options.sponsors.filter((s) => s.name || s.logoUrl);

      if (validSponsors.length > 0) {
        // Define sponsor container area (the blue placeholder below "الرعاة" ribbon)
        const containerLeft = width * 0.1;
        const containerRight = width * 0.9;
        const containerWidth = containerRight - containerLeft;
        const containerTop = height * 0.2; // Just below the ribbon
        const containerBottom = height * 0.1; // Above the very bottom
        const containerHeight = containerTop - containerBottom;

        // Calculate grid layout based on sponsor count (1-10 sponsors)
        // For even counts > 3: divide evenly (4→2,2; 6→3,3; 8→4,4; 10→5,5)
        // For odd counts > 3: smaller row first (5→2,3; 7→3,4; 9→4,5)
        const count = Math.min(validSponsors.length, 10);
        let rows: number;
        let row1Count: number;
        let row2Count: number;

        if (count <= 3) {
          rows = 1;
          row1Count = count;
          row2Count = 0;
        } else {
          rows = 2;
          row1Count = Math.floor(count / 2);
          row2Count = Math.ceil(count / 2);
        }

        // Calculate cell dimensions based on max columns needed
        const maxCols = Math.max(row1Count, row2Count);
        const cellWidth = containerWidth / maxCols;
        const cellHeight = containerHeight / rows;
        const padding = Math.min(cellWidth, cellHeight) * 0.1;

        // Calculate max logo/text size based on cell size
        const maxLogoSize = Math.min(
          cellWidth - padding * 2,
          cellHeight - padding * 2
        );
        const fontSize = Math.max(12, Math.min(24, maxLogoSize * 0.3));

        // Draw sponsors in RTL order (right to left, top to bottom)
        for (let i = 0; i < count; i++) {
          const sponsor = validSponsors[i];
          if (!sponsor) continue;

          // Determine which row this sponsor is in and position within row
          let row: number;
          let colInRow: number;
          let colsInThisRow: number;

          if (rows === 1) {
            row = 0;
            colInRow = i;
            colsInThisRow = row1Count;
          } else {
            if (i < row1Count) {
              row = 0;
              colInRow = i;
              colsInThisRow = row1Count;
            } else {
              row = 1;
              colInRow = i - row1Count;
              colsInThisRow = row2Count;
            }
          }

          // Calculate cell width for this row (each row is centered)
          const rowCellWidth = containerWidth / colsInThisRow;

          // Calculate position (RTL: start from right)
          const colFromRight = colsInThisRow - 1 - colInRow;
          const cellCenterX = containerLeft + (colFromRight + 0.5) * rowCellWidth;
          const cellCenterY = containerTop - (row + 0.5) * cellHeight;

          // Try to load and embed sponsor logo
          if (sponsor.logoUrl) {
            try {
              // Get the URL to fetch - handle S3 presigned URLs
              let logoUrl = sponsor.logoUrl;

              // Check if we need presigned URLs for S3
              if (needsPresignedReadUrl()) {
                const key = extractKeyFromUrl(logoUrl);
                if (key) {
                  logoUrl = await generatePresignedReadUrl(key);
                } else if (!logoUrl.startsWith("http")) {
                  // It's already a key, not a URL
                  logoUrl = await generatePresignedReadUrl(logoUrl);
                  console.log(
                    `Generated presigned URL for direct key: ${sponsor.logoUrl}`
                  );
                }
              } else if (logoUrl.startsWith("/")) {
                // Handle relative URLs by prepending base URL
                const baseUrl = process.env.BASE_URL || "http://localhost:3000";
                logoUrl = `${baseUrl}${logoUrl}`;
              }

              const logoResponse = await fetch(logoUrl);
              if (logoResponse.ok) {
                const logoBuffer = Buffer.from(
                  await logoResponse.arrayBuffer()
                );
                const contentType =
                  logoResponse.headers.get("content-type") || "";

                // Determine image type from content-type or URL
                const lowerUrl = logoUrl.toLowerCase();
                const isPng =
                  contentType.includes("png") || lowerUrl.includes(".png");
                const isWebp =
                  contentType.includes("webp") || lowerUrl.includes(".webp");
                const isSvg =
                  contentType.includes("svg") || lowerUrl.includes(".svg");
                const isGif =
                  contentType.includes("gif") || lowerUrl.includes(".gif");

                // First, convert to PNG if needed (for non-PNG formats)
                let pngBuffer: Buffer;
                if (isSvg || isWebp || isGif) {
                  // SVG, WebP, GIF not supported by pdf-lib - convert via canvas
                  const img = await loadImage(logoBuffer);
                  const canvas = createCanvas(img.width, img.height);
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0);
                  pngBuffer = canvas.toBuffer("image/png");
                } else if (isPng) {
                  pngBuffer = logoBuffer;
                } else {
                  // Convert JPG to PNG for circular cropping
                  const img = await loadImage(logoBuffer);
                  const canvas = createCanvas(img.width, img.height);
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0);
                  pngBuffer = canvas.toBuffer("image/png");
                }

                // Crop to circle - commented out for now
                // const circleSize = Math.round(maxLogoSize);
                // const circularBuffer = await cropImageToCircle(pngBuffer, circleSize);
                // const logoImage = await pdfDoc.embedPng(circularBuffer);

                // Use original image without circular cropping
                const logoImage = await pdfDoc.embedPng(pngBuffer);

                // Calculate logo dimensions to fit cell
                const aspectRatio = logoImage.width / logoImage.height;
                let logoWidth = maxLogoSize;
                let logoHeight = maxLogoSize;
                if (aspectRatio > 1) {
                  logoHeight = maxLogoSize / aspectRatio;
                } else {
                  logoWidth = maxLogoSize * aspectRatio;
                }

                page.drawImage(logoImage, {
                  x: cellCenterX - logoWidth / 2,
                  y: cellCenterY - logoHeight / 2,
                  width: logoWidth,
                  height: logoHeight,
                });

                // Add hyperlink if sponsor has a link
                const sponsorLink = getSponsorLink(sponsor.socialMediaLinks);
                if (sponsorLink) {
                  const linkX = cellCenterX - logoWidth / 2;
                  const linkY = cellCenterY - logoHeight / 2;

                  const actionDict = pdfDoc.context.obj({
                    Type: "Action",
                    S: "URI",
                    URI: PDFString.of(sponsorLink),
                  });

                  const linkAnnotation = pdfDoc.context.obj({
                    Type: "Annot",
                    Subtype: "Link",
                    Rect: [linkX, linkY, linkX + logoWidth, linkY + logoHeight],
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
              } else {
                throw new Error("Failed to fetch logo");
              }
            } catch (logoError) {
              console.error(
                `Failed to load sponsor logo: ${sponsor.logoUrl}`,
                logoError
              );
              // Fall back to text
              const nameImageData = renderArabicTextToImage(sponsor.name, {
                fontFamily: "Abar",
                fontSize,
                color: TEXT_COLOR,
                maxWidth: cellWidth - padding * 2,
              });
              const nameImage = await pdfDoc.embedPng(nameImageData.buffer);

              page.drawImage(nameImage, {
                x: cellCenterX - nameImageData.width / 2,
                y: cellCenterY - nameImageData.height / 2,
                width: nameImageData.width,
                height: nameImageData.height,
              });

              // Add hyperlink for text fallback if sponsor has a link
              const sponsorLink = getSponsorLink(sponsor.socialMediaLinks);
              if (sponsorLink) {
                const linkX = cellCenterX - nameImageData.width / 2;
                const linkY = cellCenterY - nameImageData.height / 2;

                const actionDict = pdfDoc.context.obj({
                  Type: "Action",
                  S: "URI",
                  URI: PDFString.of(sponsorLink),
                });

                const linkAnnotation = pdfDoc.context.obj({
                  Type: "Annot",
                  Subtype: "Link",
                  Rect: [linkX, linkY, linkX + nameImageData.width, linkY + nameImageData.height],
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
            }
          } else {
            // No logo, draw sponsor name
            const nameImageData = renderArabicTextToImage(sponsor.name, {
              fontFamily: "Abar",
              fontSize,
              color: TEXT_COLOR,
              maxWidth: cellWidth - padding * 2,
            });
            const nameImage = await pdfDoc.embedPng(nameImageData.buffer);

            page.drawImage(nameImage, {
              x: cellCenterX - nameImageData.width / 2,
              y: cellCenterY - nameImageData.height / 2,
              width: nameImageData.width,
              height: nameImageData.height,
            });

            // Add hyperlink for text if sponsor has a link
            const sponsorLink = getSponsorLink(sponsor.socialMediaLinks);
            if (sponsorLink) {
              const linkX = cellCenterX - nameImageData.width / 2;
              const linkY = cellCenterY - nameImageData.height / 2;

              const actionDict = pdfDoc.context.obj({
                Type: "Action",
                S: "URI",
                URI: PDFString.of(sponsorLink),
              });

              const linkAnnotation = pdfDoc.context.obj({
                Type: "Annot",
                Subtype: "Link",
                Rect: [linkX, linkY, linkX + nameImageData.width, linkY + nameImageData.height],
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
          }
        }
      }
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Failed to generate invitation PDF:", error);
    return null;
  }
}

/**
 * Generate invitation PDF as base64 data URL
 */
export async function generateInvitationPdfDataUrl(
  options: InvitationPdfOptions
): Promise<string | null> {
  const buffer = await generateInvitationPdf(options);
  if (!buffer) return null;
  return `data:application/pdf;base64,${buffer.toString("base64")}`;
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache(): void {
  templateBuffer = null;
}
