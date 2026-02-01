/**
 * AcroForm Inspector Helper
 * Inspect and validate AcroForm fields in PDF
 */

import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
  PDFField,
} from 'pdf-lib';

export type AcroFieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'signature' | 'unknown';

export interface AcroFormField {
  name: string;
  type: AcroFieldType;
  page: number;
  position: { x: number; y: number; width: number; height: number };
  value?: string | boolean;
  options?: string[];
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  multiline?: boolean;
}

/**
 * Get all form fields from a PDF
 */
export async function getFormFields(pdfBytes: Uint8Array): Promise<AcroFormField[]> {
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();
  const fields = form.getFields();
  const result: AcroFormField[] = [];

  for (const field of fields) {
    const acroField = inspectField(field, doc);
    if (acroField) {
      result.push(acroField);
    }
  }

  return result;
}

/**
 * Inspect a single PDF field
 */
function inspectField(field: PDFField, doc: PDFDocument): AcroFormField | null {
  const name = field.getName();
  const widgets = field.acroField.getWidgets();

  if (widgets.length === 0) return null;

  // Get position from first widget
  const widget = widgets[0];
  const rect = widget.getRectangle();

  // Determine page number from widget's P entry (page reference)
  let pageNumber = 1;
  const pages = doc.getPages();
  const pRef = widget.P();
  if (pRef) {
    for (let i = 0; i < pages.length; i++) {
      if (pages[i].ref === pRef) {
        pageNumber = i + 1; // 1-indexed
        break;
      }
    }
  }

  const baseField: AcroFormField = {
    name,
    type: 'unknown',
    page: pageNumber,
    position: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    },
    readOnly: field.isReadOnly(),
  };

  if (field instanceof PDFTextField) {
    return {
      ...baseField,
      type: field.isMultiline() ? 'text' : 'text',
      value: field.getText() || undefined,
      maxLength: field.getMaxLength(),
      multiline: field.isMultiline(),
    };
  }

  if (field instanceof PDFCheckBox) {
    return {
      ...baseField,
      type: 'checkbox',
      value: field.isChecked(),
    };
  }

  if (field instanceof PDFDropdown) {
    return {
      ...baseField,
      type: 'dropdown',
      value: field.getSelected()[0] || undefined,
      options: field.getOptions(),
    };
  }

  if (field instanceof PDFRadioGroup) {
    return {
      ...baseField,
      type: 'radio',
      value: field.getSelected() || undefined,
      options: field.getOptions(),
    };
  }

  return baseField;
}

/**
 * Check if a field is fillable
 */
export async function isFieldFillable(pdfBytes: Uint8Array, fieldName: string): Promise<boolean> {
  try {
    const doc = await PDFDocument.load(pdfBytes);
    const form = doc.getForm();
    const field = form.getField(fieldName);
    return field !== undefined && !field.isReadOnly();
  } catch {
    return false;
  }
}

/**
 * Get a specific field by name
 */
export async function getFieldByName(
  pdfBytes: Uint8Array,
  fieldName: string
): Promise<AcroFormField | null> {
  const fields = await getFormFields(pdfBytes);
  return fields.find((f) => f.name === fieldName) || null;
}

/**
 * Fill form fields and return updated PDF
 */
export async function fillAndExtract(
  pdfBytes: Uint8Array,
  values: Record<string, string | boolean>
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const form = doc.getForm();

  for (const [fieldName, value] of Object.entries(values)) {
    try {
      const field = form.getField(fieldName);

      if (field instanceof PDFTextField && typeof value === 'string') {
        field.setText(value);
      } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
        if (value) field.check();
        else field.uncheck();
      } else if (field instanceof PDFDropdown && typeof value === 'string') {
        field.select(value);
      } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
        field.select(value);
      }
    } catch (err) {
      // Field might not exist or have wrong type
      console.warn(`Could not fill field ${fieldName}:`, err);
    }
  }

  return doc.save();
}

/**
 * Count fields by type
 */
export async function countFieldsByType(
  pdfBytes: Uint8Array
): Promise<Record<AcroFieldType, number>> {
  const fields = await getFormFields(pdfBytes);
  const counts: Record<AcroFieldType, number> = {
    text: 0,
    checkbox: 0,
    radio: 0,
    dropdown: 0,
    signature: 0,
    unknown: 0,
  };

  for (const field of fields) {
    counts[field.type]++;
  }

  return counts;
}

/**
 * Verify all expected fields exist
 */
export async function verifyFieldsExist(
  pdfBytes: Uint8Array,
  expectedFieldNames: string[]
): Promise<{ found: string[]; missing: string[] }> {
  const fields = await getFormFields(pdfBytes);
  const existingNames = new Set(fields.map((f) => f.name));

  const found: string[] = [];
  const missing: string[] = [];

  for (const name of expectedFieldNames) {
    if (existingNames.has(name)) {
      found.push(name);
    } else {
      missing.push(name);
    }
  }

  return { found, missing };
}
