/**
 * AcroForm Validation Tests
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import {
  getFormFields,
  isFieldFillable,
  fillAndExtract,
  verifyFieldsExist,
} from '../helpers/acroform-inspector.js';
import { SchemaBuilder, createAllFieldTypesSchema } from '../helpers/schema-builder.js';

describe('AcroForm Validation', () => {
  it('all fields are fillable by default', async () => {
    const schema = createAllFieldTypesSchema();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    for (const field of fields) {
      const fillable = await isFieldFillable(result.bytes, field.name);
      expect(fillable).toBe(true);
    }
  });

  it('read-only fields are not fillable', async () => {
    const schema = new SchemaBuilder('readonly-test', 'Read-Only Test')
      .addTextField('readonly_field', { x: 72, y: 700, width: 200, height: 24 }, { readOnly: true })
      .build();

    const result = await generatePdf({ schema });
    const fillable = await isFieldFillable(result.bytes, 'readonly_field');

    expect(fillable).toBe(false);
  });

  it('dropdown fields have correct options', async () => {
    const options = ['Apple', 'Banana', 'Cherry', 'Date'];

    const schema = new SchemaBuilder('dropdown-options', 'Dropdown Options Test')
      .addDropdown('fruit', { x: 72, y: 700, width: 200, height: 24 }, options)
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);
    const dropdown = fields.find((f) => f.name === 'fruit');

    expect(dropdown?.options).toEqual(options);
  });

  it('radio groups have correct options', async () => {
    const schema = new SchemaBuilder('radio-options', 'Radio Options Test')
      .addRadioGroup('choice', { x: 72, y: 700 }, [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
        { value: 'c', label: 'Option C' },
      ])
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);
    const radio = fields.find((f) => f.name === 'choice');

    expect(radio?.options).toContain('a');
    expect(radio?.options).toContain('b');
    expect(radio?.options).toContain('c');
  });

  it('text fields accept and retain values', async () => {
    const schema = new SchemaBuilder('text-values', 'Text Values Test')
      .addTextField('name', { x: 72, y: 700, width: 200, height: 24 })
      .addTextField('email', { x: 72, y: 650, width: 200, height: 24 })
      .addTextField('phone', { x: 72, y: 600, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });

    const filled = await fillAndExtract(result.bytes, {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '555-1234',
    });

    const fields = await getFormFields(filled);

    expect(fields.find((f) => f.name === 'name')?.value).toBe('John Doe');
    expect(fields.find((f) => f.name === 'email')?.value).toBe('john@example.com');
    expect(fields.find((f) => f.name === 'phone')?.value).toBe('555-1234');
  });

  it('checkbox fields can be checked', async () => {
    const schema = new SchemaBuilder('checkbox-check', 'Checkbox Test')
      .addCheckbox('agree', { x: 72, y: 700 }, 'I agree')
      .build();

    const result = await generatePdf({ schema });

    const filled = await fillAndExtract(result.bytes, {
      agree: true,
    });

    const fields = await getFormFields(filled);
    expect(fields.find((f) => f.name === 'agree')?.value).toBe(true);
  });

  it('checkbox fields can be unchecked', async () => {
    const schema = new SchemaBuilder('checkbox-uncheck', 'Checkbox Uncheck Test')
      .addCheckbox('agree', { x: 72, y: 700 }, 'I agree', { default: true })
      .build();

    const result = await generatePdf({ schema });

    const filled = await fillAndExtract(result.bytes, {
      agree: false,
    });

    const fields = await getFormFields(filled);
    expect(fields.find((f) => f.name === 'agree')?.value).toBe(false);
  });

  it('dropdown selection can be changed', async () => {
    const schema = new SchemaBuilder('dropdown-select', 'Dropdown Select Test')
      .addDropdown('color', { x: 72, y: 700, width: 200, height: 24 }, ['Red', 'Green', 'Blue'])
      .build();

    const result = await generatePdf({ schema });

    const filled = await fillAndExtract(result.bytes, {
      color: 'Green',
    });

    const fields = await getFormFields(filled);
    expect(fields.find((f) => f.name === 'color')?.value).toBe('Green');
  });

  it('radio selection can be changed', async () => {
    const schema = new SchemaBuilder('radio-select', 'Radio Select Test')
      .addRadioGroup('size', { x: 72, y: 700 }, [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
      ])
      .build();

    const result = await generatePdf({ schema });

    const filled = await fillAndExtract(result.bytes, {
      size: 'medium',
    });

    const fields = await getFormFields(filled);
    expect(fields.find((f) => f.name === 'size')?.value).toBe('medium');
  });

  it('verifies all expected fields exist', async () => {
    const schema = new SchemaBuilder('verify-fields', 'Verify Fields Test')
      .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
      .addTextField('field2', { x: 72, y: 650, width: 200, height: 24 })
      .addCheckbox('field3', { x: 72, y: 600 }, 'Checkbox')
      .build();

    const result = await generatePdf({ schema });
    const verification = await verifyFieldsExist(result.bytes, ['field1', 'field2', 'field3']);

    expect(verification.found).toHaveLength(3);
    expect(verification.missing).toHaveLength(0);
  });

  it('detects missing fields', async () => {
    const schema = new SchemaBuilder('missing-fields', 'Missing Fields Test')
      .addTextField('existing', { x: 72, y: 700, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });
    const verification = await verifyFieldsExist(result.bytes, [
      'existing',
      'nonexistent',
      'also_missing',
    ]);

    expect(verification.found).toContain('existing');
    expect(verification.missing).toContain('nonexistent');
    expect(verification.missing).toContain('also_missing');
  });

  it('field max length is enforced', async () => {
    const schema = new SchemaBuilder('max-length', 'Max Length Test')
      .addTextField('limited', { x: 72, y: 700, width: 200, height: 24 }, { maxLength: 10 })
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);
    const limitedField = fields.find((f) => f.name === 'limited');

    expect(limitedField?.maxLength).toBe(10);
  });

  it('multiline fields are marked correctly', async () => {
    const schema = new SchemaBuilder('multiline', 'Multiline Test')
      .addTextarea('comments', { x: 72, y: 500, width: 400, height: 100 })
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);
    const textarea = fields.find((f) => f.name === 'comments');

    expect(textarea?.multiline).toBe(true);
  });

  it('filled PDF can be saved and reloaded', async () => {
    const schema = new SchemaBuilder('save-reload', 'Save and Reload Test')
      .addTextField('name', { x: 72, y: 700, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });

    // Fill the form
    const filled = await fillAndExtract(result.bytes, {
      name: 'Test User',
    });

    // Reload and verify
    const reloadedFields = await getFormFields(filled);
    expect(reloadedFields.find((f) => f.name === 'name')?.value).toBe('Test User');
  });
});
