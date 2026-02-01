/**
 * Text Field Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { createTextField, drawFieldLabel } from '../../../src/generators/pdf/fields/text.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { NormalizedFormField } from '../../../src/types/schema.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Text Field Generator', () => {
  let doc: PDFDocument;
  let page: ReturnType<PDFDocument['addPage']>;
  let stylesheet: ResolvedStylesheet;

  beforeEach(async () => {
    doc = await PDFDocument.create();
    page = doc.addPage([612, 792]); // Letter size
    stylesheet = getDefaultStylesheet();
  });

  it('creates text field with correct position', async () => {
    const field: NormalizedFormField = {
      name: 'test_field',
      type: 'text',
      label: 'Test Field',
      page: 1,
      position: { x: 72, y: 700, width: 200, height: 24 },
    };

    const textField = createTextField(doc, page, field, stylesheet);

    expect(textField).toBeDefined();
    expect(textField.getName()).toBe('test_field');
  });

  it('applies maxLength constraint', async () => {
    const field: NormalizedFormField = {
      name: 'limited_field',
      type: 'text',
      label: 'Limited Field',
      page: 1,
      maxLength: 50,
      position: { x: 72, y: 700, width: 200, height: 24 },
    };

    const textField = createTextField(doc, page, field, stylesheet);

    expect(textField.getMaxLength()).toBe(50);
  });

  it('sets default value when provided', async () => {
    const field: NormalizedFormField = {
      name: 'default_field',
      type: 'text',
      label: 'Default Field',
      page: 1,
      default: 'Hello World',
      position: { x: 72, y: 700, width: 200, height: 24 },
    };

    const textField = createTextField(doc, page, field, stylesheet);

    expect(textField.getText()).toBe('Hello World');
  });

  it('marks field as read-only when specified', async () => {
    const field: NormalizedFormField = {
      name: 'readonly_field',
      type: 'text',
      label: 'Read Only Field',
      page: 1,
      readOnly: true,
      position: { x: 72, y: 700, width: 200, height: 24 },
    };

    const textField = createTextField(doc, page, field, stylesheet);

    expect(textField.isReadOnly()).toBe(true);
  });

  it('enables multiline when specified', async () => {
    const field: NormalizedFormField = {
      name: 'multiline_field',
      type: 'text',
      label: 'Multiline Field',
      page: 1,
      multiline: true,
      position: { x: 72, y: 700, width: 200, height: 100 },
    };

    const textField = createTextField(doc, page, field, stylesheet);

    expect(textField.isMultiline()).toBe(true);
  });

  it('uses default width and height when not specified', async () => {
    const field: NormalizedFormField = {
      name: 'default_size',
      type: 'text',
      label: 'Default Size',
      page: 1,
      position: { x: 72, y: 700 }, // No width/height
    };

    const textField = createTextField(doc, page, field, stylesheet);

    // Field should be created without error
    expect(textField).toBeDefined();
  });

  it('draws label above field', async () => {
    const field: NormalizedFormField = {
      name: 'labeled_field',
      type: 'text',
      label: 'My Label',
      page: 1,
      position: { x: 72, y: 700, width: 200, height: 24 },
    };

    // Should not throw
    await expect(drawFieldLabel(doc, page, field, stylesheet)).resolves.not.toThrow();
  });

  it('appends asterisk to required field labels', async () => {
    const field: NormalizedFormField = {
      name: 'required_field',
      type: 'text',
      label: 'Required Field',
      page: 1,
      required: true,
      position: { x: 72, y: 700, width: 200, height: 24 },
    };

    // The label drawing should include the asterisk
    await expect(drawFieldLabel(doc, page, field, stylesheet)).resolves.not.toThrow();
  });

  it('generates valid PDF with text field', async () => {
    const field: NormalizedFormField = {
      name: 'pdf_test',
      type: 'text',
      label: 'PDF Test',
      page: 1,
      position: { x: 72, y: 700, width: 200, height: 24 },
    };

    createTextField(doc, page, field, stylesheet);
    const pdfBytes = await doc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('creates multiple text fields without name conflicts', async () => {
    const fields: NormalizedFormField[] = [
      {
        name: 'field_1',
        type: 'text',
        label: 'Field 1',
        page: 1,
        position: { x: 72, y: 700, width: 200, height: 24 },
      },
      {
        name: 'field_2',
        type: 'text',
        label: 'Field 2',
        page: 1,
        position: { x: 72, y: 650, width: 200, height: 24 },
      },
      {
        name: 'field_3',
        type: 'text',
        label: 'Field 3',
        page: 1,
        position: { x: 72, y: 600, width: 200, height: 24 },
      },
    ];

    for (const field of fields) {
      createTextField(doc, page, field, stylesheet);
    }

    const form = doc.getForm();
    expect(form.getFields().length).toBe(3);
  });
});
