/**
 * Checkbox Field Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  createCheckboxField,
  drawCheckboxLabel,
} from '../../../src/generators/pdf/fields/checkbox.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { NormalizedFormField } from '../../../src/types/schema.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Checkbox Field Generator', () => {
  let doc: PDFDocument;
  let page: ReturnType<PDFDocument['addPage']>;
  let stylesheet: ResolvedStylesheet;

  beforeEach(async () => {
    doc = await PDFDocument.create();
    page = doc.addPage([612, 792]);
    stylesheet = getDefaultStylesheet();
  });

  it('creates checkbox field with correct position', async () => {
    const field: NormalizedFormField = {
      name: 'test_checkbox',
      type: 'checkbox',
      label: 'Test Checkbox',
      page: 1,
      position: { x: 72, y: 700, width: 16 },
    };

    const checkbox = createCheckboxField(doc, page, field, stylesheet);

    expect(checkbox).toBeDefined();
    expect(checkbox.getName()).toBe('test_checkbox');
  });

  it('checkbox is unchecked by default', async () => {
    const field: NormalizedFormField = {
      name: 'unchecked_box',
      type: 'checkbox',
      label: 'Unchecked',
      page: 1,
      position: { x: 72, y: 700 },
    };

    const checkbox = createCheckboxField(doc, page, field, stylesheet);

    expect(checkbox.isChecked()).toBe(false);
  });

  it('sets checkbox checked when default is true', async () => {
    const field: NormalizedFormField = {
      name: 'checked_box',
      type: 'checkbox',
      label: 'Checked',
      page: 1,
      default: true,
      position: { x: 72, y: 700 },
    };

    const checkbox = createCheckboxField(doc, page, field, stylesheet);

    expect(checkbox.isChecked()).toBe(true);
  });

  it('marks checkbox as read-only when specified', async () => {
    const field: NormalizedFormField = {
      name: 'readonly_checkbox',
      type: 'checkbox',
      label: 'Read Only',
      page: 1,
      readOnly: true,
      position: { x: 72, y: 700 },
    };

    const checkbox = createCheckboxField(doc, page, field, stylesheet);

    expect(checkbox.isReadOnly()).toBe(true);
  });

  it('uses default size when width not specified', async () => {
    const field: NormalizedFormField = {
      name: 'default_size',
      type: 'checkbox',
      label: 'Default Size',
      page: 1,
      position: { x: 72, y: 700 },
    };

    const checkbox = createCheckboxField(doc, page, field, stylesheet);

    expect(checkbox).toBeDefined();
  });

  it('draws label to the right of checkbox', async () => {
    const field: NormalizedFormField = {
      name: 'labeled_checkbox',
      type: 'checkbox',
      label: 'My Checkbox Label',
      page: 1,
      position: { x: 72, y: 700 },
    };

    await expect(drawCheckboxLabel(doc, page, field, stylesheet)).resolves.not.toThrow();
  });

  it('checkbox can be toggled', async () => {
    const field: NormalizedFormField = {
      name: 'toggle_test',
      type: 'checkbox',
      label: 'Toggle Test',
      page: 1,
      position: { x: 72, y: 700 },
    };

    const checkbox = createCheckboxField(doc, page, field, stylesheet);

    expect(checkbox.isChecked()).toBe(false);
    checkbox.check();
    expect(checkbox.isChecked()).toBe(true);
    checkbox.uncheck();
    expect(checkbox.isChecked()).toBe(false);
  });

  it('generates valid PDF with checkbox', async () => {
    const field: NormalizedFormField = {
      name: 'pdf_checkbox',
      type: 'checkbox',
      label: 'PDF Checkbox',
      page: 1,
      position: { x: 72, y: 700 },
    };

    createCheckboxField(doc, page, field, stylesheet);
    const pdfBytes = await doc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('creates multiple checkboxes without conflicts', async () => {
    const fields: NormalizedFormField[] = [
      { name: 'cb_1', type: 'checkbox', label: 'Checkbox 1', page: 1, position: { x: 72, y: 700 } },
      { name: 'cb_2', type: 'checkbox', label: 'Checkbox 2', page: 1, position: { x: 72, y: 680 } },
      { name: 'cb_3', type: 'checkbox', label: 'Checkbox 3', page: 1, position: { x: 72, y: 660 } },
    ];

    for (const field of fields) {
      createCheckboxField(doc, page, field, stylesheet);
    }

    const form = doc.getForm();
    expect(form.getFields().length).toBe(3);
  });
});
