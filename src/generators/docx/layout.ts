/**
 * DOCX Layout Module
 * Handles page setup, sections, headers/footers, margins
 */

import {
  Paragraph,
  TextRun,
  Header,
  Footer,
  PageNumber,
  AlignmentType,
  PageOrientation,
  ExternalHyperlink,
  ImageRun,
  convertInchesToTwip,
  BorderStyle,
  TabStopType,
} from 'docx';
import type { DocxConfig, PageSize } from '../../types/index.js';
import type { ResolvedStylesheet } from '../../types/stylesheet.js';
import { PAGE_SIZES } from '../../types/index.js';
import { mapFontFamily, isBoldFont, isItalicFont, ptToTwip, hexToDocxColor } from './utils.js';
import { type ResolvedFooter } from '../footer-utils.js';
import { loadSocialIconBytes, SOCIAL_ICON_SIZE } from '../icon-utils.js';

/**
 * Page dimensions for DOCX (in twips)
 */
export interface DocxPageDimensions {
  width: number;
  height: number;
}

/**
 * Get page dimensions in twips for DOCX
 */
export function getPageDimensions(pageSize: PageSize): DocxPageDimensions {
  const size = PAGE_SIZES[pageSize];
  return {
    width: ptToTwip(size.width),
    height: ptToTwip(size.height),
  };
}

/**
 * Create document section properties
 */
export function createSectionProperties(
  config: DocxConfig,
  stylesheet: ResolvedStylesheet
): {
  page: {
    size: {
      width: number;
      height: number;
      orientation: (typeof PageOrientation)[keyof typeof PageOrientation];
    };
    margin: { top: number; right: number; bottom: number; left: number };
  };
} {
  const pageDimensions = getPageDimensions(stylesheet.page.size);
  const margins = stylesheet.page.margins;

  return {
    page: {
      size: {
        width: pageDimensions.width,
        height: pageDimensions.height,
        orientation: PageOrientation.PORTRAIT,
      },
      margin: {
        top: ptToTwip(margins.top),
        right: ptToTwip(margins.right),
        bottom: ptToTwip(margins.bottom),
        left: ptToTwip(margins.left),
      },
    },
  };
}

/**
 * Create header for document
 */
export function createHeader(
  title: string,
  stylesheet: ResolvedStylesheet,
  showPageNumbers = true
): Header {
  const style = stylesheet.header;
  const fontName = mapFontFamily(style.fontFamily);
  const bold = isBoldFont(style.fontFamily);
  const italics = isItalicFont(style.fontFamily);

  const children: Paragraph[] = [];

  if (showPageNumbers) {
    // Header with title on left, page numbers on right
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            font: fontName,
            size: style.fontSize * 2, // DOCX uses half-points
            color: hexToDocxColor(style.color),
            bold,
            italics,
          }),
          new TextRun({
            text: '\t\t',
          }),
          new TextRun({
            text: 'Page ',
            font: fontName,
            size: style.fontSize * 2,
            color: hexToDocxColor(style.color),
          }),
          new TextRun({
            children: [PageNumber.CURRENT],
            font: fontName,
            size: style.fontSize * 2,
            color: hexToDocxColor(style.color),
          }),
          new TextRun({
            text: ' of ',
            font: fontName,
            size: style.fontSize * 2,
            color: hexToDocxColor(style.color),
          }),
          new TextRun({
            children: [PageNumber.TOTAL_PAGES],
            font: fontName,
            size: style.fontSize * 2,
            color: hexToDocxColor(style.color),
          }),
        ],
        tabStops: [
          {
            type: 'right' as const,
            position: convertInchesToTwip(6.5), // Right margin position
          },
        ],
      })
    );
  } else {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            font: fontName,
            size: style.fontSize * 2,
            color: hexToDocxColor(style.color),
            bold,
            italics,
          }),
        ],
      })
    );
  }

  return new Header({
    children,
  });
}

/**
 * Create footer for document with three-section layout, separator, and social icon links
 * Returns undefined if footer is disabled.
 */
export async function createFooter(
  footer: ResolvedFooter,
  stylesheet: ResolvedStylesheet
): Promise<Footer | undefined> {
  if (!footer.enabled) return undefined;

  const style = stylesheet.footer;
  const fontName = mapFontFamily(style.fontFamily);
  const bold = isBoldFont(style.fontFamily);
  const italics = isItalicFont(style.fontFamily);
  const halfPtSize = style.fontSize * 2;
  const colorHex = hexToDocxColor(style.color);

  const children: Paragraph[] = [];

  // Build three-section footer using tab stops
  const hasLeft = !!footer.left;
  const hasCenter = !!footer.center;
  const hasRight = !!footer.right;

  if (hasLeft || hasCenter || hasRight) {
    const runs: TextRun[] = [];

    // Helper to create text runs from footer text, replacing {{page}}/{{pages}} with native fields
    const createRuns = (text: string): TextRun[] => {
      const result: TextRun[] = [];
      const parts = text.split(/(\{\{page\}\}|\{\{pages\}\})/g);
      for (const part of parts) {
        if (part === '{{page}}') {
          result.push(
            new TextRun({
              children: [PageNumber.CURRENT],
              font: fontName,
              size: halfPtSize,
              color: colorHex,
              bold,
              italics,
            })
          );
        } else if (part === '{{pages}}') {
          result.push(
            new TextRun({
              children: [PageNumber.TOTAL_PAGES],
              font: fontName,
              size: halfPtSize,
              color: colorHex,
              bold,
              italics,
            })
          );
        } else if (part) {
          result.push(
            new TextRun({
              text: part,
              font: fontName,
              size: halfPtSize,
              color: colorHex,
              bold,
              italics,
            })
          );
        }
      }
      return result;
    };

    // Left section
    if (hasLeft) {
      runs.push(...createRuns(footer.left));
    }

    // Tab to center
    if (hasCenter) {
      runs.push(new TextRun({ text: '\t', font: fontName, size: halfPtSize }));
      runs.push(...createRuns(footer.center));
    }

    // Tab to right
    if (hasRight) {
      // If no center, need two tabs to get to right
      if (!hasCenter) {
        runs.push(new TextRun({ text: '\t\t', font: fontName, size: halfPtSize }));
      } else {
        runs.push(new TextRun({ text: '\t', font: fontName, size: halfPtSize }));
      }
      runs.push(...createRuns(footer.right));
    }

    children.push(
      new Paragraph({
        tabStops: [
          {
            type: TabStopType.CENTER,
            position: convertInchesToTwip(3.25),
          },
          {
            type: TabStopType.RIGHT,
            position: convertInchesToTwip(6.5),
          },
        ],
        border: footer.separator.enabled
          ? {
              top: {
                style: BorderStyle.SINGLE,
                size: Math.round(footer.separator.thickness * 8),
                color: hexToDocxColor(footer.separator.color),
                space: 4,
              },
            }
          : undefined,
        children: runs,
      })
    );
  }

  // Social icons row
  const socialEntries = Object.entries(footer.socialLinks).filter(([, url]) => !!url);
  if (socialEntries.length > 0) {
    const socialRuns: (TextRun | ExternalHyperlink)[] = [];

    for (let index = 0; index < socialEntries.length; index++) {
      const [key, url] = socialEntries[index];

      if (index > 0) {
        socialRuns.push(
          new TextRun({
            text: '  ',
            font: fontName,
            size: halfPtSize,
          })
        );
      }

      const iconBytes = await loadSocialIconBytes(key);
      if (iconBytes) {
        socialRuns.push(
          new ExternalHyperlink({
            link: url as string,
            children: [
              new ImageRun({
                data: iconBytes,
                type: 'png',
                transformation: {
                  width: SOCIAL_ICON_SIZE.width,
                  height: SOCIAL_ICON_SIZE.height,
                },
              }),
            ],
          })
        );
      }
    }

    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: ptToTwip(2) },
        children: socialRuns,
      })
    );
  }

  if (children.length === 0) return undefined;

  return new Footer({ children });
}

/**
 * Calculate content area width in points
 */
export function getContentWidth(stylesheet: ResolvedStylesheet): number {
  const pageSize = PAGE_SIZES[stylesheet.page.size];
  const margins = stylesheet.page.margins;
  return pageSize.width - margins.left - margins.right;
}
