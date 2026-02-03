/**
 * PDF Cover Page Generator
 * Draws a dedicated cover page as the first page of the PDF
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { StandardFonts, degrees, type PDFPage } from 'pdf-lib';
import type { FormMetadata, CoverPage } from '../../types/schema.js';
import type { LayoutContext } from './layout.js';
import { hexToRgb, wrapText } from './utils.js';

/**
 * Draw a cover page on the current (first) page of the PDF
 */
export async function drawCoverPage(
  ctx: LayoutContext,
  formMeta: FormMetadata,
  coverPage: CoverPage,
  basePath: string
): Promise<void> {
  const page = ctx.pages[0];
  const { width: pageWidth, height: pageHeight } = ctx.pageSize;
  const margins = ctx.stylesheet.page.margins;
  const contentWidth = pageWidth - margins.left - margins.right;

  // Embed fonts
  const font = await ctx.doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await ctx.doc.embedFont(StandardFonts.HelveticaBold);

  // --- Render layer 1: Cover image (background) ---
  if (coverPage.coverImage) {
    await drawCoverImage(ctx, page, coverPage.coverImage, basePath);
  }

  // --- Render layer 2: Content ---
  let cursorY = pageHeight - margins.top;

  // Logo
  if (coverPage.logo) {
    cursorY = await drawLogo(ctx, page, coverPage.logo, basePath, cursorY);
    cursorY -= 20;
  }

  // Title (from form.title)
  const titleFontSize = 28;
  const titleLines = wrapText(formMeta.title, contentWidth, titleFontSize);
  for (const line of titleLines) {
    const titleWidth = boldFont.widthOfTextAtSize(line, titleFontSize);
    const titleX = (pageWidth - titleWidth) / 2;
    page.drawText(line, {
      x: titleX,
      y: cursorY,
      size: titleFontSize,
      font: boldFont,
      color: hexToRgb('#1a1a2e'),
    });
    cursorY -= titleFontSize * 1.3;
  }
  cursorY -= 5;

  // Subtitle
  if (coverPage.subtitle) {
    const subtitleFontSize = 16;
    const subtitleLines = wrapText(coverPage.subtitle, contentWidth, subtitleFontSize);
    for (const line of subtitleLines) {
      const subtitleWidth = font.widthOfTextAtSize(line, subtitleFontSize);
      const subtitleX = (pageWidth - subtitleWidth) / 2;
      page.drawText(line, {
        x: subtitleX,
        y: cursorY,
        size: subtitleFontSize,
        font,
        color: hexToRgb('#444444'),
      });
      cursorY -= subtitleFontSize * 1.3;
    }
    cursorY -= 10;
  }

  // Horizontal rule separator
  cursorY -= 5;
  page.drawLine({
    start: { x: margins.left + 40, y: cursorY },
    end: { x: pageWidth - margins.right - 40, y: cursorY },
    thickness: 1,
    color: hexToRgb('#cccccc'),
  });
  cursorY -= 20;

  // Metadata block
  const metaFontSize = 10;
  const labelFontSize = 10;
  const lineSpacing = 16;

  const metaFields: [string, string | undefined][] = [
    ['Organization', coverPage.organization],
    ['Department', coverPage.department],
    ['Document #', coverPage.documentNumber],
    ['Type', coverPage.documentType],
    ['Status', coverPage.status],
    ['Classification', coverPage.classification],
    ['Date', coverPage.date],
    ['Effective Date', coverPage.effectiveDate],
    ['Review Date', coverPage.reviewDate],
    ['Version', formMeta.version],
    ['Author', formMeta.author],
    ['Prepared By', coverPage.preparedBy],
    ['Reviewed By', coverPage.reviewedBy],
    ['Approved By', coverPage.approvedBy],
  ];

  const labelX = margins.left + 40;
  const valueX = margins.left + 160;

  for (const [label, value] of metaFields) {
    if (!value) continue;

    page.drawText(`${label}:`, {
      x: labelX,
      y: cursorY,
      size: labelFontSize,
      font: boldFont,
      color: hexToRgb('#333333'),
    });

    page.drawText(value, {
      x: valueX,
      y: cursorY,
      size: metaFontSize,
      font,
      color: hexToRgb('#444444'),
    });

    cursorY -= lineSpacing;
  }

  // Revision history table
  if (coverPage.revisionHistory && coverPage.revisionHistory.length > 0) {
    cursorY -= 10;
    cursorY = drawRevisionHistoryTable(
      page,
      coverPage.revisionHistory,
      cursorY,
      margins.left + 40,
      contentWidth - 80,
      font,
      boldFont
    );
  }

  // Legal block at bottom
  const legalY = margins.bottom + 60;
  const legalFontSize = 8;
  let legalCursorY = legalY;

  const legalFields = [
    coverPage.copyright,
    coverPage.disclaimer,
    coverPage.distributionStatement,
  ].filter(Boolean) as string[];

  // Draw from bottom up for legal text
  for (const text of legalFields.reverse()) {
    const legalWidth = font.widthOfTextAtSize(text, legalFontSize);
    const legalX = (pageWidth - legalWidth) / 2;
    page.drawText(text, {
      x: Math.max(margins.left, legalX),
      y: legalCursorY,
      size: legalFontSize,
      font,
      color: hexToRgb('#888888'),
    });
    legalCursorY += legalFontSize * 1.5;
  }

  // --- Render layer 3: Watermark (on top of everything) ---
  if (coverPage.watermark) {
    drawWatermark(page, coverPage.watermark, pageWidth, pageHeight);
  }
}

/**
 * Draw cover image as background
 */
async function drawCoverImage(
  ctx: LayoutContext,
  page: PDFPage,
  imagePath: string,
  basePath: string
): Promise<void> {
  const resolvedPath = resolve(basePath, imagePath);
  if (!existsSync(resolvedPath)) {
    console.warn(`Cover image not found: ${resolvedPath}`);
    return;
  }

  try {
    const imageBytes = await readFile(resolvedPath);
    const ext = imagePath.toLowerCase();
    const image = ext.endsWith('.png')
      ? await ctx.doc.embedPng(imageBytes)
      : await ctx.doc.embedJpg(imageBytes);

    const { width: pageWidth, height: pageHeight } = page.getSize();

    // Scale image to fill page width, maintaining aspect ratio
    const scale = pageWidth / image.width;
    const scaledHeight = image.height * scale;

    // Draw at reduced opacity by using a graphics state
    page.drawImage(image, {
      x: 0,
      y: pageHeight - Math.min(scaledHeight, pageHeight),
      width: pageWidth,
      height: Math.min(scaledHeight, pageHeight),
      opacity: 0.15,
    });
  } catch (err) {
    console.warn(`Failed to embed cover image: ${(err as Error).message}`);
  }
}

/**
 * Draw logo centered at top of page
 */
async function drawLogo(
  ctx: LayoutContext,
  page: PDFPage,
  logoPath: string,
  basePath: string,
  cursorY: number
): Promise<number> {
  const resolvedPath = resolve(basePath, logoPath);
  if (!existsSync(resolvedPath)) {
    console.warn(`Logo image not found: ${resolvedPath}`);
    return cursorY;
  }

  try {
    const imageBytes = await readFile(resolvedPath);
    const ext = logoPath.toLowerCase();
    const image = ext.endsWith('.png')
      ? await ctx.doc.embedPng(imageBytes)
      : await ctx.doc.embedJpg(imageBytes);

    // Scale logo to max 150px wide, 80px tall
    const maxWidth = 150;
    const maxHeight = 80;
    const scale = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const scaledWidth = image.width * scale;
    const scaledHeight = image.height * scale;

    const { width: pageWidth } = page.getSize();
    const logoX = (pageWidth - scaledWidth) / 2;

    page.drawImage(image, {
      x: logoX,
      y: cursorY - scaledHeight,
      width: scaledWidth,
      height: scaledHeight,
    });

    return cursorY - scaledHeight;
  } catch (err) {
    console.warn(`Failed to embed logo: ${(err as Error).message}`);
    return cursorY;
  }
}

/**
 * Draw diagonal watermark text across the page
 */
function drawWatermark(page: PDFPage, text: string, pageWidth: number, pageHeight: number): void {
  const fontSize = 72;
  // We approximate the text width for centering
  const approxWidth = text.length * fontSize * 0.5;
  const centerX = pageWidth / 2 - approxWidth / 2;
  const centerY = pageHeight / 2 - fontSize / 2;

  page.drawText(text, {
    x: centerX,
    y: centerY,
    size: fontSize,
    color: hexToRgb('#cccccc'),
    opacity: 0.15,
    rotate: degrees(45),
  });
}

/**
 * Draw revision history as a simple table
 */
function drawRevisionHistoryTable(
  page: PDFPage,
  history: { version: string; date: string; author: string; description: string }[],
  startY: number,
  startX: number,
  tableWidth: number,
  font: Awaited<ReturnType<typeof import('pdf-lib').PDFDocument.prototype.embedFont>>,
  boldFont: Awaited<ReturnType<typeof import('pdf-lib').PDFDocument.prototype.embedFont>>
): number {
  const fontSize = 8;
  const rowHeight = 14;
  const headerHeight = 16;
  const colWidths = [
    tableWidth * 0.12, // Version
    tableWidth * 0.18, // Date
    tableWidth * 0.22, // Author
    tableWidth * 0.48, // Description
  ];
  const headers = ['Version', 'Date', 'Author', 'Description'];

  let cursorY = startY;

  // Table title
  page.drawText('Revision History', {
    x: startX,
    y: cursorY,
    size: 9,
    font: boldFont,
    color: hexToRgb('#333333'),
  });
  cursorY -= 14;

  // Header row background
  page.drawRectangle({
    x: startX,
    y: cursorY - headerHeight + 4,
    width: tableWidth,
    height: headerHeight,
    color: hexToRgb('#f0f0f0'),
  });

  // Header text
  let colX = startX + 4;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: colX,
      y: cursorY - headerHeight + 8,
      size: fontSize,
      font: boldFont,
      color: hexToRgb('#333333'),
    });
    colX += colWidths[i];
  }
  cursorY -= headerHeight;

  // Header border
  page.drawLine({
    start: { x: startX, y: cursorY + 4 },
    end: { x: startX + tableWidth, y: cursorY + 4 },
    thickness: 0.5,
    color: hexToRgb('#cccccc'),
  });

  // Data rows
  for (const entry of history) {
    const values = [entry.version, entry.date, entry.author, entry.description];
    colX = startX + 4;

    for (let i = 0; i < values.length; i++) {
      const maxChars = Math.floor(colWidths[i] / (fontSize * 0.45));
      const displayText =
        values[i].length > maxChars ? `${values[i].substring(0, maxChars - 2)}..` : values[i];

      page.drawText(displayText, {
        x: colX,
        y: cursorY - rowHeight + 5,
        size: fontSize,
        font,
        color: hexToRgb('#444444'),
      });
      colX += colWidths[i];
    }

    cursorY -= rowHeight;

    // Row border
    page.drawLine({
      start: { x: startX, y: cursorY + 5 },
      end: { x: startX + tableWidth, y: cursorY + 5 },
      thickness: 0.25,
      color: hexToRgb('#dddddd'),
    });
  }

  return cursorY;
}
