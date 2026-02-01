/**
 * Textarea Field Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  createTextareaField,
  drawTextareaLabel,
} from '../../../src/generators/pdf/fields/textarea.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { NormalizedFormField } from '../../../src/types/schema.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Textarea Field Generator', () => {
  let doc: PDFDocument;
  let page: ReturnType<PDFDocument['addPage']>;
  let stylesheet: ResolvedStylesheet;

  beforeEach(async () => {
    doc = await PDFDocument.create();
    page = doc.addPage([612, 792]);
    stylesheet = getDefaultStylesheet();
  });

  it('creates textarea field with correct name', async () => {
    const field: NormalizedFormField = {
      name: 'test_textarea',
      type: 'textarea',
      label: 'Test Textarea',
      page: 1,
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);

    expect(textarea).toBeDefined();
    expect(textarea.getName()).toBe('test_textarea');
  });

  it('textarea is multiline by default', async () => {
    const field: NormalizedFormField = {
      name: 'multiline_textarea',
      type: 'textarea',
      label: 'Multiline Textarea',
      page: 1,
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);

    expect(textarea.isMultiline()).toBe(true);
  });

  it('applies maxLength constraint', async () => {
    const field: NormalizedFormField = {
      name: 'limited_textarea',
      type: 'textarea',
      label: 'Limited Textarea',
      page: 1,
      maxLength: 500,
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);

    expect(textarea.getMaxLength()).toBe(500);
  });

  it('sets default value when provided', async () => {
    const field: NormalizedFormField = {
      name: 'default_textarea',
      type: 'textarea',
      label: 'Default Textarea',
      page: 1,
      default: 'This is default text\nWith multiple lines',
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);

    expect(textarea.getText()).toBe('This is default text\nWith multiple lines');
  });

  it('marks textarea as read-only when specified', async () => {
    const field: NormalizedFormField = {
      name: 'readonly_textarea',
      type: 'textarea',
      label: 'Read Only',
      page: 1,
      readOnly: true,
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);

    expect(textarea.isReadOnly()).toBe(true);
  });

  it('uses default dimensions when not specified', async () => {
    const field: NormalizedFormField = {
      name: 'default_size_textarea',
      type: 'textarea',
      label: 'Default Size',
      page: 1,
      position: { x: 72, y: 500 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);

    expect(textarea).toBeDefined();
  });

  it('draws label above textarea', async () => {
    const field: NormalizedFormField = {
      name: 'labeled_textarea',
      type: 'textarea',
      label: 'My Textarea Label',
      page: 1,
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    await expect(drawTextareaLabel(doc, page, field, stylesheet)).resolves.not.toThrow();
  });

  it('accepts multiline text input', async () => {
    const field: NormalizedFormField = {
      name: 'input_textarea',
      type: 'textarea',
      label: 'Input Textarea',
      page: 1,
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);
    const multilineText = 'Line 1\nLine 2\nLine 3';

    textarea.setText(multilineText);

    expect(textarea.getText()).toBe(multilineText);
  });

  it('generates valid PDF with textarea', async () => {
    const field: NormalizedFormField = {
      name: 'pdf_textarea',
      type: 'textarea',
      label: 'PDF Textarea',
      page: 1,
      position: { x: 72, y: 500, width: 400, height: 100 },
    };

    createTextareaField(doc, page, field, stylesheet);
    const pdfBytes = await doc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('handles large text content', async () => {
    const field: NormalizedFormField = {
      name: 'large_textarea',
      type: 'textarea',
      label: 'Large Textarea',
      page: 1,
      position: { x: 72, y: 300, width: 468, height: 200 },
    };

    const textarea = createTextareaField(doc, page, field, stylesheet);
    const largeText = 'Lorem ipsum dolor sit amet. '.repeat(50);

    textarea.setText(largeText);

    expect(textarea.getText()).toBe(largeText);
  });

  it('creates multiple textareas without conflicts', async () => {
    const fields: NormalizedFormField[] = [
      {
        name: 'ta_1',
        type: 'textarea',
        label: 'Textarea 1',
        page: 1,
        position: { x: 72, y: 600, width: 400, height: 80 },
      },
      {
        name: 'ta_2',
        type: 'textarea',
        label: 'Textarea 2',
        page: 1,
        position: { x: 72, y: 400, width: 400, height: 80 },
      },
    ];

    for (const field of fields) {
      createTextareaField(doc, page, field, stylesheet);
    }

    const form = doc.getForm();
    expect(form.getFields().length).toBe(2);
  });
});
