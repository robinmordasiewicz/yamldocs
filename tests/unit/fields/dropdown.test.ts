/**
 * Dropdown Field Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  createDropdownField,
  drawDropdownLabel,
} from '../../../src/generators/pdf/fields/dropdown.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { NormalizedFormField } from '../../../src/types/schema.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Dropdown Field Generator', () => {
  let doc: PDFDocument;
  let page: ReturnType<PDFDocument['addPage']>;
  let stylesheet: ResolvedStylesheet;

  beforeEach(async () => {
    doc = await PDFDocument.create();
    page = doc.addPage([612, 792]);
    stylesheet = getDefaultStylesheet();
  });

  const sampleOptions = [
    { value: 'choice_a', label: 'Choice A' },
    { value: 'choice_b', label: 'Choice B' },
    { value: 'choice_c', label: 'Choice C' },
  ];

  it('creates dropdown field with correct name', async () => {
    const field: NormalizedFormField = {
      name: 'test_dropdown',
      type: 'dropdown',
      label: 'Test Dropdown',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);

    expect(dropdown).toBeDefined();
    expect(dropdown.getName()).toBe('test_dropdown');
  });

  it('populates dropdown with all options', async () => {
    const field: NormalizedFormField = {
      name: 'options_dropdown',
      type: 'dropdown',
      label: 'Options Dropdown',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);
    const options = dropdown.getOptions();

    expect(options).toHaveLength(3);
    expect(options).toContain('Choice A');
    expect(options).toContain('Choice B');
    expect(options).toContain('Choice C');
  });

  it('sets default selection when specified by label', async () => {
    const field: NormalizedFormField = {
      name: 'default_dropdown',
      type: 'dropdown',
      label: 'Default Dropdown',
      page: 1,
      options: sampleOptions,
      default: 'choice_b',
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);
    const selected = dropdown.getSelected();

    expect(selected).toContain('Choice B');
  });

  it('marks dropdown as read-only when specified', async () => {
    const field: NormalizedFormField = {
      name: 'readonly_dropdown',
      type: 'dropdown',
      label: 'Read Only',
      page: 1,
      options: sampleOptions,
      readOnly: true,
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);

    expect(dropdown.isReadOnly()).toBe(true);
  });

  it('allows selection to be changed', async () => {
    const field: NormalizedFormField = {
      name: 'selectable_dropdown',
      type: 'dropdown',
      label: 'Selectable',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);

    dropdown.select('Choice A');
    expect(dropdown.getSelected()).toContain('Choice A');

    dropdown.select('Choice C');
    expect(dropdown.getSelected()).toContain('Choice C');
  });

  it('uses default dimensions when not specified', async () => {
    const field: NormalizedFormField = {
      name: 'default_size_dropdown',
      type: 'dropdown',
      label: 'Default Size',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);

    expect(dropdown).toBeDefined();
  });

  it('draws label above dropdown', async () => {
    const field: NormalizedFormField = {
      name: 'labeled_dropdown',
      type: 'dropdown',
      label: 'My Dropdown Label',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    await expect(drawDropdownLabel(doc, page, field, stylesheet)).resolves.not.toThrow();
  });

  it('generates valid PDF with dropdown', async () => {
    const field: NormalizedFormField = {
      name: 'pdf_dropdown',
      type: 'dropdown',
      label: 'PDF Dropdown',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    await createDropdownField(doc, page, field, stylesheet);
    const pdfBytes = await doc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('handles empty options array', async () => {
    const field: NormalizedFormField = {
      name: 'empty_dropdown',
      type: 'dropdown',
      label: 'Empty Dropdown',
      page: 1,
      options: [],
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);

    expect(dropdown.getOptions()).toHaveLength(0);
  });

  it('handles many options', async () => {
    const manyOptions = Array.from({ length: 20 }, (_, i) => ({
      value: `option_${i}`,
      label: `Option ${i + 1}`,
    }));

    const field: NormalizedFormField = {
      name: 'many_options_dropdown',
      type: 'dropdown',
      label: 'Many Options',
      page: 1,
      options: manyOptions,
      position: { x: 72, y: 700, width: 150, height: 24 },
    };

    const dropdown = await createDropdownField(doc, page, field, stylesheet);

    expect(dropdown.getOptions()).toHaveLength(20);
  });

  it('creates multiple dropdowns without conflicts', async () => {
    const fields: NormalizedFormField[] = [
      {
        name: 'dd_1',
        type: 'dropdown',
        label: 'Dropdown 1',
        page: 1,
        options: sampleOptions,
        position: { x: 72, y: 700, width: 150, height: 24 },
      },
      {
        name: 'dd_2',
        type: 'dropdown',
        label: 'Dropdown 2',
        page: 1,
        options: sampleOptions,
        position: { x: 72, y: 650, width: 150, height: 24 },
      },
    ];

    for (const field of fields) {
      await createDropdownField(doc, page, field, stylesheet);
    }

    const form = doc.getForm();
    expect(form.getFields().length).toBe(2);
  });
});
