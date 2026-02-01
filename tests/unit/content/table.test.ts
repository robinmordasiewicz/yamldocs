/**
 * Table Content Type Tests
 * Tests the table content rendering functionality
 */

import { describe, it, expect } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { generatePdf } from '../../../src/generators/pdf/index.js';
import { parseStylesheetContent } from '../../../src/parsers/stylesheet.js';
import type { ParsedFormSchema, TableContent } from '../../../src/types/index.js';

describe('Table Content Type', () => {
  describe('Basic Table Rendering', () => {
    it('generates a PDF with a simple table', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'table-test',
          title: 'Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
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

      // Check that form fields were created
      const form = doc.getForm();
      const fields = form.getFields();
      expect(fields.length).toBe(2);
      expect(fields.map((f) => f.getName())).toContain('value_1');
      expect(fields.map((f) => f.getName())).toContain('value_2');
    });

    it('generates a table with dropdown cells', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'dropdown-table-test',
          title: 'Dropdown Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            columns: [{ label: 'Status', width: 150 }],
            rows: [
              {
                cells: [
                  {
                    type: 'dropdown',
                    fieldName: 'status_1',
                    options: [
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ],
                  },
                ],
              },
            ],
          } as TableContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });
      const doc = await PDFDocument.load(result.bytes);
      const form = doc.getForm();

      // Check that dropdown field was created
      const dropdown = form.getDropdown('status_1');
      expect(dropdown).toBeDefined();
      expect(dropdown.getOptions()).toContain('Active');
      expect(dropdown.getOptions()).toContain('Inactive');
    });

    it('generates a table with checkbox cells', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'checkbox-table-test',
          title: 'Checkbox Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            columns: [
              { label: 'Item', width: 100 },
              { label: 'Selected', width: 80 },
            ],
            rows: [
              {
                cells: [
                  { type: 'label', value: 'Option A' },
                  { type: 'checkbox', fieldName: 'selected_a', default: true },
                ],
              },
              {
                cells: [
                  { type: 'label', value: 'Option B' },
                  { type: 'checkbox', fieldName: 'selected_b' },
                ],
              },
            ],
          } as TableContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });
      const doc = await PDFDocument.load(result.bytes);
      const form = doc.getForm();

      // Check that checkbox fields were created
      const checkboxA = form.getCheckBox('selected_a');
      const checkboxB = form.getCheckBox('selected_b');
      expect(checkboxA).toBeDefined();
      expect(checkboxB).toBeDefined();
      expect(checkboxA.isChecked()).toBe(true);
      expect(checkboxB.isChecked()).toBe(false);
    });

    it('tracks table as drawn element', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'table-tracking-test',
          title: 'Table Tracking Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            columns: [
              { label: 'Col1', width: 100 },
              { label: 'Col2', width: 100 },
            ],
            rows: [
              {
                cells: [
                  { type: 'label', value: 'A' },
                  { type: 'label', value: 'B' },
                ],
              },
              {
                cells: [
                  { type: 'label', value: 'C' },
                  { type: 'label', value: 'D' },
                ],
              },
            ],
          } as TableContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      // Check that table was tracked
      expect(result.drawnElements).toBeDefined();
      const tableElement = result.drawnElements?.find((el) => el.type === 'table');
      expect(tableElement).toBeDefined();
      expect(tableElement?.page).toBe(1);
      expect(tableElement?.bounds.width).toBe(200); // 100 + 100
    });
  });

  describe('Table Label', () => {
    it('renders a label above the table', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'label-table-test',
          title: 'Label Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            label: 'Test Table Description',
            columns: [{ label: 'Column', width: 100 }],
            rows: [{ cells: [{ type: 'label', value: 'Row 1' }] }],
          } as TableContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });

      // Should generate without errors
      expect(result.bytes.length).toBeGreaterThan(0);

      // Element should include label height
      const tableElement = result.drawnElements?.find((el) => el.type === 'table');
      expect(tableElement).toBeDefined();
      // With label, total height > just header (24) + row (22) = 46
      expect(tableElement?.bounds.height).toBeGreaterThan(46);
    });

    it('works without a label', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'no-label-table-test',
          title: 'No Label Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            // No label property
            columns: [{ label: 'Column', width: 100 }],
            rows: [{ cells: [{ type: 'label', value: 'Row 1' }] }],
          } as TableContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });
      const tableElement = result.drawnElements?.find((el) => el.type === 'table');

      // Without label, height = header (24) + row (22) = 46
      expect(tableElement?.bounds.height).toBe(46);
    });
  });

  describe('Table Styling', () => {
    it('respects custom row and header heights', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'styled-table-test',
          title: 'Styled Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            rowHeight: 30,
            headerHeight: 35,
            columns: [{ label: 'Column', width: 100 }],
            rows: [
              { cells: [{ type: 'label', value: 'Row 1' }] },
              { cells: [{ type: 'label', value: 'Row 2' }] },
            ],
          } as TableContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });
      const tableElement = result.drawnElements?.find((el) => el.type === 'table');

      // Total height = headerHeight (35) + 2 rows * rowHeight (30) = 95
      expect(tableElement?.bounds.height).toBe(95);
    });

    it('can disable borders', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'borderless-table-test',
          title: 'Borderless Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            showBorders: false,
            columns: [{ label: 'Column', width: 100 }],
            rows: [{ cells: [{ type: 'label', value: 'Row 1' }] }],
          } as TableContent,
        ],
        fields: [],
      };

      // Should generate without errors
      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });
  });

  describe('Mixed Cell Types', () => {
    it('handles a table with all cell types', async () => {
      const schema: ParsedFormSchema = {
        form: {
          id: 'mixed-table-test',
          title: 'Mixed Table Test',
          pages: 1,
          positioning: 'absolute',
        },
        content: [
          {
            type: 'table',
            page: 1,
            position: { y: 700 },
            columns: [
              { label: 'Label', width: 100 },
              { label: 'Text', width: 100 },
              { label: 'Dropdown', width: 100 },
              { label: 'Check', width: 60 },
            ],
            rows: [
              {
                cells: [
                  { type: 'label', value: 'Static' },
                  { type: 'text', fieldName: 'text_input' },
                  {
                    type: 'dropdown',
                    fieldName: 'dropdown_field',
                    options: [
                      { value: 'a', label: 'A' },
                      { value: 'b', label: 'B' },
                    ],
                  },
                  { type: 'checkbox', fieldName: 'check_field' },
                ],
              },
            ],
          } as TableContent,
        ],
        fields: [],
      };

      const result = await generatePdf({ schema });
      const doc = await PDFDocument.load(result.bytes);
      const form = doc.getForm();
      const fields = form.getFields();

      expect(fields.length).toBe(3); // text, dropdown, checkbox (label is not a field)
      expect(form.getTextField('text_input')).toBeDefined();
      expect(form.getDropdown('dropdown_field')).toBeDefined();
      expect(form.getCheckBox('check_field')).toBeDefined();
    });
  });

  describe('CSS Styling', () => {
    it('parses .table base styles', () => {
      const css = `
        .table {
          border-color: #333333;
          border-width: 1pt;
          padding: 6pt;
        }
      `;
      const stylesheet = parseStylesheetContent(css);
      expect(stylesheet.table.borderColor).toBe('#333333');
      expect(stylesheet.table.borderWidth).toBe(1);
      expect(stylesheet.table.cellPadding).toBe(6);
    });

    it('parses .table-header styles', () => {
      const css = `
        .table-header {
          background-color: #0066cc;
          color: #ffffff;
          font-family: HelveticaBold;
          font-size: 12pt;
          height: 28pt;
        }
      `;
      const stylesheet = parseStylesheetContent(css);
      expect(stylesheet.table.headerBackgroundColor).toBe('#0066cc');
      expect(stylesheet.table.headerTextColor).toBe('#ffffff');
      expect(stylesheet.table.headerFontFamily).toBe('HelveticaBold');
      expect(stylesheet.table.headerFontSize).toBe(12);
      expect(stylesheet.table.headerHeight).toBe(28);
    });

    it('parses .table-row styles', () => {
      const css = `
        .table-row {
          background-color: #f5f5f5;
          height: 24pt;
        }
      `;
      const stylesheet = parseStylesheetContent(css);
      expect(stylesheet.table.rowBackgroundColor).toBe('#f5f5f5');
      expect(stylesheet.table.rowHeight).toBe(24);
    });

    it('parses .table-row-alternate styles', () => {
      const css = `
        .table-row-alternate {
          background-color: #eeeeee;
        }
      `;
      const stylesheet = parseStylesheetContent(css);
      expect(stylesheet.table.alternateRowColor).toBe('#eeeeee');
    });

    it('parses .table-cell styles', () => {
      const css = `
        .table-cell {
          font-family: Helvetica;
          font-size: 10pt;
          color: #222222;
          padding: 5pt;
        }
      `;
      const stylesheet = parseStylesheetContent(css);
      expect(stylesheet.table.cellFontFamily).toBe('Helvetica');
      expect(stylesheet.table.cellFontSize).toBe(10);
      expect(stylesheet.table.cellTextColor).toBe('#222222');
      expect(stylesheet.table.cellPadding).toBe(5);
    });

    it('applies combined table CSS', () => {
      const css = `
        .table {
          border-color: #999999;
          border-width: 0.5pt;
        }
        .table-header {
          background-color: #003366;
          color: white;
        }
        .table-row {
          background-color: #ffffff;
        }
        .table-row-alternate {
          background-color: #f0f0f0;
        }
        .table-cell {
          font-size: 9pt;
        }
      `;
      const stylesheet = parseStylesheetContent(css);
      expect(stylesheet.table.borderColor).toBe('#999999');
      expect(stylesheet.table.borderWidth).toBe(0.5);
      expect(stylesheet.table.headerBackgroundColor).toBe('#003366');
      expect(stylesheet.table.headerTextColor).toBe('#ffffff');
      expect(stylesheet.table.rowBackgroundColor).toBe('#ffffff');
      expect(stylesheet.table.alternateRowColor).toBe('#f0f0f0');
      expect(stylesheet.table.cellFontSize).toBe(9);
    });
  });
});
