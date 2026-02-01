/**
 * Layout Cursor Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  initializeLayout,
  moveCursorDown,
  nextPage,
  getCurrentPage,
} from '../../../src/generators/pdf/layout.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { PdfConfig } from '../../../src/types/index.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Layout Cursor', () => {
  let doc: PDFDocument;
  let stylesheet: ResolvedStylesheet;
  const testConfig: Required<PdfConfig> = {
    pageSize: 'letter',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
    fonts: { default: 'Helvetica', monospace: 'Courier' },
  };

  beforeEach(async () => {
    doc = await PDFDocument.create();
    stylesheet = getDefaultStylesheet();
  });

  it('initializes cursor at top of content area', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    // Letter size is 792pt height, minus 72pt top margin = 720
    expect(ctx.cursor.y).toBe(720);
    expect(ctx.cursor.x).toBe(72);
  });

  it('tracks vertical position correctly when moving down', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);
    const initialY = ctx.cursor.y;

    moveCursorDown(ctx, 100);

    expect(ctx.cursor.y).toBe(initialY - 100);
  });

  it('cursor x position stays constant when moving down', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    moveCursorDown(ctx, 50);
    expect(ctx.cursor.x).toBe(72);

    moveCursorDown(ctx, 100);
    expect(ctx.cursor.x).toBe(72);
  });

  it('calculates content area correctly', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    // Letter size: 612 x 792
    // Content width: 612 - 72 - 72 = 468
    // Content height: 792 - 72 - 72 = 648
    expect(ctx.contentArea.width).toBe(468);
    expect(ctx.contentArea.height).toBe(648);
    expect(ctx.contentArea.x).toBe(72);
    expect(ctx.contentArea.y).toBe(72);
  });

  it('triggers page break when exceeding bottom margin', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    // Move cursor close to bottom margin
    ctx.cursor.y = 80; // Just above bottom margin (72)

    // Move down more than available space should trigger page break
    moveCursorDown(ctx, 50);

    // Should now be on page 2
    expect(ctx.currentPage).toBe(1);
    // Cursor should reset to top
    expect(ctx.cursor.y).toBe(720);
  });

  it('creates new page when moving past existing pages', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    expect(ctx.pages.length).toBe(1);

    // Force page break
    ctx.cursor.y = 50;
    moveCursorDown(ctx, 50);

    expect(ctx.pages.length).toBe(2);
    expect(ctx.currentPage).toBe(1);
  });

  it('nextPage advances to next page', async () => {
    const ctx = initializeLayout(doc, testConfig, 2, stylesheet);

    expect(ctx.currentPage).toBe(0);

    nextPage(ctx);

    expect(ctx.currentPage).toBe(1);
    expect(ctx.cursor.y).toBe(720);
  });

  it('getCurrentPage returns correct page', async () => {
    const ctx = initializeLayout(doc, testConfig, 3, stylesheet);

    expect(getCurrentPage(ctx)).toBe(ctx.pages[0]);

    ctx.currentPage = 1;
    expect(getCurrentPage(ctx)).toBe(ctx.pages[1]);

    ctx.currentPage = 2;
    expect(getCurrentPage(ctx)).toBe(ctx.pages[2]);
  });

  it('handles multiple page breaks', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    // Force multiple page breaks
    for (let i = 0; i < 5; i++) {
      ctx.cursor.y = 50;
      moveCursorDown(ctx, 100);
    }

    expect(ctx.pages.length).toBe(6);
    expect(ctx.currentPage).toBe(5);
  });

  it('respects different margin configurations', async () => {
    // Create a stylesheet with custom margins
    const customStylesheet: ResolvedStylesheet = {
      ...stylesheet,
      page: {
        ...stylesheet.page,
        margins: { top: 100, bottom: 100, left: 50, right: 50 },
      },
    };
    const customConfig: Required<PdfConfig> = {
      ...testConfig,
      margins: { top: 100, bottom: 100, left: 50, right: 50 },
    };

    const ctx = initializeLayout(doc, customConfig, 1, customStylesheet);

    // Content width: 612 - 50 - 50 = 512
    // Content height: 792 - 100 - 100 = 592
    expect(ctx.contentArea.width).toBe(512);
    expect(ctx.contentArea.height).toBe(592);
    expect(ctx.cursor.x).toBe(50);
    expect(ctx.cursor.y).toBe(692); // 792 - 100
  });
});
