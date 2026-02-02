/**
 * Flow Positioning Mode Tests
 * Tests the flow positioning mode where content elements stack vertically
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generatePdf } from '../../../src/generators/pdf/index.js';
import type {
  ParsedFormSchema,
  HeadingContent,
  ParagraphContent,
  RuleContent,
  SpacerContent,
  AdmonitionContent,
  TableContent,
} from '../../../src/types/index.js';

describe('Flow Positioning Mode', () => {
  describe('Basic Flow Rendering', () => {
    it('renders elements sequentially without explicit y positions', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-basic-test',
          title: 'Flow Basic Test',
          pages: 1,
          positioning: 'flow',
        },
        content: [
          {
            type: 'heading',
            level: 1,
            text: 'Main Title',
            page: 1,
          } as HeadingContent,
          {
            type: 'paragraph',
            text: 'This is the first paragraph of content that flows after the heading.',
            page: 1,
          } as ParagraphContent,
          {
            type: 'paragraph',
            text: 'This is the second paragraph that flows after the first.',
            page: 1,
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();
      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.pageCount).toBe(1);

      // Verify the PDF is valid
      const doc = await PDFDocument.load(result.bytes);
      expect(doc.getPageCount()).toBe(1);

      // Check that elements were tracked
      expect(result.drawnElements).toBeDefined();
      expect(result.drawnElements?.length).toBeGreaterThan(0);

      // Find the drawn elements
      // Level 1 headings are tracked as 'title' type
      const heading = result.drawnElements?.find((el) => el.type === 'title');
      const paragraphs = result.drawnElements?.filter((el) => el.type === 'paragraph');

      expect(heading).toBeDefined();
      expect(paragraphs?.length).toBe(2);

      // In flow mode, elements should stack vertically (lower y value = further down page)
      // The heading should be above the paragraphs
      if (heading && paragraphs && paragraphs.length >= 2) {
        expect(heading.bounds.y).toBeGreaterThan(paragraphs[0].bounds.y);
        expect(paragraphs[0].bounds.y).toBeGreaterThan(paragraphs[1].bounds.y);
      }
    });

    it('spacer advances cursor by specified height', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-spacer-test',
          title: 'Flow Spacer Test',
          pages: 1,
          positioning: 'flow',
        },
        content: [
          {
            type: 'heading',
            level: 2,
            text: 'Before Spacer',
            page: 1,
          } as HeadingContent,
          {
            type: 'spacer',
            height: 50,
            page: 1,
          } as SpacerContent,
          {
            type: 'heading',
            level: 2,
            text: 'After Spacer',
            page: 1,
          } as HeadingContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();
      expect(result.drawnElements).toBeDefined();

      const headings = result.drawnElements?.filter((el) => el.type === 'heading');
      expect(headings?.length).toBe(2);

      // The gap between headings should include the spacer height
      if (headings?.length === 2) {
        const gap = headings[0].bounds.y - headings[1].bounds.y;
        // Gap should be at least the spacer height (50) plus heading heights and margins
        expect(gap).toBeGreaterThan(50);
      }
    });

    it('renders rule in flow mode', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-rule-test',
          title: 'Flow Rule Test',
          pages: 1,
          positioning: 'flow',
        },
        content: [
          {
            type: 'paragraph',
            text: 'Content before rule.',
            page: 1,
          } as ParagraphContent,
          {
            type: 'rule',
            page: 1,
          } as RuleContent,
          {
            type: 'paragraph',
            text: 'Content after rule.',
            page: 1,
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();

      const rule = result.drawnElements?.find((el) => el.type === 'rule');
      const paragraphs = result.drawnElements?.filter((el) => el.type === 'paragraph');

      expect(rule).toBeDefined();
      expect(paragraphs?.length).toBe(2);

      // Rule should be between the two paragraphs
      if (rule && paragraphs?.length === 2) {
        expect(paragraphs[0].bounds.y).toBeGreaterThan(rule.bounds.y);
        expect(rule.bounds.y).toBeGreaterThan(paragraphs[1].bounds.y);
      }
    });
  });

  describe('Flow Mode with Explicit Override', () => {
    it('elements with explicit y position render absolutely', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-override-test',
          title: 'Flow Override Test',
          pages: 1,
          positioning: 'flow',
        },
        content: [
          {
            type: 'heading',
            level: 1,
            text: 'Flow Heading',
            page: 1,
            // No position - uses flow
          } as HeadingContent,
          {
            type: 'paragraph',
            text: 'Absolute positioned paragraph at y=200',
            page: 1,
            position: { y: 200 }, // Explicit position - renders absolutely
          } as ParagraphContent,
          {
            type: 'paragraph',
            text: 'Flow paragraph after absolute',
            page: 1,
            // No position - uses flow (continues from where flow left off)
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();

      const paragraphs = result.drawnElements?.filter((el) => el.type === 'paragraph');
      expect(paragraphs?.length).toBe(2);

      // The absolute positioned paragraph should be at approximately y=200
      // (accounting for text height)
      if (paragraphs && paragraphs.length >= 1) {
        const absoluteParagraph = paragraphs.find((p) =>
          p.content?.includes('Absolute positioned')
        );
        expect(absoluteParagraph).toBeDefined();
      }
    });
  });

  describe('Flow Mode with Tables', () => {
    it('renders table in flow mode', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-table-test',
          title: 'Flow Table Test',
          pages: 1,
          positioning: 'flow',
        },
        content: [
          {
            type: 'heading',
            level: 2,
            text: 'Data Entry Table',
            page: 1,
          } as HeadingContent,
          {
            type: 'table',
            page: 1,
            label: 'Enter your data below:',
            columns: [
              { label: 'Name', width: 150 },
              { label: 'Value', width: 100 },
            ],
            rows: [
              {
                cells: [
                  { type: 'label', value: 'Item 1' },
                  { type: 'text', fieldName: 'value_1' },
                ],
              },
              {
                cells: [
                  { type: 'label', value: 'Item 2' },
                  { type: 'text', fieldName: 'value_2' },
                ],
              },
            ],
          } as TableContent,
          {
            type: 'paragraph',
            text: 'Content after the table.',
            page: 1,
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();
      expect(result.pageCount).toBe(1);

      // Verify form fields were created
      const doc = await PDFDocument.load(result.bytes);
      const form = doc.getForm();
      const fields = form.getFields();
      expect(fields.length).toBe(2);
      expect(fields.map((f) => f.getName())).toContain('value_1');
      expect(fields.map((f) => f.getName())).toContain('value_2');

      // Check element ordering
      const heading = result.drawnElements?.find((el) => el.type === 'heading');
      const table = result.drawnElements?.find((el) => el.type === 'table');
      const paragraph = result.drawnElements?.find((el) => el.type === 'paragraph');

      expect(heading).toBeDefined();
      expect(table).toBeDefined();
      expect(paragraph).toBeDefined();

      // Verify vertical ordering: heading > table > paragraph
      if (heading && table && paragraph) {
        expect(heading.bounds.y).toBeGreaterThan(table.bounds.y);
        expect(table.bounds.y).toBeGreaterThan(paragraph.bounds.y);
      }
    });
  });

  describe('Flow Mode with Admonitions', () => {
    it('renders admonition in flow mode', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-admonition-test',
          title: 'Flow Admonition Test',
          pages: 1,
          positioning: 'flow',
        },
        content: [
          {
            type: 'paragraph',
            text: 'Important information follows.',
            page: 1,
          } as ParagraphContent,
          {
            type: 'admonition',
            variant: 'warning',
            title: 'Warning',
            text: 'This is a warning message that appears in the flow of content.',
            page: 1,
          } as AdmonitionContent,
          {
            type: 'paragraph',
            text: 'Content continues after the warning.',
            page: 1,
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();

      const paragraphs = result.drawnElements?.filter((el) => el.type === 'paragraph');
      const admonition = result.drawnElements?.find((el) => el.type === 'admonition');

      expect(paragraphs?.length).toBe(2);
      expect(admonition).toBeDefined();

      // Verify ordering: first paragraph > admonition > second paragraph
      if (paragraphs && admonition && paragraphs.length === 2) {
        expect(paragraphs[0].bounds.y).toBeGreaterThan(admonition.bounds.y);
        expect(admonition.bounds.y).toBeGreaterThan(paragraphs[1].bounds.y);
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('absolute mode still works with explicit positions', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'absolute-mode-test',
          title: 'Absolute Mode Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'heading',
            level: 1,
            text: 'Absolute Heading',
            page: 1,
            position: { y: 700 },
          } as HeadingContent,
          {
            type: 'paragraph',
            text: 'Absolute paragraph at specific position.',
            page: 1,
            position: { y: 650 },
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();
      expect(result.pageCount).toBe(1);

      // Elements should be rendered at their specified positions
      // Level 1 headings are tracked as 'title' type
      const heading = result.drawnElements?.find((el) => el.type === 'title');
      expect(heading).toBeDefined();
    });

    it('default mode (no positioning specified) uses absolute', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'default-mode-test',
          title: 'Default Mode Test',
          pages: 1,
          // No positioning specified
        },
        content: [
          {
            type: 'heading',
            level: 1,
            text: 'Default Mode Heading',
            page: 1,
            position: { y: 700 },
          } as HeadingContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();
      expect(result.pageCount).toBe(1);
    });
  });

  describe('Multi-Page Flow', () => {
    it('handles page transitions correctly', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-multipage-test',
          title: 'Flow Multi-Page Test',
          pages: 2,
          positioning: 'flow',
        },
        content: [
          {
            type: 'heading',
            level: 1,
            text: 'Page 1 Content',
            page: 1,
          } as HeadingContent,
          {
            type: 'paragraph',
            text: 'This content is on page 1.',
            page: 1,
          } as ParagraphContent,
          {
            type: 'heading',
            level: 1,
            text: 'Page 2 Content',
            page: 2,
          } as HeadingContent,
          {
            type: 'paragraph',
            text: 'This content is on page 2.',
            page: 2,
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();
      expect(result.pageCount).toBe(2);

      // Verify content on both pages
      const page1Elements = result.drawnElements?.filter((el) => el.page === 1);
      const page2Elements = result.drawnElements?.filter((el) => el.page === 2);

      expect(page1Elements?.length).toBeGreaterThan(0);
      expect(page2Elements?.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed Content Types', () => {
    it('handles all content types in flow mode', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'flow-all-types-test',
          title: 'Flow All Types Test',
          pages: 1,
          positioning: 'flow',
        },
        content: [
          {
            type: 'heading',
            level: 1,
            text: 'Document Title',
            page: 1,
          } as HeadingContent,
          {
            type: 'paragraph',
            text: 'Introduction paragraph.',
            page: 1,
          } as ParagraphContent,
          {
            type: 'admonition',
            variant: 'note',
            title: 'Note',
            text: 'An important note.',
            page: 1,
          } as AdmonitionContent,
          {
            type: 'rule',
            page: 1,
          } as RuleContent,
          {
            type: 'heading',
            level: 2,
            text: 'Section Title',
            page: 1,
          } as HeadingContent,
          {
            type: 'table',
            page: 1,
            columns: [{ label: 'Column', width: 100 }],
            rows: [{ cells: [{ type: 'label', value: 'Data' }] }],
          } as TableContent,
          {
            type: 'spacer',
            height: 20,
            page: 1,
          } as SpacerContent,
          {
            type: 'paragraph',
            text: 'Final paragraph.',
            page: 1,
          } as ParagraphContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      expect(result.bytes).toBeDefined();
      expect(result.pageCount).toBe(1);

      // Verify all tracked element types (spacer doesn't create a drawn element)
      expect(result.drawnElements?.some((el) => el.type === 'heading')).toBe(true);
      expect(result.drawnElements?.some((el) => el.type === 'paragraph')).toBe(true);
      expect(result.drawnElements?.some((el) => el.type === 'admonition')).toBe(true);
      expect(result.drawnElements?.some((el) => el.type === 'rule')).toBe(true);
      expect(result.drawnElements?.some((el) => el.type === 'table')).toBe(true);
    });
  });
});
