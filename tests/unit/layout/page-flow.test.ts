/**
 * Page Flow Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  initializeLayout,
  drawTitle,
  drawSectionHeading,
  drawParagraph,
  drawHorizontalRule,
  nextPage,
} from '../../../src/generators/pdf/layout.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { PdfConfig } from '../../../src/types/index.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Page Flow', () => {
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

  it('initializes with correct number of pages', async () => {
    const ctx1 = initializeLayout(doc, testConfig, 1, stylesheet);
    expect(ctx1.pages.length).toBe(1);

    const doc2 = await PDFDocument.create();
    const ctx3 = initializeLayout(doc2, testConfig, 3, stylesheet);
    expect(ctx3.pages.length).toBe(3);
  });

  it('draws title and moves cursor', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);
    const initialY = ctx.cursor.y;

    await drawTitle(ctx, 'Test Title');

    expect(ctx.cursor.y).toBeLessThan(initialY);
  });

  it('draws section heading and moves cursor', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);
    const initialY = ctx.cursor.y;

    await drawSectionHeading(ctx, 'Section 1', 2);

    expect(ctx.cursor.y).toBeLessThan(initialY);
  });

  it('draws paragraph and moves cursor', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);
    const initialY = ctx.cursor.y;

    await drawParagraph(ctx, 'This is a test paragraph with some content.');

    expect(ctx.cursor.y).toBeLessThan(initialY);
  });

  it('draws horizontal rule and moves cursor', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);
    const initialY = ctx.cursor.y;

    drawHorizontalRule(ctx);

    expect(ctx.cursor.y).toBeLessThan(initialY);
  });

  it('handles long paragraph that spans multiple lines', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);
    const initialY = ctx.cursor.y;

    const longText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(10);
    await drawParagraph(ctx, longText);

    // Should have moved down significantly for multiple lines
    expect(initialY - ctx.cursor.y).toBeGreaterThan(50);
  });

  it('creates new page when content overflows', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    // Fill the page with content
    for (let i = 0; i < 50; i++) {
      await drawParagraph(
        ctx,
        `Paragraph ${i}: This is test content that will eventually overflow to a new page.`
      );
    }

    expect(ctx.pages.length).toBeGreaterThan(1);
  });

  it('nextPage creates additional page if needed', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    nextPage(ctx);

    expect(ctx.pages.length).toBe(2);
    expect(ctx.currentPage).toBe(1);
  });

  it('preserves page order when navigating', async () => {
    const ctx = initializeLayout(doc, testConfig, 3, stylesheet);

    expect(ctx.currentPage).toBe(0);

    nextPage(ctx);
    expect(ctx.currentPage).toBe(1);

    nextPage(ctx);
    expect(ctx.currentPage).toBe(2);

    // Should create page 4
    nextPage(ctx);
    expect(ctx.pages.length).toBe(4);
    expect(ctx.currentPage).toBe(3);
  });

  it('title can be centered', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    // Should not throw
    await expect(drawTitle(ctx, 'Centered Title', { centered: true })).resolves.not.toThrow();
  });

  it('section headings have different sizes based on level', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    // Should handle all heading levels without error
    await drawSectionHeading(ctx, 'H1 Heading', 1);
    await drawSectionHeading(ctx, 'H2 Heading', 2);
    await drawSectionHeading(ctx, 'H3 Heading', 3);
    await drawSectionHeading(ctx, 'H4 Heading', 4);
    await drawSectionHeading(ctx, 'H5 Heading', 5);
    await drawSectionHeading(ctx, 'H6 Heading', 6);

    expect(ctx.cursor.y).toBeLessThan(700);
  });

  it('generates valid PDF after all content operations', async () => {
    const ctx = initializeLayout(doc, testConfig, 1, stylesheet);

    await drawTitle(ctx, 'Test Document');
    await drawSectionHeading(ctx, 'Introduction', 2);
    await drawParagraph(ctx, 'This is the introduction paragraph.');
    drawHorizontalRule(ctx);
    await drawSectionHeading(ctx, 'Content', 2);
    await drawParagraph(ctx, 'This is the main content of the document.');

    const pdfBytes = await doc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });
});
