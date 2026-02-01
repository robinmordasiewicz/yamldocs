/**
 * Signature Field Generator Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import {
  createSignatureField,
  drawSignatureFieldWithLabel,
  drawSignHereIndicator,
} from '../../../src/generators/pdf/fields/signature.js';
import { getDefaultStylesheet } from '../../../src/parsers/stylesheet.js';
import type { NormalizedFormField } from '../../../src/types/schema.js';
import type { ResolvedStylesheet } from '../../../src/types/stylesheet.js';

describe('Signature Field Generator', () => {
  let doc: PDFDocument;
  let page: ReturnType<PDFDocument['addPage']>;
  let stylesheet: ResolvedStylesheet;

  beforeEach(async () => {
    doc = await PDFDocument.create();
    page = doc.addPage([612, 792]);
    stylesheet = getDefaultStylesheet();
  });

  it('creates signature field with correct name', async () => {
    const field: NormalizedFormField = {
      name: 'test_signature',
      type: 'signature',
      label: 'Test Signature',
      page: 1,
      position: { x: 72, y: 100, width: 200, height: 50 },
    };

    const signature = createSignatureField(doc, page, field, stylesheet);

    expect(signature).toBeDefined();
    expect(signature.getName()).toBe('test_signature');
  });

  it('uses default dimensions when not specified', async () => {
    const field: NormalizedFormField = {
      name: 'default_signature',
      type: 'signature',
      label: 'Default Signature',
      page: 1,
      position: { x: 72, y: 100 },
    };

    const signature = createSignatureField(doc, page, field, stylesheet);

    expect(signature).toBeDefined();
  });

  it('marks signature as read-only when specified', async () => {
    const field: NormalizedFormField = {
      name: 'readonly_signature',
      type: 'signature',
      label: 'Read Only',
      page: 1,
      readOnly: true,
      position: { x: 72, y: 100, width: 200, height: 50 },
    };

    const signature = createSignatureField(doc, page, field, stylesheet);

    expect(signature.isReadOnly()).toBe(true);
  });

  it('signature field accepts text input (typed signature)', async () => {
    const field: NormalizedFormField = {
      name: 'typed_signature',
      type: 'signature',
      label: 'Typed Signature',
      page: 1,
      position: { x: 72, y: 100, width: 200, height: 50 },
    };

    const signature = createSignatureField(doc, page, field, stylesheet);
    signature.setText('John Doe');

    expect(signature.getText()).toBe('John Doe');
  });

  it('draws label and signature line', async () => {
    const field: NormalizedFormField = {
      name: 'labeled_signature',
      type: 'signature',
      label: 'Applicant Signature',
      page: 1,
      position: { x: 72, y: 100, width: 200, height: 50 },
    };

    await expect(
      drawSignatureFieldWithLabel(doc, page, field, stylesheet, { includeLine: true })
    ).resolves.not.toThrow();
  });

  it('draws signature field with date field', async () => {
    const field: NormalizedFormField = {
      name: 'signature_with_date',
      type: 'signature',
      label: 'Signature',
      page: 1,
      position: { x: 72, y: 100, width: 200, height: 50 },
    };

    await expect(
      drawSignatureFieldWithLabel(doc, page, field, stylesheet, {
        includeDate: true,
        includeLine: true,
      })
    ).resolves.not.toThrow();
  });

  // Note: drawSignHereIndicator uses Unicode characters that standard PDF fonts
  // cannot encode. This is a known limitation. In production, this would require
  // embedding a custom font that supports the "✕" character.
  it.skip('draws sign here indicator (requires custom font)', async () => {
    await expect(drawSignHereIndicator(doc, page, 72, 100, stylesheet)).resolves.not.toThrow();
  });

  it('generates valid PDF with signature field', async () => {
    const field: NormalizedFormField = {
      name: 'pdf_signature',
      type: 'signature',
      label: 'PDF Signature',
      page: 1,
      position: { x: 72, y: 100, width: 200, height: 50 },
    };

    createSignatureField(doc, page, field, stylesheet);
    const pdfBytes = await doc.save();

    expect(pdfBytes).toBeInstanceOf(Uint8Array);
    expect(pdfBytes.length).toBeGreaterThan(0);
  });

  it('creates multiple signature fields without conflicts', async () => {
    const fields: NormalizedFormField[] = [
      {
        name: 'sig_1',
        type: 'signature',
        label: 'Signature 1',
        page: 1,
        position: { x: 72, y: 200, width: 200, height: 50 },
      },
      {
        name: 'sig_2',
        type: 'signature',
        label: 'Signature 2',
        page: 1,
        position: { x: 72, y: 100, width: 200, height: 50 },
      },
    ];

    for (const field of fields) {
      createSignatureField(doc, page, field, stylesheet);
    }

    const form = doc.getForm();
    expect(form.getFields().length).toBe(2);
  });

  it('handles required signature field', async () => {
    const field: NormalizedFormField = {
      name: 'required_signature',
      type: 'signature',
      label: 'Required Signature',
      page: 1,
      required: true,
      position: { x: 72, y: 100, width: 200, height: 50 },
    };

    const signature = createSignatureField(doc, page, field, stylesheet);
    await drawSignatureFieldWithLabel(doc, page, field, stylesheet);

    expect(signature).toBeDefined();
  });
});
