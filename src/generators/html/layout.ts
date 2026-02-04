/**
 * HTML Layout Engine
 * Handles page layout, content positioning, and page break calculations for HTML
 * Mirrors PDF pagination logic for consistent output across formats
 */

import type {
  SchemaContentElement,
  HeadingContent,
  ParagraphContent,
  AdmonitionContent,
  SpacerContent,
  TableContent,
  FieldContent,
} from '../../types/index.js';
import { components } from '../../styles/tokens.js';

// Type assertion references for TypeScript analysis (used in 'as' casts below)
type _TypeReferences =
  | HeadingContent
  | ParagraphContent
  | AdmonitionContent
  | SpacerContent
  | FieldContent;

/** Page size configuration */
export type HtmlPageSize = 'a4' | 'letter';

/** A single rendered HTML page */
export interface HtmlPage {
  elements: HtmlPageElement[];
  pageNumber: number;
}

/** An element with its rendered HTML and estimated height */
export interface HtmlPageElement {
  html: string;
  height: number;
}

/** Layout context for HTML pagination */
export interface HtmlLayoutContext {
  pageSize: HtmlPageSize;
  contentHeight: number; // Available height per page (after margins)
  pages: HtmlPage[];
  currentPage: number;
  cursorY: number; // Current Y position from top of content area
}

/** Default spacing values matching PDF content.ts FLOW_SPACING */
const FLOW_SPACING = {
  heading: { marginTop: 16, marginBottom: 8 },
  paragraph: { marginTop: 0, marginBottom: 12 },
  admonition: { marginTop: 12, marginBottom: 12 },
  rule: { marginTop: 10, marginBottom: 10 },
  table: { marginTop: 12, marginBottom: 12 },
  spacer: { marginTop: 0, marginBottom: 0 },
  field: { marginTop: 8, marginBottom: 12 },
};

/**
 * Initialize HTML layout context
 * Matches PDF layout.ts initializeLayout() for consistent pagination
 */
export function initializeHtmlLayout(pageSize: HtmlPageSize = 'a4'): HtmlLayoutContext {
  const pageDimensions =
    pageSize === 'a4' ? components.pageLayout.a4 : components.pageLayout.letter;

  // Content height = page height - top margin - bottom margin - footer reserve
  // This matches PDF: pageSize.height - margins.top - margins.bottom
  // Page number is absolutely positioned, so doesn't affect content area
  // Reserve space for footer (text + separator + social icons)
  const footerReserve = 50;
  const contentHeight = pageDimensions.height - pageDimensions.margin * 2 - footerReserve;

  return {
    pageSize,
    contentHeight,
    pages: [{ elements: [], pageNumber: 1 }],
    currentPage: 0,
    cursorY: 0,
  };
}

/**
 * Check if an element needs a page break
 */
export function needsPageBreak(ctx: HtmlLayoutContext, elementHeight: number): boolean {
  return ctx.cursorY + elementHeight > ctx.contentHeight;
}

/**
 * Add an element to the current page
 */
export function addElementToPage(ctx: HtmlLayoutContext, html: string, height: number): void {
  ctx.pages[ctx.currentPage].elements.push({ html, height });
  ctx.cursorY += height;
}

/**
 * Move to next page
 */
export function nextHtmlPage(ctx: HtmlLayoutContext): void {
  ctx.currentPage++;
  ctx.pages.push({ elements: [], pageNumber: ctx.currentPage + 1 });
  ctx.cursorY = 0;
}

/**
 * Estimate the number of lines text will wrap to
 * Based on average character width estimation
 */
export function estimateLineCount(text: string, maxWidthPx: number, fontSizePt: number): number {
  // Approximate character width: fontSize * 0.5 for Helvetica-like fonts
  // Convert pt to px: 1pt = 1.333px
  const fontSizePx = fontSizePt * (96 / 72);
  const avgCharWidth = fontSizePx * 0.5;
  const charsPerLine = Math.floor(maxWidthPx / avgCharWidth);

  if (charsPerLine <= 0) return 1;

  // Simple word-wrap estimation
  const words = text.split(/\s+/);
  let lineCount = 1;
  let currentLineLength = 0;

  for (const word of words) {
    const wordLength = word.length + 1; // +1 for space
    if (currentLineLength + wordLength > charsPerLine) {
      lineCount++;
      currentLineLength = word.length;
    } else {
      currentLineLength += wordLength;
    }
  }

  return lineCount;
}

/**
 * Estimate the height of an element for page break decisions
 * Ported from PDF content.ts estimateElementHeight
 */
export function estimateHtmlElementHeight(
  element: SchemaContentElement,
  contentWidthPx: number
): number {
  // Convert pt to px for all calculations
  const ptToPx = (pt: number): number => pt * (96 / 72);

  switch (element.type) {
    case 'heading': {
      const headingEl = element;
      const level = Math.max(1, Math.min(6, headingEl.level));
      // Get heading style based on level (1-6)
      const headingStyles = {
        1: components.heading.h1,
        2: components.heading.h2,
        3: components.heading.h3,
        4: components.heading.h4,
        5: components.heading.h5,
        6: components.heading.h6,
      } as const;
      const style = headingStyles[level as 1 | 2 | 3 | 4 | 5 | 6];
      const fontSizePx = ptToPx(style.fontSize);
      const marginTopPx = ptToPx(FLOW_SPACING.heading.marginTop);
      const marginBottomPx = ptToPx(FLOW_SPACING.heading.marginBottom);
      return fontSizePx + marginTopPx + marginBottomPx;
    }

    case 'paragraph': {
      const paragraphEl = element;
      const style = components.paragraph;
      const fontSize = paragraphEl.fontSize ?? style.fontSize;
      const lineHeight = fontSize * style.lineHeight;
      const maxWidth = paragraphEl.maxWidth ? ptToPx(paragraphEl.maxWidth) : contentWidthPx;
      const lineCount = estimateLineCount(paragraphEl.text, maxWidth, fontSize);
      const textHeightPx = lineCount * ptToPx(lineHeight);
      const marginBottomPx = ptToPx(FLOW_SPACING.paragraph.marginBottom);
      return textHeightPx + marginBottomPx;
    }

    case 'admonition': {
      const admonitionEl = element;
      const style = components.admonition;
      const titleContentGap = 10;
      const minPadding = 4;
      const paddingPx = ptToPx(style.padding);
      const borderWidthPx = ptToPx(style.borderWidth);
      const contentWidth = contentWidthPx - paddingPx * 2 - borderWidthPx;
      const lineCount = estimateLineCount(admonitionEl.text, contentWidth, style.contentFontSize);
      const lineHeightPx = ptToPx(style.contentFontSize * style.contentLineHeight);
      const contentHeight =
        lineCount > 0 ? (lineCount - 1) * lineHeightPx + ptToPx(style.contentFontSize) : 0;
      const titleFontSizePx = ptToPx(style.titleFontSize);
      const textBlockHeight = titleFontSizePx + titleContentGap + contentHeight;
      const marginTopPx = ptToPx(FLOW_SPACING.admonition.marginTop);
      const marginBottomPx = ptToPx(FLOW_SPACING.admonition.marginBottom);
      return textBlockHeight + minPadding * 2 + marginTopPx + marginBottomPx;
    }

    case 'rule': {
      const style = components.rule;
      const thicknessPx = ptToPx(style.thickness);
      const marginTopPx = ptToPx(FLOW_SPACING.rule.marginTop);
      const marginBottomPx = ptToPx(FLOW_SPACING.rule.marginBottom);
      return thicknessPx + marginTopPx + marginBottomPx;
    }

    case 'spacer': {
      const spacerEl = element;
      return ptToPx(spacerEl.height);
    }

    case 'table': {
      const tableEl = element;
      const style = components.table;
      const rowHeight = tableEl.rowHeight ?? style.rowHeight;
      const headerHeight = tableEl.headerHeight ?? style.headerHeight;
      let labelHeight = 0;
      if (tableEl.label) {
        labelHeight = ptToPx(components.field.label.fontSize - 4);
      }
      const rowCount = getTableRowCount(tableEl);
      const tableHeightPx =
        ptToPx(headerHeight) +
        rowCount * ptToPx(rowHeight) +
        labelHeight +
        ptToPx(FLOW_SPACING.table.marginTop) +
        ptToPx(FLOW_SPACING.table.marginBottom);
      return tableHeightPx;
    }

    case 'field': {
      const fieldEl = element;
      const labelHeightPx = ptToPx(components.field.label.fontSize + 4);
      const defaultHeight = fieldEl.fieldType === 'textarea' ? 60 : 22;
      const fieldHeight = fieldEl.height ?? defaultHeight;
      const fieldHeightPx = ptToPx(fieldHeight);
      const marginTopPx = ptToPx(FLOW_SPACING.field.marginTop);
      const marginBottomPx = ptToPx(FLOW_SPACING.field.marginBottom);
      return labelHeightPx + fieldHeightPx + marginTopPx + marginBottomPx;
    }

    default:
      return 20; // Default minimum height in pixels
  }
}

/**
 * Get the row count for a table element
 */
function getTableRowCount(table: TableContent): number {
  if (table.rowCount) {
    return table.rowCount;
  }
  if (table.rows) {
    return table.rows.length;
  }
  return 0;
}

/**
 * Get the content width in pixels for the given page size
 */
export function getContentWidthPx(pageSize: HtmlPageSize): number {
  const pageDimensions =
    pageSize === 'a4' ? components.pageLayout.a4 : components.pageLayout.letter;
  return pageDimensions.contentWidth;
}
