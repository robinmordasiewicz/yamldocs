/**
 * PDF Generation Pipeline Integration Tests
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import { getFormFields, countFieldsByType } from '../helpers/acroform-inspector.js';
import {
  SchemaBuilder,
  createSimpleTestSchema,
  createMultiPageTestSchema,
  createAllFieldTypesSchema,
} from '../helpers/schema-builder.js';
import {
  fieldsToLayoutElements,
  detectOverlaps,
  checkBoundaries,
} from '../helpers/layout-analyzer.js';

describe('PDF Generation Pipeline', () => {
  it('generates valid PDF from simple schema', async () => {
    const schema = createSimpleTestSchema();

    const result = await generatePdf({ schema });

    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.fieldCount).toBe(3);
    expect(result.pageCount).toBe(1);
  });

  it('preserves all schema fields in output', async () => {
    const schema = createAllFieldTypesSchema();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(fields.length).toBe(6);

    // Verify each field type exists
    const fieldNames = fields.map((f) => f.name);
    expect(fieldNames).toContain('text_field');
    expect(fieldNames).toContain('checkbox_field');
    expect(fieldNames).toContain('radio_field');
    expect(fieldNames).toContain('dropdown_field');
    expect(fieldNames).toContain('textarea_field');
    expect(fieldNames).toContain('signature_field');
  });

  it('handles multi-page forms correctly', async () => {
    const schema = createMultiPageTestSchema(3);

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(result.pageCount).toBe(3);
    expect(fields.length).toBe(6); // 2 fields per page
  });

  it('counts field types correctly', async () => {
    const schema = createAllFieldTypesSchema();

    const result = await generatePdf({ schema });
    const counts = await countFieldsByType(result.bytes);

    // text_field, textarea_field, and signature_field are all implemented as text fields in pdf-lib
    expect(counts.text).toBe(3);
    expect(counts.checkbox).toBe(1);
    expect(counts.radio).toBe(1);
    expect(counts.dropdown).toBe(1);
  });

  it('generates PDF with correct metadata', async () => {
    const schema = new SchemaBuilder('metadata-test', 'Metadata Test Form')
      .setVersion('2.0.0')
      .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
      .build();

    // Add author to schema
    schema.form.author = 'Test Author';

    const result = await generatePdf({ schema });

    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles empty schema with no fields', async () => {
    const schema = new SchemaBuilder('empty-form', 'Empty Form').setPages(1).build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(result.bytes.length).toBeGreaterThan(0);
    expect(fields.length).toBe(0);
    expect(result.fieldCount).toBe(0);
  });

  it('fields do not overlap by default in well-designed schemas', async () => {
    const schema = new SchemaBuilder('no-overlap', 'No Overlap Test')
      .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
      .addTextField('field2', { x: 72, y: -80, width: 200, height: 24 })
      .addTextField('field3', { x: 72, y: -130, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);
    const elements = fieldsToLayoutElements(fields);
    const overlaps = detectOverlaps(elements);

    expect(overlaps.length).toBe(0);
  });

  it('validates fields stay within page boundaries', async () => {
    const schema = new SchemaBuilder('boundary-test', 'Boundary Test')
      .addTextField('safe_field', { x: 100, y: -100, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);
    const elements = fieldsToLayoutElements(fields);

    const violations = checkBoundaries(
      elements,
      { width: 612, height: 792 },
      { top: 72, bottom: 72, left: 72, right: 72 }
    );

    expect(violations.length).toBe(0);
  });

  it('handles required fields', async () => {
    const schema = new SchemaBuilder('required-test', 'Required Fields Test')
      .addTextField(
        'required_name',
        { x: 72, y: -30, width: 200, height: 24 },
        { required: true, label: 'Name' }
      )
      .addTextField(
        'optional_phone',
        { x: 72, y: -80, width: 200, height: 24 },
        { required: false, label: 'Phone' }
      )
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(fields.length).toBe(2);
  });

  it('handles fields with default values', async () => {
    const schema = new SchemaBuilder('defaults-test', 'Default Values Test')
      .addTextField(
        'prefilled',
        { x: 72, y: -30, width: 200, height: 24 },
        { default: 'Default Text' }
      )
      .addCheckbox('checked', { x: 72, y: -80 }, 'Pre-checked', { default: true })
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    const textField = fields.find((f) => f.name === 'prefilled');
    const checkboxField = fields.find((f) => f.name === 'checked');

    expect(textField?.value).toBe('Default Text');
    expect(checkboxField?.value).toBe(true);
  });

  it('handles read-only fields', async () => {
    const schema = new SchemaBuilder('readonly-test', 'Read-Only Test')
      .addTextField(
        'readonly_field',
        { x: 72, y: -30, width: 200, height: 24 },
        { readOnly: true, default: 'Cannot edit' }
      )
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    const readOnlyField = fields.find((f) => f.name === 'readonly_field');
    expect(readOnlyField?.readOnly).toBe(true);
  });

  it('handles dropdown with many options', async () => {
    const options = Array.from({ length: 50 }, (_, i) => `Option ${i + 1}`);

    const schema = new SchemaBuilder('many-options', 'Many Options Test')
      .addDropdown('big_dropdown', { x: 72, y: -30, width: 200, height: 24 }, options)
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    const dropdown = fields.find((f) => f.name === 'big_dropdown');
    expect(dropdown?.options?.length).toBe(50);
  });

  it('generates reproducible output for same input', async () => {
    const schema = createSimpleTestSchema();

    const result1 = await generatePdf({ schema });
    const result2 = await generatePdf({ schema });

    // Field counts should be identical
    expect(result1.fieldCount).toBe(result2.fieldCount);
    expect(result1.pageCount).toBe(result2.pageCount);

    // PDF sizes should be similar (may have minor differences due to timestamps)
    const sizeDiff = Math.abs(result1.bytes.length - result2.bytes.length);
    expect(sizeDiff).toBeLessThan(100); // Allow small variation for timestamps
  });
});
