import { PDFDocument, PDFName, PDFArray, PDFString } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { generateQRCodeBuffer } from "./qr";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import {
  generatePresignedReadUrl,
  extractKeyFromUrl,
  needsPresignedReadUrl,
} from "./s3";
// Import shared functions from invitation-pdf
import {
  renderArabicTextToImage,
  getSponsorLink,
  calculateFitFontSize,
  loadIcon,
  renderIconWithLabel,
  formatDayNameForInvitation,
  formatDateForInvitation,
  convertImageToTextColor,
  TEXT_COLOR,
  WHITE_COLOR,
  ACCENT_COLOR,
  TITLE_COLOR,
} from "./invitation-pdf";
// Import agenda PDF generation
import { generateAgendaPdf } from "./agenda-pdf";

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

// Fixed Arabic texts for QR PDF content
const FIXED_TEXTS = {
  mainTitle: "دعوة خاصة",
  subtitle: "ندعـوكم لحضور ثلوثية الأعمال في شتوية لفت بعنوان",
  // description:
  //   "حيث يجتمع نخبة من رواد الأعمال في لقاء يحول الثلوثية إلى مساحة تبنى فيها العلاقات، وتنضج فيها الفرص",
  description: "", // Hidden for now
  greetingPrefix: "حياك الله",
  simpleGreeting: "حياكم الله",
  menOnlyLabel: "للرجال",
  menOnlySublabel: "فقط",
  sponsorsHeader: "الرعــاة",
  clickForLocation: "انقر للوصول",
  locationSublabel: "إلى الموقع",
  agendaLink: "أجندة الحدث: (انقر لمشاهدة الأجندة)",
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
  bottomMargin: 0.01, // Bottom margin for sponsors

  // Spacing between sections (in points)
  // Each value is the gap between the bottom of one section and top of next
  spacing: {
    afterMainTitle: 15, // gap after "دعوة خاصة"
    afterGreeting: 12, // gap after attendee name
    afterSubtitle: 12, // gap after "ندعوكم لحضور"
    afterSessionTitle: 22, // gap after session title
    afterDescription: 28, // gap after description paragraph
    afterGuestTitle: 15, // gap after "ضيف هذه الثلوثية"
    afterSessionGuests: 25, // gap after guest names
    afterSimpleGreeting: 18, // gap after "حياكم الله"
    afterQrCode: 10, // gap after QR code
    afterAgendaLink: 2, // gap after agenda link
    afterIcons: 22, // gap after info icons row
  },
};

// Font sizes
const FONT_SIZES = {
  mainTitle: 50,
  subtitle: 35,
  sessionTitle: 90,
  description: 28,
  greeting: 65,
  simpleGreeting: 38,
  sessionGuests: 24,
  iconLabel: 32,
  sponsorsHeader: 65,
  agendaLink: 32,
};

export interface BrandedQRPdfOptions {
  sessionId: string;
  sessionTitle: string;
  sessionDate: Date;
  attendeeName?: string;
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

// Cache for template
let templateBuffer: Buffer | null = null;

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
 * Generate branded QR code PDF using blank template with all content rendered from code
 */
export async function generateBrandedQRPdf(
  qrData: string,
  options: BrandedQRPdfOptions,
): Promise<Buffer | null> {
  try {
    // 1. Generate base QR code as PNG
    const qrBuffer = await generateQRCodeBuffer(qrData);
    if (!qrBuffer) {
      console.error("Failed to generate base QR code for PDF");
      return null;
    }

    // 2. Load template PDF
    const template = await loadTemplate();
    const pdfDoc = await PDFDocument.load(template);

    // 3. Register fontkit
    pdfDoc.registerFontkit(fontkit);

    // 4. Get first page and dimensions
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
    // 2. DRAW GREETING WITH ATTENDEE NAME (right after main title)
    // ====================================
    const greetingText = options.attendeeName
      ? `${options.attendeeName}`
      : FIXED_TEXTS.greetingPrefix;
    const greetingImageData = renderArabicTextToImage(greetingText, {
      fontFamily: "AbarBold",
      fontSize: FONT_SIZES.greeting,
      color: TEXT_COLOR,
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
    // 3. DRAW SUBTITLE ("ندعوكم لحضور")
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
    // 4. DRAW SESSION TITLE - TITLE_COLOR (dynamic from DB)
    // ====================================
    const sessionTitleMaxWidth = width * 0.75;
    const sessionTitleFontSize = calculateFitFontSize(
      options.sessionTitle,
      "AbarBold",
      FONT_SIZES.sessionTitle,
      35,
      sessionTitleMaxWidth,
    );
    const sessionTitleImageData = renderArabicTextToImage(options.sessionTitle, {
      fontFamily: "AbarBold",
      fontSize: sessionTitleFontSize,
      color: TITLE_COLOR,
      maxWidth: sessionTitleMaxWidth,
    });
    const sessionTitleImage = await pdfDoc.embedPng(sessionTitleImageData.buffer);
    currentY -= sessionTitleImageData.height / 2;
    page.drawImage(sessionTitleImage, {
      x: (width - sessionTitleImageData.width) / 2,
      y: currentY - sessionTitleImageData.height / 2,
      width: sessionTitleImageData.width,
      height: sessionTitleImageData.height,
    });
    currentY -= sessionTitleImageData.height / 2 + spacing.afterSessionTitle;

    // ====================================
    // 5. DRAW DESCRIPTION (fixed text) - only if description exists
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
      // Page split: 60% text on left, 40% image on right
      // Gap between them is at the split point
      const guestCount = Math.min(options.sessionGuests.length, 5);
      const textLineGap = 8; // Gap between name and job title
      const guestImageSize = 200; // Square image size (bigger)
      const guestVerticalGap = 30; // Gap between multiple guests
      const centerGap = 40; // Gap between text and image

      // Define content area with page margins
      const pageMargin = width * 0.12; // 12% margin on each side
      const contentWidth = width - pageMargin * 2;
      const contentStartX = pageMargin;

      // 60/40 split within content area (text gets 60%, image gets 40%)
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
    // 7. DRAW SIMPLE GREETING ("حياكم الله") - ACCENT COLOR (before QR code)
    // ====================================
    const simpleGreetingImageData = renderArabicTextToImage(
      FIXED_TEXTS.simpleGreeting,
      {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.simpleGreeting,
        color: ACCENT_COLOR,
      },
    );
    const simpleGreetingImage = await pdfDoc.embedPng(
      simpleGreetingImageData.buffer,
    );
    currentY -= simpleGreetingImageData.height / 2;
    page.drawImage(simpleGreetingImage, {
      x: (width - simpleGreetingImageData.width) / 2,
      y: currentY - simpleGreetingImageData.height / 2,
      width: simpleGreetingImageData.width,
      height: simpleGreetingImageData.height,
    });
    currentY -=
      simpleGreetingImageData.height / 2 + spacing.afterSimpleGreeting;

    // ====================================
    // 8. DRAW QR CODE
    // ====================================
    const qrImage = await pdfDoc.embedPng(qrBuffer);
    const qrSize = 200;
    const qrX = (width - qrSize) / 2;
    currentY -= qrSize / 2;
    const qrY = currentY - qrSize / 2;

    page.drawImage(qrImage, {
      x: qrX,
      y: qrY,
      width: qrSize,
      height: qrSize,
    });
    currentY -= qrSize / 2 + spacing.afterQrCode;

    // ====================================
    // 9. DRAW AGENDA LINK (below QR code)
    // ====================================
    const agendaLinkImageData = renderArabicTextToImage(
      FIXED_TEXTS.agendaLink,
      {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.agendaLink,
        color: ACCENT_COLOR,
      },
    );
    const agendaLinkImage = await pdfDoc.embedPng(agendaLinkImageData.buffer);
    currentY -= agendaLinkImageData.height / 2;
    const agendaLinkY = currentY - agendaLinkImageData.height / 2;
    const agendaLinkX = (width - agendaLinkImageData.width) / 2;

    page.drawImage(agendaLinkImage, {
      x: agendaLinkX,
      y: agendaLinkY,
      width: agendaLinkImageData.width,
      height: agendaLinkImageData.height,
    });

    // Add hyperlink to agenda PDF
    const agendaUrl =
      process.env.BASE_URL || "http://localhost:3000";
    const agendaLinkUrl = `${agendaUrl}/api/sessions/${options.sessionId}/agenda-pdf`;
    const agendaLinkWidth = agendaLinkImageData.width + 20;
    const agendaLinkHeight = agendaLinkImageData.height + 10;
    const agendaLinkRectX = agendaLinkX - 10;
    const agendaLinkRectY = agendaLinkY - 5;

    const agendaActionDict = pdfDoc.context.obj({
      Type: "Action",
      S: "URI",
      URI: PDFString.of(agendaLinkUrl),
    });

    const agendaLinkAnnotation = pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [
        agendaLinkRectX,
        agendaLinkRectY,
        agendaLinkRectX + agendaLinkWidth,
        agendaLinkRectY + agendaLinkHeight,
      ],
      Border: [0, 0, 0],
      A: agendaActionDict,
    });

    const agendaExistingAnnots = page.node.lookup(
      PDFName.of("Annots"),
      PDFArray,
    );
    if (agendaExistingAnnots) {
      agendaExistingAnnots.push(agendaLinkAnnotation);
    } else {
      page.node.set(
        PDFName.of("Annots"),
        pdfDoc.context.obj([agendaLinkAnnotation]),
      );
    }

    currentY -= agendaLinkImageData.height / 2 + spacing.afterAgendaLink;

    // ====================================
    // 10. DRAW INFO ICONS ROW (no background)
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
    // 11. DRAW SPONSORS SECTION (with its own container)
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

        // Calculate grid layout based on sponsor count
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

        // Draw rounded rectangle background (like invitation-pdf.ts)
        const bgX = containerLeft - bgPadding;
        const bgY = containerBottom - bgPadding;
        const bgWidth = containerWidth + bgPadding * 2;
        const bgHeight = containerHeight + bgPadding * 2;

        // Create rounded rectangle using canvas
        const scale = 2;
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

        // Fill with 50% transparent #01142d (like invitation-pdf.ts)
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

        // Draw "الرعاة" ribbon ON TOP of the container with diamond ends
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
        // Start at left arrow point
        ribbonCtx.moveTo(rcenterX - bodyHalfWidth - arrowW, rcenterY);
        // Top left corner
        ribbonCtx.lineTo(rcenterX - bodyHalfWidth, 0);
        // Top right corner
        ribbonCtx.lineTo(rcenterX + bodyHalfWidth, 0);
        // Right arrow point
        ribbonCtx.lineTo(rcenterX + bodyHalfWidth + arrowW, rcenterY);
        // Bottom right corner
        ribbonCtx.lineTo(rcenterX + bodyHalfWidth, ribbonHeight * ribbonScale);
        // Bottom left corner
        ribbonCtx.lineTo(rcenterX - bodyHalfWidth, ribbonHeight * ribbonScale);
        // Back to left arrow point
        ribbonCtx.closePath();
        ribbonCtx.fillStyle = fillColor;
        ribbonCtx.fill();

        // Draw left diamond
        const leftDiamondX =
          rcenterX - bodyHalfWidth - arrowW - dgap - diamondS / 2;
        ribbonCtx.beginPath();
        ribbonCtx.moveTo(leftDiamondX, rcenterY - diamondS / 2); // Top
        ribbonCtx.lineTo(leftDiamondX + diamondS / 2, rcenterY); // Right
        ribbonCtx.lineTo(leftDiamondX, rcenterY + diamondS / 2); // Bottom
        ribbonCtx.lineTo(leftDiamondX - diamondS / 2, rcenterY); // Left
        ribbonCtx.closePath();
        ribbonCtx.fillStyle = fillColor;
        ribbonCtx.fill();

        // Draw right diamond
        const rightDiamondX =
          rcenterX + bodyHalfWidth + arrowW + dgap + diamondS / 2;
        ribbonCtx.beginPath();
        ribbonCtx.moveTo(rightDiamondX, rcenterY - diamondS / 2); // Top
        ribbonCtx.lineTo(rightDiamondX + diamondS / 2, rcenterY); // Right
        ribbonCtx.lineTo(rightDiamondX, rcenterY + diamondS / 2); // Bottom
        ribbonCtx.lineTo(rightDiamondX - diamondS / 2, rcenterY); // Left
        ribbonCtx.closePath();
        ribbonCtx.fillStyle = fillColor;
        ribbonCtx.fill();

        // Draw text
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

        // Draw sponsors in RTL order (like invitation-pdf.ts)
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
              let logoUrl = sponsor.logoUrl;

              if (needsPresignedReadUrl()) {
                const key = extractKeyFromUrl(logoUrl);
                if (key) {
                  logoUrl = await generatePresignedReadUrl(key);
                } else if (!logoUrl.startsWith("http")) {
                  logoUrl = await generatePresignedReadUrl(logoUrl);
                }
              } else if (logoUrl.startsWith("/")) {
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

                const lowerUrl = logoUrl.toLowerCase();
                const isPng =
                  contentType.includes("png") || lowerUrl.includes(".png");
                const isWebp =
                  contentType.includes("webp") || lowerUrl.includes(".webp");
                const isSvg =
                  contentType.includes("svg") || lowerUrl.includes(".svg");
                const isGif =
                  contentType.includes("gif") || lowerUrl.includes(".gif");

                let pngBuffer: Buffer;
                if (isSvg || isWebp || isGif) {
                  const img = await loadImage(logoBuffer);
                  const canvas = createCanvas(img.width, img.height);
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0);
                  pngBuffer = canvas.toBuffer("image/png");
                } else if (isPng) {
                  pngBuffer = logoBuffer;
                } else {
                  const img = await loadImage(logoBuffer);
                  const canvas = createCanvas(img.width, img.height);
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(img, 0, 0);
                  pngBuffer = canvas.toBuffer("image/png");
                }

                // Convert logo to cream color for dark background
                const coloredPngBuffer =
                  await convertImageToTextColor(pngBuffer);
                const logoImage = await pdfDoc.embedPng(coloredPngBuffer);

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
    console.error("Failed to generate branded QR PDF:", error);
    return null;
  }
}

/**
 * Generate branded QR PDF as base64 data URL
 */
export async function generateBrandedQRPdfDataUrl(
  qrData: string,
  options: BrandedQRPdfOptions,
): Promise<string | null> {
  const buffer = await generateBrandedQRPdf(qrData, options);
  if (!buffer) return null;
  return `data:application/pdf;base64,${buffer.toString("base64")}`;
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache(): void {
  templateBuffer = null;
}
