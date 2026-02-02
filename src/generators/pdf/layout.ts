/**
 * Page Layout Engine
 * Handles page setup, content positioning, and layout calculations
 */

import { PDFDocument, PDFPage, StandardFonts } from 'pdf-lib';
import type { PdfConfig } from '../../types/index.js';
import type { ResolvedStylesheet, FontFamily } from '../../types/stylesheet.js';
import { PAGE_SIZES } from '../../types/index.js';
import { wrapText, hexToRgb } from './utils.js';

/**
 * Admonition type for rendering admonition boxes
 */
export interface Admonition {
  type: 'warning' | 'note' | 'info' | 'tip' | 'danger';
  title: string;
  content: string;
}

/**
 * Represents a drawn element with its position for overlap detection
 */
export interface DrawnElement {
  type: 'title' | 'heading' | 'paragraph' | 'rule' | 'admonition' | 'checkbox' | 'table' | 'field';
  page: number;
  bounds: { x: number; y: number; width: number; height: number };
  content?: string;
}

export interface LayoutContext {
  doc: PDFDocument;
  pages: PDFPage[];
  currentPage: number;
  config: Required<PdfConfig>;
  pageSize: { width: number; height: number };
  contentArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  cursor: {
    x: number;
    y: number;
  };
  /** Tracked drawn elements for overlap detection */
  drawnElements: DrawnElement[];
  /** Stylesheet for all styling values */
  stylesheet: ResolvedStylesheet;
}

/**
 * Map FontFamily type to StandardFonts enum value
 */
export function getFontName(
  fontFamily: FontFamily
): (typeof StandardFonts)[keyof typeof StandardFonts] {
  const fontMap: Record<FontFamily, (typeof StandardFonts)[keyof typeof StandardFonts]> = {
    Helvetica: StandardFonts.Helvetica,
    HelveticaBold: StandardFonts.HelveticaBold,
    HelveticaOblique: StandardFonts.HelveticaOblique,
    HelveticaBoldOblique: StandardFonts.HelveticaBoldOblique,
    Courier: StandardFonts.Courier,
    CourierBold: StandardFonts.CourierBold,
    CourierOblique: StandardFonts.CourierOblique,
    CourierBoldOblique: StandardFonts.CourierBoldOblique,
    TimesRoman: StandardFonts.TimesRoman,
    TimesRomanBold: StandardFonts.TimesRomanBold,
    TimesRomanItalic: StandardFonts.TimesRomanItalic,
    TimesRomanBoldItalic: StandardFonts.TimesRomanBoldItalic,
  };
  return fontMap[fontFamily];
}

/**
 * Initialize layout context
 */
export function initializeLayout(
  doc: PDFDocument,
  config: Required<PdfConfig>,
  pageCount = 1,
  stylesheet: ResolvedStylesheet
): LayoutContext {
  const pageSize = PAGE_SIZES[stylesheet.page.size];
  const margins = stylesheet.page.margins;

  // Create initial pages
  const pages: PDFPage[] = [];
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([pageSize.width, pageSize.height]);
    pages.push(page);
  }

  const contentArea = {
    x: margins.left,
    y: margins.bottom,
    width: pageSize.width - margins.left - margins.right,
    height: pageSize.height - margins.top - margins.bottom,
  };

  return {
    doc,
    pages,
    currentPage: 0,
    config,
    pageSize,
    contentArea,
    cursor: {
      x: contentArea.x,
      y: pageSize.height - margins.top, // Start from top
    },
    drawnElements: [],
    stylesheet,
  };
}

/**
 * Get current page
 */
export function getCurrentPage(ctx: LayoutContext): PDFPage {
  return ctx.pages[ctx.currentPage];
}

/**
 * Move to next page
 */
export function nextPage(ctx: LayoutContext): PDFPage {
  ctx.currentPage++;

  if (ctx.currentPage >= ctx.pages.length) {
    // Create new page
    const page = ctx.doc.addPage([ctx.pageSize.width, ctx.pageSize.height]);
    ctx.pages.push(page);
  }

  // Reset cursor to top of page
  ctx.cursor = {
    x: ctx.contentArea.x,
    y: ctx.pageSize.height - ctx.config.margins.top,
  };

  return ctx.pages[ctx.currentPage];
}

/**
 * Move cursor down
 */
export function moveCursorDown(ctx: LayoutContext, amount: number): void {
  ctx.cursor.y -= amount;

  // Check if we need to go to next page
  if (ctx.cursor.y < ctx.config.margins.bottom) {
    nextPage(ctx);
  }
}

/**
 * Draw page header
 */
export async function drawHeader(
  ctx: LayoutContext,
  text: string,
  options: { pageNumber?: boolean } = {}
): Promise<void> {
  const style = ctx.stylesheet.header;
  const font = await ctx.doc.embedFont(getFontName(style.fontFamily));
  const fontSize = style.fontSize;
  const color = hexToRgb(style.color);

  for (let i = 0; i < ctx.pages.length; i++) {
    const page = ctx.pages[i];
    const y = ctx.pageSize.height - 30;

    // Draw header text on left
    page.drawText(text, {
      x: ctx.stylesheet.page.margins.left,
      y,
      size: fontSize,
      font,
      color,
    });

    // Draw page number on right
    if (options.pageNumber !== false && ctx.pages.length > 1) {
      const pageNumText = `Page ${i + 1} of ${ctx.pages.length}`;
      const textWidth = font.widthOfTextAtSize(pageNumText, fontSize);

      page.drawText(pageNumText, {
        x: ctx.pageSize.width - ctx.stylesheet.page.margins.right - textWidth,
        y,
        size: fontSize,
        font,
        color,
      });
    }
  }
}

/**
 * Draw page footer
 */
export async function drawFooter(ctx: LayoutContext, text: string): Promise<void> {
  const style = ctx.stylesheet.footer;
  const font = await ctx.doc.embedFont(getFontName(style.fontFamily));
  const fontSize = style.fontSize;
  const color = hexToRgb(style.color);

  for (const page of ctx.pages) {
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const x = (ctx.pageSize.width - textWidth) / 2;

    page.drawText(text, {
      x,
      y: 20,
      size: fontSize,
      font,
      color,
    });
  }
}

/**
 * Draw form title (uses h1 heading style)
 */
export async function drawTitle(
  ctx: LayoutContext,
  title: string,
  options: { centered?: boolean } = {}
): Promise<void> {
  const style = ctx.stylesheet.headings[1];
  const font = await ctx.doc.embedFont(getFontName(style.fontFamily));
  const fontSize = style.fontSize;
  const color = hexToRgb(style.color);
  const page = getCurrentPage(ctx);

  let x = ctx.cursor.x;
  const textWidth = font.widthOfTextAtSize(title, fontSize);
  if (options.centered) {
    x = (ctx.pageSize.width - textWidth) / 2;
  }

  const startY = ctx.cursor.y;

  page.drawText(title, {
    x,
    y: ctx.cursor.y,
    size: fontSize,
    font,
    color,
  });

  const elementHeight = fontSize + style.marginBottom;
  moveCursorDown(ctx, elementHeight);

  // Track drawn element
  ctx.drawnElements.push({
    type: 'title',
    page: ctx.currentPage + 1,
    bounds: {
      x,
      y: startY - fontSize, // PDF y is baseline, adjust for text height
      width: textWidth,
      height: fontSize,
    },
    content: title,
  });
}

/**
 * Draw section heading
 */
export async function drawSectionHeading(
  ctx: LayoutContext,
  text: string,
  level = 2
): Promise<void> {
  // Clamp level to 1-6
  const headingLevel = Math.max(1, Math.min(6, level)) as 1 | 2 | 3 | 4 | 5 | 6;
  const style = ctx.stylesheet.headings[headingLevel];
  const font = await ctx.doc.embedFont(getFontName(style.fontFamily));
  const fontSize = style.fontSize;
  const color = hexToRgb(style.color);
  const page = getCurrentPage(ctx);

  // Add space before heading
  moveCursorDown(ctx, style.marginTop);

  const startY = ctx.cursor.y;
  const textWidth = font.widthOfTextAtSize(text, fontSize);

  page.drawText(text, {
    x: ctx.cursor.x,
    y: ctx.cursor.y,
    size: fontSize,
    font,
    color,
  });

  moveCursorDown(ctx, fontSize + style.marginBottom);

  // Track drawn element
  ctx.drawnElements.push({
    type: 'heading',
    page: ctx.currentPage + 1,
    bounds: {
      x: ctx.cursor.x,
      y: startY - fontSize,
      width: textWidth,
      height: fontSize,
    },
    content: text,
  });
}

/**
 * Draw paragraph text
 */
export async function drawParagraph(ctx: LayoutContext, text: string): Promise<void> {
  const style = ctx.stylesheet.paragraph;
  const font = await ctx.doc.embedFont(getFontName(style.fontFamily));
  const fontSize = style.fontSize;
  const lineHeight = fontSize * (style.lineHeight || 1.5);
  const color = hexToRgb(style.color);
  const maxWidth = style.maxWidth || ctx.contentArea.width;

  // Wrap text to fit content area
  const lines = wrapText(text, Math.min(maxWidth, ctx.contentArea.width), fontSize);

  const startY = ctx.cursor.y;
  const startPage = ctx.currentPage;

  for (const line of lines) {
    const page = getCurrentPage(ctx);

    page.drawText(line, {
      x: ctx.cursor.x,
      y: ctx.cursor.y,
      size: fontSize,
      font,
      color,
    });

    moveCursorDown(ctx, lineHeight);
  }

  // Calculate total height of paragraph
  const totalHeight = lines.length * lineHeight;

  // Track drawn element (using starting position and total height)
  ctx.drawnElements.push({
    type: 'paragraph',
    page: startPage + 1,
    bounds: {
      x: ctx.contentArea.x,
      y: startY - totalHeight, // Bottom of the paragraph
      width: ctx.contentArea.width,
      height: totalHeight,
    },
    content: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
  });

  // Add paragraph spacing
  moveCursorDown(ctx, style.marginBottom);
}

/**
 * Draw horizontal rule
 */
export function drawHorizontalRule(ctx: LayoutContext): void {
  const style = ctx.stylesheet.rule;
  const page = getCurrentPage(ctx);

  moveCursorDown(ctx, style.marginTop);

  const ruleY = ctx.cursor.y;

  page.drawLine({
    start: { x: ctx.cursor.x, y: ctx.cursor.y },
    end: { x: ctx.cursor.x + ctx.contentArea.width, y: ctx.cursor.y },
    thickness: style.thickness,
    color: hexToRgb(style.color),
  });

  // Track drawn element
  ctx.drawnElements.push({
    type: 'rule',
    page: ctx.currentPage + 1,
    bounds: {
      x: ctx.cursor.x,
      y: ruleY - style.thickness, // Account for line thickness
      width: ctx.contentArea.width,
      height: style.thickness * 2, // Minimal height for rule
    },
  });

  moveCursorDown(ctx, style.marginBottom);
}

/**
 * Draw an admonition box (warning, note, info, tip, danger)
 */
export async function drawAdmonition(ctx: LayoutContext, admonition: Admonition): Promise<void> {
  const page = getCurrentPage(ctx);

  // Get style for this admonition type
  const style = ctx.stylesheet.admonitions[admonition.type] || ctx.stylesheet.admonitions.note;
  const font = await ctx.doc.embedFont(getFontName(style.contentFontFamily));
  const boldFont = await ctx.doc.embedFont(getFontName(style.titleFontFamily));

  const prefixMap: Record<string, string> = {
    warning: 'Warning',
    note: 'Note',
    info: 'Info',
    tip: 'Tip',
    danger: 'Danger',
  };

  const prefix = prefixMap[admonition.type] || 'Note';
  const fontSize = style.contentFontSize;
  const titleFontSize = style.titleFontSize;
  const horizontalPadding = style.padding;
  const verticalPadding = 4; // Minimal vertical padding for tight box
  const titleContentGap = 6; // Clear gap between title and content
  const borderWidth = style.borderWidth;

  // Calculate content height
  const contentLines = wrapText(
    admonition.content,
    ctx.contentArea.width - horizontalPadding * 2 - borderWidth,
    fontSize
  );
  const contentHeight = contentLines.length * (fontSize * style.contentLineHeight);
  const totalHeight =
    verticalPadding + titleFontSize + titleContentGap + contentHeight + verticalPadding;

  // Check for page break
  if (ctx.cursor.y - totalHeight < ctx.stylesheet.page.margins.bottom) {
    nextPage(ctx);
  }

  const startY = ctx.cursor.y;
  const boxTop = startY;
  const boxBottom = startY - totalHeight;

  // Draw background
  page.drawRectangle({
    x: ctx.contentArea.x,
    y: boxBottom,
    width: ctx.contentArea.width,
    height: totalHeight,
    color: hexToRgb(style.backgroundColor),
    borderWidth: 0,
  });

  // Draw left border accent
  page.drawRectangle({
    x: ctx.contentArea.x,
    y: boxBottom,
    width: borderWidth,
    height: totalHeight,
    color: hexToRgb(style.borderColor),
  });

  // Draw title
  const titleText = `${prefix}: ${admonition.title}`;
  page.drawText(titleText, {
    x: ctx.contentArea.x + borderWidth + horizontalPadding,
    y: boxTop - verticalPadding - titleFontSize,
    size: titleFontSize,
    font: boldFont,
    color: hexToRgb(style.titleColor),
  });

  // Draw content lines
  let contentY = boxTop - verticalPadding - titleFontSize - titleContentGap;
  for (const line of contentLines) {
    page.drawText(line, {
      x: ctx.contentArea.x + borderWidth + horizontalPadding,
      y: contentY,
      size: fontSize,
      font,
      color: hexToRgb(style.contentColor),
    });
    contentY -= fontSize * style.contentLineHeight;
  }

  // Track drawn element
  ctx.drawnElements.push({
    type: 'admonition',
    page: ctx.currentPage + 1,
    bounds: {
      x: ctx.contentArea.x,
      y: boxBottom,
      width: ctx.contentArea.width,
      height: totalHeight,
    },
    content: admonition.title,
  });

  // Move cursor below admonition
  ctx.cursor.y = boxBottom - 10;

  // Check for page break
  if (ctx.cursor.y < ctx.stylesheet.page.margins.bottom) {
    nextPage(ctx);
  }
}
