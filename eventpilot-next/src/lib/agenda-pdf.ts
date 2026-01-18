import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import {
  renderArabicTextToImage,
  TEXT_COLOR,
  WHITE_COLOR,
  ACCENT_COLOR,
  TITLE_COLOR,
} from "./invitation-pdf";

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

// Fixed agenda content
const FIXED_TEXTS = {
  header: "شتوية لفت",
  subtitle: "ثلوثية الأعمال",
  agendaTitle: "•♦• أجندة ثلوثية الأعمال •♦•",
  guestPrefix: "ضيف الثلوثية /",
  periodHeader: "الفــــترة",
  timeHeader: "الوقــــت",
  // Agenda items (Period: Time)
  agendaItems: [
    { period: "الاستقبال", subPeriod: "التعريف", time: "PM 8:00 - 7:30" },
    { period: "اللقــــاء", subPeriod: "", time: "PM 9:30 - 8:15" },
    { period: "العــــشاء", subPeriod: "", time: "PM 10:30 - 9:30" },
    { period: "تواصــــل", subPeriod: "", time: "PM 11:30 -10:30" },
  ],
};

// Font sizes
const FONT_SIZES = {
  header: 60,
  subtitle: 45,
  agendaTitle: 40,
  sessionTitle: 50,
  guestName: 38,
  guestTitle: 28,
  tableHeader: 42,
  tableContent: 38,
};

// Colors (matching the image)
const GUEST_BG_COLOR = "#cba890"; // Beige/tan background for guest section
const GUEST_TEXT_COLOR = "#7b4227"; // Dark brown text for guest section
const TABLE_BORDER_COLOR = "#cca890"; // Golden border for table

export interface AgendaPdfOptions {
  sessionTitle: string;
  guestName?: string;
  guestJobTitle?: string;
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
 * Generate dynamic agenda PDF
 * Creates a one-page agenda showing session title, guest info, and time schedule
 */
export async function generateAgendaPdf(
  options: AgendaPdfOptions,
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
    // RENDER AGENDA CONTENT
    // Following the design from the provided image
    // ====================================

    // Start from top (Y: 0 = bottom in PDF coordinates)
    let currentY = height * 0.88;
    const centerX = width / 2;

    // ====================================
    // 1. HEADER: "شتوية لفت"
    // ====================================
    const headerImageData = renderArabicTextToImage(FIXED_TEXTS.header, {
      fontFamily: "AbarBold",
      fontSize: FONT_SIZES.header,
      color: WHITE_COLOR,
    });
    const headerImage = await pdfDoc.embedPng(headerImageData.buffer);
    page.drawImage(headerImage, {
      x: centerX - headerImageData.width / 2,
      y: currentY - headerImageData.height / 2,
      width: headerImageData.width,
      height: headerImageData.height,
    });
    currentY -= headerImageData.height / 2 + 20;

    // ====================================
    // 2. SUBTITLE: "ثلوثية الأعمال"
    // ====================================
    const subtitleImageData = renderArabicTextToImage(FIXED_TEXTS.subtitle, {
      fontFamily: "AbarBold",
      fontSize: FONT_SIZES.subtitle,
      color: ACCENT_COLOR,
    });
    const subtitleImage = await pdfDoc.embedPng(subtitleImageData.buffer);
    currentY -= subtitleImageData.height / 2;
    page.drawImage(subtitleImage, {
      x: centerX - subtitleImageData.width / 2,
      y: currentY - subtitleImageData.height / 2,
      width: subtitleImageData.width,
      height: subtitleImageData.height,
    });
    currentY -= subtitleImageData.height / 2 + 35;

    // ====================================
    // 3. DECORATIVE AGENDA TITLE
    // ====================================
    const agendaTitleImageData = renderArabicTextToImage(
      FIXED_TEXTS.agendaTitle,
      {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.agendaTitle,
        color: WHITE_COLOR,
      },
    );
    const agendaTitleImage = await pdfDoc.embedPng(agendaTitleImageData.buffer);
    currentY -= agendaTitleImageData.height / 2;
    page.drawImage(agendaTitleImage, {
      x: centerX - agendaTitleImageData.width / 2,
      y: currentY - agendaTitleImageData.height / 2,
      width: agendaTitleImageData.width,
      height: agendaTitleImageData.height,
    });
    currentY -= agendaTitleImageData.height / 2 + 25;

    // ====================================
    // 4. SESSION TITLE (dynamic)
    // ====================================
    const sessionTitleImageData = renderArabicTextToImage(
      options.sessionTitle,
      {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.sessionTitle,
        color: ACCENT_COLOR,
        maxWidth: width * 0.8,
      },
    );
    const sessionTitleImage = await pdfDoc.embedPng(
      sessionTitleImageData.buffer,
    );
    currentY -= sessionTitleImageData.height / 2;
    page.drawImage(sessionTitleImage, {
      x: centerX - sessionTitleImageData.width / 2,
      y: currentY - sessionTitleImageData.height / 2,
      width: sessionTitleImageData.width,
      height: sessionTitleImageData.height,
    });
    currentY -= sessionTitleImageData.height / 2 + 30;

    // ====================================
    // 5. GUEST SECTION (if guest exists)
    // ====================================
    if (options.guestName) {
      // Guest background panel dimensions
      const panelWidth = width * 0.7;
      const panelPadding = 20;
      const panelBorderRadius = 10;

      // Prepare guest text
      const guestNameText = `${FIXED_TEXTS.guestPrefix} ${options.guestName}`;
      const guestNameImageData = renderArabicTextToImage(guestNameText, {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.guestName,
        color: GUEST_TEXT_COLOR,
        maxWidth: panelWidth - panelPadding * 2,
      });

      let guestJobTitleImageData: {
        buffer: Buffer;
        width: number;
        height: number;
      } | null = null;
      if (options.guestJobTitle) {
        guestJobTitleImageData = renderArabicTextToImage(
          options.guestJobTitle,
          {
            fontFamily: "AbarBold",
            fontSize: FONT_SIZES.guestTitle,
            color: GUEST_TEXT_COLOR,
            maxWidth: panelWidth - panelPadding * 2,
          },
        );
      }

      // Calculate panel height
      const textGap = 12;
      const panelHeight =
        panelPadding * 2 +
        guestNameImageData.height +
        (guestJobTitleImageData
          ? textGap + guestJobTitleImageData.height
          : 0);

      // Draw rounded rectangle background
      const panelX = centerX - panelWidth / 2;
      const panelY = currentY - panelHeight;

      const scale = 2;
      const bgCanvas = createCanvas(panelWidth * scale, panelHeight * scale);
      const bgCtx = bgCanvas.getContext("2d");
      bgCtx.clearRect(0, 0, panelWidth * scale, panelHeight * scale);

      // Draw rounded rectangle
      const r = panelBorderRadius * scale;
      bgCtx.beginPath();
      bgCtx.moveTo(r, 0);
      bgCtx.lineTo(panelWidth * scale - r, 0);
      bgCtx.quadraticCurveTo(panelWidth * scale, 0, panelWidth * scale, r);
      bgCtx.lineTo(panelWidth * scale, panelHeight * scale - r);
      bgCtx.quadraticCurveTo(
        panelWidth * scale,
        panelHeight * scale,
        panelWidth * scale - r,
        panelHeight * scale,
      );
      bgCtx.lineTo(r, panelHeight * scale);
      bgCtx.quadraticCurveTo(0, panelHeight * scale, 0, panelHeight * scale - r);
      bgCtx.lineTo(0, r);
      bgCtx.quadraticCurveTo(0, 0, r, 0);
      bgCtx.closePath();
      bgCtx.fillStyle = GUEST_BG_COLOR;
      bgCtx.fill();

      const bgBuffer = bgCanvas.toBuffer("image/png");
      const bgImage = await pdfDoc.embedPng(bgBuffer);
      page.drawImage(bgImage, {
        x: panelX,
        y: panelY,
        width: panelWidth,
        height: panelHeight,
      });

      // Draw guest name
      const guestNameImage = await pdfDoc.embedPng(guestNameImageData.buffer);
      const guestNameY = panelY + panelHeight - panelPadding - guestNameImageData.height;
      page.drawImage(guestNameImage, {
        x: centerX - guestNameImageData.width / 2,
        y: guestNameY,
        width: guestNameImageData.width,
        height: guestNameImageData.height,
      });

      // Draw guest job title if exists
      if (guestJobTitleImageData) {
        const guestJobTitleImage = await pdfDoc.embedPng(
          guestJobTitleImageData.buffer,
        );
        const guestJobTitleY = guestNameY - textGap - guestJobTitleImageData.height;
        page.drawImage(guestJobTitleImage, {
          x: centerX - guestJobTitleImageData.width / 2,
          y: guestJobTitleY,
          width: guestJobTitleImageData.width,
          height: guestJobTitleImageData.height,
        });
      }

      currentY = panelY - 35;
    }

    // ====================================
    // 6. AGENDA TABLE
    // ====================================
    const tableWidth = width * 0.6;
    const tableX = centerX - tableWidth / 2;
    const colWidth = tableWidth / 2;
    const headerRowHeight = 70;
    const dataRowHeight = 60;
    const borderWidth = 3;

    // Draw table headers
    const periodHeaderImageData = renderArabicTextToImage(
      FIXED_TEXTS.periodHeader,
      {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.tableHeader,
        color: WHITE_COLOR,
      },
    );
    const timeHeaderImageData = renderArabicTextToImage(FIXED_TEXTS.timeHeader, {
      fontFamily: "AbarBold",
      fontSize: FONT_SIZES.tableHeader,
      color: WHITE_COLOR,
    });

    // Header row background (with border)
    const headerY = currentY - headerRowHeight;

    // Draw border using canvas
    const headerBorderCanvas = createCanvas(
      tableWidth * 2,
      headerRowHeight * 2,
    );
    const hbCtx = headerBorderCanvas.getContext("2d");
    hbCtx.clearRect(0, 0, tableWidth * 2, headerRowHeight * 2);
    hbCtx.strokeStyle = TABLE_BORDER_COLOR;
    hbCtx.lineWidth = borderWidth * 2;
    hbCtx.strokeRect(
      borderWidth,
      borderWidth,
      tableWidth * 2 - borderWidth * 2,
      headerRowHeight * 2 - borderWidth * 2,
    );
    const headerBorderBuffer = headerBorderCanvas.toBuffer("image/png");
    const headerBorderImage = await pdfDoc.embedPng(headerBorderBuffer);
    page.drawImage(headerBorderImage, {
      x: tableX,
      y: headerY,
      width: tableWidth,
      height: headerRowHeight,
    });

    // Draw header text - Period (right column in RTL)
    const periodHeaderImage = await pdfDoc.embedPng(
      periodHeaderImageData.buffer,
    );
    page.drawImage(periodHeaderImage, {
      x: tableX + colWidth + (colWidth - periodHeaderImageData.width) / 2,
      y: headerY + (headerRowHeight - periodHeaderImageData.height) / 2,
      width: periodHeaderImageData.width,
      height: periodHeaderImageData.height,
    });

    // Draw header text - Time (left column in RTL)
    const timeHeaderImage = await pdfDoc.embedPng(timeHeaderImageData.buffer);
    page.drawImage(timeHeaderImage, {
      x: tableX + (colWidth - timeHeaderImageData.width) / 2,
      y: headerY + (headerRowHeight - timeHeaderImageData.height) / 2,
      width: timeHeaderImageData.width,
      height: timeHeaderImageData.height,
    });

    // Draw vertical separator in header
    const separatorCanvas = createCanvas(borderWidth * 2, headerRowHeight * 2);
    const sepCtx = separatorCanvas.getContext("2d");
    sepCtx.fillStyle = TABLE_BORDER_COLOR;
    sepCtx.fillRect(0, 0, borderWidth * 2, headerRowHeight * 2);
    const separatorBuffer = separatorCanvas.toBuffer("image/png");
    const separatorImage = await pdfDoc.embedPng(separatorBuffer);
    page.drawImage(separatorImage, {
      x: tableX + colWidth - borderWidth / 2,
      y: headerY,
      width: borderWidth,
      height: headerRowHeight,
    });

    currentY = headerY;

    // Draw data rows
    for (let i = 0; i < FIXED_TEXTS.agendaItems.length; i++) {
      const item = FIXED_TEXTS.agendaItems[i];
      if (!item) continue;

      const rowY = currentY - dataRowHeight;

      // Row border
      const rowBorderCanvas = createCanvas(tableWidth * 2, dataRowHeight * 2);
      const rbCtx = rowBorderCanvas.getContext("2d");
      rbCtx.clearRect(0, 0, tableWidth * 2, dataRowHeight * 2);
      rbCtx.strokeStyle = TABLE_BORDER_COLOR;
      rbCtx.lineWidth = borderWidth * 2;
      rbCtx.strokeRect(
        borderWidth,
        0,
        tableWidth * 2 - borderWidth * 2,
        dataRowHeight * 2,
      );
      const rowBorderBuffer = rowBorderCanvas.toBuffer("image/png");
      const rowBorderImage = await pdfDoc.embedPng(rowBorderBuffer);
      page.drawImage(rowBorderImage, {
        x: tableX,
        y: rowY,
        width: tableWidth,
        height: dataRowHeight,
      });

      // Vertical separator
      page.drawImage(separatorImage, {
        x: tableX + colWidth - borderWidth / 2,
        y: rowY,
        width: borderWidth,
        height: dataRowHeight,
      });

      // Period text (right column) - can have two lines
      const periodText = item.subPeriod
        ? `${item.period}\n${item.subPeriod}`
        : item.period;
      const periodImageData = renderArabicTextToImage(periodText, {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.tableContent,
        color: ACCENT_COLOR,
        maxWidth: colWidth - 20,
      });
      const periodImage = await pdfDoc.embedPng(periodImageData.buffer);
      page.drawImage(periodImage, {
        x: tableX + colWidth + (colWidth - periodImageData.width) / 2,
        y: rowY + (dataRowHeight - periodImageData.height) / 2,
        width: periodImageData.width,
        height: periodImageData.height,
      });

      // Time text (left column)
      const timeImageData = renderArabicTextToImage(item.time, {
        fontFamily: "AbarBold",
        fontSize: FONT_SIZES.tableContent - 4,
        color: WHITE_COLOR,
      });
      const timeImage = await pdfDoc.embedPng(timeImageData.buffer);
      page.drawImage(timeImage, {
        x: tableX + (colWidth - timeImageData.width) / 2,
        y: rowY + (dataRowHeight - timeImageData.height) / 2,
        width: timeImageData.width,
        height: timeImageData.height,
      });

      currentY = rowY;
    }

    // Save and return
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  } catch (error) {
    console.error("Failed to generate agenda PDF:", error);
    return null;
  }
}

/**
 * Clear template cache (useful for development)
 */
export function clearTemplateCache(): void {
  templateBuffer = null;
}
