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
  "AbarHigh-Bold.ttf",
);
const abarRegularPath = path.join(
  process.cwd(),
  "public",
  "fonts",
  "AbarLow-Regular.ttf",
);

// Register Abar fonts
if (fsSync.existsSync(abarBoldPath)) {
  GlobalFonts.registerFromPath(abarBoldPath, "AbarBold");
}
if (fsSync.existsSync(abarRegularPath)) {
  GlobalFonts.registerFromPath(abarRegularPath, "Abar");
}

// Colors matching the design
export const TEXT_COLOR = "#E8DFC9"; // Cream color for main text
export const WHITE_COLOR = "#FFFFFF"; // Pure white when needed
export const ACCENT_COLOR = "#cca890"; // Golden accent for session title and greeting
export const TITLE_COLOR = "#e3c56f"; // Highlight color for session title

// Fixed Arabic texts for PDF content
const FIXED_TEXTS = {
  mainTitle: "دعوة خاصة",
  subtitle: "ندعـوكم لحضور ثلوثية الأعمال في شتوية لفت بعنوان",
  // description:
  //   "حيث يجتمع نخبة من رواد الأعمال في لقاء يحول الثلوثية إلى مساحة تبنى فيها العلاقات، وتنضج فيها الفرص",
  description: "", // Hidden for now
  greeting: "حياكم الله في شتوية لَفت",
  menOnlyLabel: "للرجال",
  menOnlySublabel: "فقط",
  sponsorsHeader: "الرعــاة",
  clickForLocation: "انقر للوصول",
  locationSublabel: "إلى الموقع",
  // Fixed session title (two lines)
  sessionTitleLine1: "هل الاتصال يصنع المدن؟",
  sessionTitleLine2:
    "مركاز البلد الأمين أنموذجًا رائدًا في المبادرات الاتصالية الحكومية",
};

// Layout configuration - relative spacing system
// All sections flow from top to bottom with consistent gaps between them
const LAYOUT = {
  // Anchor points (percentage from bottom of page)
  topStart: 0.88, // Where first element (mainTitle) starts
  bottomMargin: 0.02, // Bottom margin for sponsors

  // Spacing between sections (in points)
  // Each value is the gap between the bottom of one section and top of next
  spacing: {
    afterMainTitle: 15, // gap after "دعوة خاصة"
    afterSubtitle: 18, // gap after "ندعوكم لحضور"
    afterSessionTitle: 22, // gap after session title
    afterDescription: 28, // gap after description paragraph
    afterGreeting: 25, // gap after "حياكم الله"
    afterGuestTitle: 15, // gap after "ضيف هذه الثلوثية"
    afterSessionGuests: 40, // gap after guest names
    afterIcons: 80, // gap after info icons row
  },
};

// Font sizes matching qr-pdf.ts
const FONT_SIZES = {
  mainTitle: 50,
  subtitle: 35,
  sessionTitle: 90,
  description: 28,
  greeting: 50,
  sessionGuests: 24,
  iconLabel: 32,
  sponsorsHeader: 65,
};

export interface InvitationPdfOptions {
  sessionId: string;
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
  // Session guests (VIP/speakers at the event)
  sessionGuests?: Array<{
    name: string;
    title?: string | null;
    jobTitle?: string | null;
    company?: string | null;
    imageUrl?: string | null;
  }>;
}

/**
 * Get the primary sponsor link (website first, then social media)
 */
export function getSponsorLink(
  socialMediaLinks: Record<string, string> | null | undefined,
): string | null {
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

/**
 * Crop image to a circle with specified size
 */
export async function cropImageToCircle(
  imageBuffer: Buffer,
  targetSize: number,
): Promise<Buffer> {
  const img = await loadImage(imageBuffer);
  const scale = 2; // Higher resolution
  const canvas = createCanvas(targetSize * scale, targetSize * scale);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, targetSize * scale, targetSize * scale);
  ctx.beginPath();
  ctx.arc(
    (targetSize * scale) / 2,
    (targetSize * scale) / 2,
    (targetSize * scale) / 2,
    0,
    Math.PI * 2,
  );
  ctx.closePath();
  ctx.clip();
  const aspectRatio = img.width / img.height;
  let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
  if (aspectRatio > 1) {
    drawHeight = targetSize * scale;
    drawWidth = targetSize * scale * aspectRatio;
    drawX = -(drawWidth - targetSize * scale) / 2;
    drawY = 0;
  } else {
    drawWidth = targetSize * scale;
    drawHeight = (targetSize * scale) / aspectRatio;
    drawX = 0;
    drawY = -(drawHeight - targetSize * scale) / 2;
  }
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  return canvas.toBuffer("image/png");
}

/**
 * Calculate the font size needed to fit text within maxWidth on a single line
 */
export function calculateFitFontSize(
  text: string,
  fontFamily: string,
  maxFontSize: number,
  minFontSize: number,
  maxWidth: number,
): number {
  const measureCanvas = createCanvas(1, 1);
  const measureCtx = measureCanvas.getContext("2d");

  let fontSize = maxFontSize;
  while (fontSize >= minFontSize) {
    measureCtx.font = `${fontSize}px "${fontFamily}"`;
    const textWidth = measureCtx.measureText(text).width;
    if (textWidth <= maxWidth) {
      return fontSize;
    }
    fontSize -= 2; // Decrease by 2px each iteration
  }
  return minFontSize;
}

/**
 * Preserve bidirectional text order for mixed Arabic/English text.
 * Wraps text with Unicode RLI (Right-to-Left Isolate) to ensure
 * the visual order matches how the text was typed.
 */
export function preserveBidiOrder(text: string): string {
  // U+2067: RLI (Right-to-Left Isolate) - establishes RTL context
  // U+2069: PDI (Pop Directional Isolate) - ends the isolate
  const RLI = "\u2067";
  const PDI = "\u2069";
  return `${RLI}${text}${PDI}`;
}

/**
 * Render Arabic text to a PNG buffer using canvas with word wrapping
 */
export function renderArabicTextToImage(
  text: string,
  options: {
    fontFamily?: string;
    fontSize?: number;
    color?: string;
    padding?: number;
    maxWidth?: number;
    textAlign?: "center" | "right" | "left";
  } = {},
): { buffer: Buffer; width: number; height: number } {
  const {
    fontFamily = "AbarBold",
    fontSize = 25,
    color = TEXT_COLOR,
    padding = 10,
    maxWidth = 800,
    textAlign = "center",
  } = options;

  // Preserve bidirectional text order for mixed Arabic/English
  const processedText = preserveBidiOrder(text);

  // Create a temporary canvas to measure text
  const measureCanvas = createCanvas(1, 1);
  const measureCtx = measureCanvas.getContext("2d");
  const fontString = `${fontSize}px "${fontFamily}"`;
  measureCtx.font = fontString;

  // Split text into words and wrap lines
  const words = processedText.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = measureCtx.measureText(testLine).width;

    if (testWidth <= maxWidth || !currentLine) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  // Calculate dimensions
  const lineHeight = fontSize * 1.4;
  let maxLineWidth = 0;
  for (const line of lines) {
    const lineWidth = measureCtx.measureText(line).width;
    if (lineWidth > maxLineWidth) maxLineWidth = lineWidth;
  }

  const canvasWidth = Math.ceil(Math.min(maxLineWidth, maxWidth) + padding * 2);
  const canvasHeight = Math.ceil(lines.length * lineHeight + padding * 2);

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext("2d");

  // Transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Set text properties
  ctx.font = fontString;
  ctx.fillStyle = color;
  ctx.textAlign = textAlign;
  ctx.textBaseline = "middle";

  // Calculate x position based on alignment
  let textX: number;
  if (textAlign === "right") {
    textX = canvasWidth - padding;
  } else if (textAlign === "left") {
    textX = padding;
  } else {
    textX = canvasWidth / 2;
  }

  // Draw each line
  for (let i = 0; i < lines.length; i++) {
    const y = padding + lineHeight * (i + 0.5);
    ctx.fillText(lines[i], textX, y);
  }

  return {
    buffer: canvas.toBuffer("image/png"),
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * Convert image to cream color (#E8DFC9) while preserving alpha channel
 * Used for sponsor logos on dark backgrounds
 */
export async function convertImageToTextColor(
  imageBuffer: Buffer,
): Promise<Buffer> {
  const img = await loadImage(imageBuffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext("2d");

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, img.width, img.height);
  const data = imageData.data;

  // Parse cream color (#E8DFC9) to RGB
  const r = 0xe8; // 232
  const g = 0xdf; // 223
  const b = 0xc9; // 201

  // Convert all non-transparent pixels to cream color
  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha > 0) {
      // Set RGB to cream color, preserve alpha
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  // Put modified image data back
  ctx.putImageData(imageData, 0, 0);

  return canvas.toBuffer("image/png");
}

/**
 * Load and cache template
 */
async function loadTemplate(): Promise<Buffer> {
  if (templateBuffer) {
    return templateBuffer;
  }

  const templatePath = path.join(process.cwd(), "public", "blank_template.pdf");
  templateBuffer = await fs.readFile(templatePath);
  return templateBuffer;
}

/**
 * Load icon from public/icons folder
 */
export async function loadIcon(iconName: string): Promise<Buffer> {
  const iconPath = path.join(
    process.cwd(),
    "public",
    "icons",
    `${iconName}.png`,
  );
  return fs.readFile(iconPath);
}

/**
 * Render icon with label below it (high resolution)
 */
export async function renderIconWithLabel(
  iconBuffer: Buffer,
  label: string,
  sublabel: string | null,
  options: {
    iconSize?: number;
    fontSize?: number;
    color?: string;
  } = {},
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { iconSize = 40, fontSize = 18, color = WHITE_COLOR } = options;

  // Scale factor for high resolution rendering (2x for crisp icons)
  const scale = 2;

  // Load the icon image
  const iconImg = await loadImage(iconBuffer);

  // Calculate dimensions (at 1x for measurement)
  const padding = 10;
  const labelGap = 8;
  const sublabelGap = 12;

  // Measure text at scaled size
  const measureCanvas = createCanvas(1, 1);
  const measureCtx = measureCanvas.getContext("2d");
  measureCtx.font = `${fontSize * scale}px "AbarBold"`;
  const labelWidth = measureCtx.measureText(label).width / scale;

  let sublabelWidth = 0;
  if (sublabel) {
    measureCtx.font = `${(fontSize - 4) * scale}px "AbarBold"`;
    sublabelWidth = measureCtx.measureText(sublabel).width / scale;
  }

  const maxTextWidth = Math.max(labelWidth, sublabelWidth);
  const canvasWidth = Math.ceil(Math.max(iconSize, maxTextWidth) + padding * 2);
  const canvasHeight = Math.ceil(
    iconSize +
      labelGap +
      fontSize +
      (sublabel ? sublabelGap + fontSize - 4 : 0) +
      padding * 2,
  );

  // Create canvas at scaled size for high resolution
  const canvas = createCanvas(canvasWidth * scale, canvasHeight * scale);
  const ctx = canvas.getContext("2d");

  // Scale all drawing operations
  ctx.scale(scale, scale);

  // Transparent background
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw icon centered at top (at logical size, canvas handles scaling)
  const iconX = (canvasWidth - iconSize) / 2;
  ctx.drawImage(iconImg, iconX, padding, iconSize, iconSize);

  // Draw label below icon
  ctx.font = `${fontSize}px "AbarBold"`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(label, canvasWidth / 2, padding + iconSize + labelGap);

  // Draw sublabel if provided
  if (sublabel) {
    ctx.font = `${fontSize - 4}px "AbarBold"`;
    ctx.fillText(
      sublabel,
      canvasWidth / 2,
      padding + iconSize + labelGap + fontSize + sublabelGap,
    );
  }

  return {
    buffer: canvas.toBuffer("image/png"),
    width: canvasWidth,
    height: canvasHeight,
  };
}

/**
 * Format day name for invitation PDF (e.g., "الثلاثاء")
 */
export function formatDayNameForInvitation(date: Date): string {
  const saudiDate = toSaudiTime(date);
  if (!saudiDate) return "";

  return saudiDate.toLocaleDateString("ar-SA", {
    weekday: "long",
  });
}

/**
 * Format date for invitation PDF (e.g., "١٦ ديسمبر" with Arabic numerals, no year)
 */
export function formatDateForInvitation(date: Date): string {
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
  options: InvitationPdfOptions,
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
    // RENDER ALL CONTENT FROM CODE (blank_template.pdf)
    // Template only contains: background image + header logos
    // All text, icons, and content are rendered dynamically
    // Uses relative positioning - each section flows from the previous one
    // ====================================

    // currentY tracks position as we flow down the page (PDF Y: 0 = bottom)
    let currentY = height * LAYOUT.topStart;
    const { spacing } = LAYOUT;

    // ====================================
    // 1. DRAW MAIN TITLE ("دعوة خاصة")
    // ====================================
    const mainTitleImageData = renderArabicTextToImage(FIXED_TEXTS.mainTitle, {
      fontFamily: "AbarBold",
      fontSize: FONT_SIZES.mainTitle,
      color: WHITE_COLOR,
    });
    const mainTitleImage = await pdfDoc.embedPng(mainTitleImageData.buffer);
    page.drawImage(mainTitleImage, {
      x: (width - mainTitleImageData.width) / 2,
      y: currentY - mainTitleImageData.height / 2,
      width: mainTitleImageData.width,
      height: mainTitleImageData.height,
    });
    currentY -= mainTitleImageData.height / 2 + spacing.afterMainTitle;

    // ====================================
    // 2. DRAW SUBTITLE ("ندعوكم لحضور")
    // ====================================
    const subtitleImageData = renderArabicTextToImage(FIXED_TEXTS.subtitle, {
      fontFamily: "AbarBold",
      fontSize: FONT_SIZES.subtitle,
      color: ACCENT_COLOR,
    });
    const subtitleImage = await pdfDoc.embedPng(subtitleImageData.buffer);
    currentY -= subtitleImageData.height / 2;
    page.drawImage(subtitleImage, {
      x: (width - subtitleImageData.width) / 2,
      y: currentY - subtitleImageData.height / 2,
      width: subtitleImageData.width,
      height: subtitleImageData.height,
    });
    currentY -= subtitleImageData.height / 2 + spacing.afterSubtitle;

    // ====================================
    // 3. DRAW SESSION TITLE - ACCENT COLOR
    // ====================================
    const sessionTitleMaxWidth = width * 0.75;

    // ====================================
    // TEMPORARY: Fixed two-line title (comment out to restore dynamic title)
    // ====================================
    // Line 1: Question (smaller font)
    const line1FontSize = 50;
    const line1ImageData = renderArabicTextToImage(
      FIXED_TEXTS.sessionTitleLine1,
      {
        fontFamily: "AbarBold",
        fontSize: line1FontSize,
        color: TITLE_COLOR,
        maxWidth: sessionTitleMaxWidth,
      },
    );
    const line1Image = await pdfDoc.embedPng(line1ImageData.buffer);
    currentY -= line1ImageData.height / 2;
    page.drawImage(line1Image, {
      x: (width - line1ImageData.width) / 2,
      y: currentY - line1ImageData.height / 2,
      width: line1ImageData.width,
      height: line1ImageData.height,
    });
    currentY -= line1ImageData.height / 2 + 10; // Small gap between lines

    // Line 2: Headline (larger font, auto-sized to fit)
    const line2FontSize = calculateFitFontSize(
      FIXED_TEXTS.sessionTitleLine2,
      "AbarBold",
      FONT_SIZES.sessionTitle,
      35,
      sessionTitleMaxWidth,
    );
    const line2ImageData = renderArabicTextToImage(
      FIXED_TEXTS.sessionTitleLine2,
      {
        fontFamily: "AbarBold",
        fontSize: line2FontSize,
        color: ACCENT_COLOR,
        maxWidth: sessionTitleMaxWidth,
      },
    );
    const line2Image = await pdfDoc.embedPng(line2ImageData.buffer);
    currentY -= line2ImageData.height / 2;
    page.drawImage(line2Image, {
      x: (width - line2ImageData.width) / 2,
      y: currentY - line2ImageData.height / 2,
      width: line2ImageData.width,
      height: line2ImageData.height,
    });
    currentY -= line2ImageData.height / 2 + spacing.afterSessionTitle;
    // ====================================
    // END TEMPORARY FIXED TITLE
    // ====================================

    // ====================================
    // DYNAMIC SESSION TITLE (from DB) - uncomment to restore
    // ====================================
    // const sessionTitleFontSize = calculateFitFontSize(
    //   options.sessionTitle,
    //   "AbarBold",
    //   FONT_SIZES.sessionTitle,
    //   35,
    //   sessionTitleMaxWidth
    // );
    // const sessionTitleImageData = renderArabicTextToImage(
    //   options.sessionTitle,
    //   {
    //     fontFamily: "AbarBold",
    //     fontSize: sessionTitleFontSize,
    //     color: ACCENT_COLOR,
    //     maxWidth: sessionTitleMaxWidth,
    //   }
    // );
    // const sessionTitleImage = await pdfDoc.embedPng(
    //   sessionTitleImageData.buffer
    // );
    // currentY -= sessionTitleImageData.height / 2;
    // page.drawImage(sessionTitleImage, {
    //   x: (width - sessionTitleImageData.width) / 2,
    //   y: currentY - sessionTitleImageData.height / 2,
    //   width: sessionTitleImageData.width,
    //   height: sessionTitleImageData.height,
    // });
    // currentY -= sessionTitleImageData.height / 2 + spacing.afterSessionTitle;
    // ====================================
    // END DYNAMIC SESSION TITLE
    // ====================================

    // ====================================
    // 4. DRAW DESCRIPTION (fixed text) - only if description exists
    // ====================================
    if (FIXED_TEXTS.description) {
      const descImageData = renderArabicTextToImage(FIXED_TEXTS.description, {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.description,
        color: WHITE_COLOR,
        maxWidth: width * 0.7,
      });
      const descImage = await pdfDoc.embedPng(descImageData.buffer);
      currentY -= descImageData.height / 2;
      page.drawImage(descImage, {
        x: (width - descImageData.width) / 2,
        y: currentY - descImageData.height / 2,
        width: descImageData.width,
        height: descImageData.height,
      });
      currentY -= descImageData.height / 2 + spacing.afterDescription;
    }

    // ====================================
    // 5. DRAW GREETING ("حياكم الله") - ACCENT COLOR
    // ====================================
    const greetingImageData = renderArabicTextToImage(FIXED_TEXTS.greeting, {
      fontFamily: "AbarBold",
      fontSize: FONT_SIZES.greeting,
      color: ACCENT_COLOR,
    });
    const greetingImage = await pdfDoc.embedPng(greetingImageData.buffer);
    currentY -= greetingImageData.height / 2;
    page.drawImage(greetingImage, {
      x: (width - greetingImageData.width) / 2,
      y: currentY - greetingImageData.height / 2,
      width: greetingImageData.width,
      height: greetingImageData.height,
    });
    currentY -= greetingImageData.height / 2 + spacing.afterGreeting;

    // ====================================
    // 6. DRAW SESSION GUESTS (VIP/speakers) - Grid layout
    // ====================================
    if (options.sessionGuests && options.sessionGuests.length > 0) {
      const nameFontSize = FONT_SIZES.sessionGuests + 10;
      const jobTitleFontSize = FONT_SIZES.sessionGuests;

      // Draw header "ضيف هذه الثلوثية" title
      const guestTitleFontSize = 44;
      const guestTitleImageData = renderArabicTextToImage("ضيف هذه الثلوثية", {
        fontFamily: "AbarBold",
        fontSize: guestTitleFontSize,
        color: WHITE_COLOR,
      });
      const guestTitleImage = await pdfDoc.embedPng(guestTitleImageData.buffer);
      currentY -= guestTitleImageData.height / 2;
      page.drawImage(guestTitleImage, {
        x: (width - guestTitleImageData.width) / 2,
        y: currentY - guestTitleImageData.height / 2,
        width: guestTitleImageData.width,
        height: guestTitleImageData.height,
      });
      currentY -= guestTitleImageData.height / 2 + spacing.afterGuestTitle;

      // Draw guests in a centered split layout (RTL)
      // Page split: 68% text on left, 32% image on right
      // Gap between them is at the split point
      const guestCount = Math.min(options.sessionGuests.length, 5);
      const textLineGap = 8; // Gap between name and job title
      const guestImageSize = 200; // Image max size (bigger)
      const guestVerticalGap = 30; // Gap between multiple guests
      const centerGap = 40; // Gap between text and image

      // Define content area with page margins
      const pageMargin = width * 0.12; // 12% margin on each side
      const contentWidth = width - pageMargin * 2;
      const contentStartX = pageMargin;

      // 68/32 split within content area (text gets 68%, image gets 32%)
      const textSectionWidth = contentStartX + contentWidth * 0.68;
      const textMaxWidth = contentWidth * 0.6 - 20; // Text area width with small padding

      for (let i = 0; i < guestCount; i++) {
        const guest = options.sessionGuests[i];
        if (!guest) continue;

        // Prepare guest name text first to measure
        const guestName = guest.title
          ? `${guest.title} ${guest.name}`
          : guest.name;

        const nameImageData = renderArabicTextToImage(guestName, {
          fontFamily: "AbarBold",
          fontSize: nameFontSize,
          color: TEXT_COLOR,
          maxWidth: textMaxWidth,
          textAlign: "right",
        });

        // Prepare job title if exists
        let jobImageData: {
          buffer: Buffer;
          width: number;
          height: number;
        } | null = null;
        if (guest.jobTitle || guest.company) {
          const jobText = [guest.jobTitle, guest.company]
            .filter(Boolean)
            .join(" - ");
          jobImageData = renderArabicTextToImage(jobText, {
            fontFamily: "AbarBold",
            fontSize: jobTitleFontSize,
            color: WHITE_COLOR,
            maxWidth: textMaxWidth,
            textAlign: "right",
          });
        }

        // Calculate total text block height
        const textBlockHeight =
          nameImageData.height +
          (jobImageData ? textLineGap + jobImageData.height : 0);

        // Content height is the taller of image or text block
        const contentHeight = Math.max(guestImageSize, textBlockHeight);

        // Try to load guest image
        let guestImageBuffer: Buffer | null = null;
        if (guest.imageUrl) {
          try {
            let imageUrl = guest.imageUrl;

            // Handle S3 presigned URLs
            if (needsPresignedReadUrl()) {
              const key = extractKeyFromUrl(imageUrl);
              if (key) {
                imageUrl = await generatePresignedReadUrl(key);
              } else if (!imageUrl.startsWith("http")) {
                imageUrl = await generatePresignedReadUrl(imageUrl);
              }
            } else if (imageUrl.startsWith("/")) {
              const baseUrl = process.env.BASE_URL || "http://localhost:3000";
              imageUrl = `${baseUrl}${imageUrl}`;
            }

            const imageResponse = await fetch(imageUrl);
            if (imageResponse.ok) {
              guestImageBuffer = Buffer.from(await imageResponse.arrayBuffer());
            }
          } catch (imgError) {
            console.error(
              `Failed to load guest image: ${guest.imageUrl}`,
              imgError,
            );
          }
        }

        // Draw image in right section (40%), preserving aspect ratio
        if (guestImageBuffer) {
          // Embed image (try PNG first, fall back to JPG)
          let guestImage;
          try {
            guestImage = await pdfDoc.embedPng(guestImageBuffer);
          } catch {
            guestImage = await pdfDoc.embedJpg(guestImageBuffer);
          }

          // Calculate dimensions preserving aspect ratio
          const aspectRatio = guestImage.width / guestImage.height;
          let drawWidth = guestImageSize;
          let drawHeight = guestImageSize;
          if (aspectRatio > 1) {
            // Wider than tall
            drawHeight = guestImageSize / aspectRatio;
          } else {
            // Taller than wide
            drawWidth = guestImageSize * aspectRatio;
          }

          const imageX = textSectionWidth + centerGap / 2; // Start just right of text section
          const imageY = currentY - contentHeight / 2 - drawHeight / 2;
          page.drawImage(guestImage, {
            x: imageX,
            y: imageY,
            width: drawWidth,
            height: drawHeight,
          });
        }

        // Draw text block in left section (60%), right-aligned near the split
        const textBlockY = currentY - contentHeight / 2 + textBlockHeight / 2;

        // Draw name - right edge at split point minus gap
        const nameImage = await pdfDoc.embedPng(nameImageData.buffer);
        const nameX = textSectionWidth - centerGap / 2 - nameImageData.width;
        const nameY = textBlockY - nameImageData.height;
        page.drawImage(nameImage, {
          x: nameX,
          y: nameY,
          width: nameImageData.width,
          height: nameImageData.height,
        });

        // Draw job title below name - right-aligned with name (same right edge)
        if (jobImageData) {
          const jobImage = await pdfDoc.embedPng(jobImageData.buffer);
          const jobX = textSectionWidth - centerGap / 2 - jobImageData.width;
          const jobY = nameY - textLineGap - jobImageData.height;
          page.drawImage(jobImage, {
            x: jobX,
            y: jobY,
            width: jobImageData.width,
            height: jobImageData.height,
          });
        }

        currentY -=
          contentHeight +
          (i < guestCount - 1 ? guestVerticalGap : spacing.afterSessionGuests);
      }
    }

    // ====================================
    // 7. DRAW INFO ICONS ROW (no background)
    // ====================================
    const iconSize = 120;
    const iconFontSize = FONT_SIZES.iconLabel;
    const iconSpacing = width / 4;

    // Load icons
    const [locationIcon, calendarIcon, peopleIcon] = await Promise.all([
      loadIcon("location"),
      loadIcon("calender"),
      loadIcon("people"),
    ]);

    // Format date for display
    const dayNameText = formatDayNameForInvitation(options.sessionDate);
    const dateText = formatDateForInvitation(options.sessionDate);

    // Pre-render all icons to get max height for consistent positioning
    const locationIconData = await renderIconWithLabel(
      locationIcon,
      FIXED_TEXTS.clickForLocation,
      FIXED_TEXTS.locationSublabel,
      { iconSize, fontSize: iconFontSize, color: WHITE_COLOR },
    );
    const calendarIconData = await renderIconWithLabel(
      calendarIcon,
      dateText,
      dayNameText,
      { iconSize, fontSize: iconFontSize, color: WHITE_COLOR },
    );
    const peopleIconData = await renderIconWithLabel(
      peopleIcon,
      FIXED_TEXTS.menOnlyLabel,
      FIXED_TEXTS.menOnlySublabel,
      { iconSize, fontSize: iconFontSize, color: WHITE_COLOR },
    );

    const maxIconHeight = Math.max(
      locationIconData.height,
      calendarIconData.height,
      peopleIconData.height,
    );

    // Position icons row using currentY
    const iconsY = currentY - maxIconHeight / 2;

    // Location icon (right side - RTL)
    const locationIconImage = await pdfDoc.embedPng(locationIconData.buffer);
    const locationX = width - iconSpacing;
    page.drawImage(locationIconImage, {
      x: locationX - locationIconData.width / 2,
      y: iconsY - locationIconData.height / 2,
      width: locationIconData.width,
      height: locationIconData.height,
    });

    // Add location hyperlink
    if (options.locationUrl) {
      const linkWidth = locationIconData.width + 20;
      const linkHeight = locationIconData.height + 20;
      const linkX = locationX - linkWidth / 2;
      const linkY = iconsY - linkHeight / 2;

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
          pdfDoc.context.obj([linkAnnotation]),
        );
      }
    }

    // Calendar icon (center)
    const calendarIconImage = await pdfDoc.embedPng(calendarIconData.buffer);
    const calendarX = width / 2;
    page.drawImage(calendarIconImage, {
      x: calendarX - calendarIconData.width / 2,
      y: iconsY - calendarIconData.height / 2,
      width: calendarIconData.width,
      height: calendarIconData.height,
    });

    // People icon (left side - RTL)
    const peopleIconImage = await pdfDoc.embedPng(peopleIconData.buffer);
    const peopleX = iconSpacing;
    page.drawImage(peopleIconImage, {
      x: peopleX - peopleIconData.width / 2,
      y: iconsY - peopleIconData.height / 2,
      width: peopleIconData.width,
      height: peopleIconData.height,
    });

    // Update currentY after icons
    currentY -= maxIconHeight + spacing.afterIcons;

    // ====================================
    // 8. DRAW SPONSORS SECTION (with its own container)
    // ====================================
    if (options.sponsors && options.sponsors.length > 0) {
      // Filter sponsors that have logos or names
      const validSponsors = options.sponsors.filter((s) => s.name || s.logoUrl);

      if (validSponsors.length > 0) {
        // Define sponsor container area - flows from currentY
        const containerLeft = width * 0.1;
        const containerRight = width * 0.9;
        const containerWidth = containerRight - containerLeft;
        const containerTop = currentY; // Use currentY as anchor point

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

        // Calculate available height from containerTop to bottom margin
        const bottomMargin = height * LAYOUT.bottomMargin;
        const maxContainerHeight = containerTop - bottomMargin;

        // Calculate ideal row height based on fixed logo size
        const idealLogoSize = height * 0.08;
        const idealRowPadding = idealLogoSize * 0.2;
        const idealRowHeight = idealLogoSize + idealRowPadding * 2;

        // Calculate actual row height - use ideal if fits, otherwise shrink to fit
        const idealContainerHeight = rows * idealRowHeight;
        const rowHeight =
          idealContainerHeight <= maxContainerHeight
            ? idealRowHeight
            : maxContainerHeight / rows;

        const containerHeight = rows * rowHeight;
        const containerBottom = containerTop - containerHeight;

        // Calculate logo size based on actual row height
        const rowPadding = rowHeight * 0.15;
        const fixedLogoSize = rowHeight - rowPadding * 2;

        // Calculate cell dimensions based on max columns needed
        const maxCols = Math.max(row1Count, row2Count);
        const cellWidth = containerWidth / maxCols;
        const cellHeight = rowHeight;
        const padding = rowPadding;

        // Use calculated logo size
        const maxLogoSize = fixedLogoSize;
        const fontSize = Math.max(16, Math.min(30, maxLogoSize * 0.3));
        const bgPadding = 10;
        const borderRadius = 15;

        // Draw rounded rectangle background (50% transparent #01142d)
        const bgX = containerLeft - bgPadding;
        const bgY = containerBottom - bgPadding;
        const bgWidth = containerWidth + bgPadding * 2;
        const bgHeight = containerHeight + bgPadding * 2;

        // Create rounded rectangle using canvas and embed as PNG
        const scale = 2; // Higher resolution
        const bgCanvas = createCanvas(bgWidth * scale, bgHeight * scale);
        const bgCtx = bgCanvas.getContext("2d");
        bgCtx.clearRect(0, 0, bgWidth * scale, bgHeight * scale);

        // Draw rounded rectangle path
        const r = borderRadius * scale;
        bgCtx.beginPath();
        bgCtx.moveTo(r, 0);
        bgCtx.lineTo(bgWidth * scale - r, 0);
        bgCtx.quadraticCurveTo(bgWidth * scale, 0, bgWidth * scale, r);
        bgCtx.lineTo(bgWidth * scale, bgHeight * scale - r);
        bgCtx.quadraticCurveTo(
          bgWidth * scale,
          bgHeight * scale,
          bgWidth * scale - r,
          bgHeight * scale,
        );
        bgCtx.lineTo(r, bgHeight * scale);
        bgCtx.quadraticCurveTo(0, bgHeight * scale, 0, bgHeight * scale - r);
        bgCtx.lineTo(0, r);
        bgCtx.quadraticCurveTo(0, 0, r, 0);
        bgCtx.closePath();

        // Fill with 50% transparent #01142d
        bgCtx.fillStyle = "rgba(1, 20, 45, 0.6)";
        bgCtx.fill();

        const bgImageBuffer = bgCanvas.toBuffer("image/png");
        const bgImage = await pdfDoc.embedPng(bgImageBuffer);

        page.drawImage(bgImage, {
          x: bgX,
          y: bgY,
          width: bgWidth,
          height: bgHeight,
        });

        // Draw "الرعاة" ribbon ON TOP of the container with diamond ends (like qr-pdf.ts)
        const ribbonHeight = 44;
        const ribbonBodyWidth = width * 0.38;
        const arrowWidth = ribbonHeight * 0.6;
        const diamondSize = ribbonHeight * 0.45;
        const diamondGap = 8;
        const totalWidth =
          ribbonBodyWidth + (arrowWidth + diamondGap + diamondSize) * 2;
        const ribbonY = containerTop + bgPadding;

        const ribbonScale = 2;
        const ribbonCanvas = createCanvas(
          totalWidth * ribbonScale,
          ribbonHeight * ribbonScale,
        );
        const ribbonCtx = ribbonCanvas.getContext("2d");
        ribbonCtx.clearRect(
          0,
          0,
          totalWidth * ribbonScale,
          ribbonHeight * ribbonScale,
        );

        const fillColor = "#cba890";
        const rcenterX = (totalWidth * ribbonScale) / 2;
        const rcenterY = (ribbonHeight * ribbonScale) / 2;
        const bodyHalfWidth = (ribbonBodyWidth * ribbonScale) / 2;
        const arrowW = arrowWidth * ribbonScale;
        const diamondS = diamondSize * ribbonScale;
        const dgap = diamondGap * ribbonScale;

        // Draw main ribbon body with arrow ends
        ribbonCtx.beginPath();
        ribbonCtx.moveTo(rcenterX - bodyHalfWidth - arrowW, rcenterY);
        ribbonCtx.lineTo(rcenterX - bodyHalfWidth, 0);
        ribbonCtx.lineTo(rcenterX + bodyHalfWidth, 0);
        ribbonCtx.lineTo(rcenterX + bodyHalfWidth + arrowW, rcenterY);
        ribbonCtx.lineTo(rcenterX + bodyHalfWidth, ribbonHeight * ribbonScale);
        ribbonCtx.lineTo(rcenterX - bodyHalfWidth, ribbonHeight * ribbonScale);
        ribbonCtx.closePath();
        ribbonCtx.fillStyle = fillColor;
        ribbonCtx.fill();

        // Draw left diamond
        const leftDiamondX =
          rcenterX - bodyHalfWidth - arrowW - dgap - diamondS / 2;
        ribbonCtx.beginPath();
        ribbonCtx.moveTo(leftDiamondX, rcenterY - diamondS / 2);
        ribbonCtx.lineTo(leftDiamondX + diamondS / 2, rcenterY);
        ribbonCtx.lineTo(leftDiamondX, rcenterY + diamondS / 2);
        ribbonCtx.lineTo(leftDiamondX - diamondS / 2, rcenterY);
        ribbonCtx.closePath();
        ribbonCtx.fillStyle = fillColor;
        ribbonCtx.fill();

        // Draw right diamond
        const rightDiamondX =
          rcenterX + bodyHalfWidth + arrowW + dgap + diamondS / 2;
        ribbonCtx.beginPath();
        ribbonCtx.moveTo(rightDiamondX, rcenterY - diamondS / 2);
        ribbonCtx.lineTo(rightDiamondX + diamondS / 2, rcenterY);
        ribbonCtx.lineTo(rightDiamondX, rcenterY + diamondS / 2);
        ribbonCtx.lineTo(rightDiamondX - diamondS / 2, rcenterY);
        ribbonCtx.closePath();
        ribbonCtx.fillStyle = fillColor;
        ribbonCtx.fill();

        // Draw text on ribbon
        ribbonCtx.font = `bold ${FONT_SIZES.sponsorsHeader}px "AbarBold"`;
        ribbonCtx.fillStyle = "#7b4227";
        ribbonCtx.textAlign = "center";
        ribbonCtx.textBaseline = "middle";
        ribbonCtx.fillText(FIXED_TEXTS.sponsorsHeader, rcenterX, rcenterY);

        const ribbonBuffer = ribbonCanvas.toBuffer("image/png");
        const ribbonImage = await pdfDoc.embedPng(ribbonBuffer);
        page.drawImage(ribbonImage, {
          x: (width - totalWidth) / 2,
          y: ribbonY - ribbonHeight / 2,
          width: totalWidth,
          height: ribbonHeight,
        });

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
          const cellCenterX =
            containerLeft + (colFromRight + 0.5) * rowCellWidth;
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
                    `Generated presigned URL for direct key: ${sponsor.logoUrl}`,
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
                  await logoResponse.arrayBuffer(),
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

                // Convert logo to TEXT_COLOR for dark background
                const coloredPngBuffer =
                  await convertImageToTextColor(pngBuffer);

                // Embed the colored logo
                const logoImage = await pdfDoc.embedPng(coloredPngBuffer);

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

                  const existingAnnots = page.node.lookup(
                    PDFName.of("Annots"),
                    PDFArray,
                  );
                  if (existingAnnots) {
                    existingAnnots.push(linkAnnotation);
                  } else {
                    page.node.set(
                      PDFName.of("Annots"),
                      pdfDoc.context.obj([linkAnnotation]),
                    );
                  }
                }
              } else {
                throw new Error("Failed to fetch logo");
              }
            } catch (logoError) {
              console.error(
                `Failed to load sponsor logo: ${sponsor.logoUrl}`,
                logoError,
              );
              // Fall back to text
              const nameImageData = renderArabicTextToImage(sponsor.name, {
                fontFamily: "AbarBold",
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
                  Rect: [
                    linkX,
                    linkY,
                    linkX + nameImageData.width,
                    linkY + nameImageData.height,
                  ],
                  Border: [0, 0, 0],
                  A: actionDict,
                });

                const existingAnnots = page.node.lookup(
                  PDFName.of("Annots"),
                  PDFArray,
                );
                if (existingAnnots) {
                  existingAnnots.push(linkAnnotation);
                } else {
                  page.node.set(
                    PDFName.of("Annots"),
                    pdfDoc.context.obj([linkAnnotation]),
                  );
                }
              }
            }
          } else {
            // No logo, draw sponsor name
            const nameImageData = renderArabicTextToImage(sponsor.name, {
              fontFamily: "AbarBold",
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
                Rect: [
                  linkX,
                  linkY,
                  linkX + nameImageData.width,
                  linkY + nameImageData.height,
                ],
                Border: [0, 0, 0],
                A: actionDict,
              });

              const existingAnnots = page.node.lookup(
                PDFName.of("Annots"),
                PDFArray,
              );
              if (existingAnnots) {
                existingAnnots.push(linkAnnotation);
              } else {
                page.node.set(
                  PDFName.of("Annots"),
                  pdfDoc.context.obj([linkAnnotation]),
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
  options: InvitationPdfOptions,
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
