/**
 * Radio Button Field Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  createRadioGroup,
  drawRadioGroupLabels,
} from '../../../src/generators/pdf/fields/radio.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { NormalizedFormField } from '../../../src/types/schema.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Radio Button Field Generator', () => {
  let doc: PDFDocument;
  let page: ReturnType<PDFDocument['addPage']>;
  let stylesheet: ResolvedStylesheet;

  beforeEach(async () => {
    doc = await PDFDocument.create();
    page = doc.addPage([612, 792]);
    stylesheet = getDefaultStylesheet();
  });

  const sampleOptions = [
    { value: 'option_a', label: 'Option A' },
    { value: 'option_b', label: 'Option B' },
    { value: 'option_c', label: 'Option C' },
  ];

  it('creates radio group with correct name', async () => {
    const field: NormalizedFormField = {
      name: 'test_radio',
      type: 'radio',
      label: 'Test Radio',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);

    expect(radioGroup).toBeDefined();
    expect(radioGroup.getName()).toBe('test_radio');
  });

  it('creates all options in the radio group', async () => {
    const field: NormalizedFormField = {
      name: 'multi_option_radio',
      type: 'radio',
      label: 'Multi Option',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);
    const options = radioGroup.getOptions();

    expect(options).toHaveLength(3);
    expect(options).toContain('option_a');
    expect(options).toContain('option_b');
    expect(options).toContain('option_c');
  });

  it('sets default selection when specified', async () => {
    const field: NormalizedFormField = {
      name: 'default_radio',
      type: 'radio',
      label: 'Default Radio',
      page: 1,
      options: sampleOptions,
      default: 'option_b',
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);

    expect(radioGroup.getSelected()).toBe('option_b');
  });

  it('no option selected by default when no default specified', async () => {
    const field: NormalizedFormField = {
      name: 'no_default_radio',
      type: 'radio',
      label: 'No Default',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);

    expect(radioGroup.getSelected()).toBeUndefined();
  });

  it('marks radio group as read-only when specified', async () => {
    const field: NormalizedFormField = {
      name: 'readonly_radio',
      type: 'radio',
      label: 'Read Only',
      page: 1,
      options: sampleOptions,
      readOnly: true,
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);

    expect(radioGroup.isReadOnly()).toBe(true);
  });

  it('allows selection change', async () => {
    const field: NormalizedFormField = {
      name: 'selectable_radio',
      type: 'radio',
      label: 'Selectable',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);

    radioGroup.select('option_a');
    expect(radioGroup.getSelected()).toBe('option_a');

    radioGroup.select('option_c');
    expect(radioGroup.getSelected()).toBe('option_c');
  });

  it('draws labels for radio group', async () => {
    const field: NormalizedFormField = {
      name: 'labeled_radio',
      type: 'radio',
      label: 'Labeled Radio Group',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    createRadioGroup(doc, page, field, stylesheet);
    await expect(drawRadioGroupLabels(doc, page, field, stylesheet)).resolves.not.toThrow();
  });

  it('supports horizontal layout', async () => {
    const field: NormalizedFormField = {
      name: 'horizontal_radio',
      type: 'radio',
      label: 'Horizontal',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet, {
      direction: 'horizontal',
    });

    expect(radioGroup).toBeDefined();
    expect(radioGroup.getOptions()).toHaveLength(3);
  });

  it('supports vertical layout', async () => {
    const field: NormalizedFormField = {
      name: 'vertical_radio',
      type: 'radio',
      label: 'Vertical',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet, {
      direction: 'vertical',
    });

    expect(radioGroup).toBeDefined();
    expect(radioGroup.getOptions()).toHaveLength(3);
  });

  it('generates valid PDF with radio group', async () => {
    const field: NormalizedFormField = {
      name: 'pdf_radio',
      type: 'radio',
      label: 'PDF Radio',
      page: 1,
      options: sampleOptions,
      position: { x: 72, y: 700 },
    };

    createRadioGroup(doc, page, field, stylesheet);
    const pdfBytes = await doc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('handles empty options array', async () => {
    const field: NormalizedFormField = {
      name: 'empty_radio',
      type: 'radio',
      label: 'Empty Radio',
      page: 1,
      options: [],
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);

    expect(radioGroup.getOptions()).toHaveLength(0);
  });

  it('handles single option', async () => {
    const field: NormalizedFormField = {
      name: 'single_radio',
      type: 'radio',
      label: 'Single Option',
      page: 1,
      options: [{ value: 'only', label: 'Only Option' }],
      position: { x: 72, y: 700 },
    };

    const radioGroup = createRadioGroup(doc, page, field, stylesheet);

    expect(radioGroup.getOptions()).toHaveLength(1);
  });
});
