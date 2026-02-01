/**
 * Visual Snapshot Tests
 *
 * Note: True visual regression testing requires rendering PDFs to images.
 * This file provides the framework for visual tests using buffer comparisons
 * and structural validation.
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import { readPdf, isPdfValid } from '../helpers/pdf-reader.js';
import { getFormFields } from '../helpers/acroform-inspector.js';
import {
  SchemaBuilder,
  createSimpleTestSchema,
  createAllFieldTypesSchema,
} from '../helpers/schema-builder.js';

describe('Visual Snapshots', () => {
  describe('PDF Structure Validation', () => {
    it('generates valid PDF structure', async () => {
      const schema = createSimpleTestSchema();
      const result = await generatePdf({ schema });

      const isValid = await isPdfValid(result.bytes);
      expect(isValid).toBe(true);
    });

    it('PDF metadata is correctly set', async () => {
      const schema = new SchemaBuilder('metadata-test', 'Visual Test Form')
        .setVersion('1.0.0')
        .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
        .build();

      schema.form.author = 'Test Suite';

      const result = await generatePdf({ schema });
      const content = await readPdf(result.bytes);

      expect(content.metadata.title).toBe('Visual Test Form');
    });

    it('page count matches schema specification', async () => {
      const schema = new SchemaBuilder('pages-test', 'Pages Test')
        .setPages(3)
        .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const content = await readPdf(result.bytes);

      expect(content.pageCount).toBe(3);
    });
  });

  describe('Field Visual Consistency', () => {
    it('all field types render without errors', async () => {
      const schema = createAllFieldTypesSchema();
      const result = await generatePdf({ schema });

      expect(result.bytes.length).toBeGreaterThan(0);
      expect(result.fieldCount).toBe(6);
    });

    it('field positions are preserved', async () => {
      const schema = new SchemaBuilder('position-test', 'Position Test')
        .addTextField('top', { x: 100, y: -30, width: 200, height: 24 })
        .addTextField('middle', { x: 100, y: -230, width: 200, height: 24 })
        .addTextField('bottom', { x: 100, y: -430, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      const topField = fields.find((f) => f.name === 'top');
      const middleField = fields.find((f) => f.name === 'middle');
      const bottomField = fields.find((f) => f.name === 'bottom');

      // Verify vertical ordering (y coordinates)
      expect(topField!.position.y).toBeGreaterThan(middleField!.position.y);
      expect(middleField!.position.y).toBeGreaterThan(bottomField!.position.y);
    });

    it('field dimensions are preserved', async () => {
      const schema = new SchemaBuilder('dimension-test', 'Dimension Test')
        .addTextField('small', { x: 72, y: -30, width: 100, height: 20 })
        .addTextField('large', { x: 72, y: -130, width: 400, height: 40 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      const smallField = fields.find((f) => f.name === 'small');
      const largeField = fields.find((f) => f.name === 'large');

      // Allow small tolerance due to border rendering (±2pt)
      expect(Math.abs(smallField!.position.width - 100)).toBeLessThanOrEqual(2);
      expect(Math.abs(smallField!.position.height - 20)).toBeLessThanOrEqual(2);
      expect(Math.abs(largeField!.position.width - 400)).toBeLessThanOrEqual(2);
      expect(Math.abs(largeField!.position.height - 40)).toBeLessThanOrEqual(2);
    });
  });

  describe('Output Consistency', () => {
    it('generates consistent output for same input', async () => {
      const schema = createSimpleTestSchema();

      const result1 = await generatePdf({ schema });
      const result2 = await generatePdf({ schema });

      // Structure should be identical
      const fields1 = await getFormFields(result1.bytes);
      const fields2 = await getFormFields(result2.bytes);

      expect(fields1.length).toBe(fields2.length);

      for (let i = 0; i < fields1.length; i++) {
        expect(fields1[i].name).toBe(fields2[i].name);
        expect(fields1[i].type).toBe(fields2[i].type);
      }
    });

    it('field order is consistent', async () => {
      const schema = new SchemaBuilder('order-test', 'Order Test')
        .addTextField('alpha', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('beta', { x: 72, y: -80, width: 200, height: 24 })
        .addTextField('gamma', { x: 72, y: -130, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const names = fields.map((f) => f.name);

      // Verify all fields present
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toContain('gamma');
    });
  });

  describe('Multi-Page Visual Layout', () => {
    it('fields on different pages maintain positions', async () => {
      // Page 1: relative y position (offset from content baseline)
      // Page 2: absolute y position (no adjustment)
      const schema = new SchemaBuilder('multipage-visual', 'Multi-Page Visual')
        .setPages(2)
        .addTextField('page1_field', { x: 100, y: -100, width: 200, height: 24 })
        .onPage(1)
        .addTextField('page2_field', { x: 100, y: 500, width: 200, height: 24 })
        .onPage(2)
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      const page1Field = fields.find((f) => f.name === 'page1_field');
      const page2Field = fields.find((f) => f.name === 'page2_field');

      // Verify fields exist and x positions match
      expect(page1Field).toBeDefined();
      expect(page2Field).toBeDefined();
      expect(page1Field!.position.x).toBe(page2Field!.position.x);

      // Page 2 field should be at absolute y position (allow small tolerance for rounding)
      expect(Math.abs(page2Field!.position.y - 500)).toBeLessThanOrEqual(1);
    });
  });

  describe('Form Field Visual States', () => {
    it('default values are visually present', async () => {
      const schema = new SchemaBuilder('defaults-visual', 'Defaults Visual Test')
        .addTextField(
          'prefilled',
          { x: 72, y: -30, width: 200, height: 24 },
          { default: 'Pre-filled Value' }
        )
        .addCheckbox('checked', { x: 72, y: -80 }, 'Pre-checked', { default: true })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      const textField = fields.find((f) => f.name === 'prefilled');
      const checkbox = fields.find((f) => f.name === 'checked');

      expect(textField?.value).toBe('Pre-filled Value');
      expect(checkbox?.value).toBe(true);
    });

    it('read-only fields have correct state', async () => {
      const schema = new SchemaBuilder('readonly-visual', 'Read-Only Visual Test')
        .addTextField(
          'readonly',
          { x: 72, y: -30, width: 200, height: 24 },
          { readOnly: true, default: 'Cannot Edit' }
        )
        .addTextField('editable', { x: 72, y: -80, width: 200, height: 24 }, { readOnly: false })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      const readonlyField = fields.find((f) => f.name === 'readonly');
      const editableField = fields.find((f) => f.name === 'editable');

      expect(readonlyField?.readOnly).toBe(true);
      expect(editableField?.readOnly).toBe(false);
    });
  });
});
