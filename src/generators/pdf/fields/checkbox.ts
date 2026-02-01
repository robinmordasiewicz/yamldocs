/**
 * Checkbox Field Generator
 * Creates AcroForm checkbox fields
 */

import { PDFDocument, PDFPage, PDFCheckBox } from 'pdf-lib';
import type { NormalizedFormField } from '../../../types/index.js';
import type { ResolvedStylesheet } from '../../../types/stylesheet.js';
import { hexToRgb } from '../utils.js';
import { getFontName } from '../layout.js';

/**
 * Create a checkbox field
 */
export function createCheckboxField(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): PDFCheckBox {
  const form = doc.getForm();
  const style = stylesheet.fields.checkbox;

  // Create the checkbox field
  const checkbox = form.createCheckBox(field.name);

  // Set position and size - use stylesheet size if not specified
  const size = field.position.width ?? style.size;

  checkbox.addToPage(page, {
    x: field.position.x,
    y: field.position.y,
    width: size,
    height: size,
    borderWidth: style.borderWidth,
    borderColor: field.borderColor ? hexToRgb(field.borderColor) : hexToRgb(style.borderColor),
    backgroundColor: field.backgroundColor
      ? hexToRgb(field.backgroundColor)
      : hexToRgb(style.backgroundColor),
  });

  // Set default value if specified
  if (field.default === true) {
    checkbox.check();
  }

  // Set read-only if specified
  if (field.readOnly) {
    checkbox.enableReadOnly();
  }

  return checkbox;
}

/**
 * Draw checkbox label to the right of the checkbox
 */
export async function drawCheckboxLabel(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): Promise<void> {
  const labelStyle = stylesheet.fields.label;
  const checkboxStyle = stylesheet.fields.checkbox;
  const font = await doc.embedFont(getFontName(labelStyle.fontFamily));
  const fontSize = labelStyle.fontSize;
  const size = field.position.width ?? checkboxStyle.size;
  const offsetX = size + labelStyle.marginBottom; // Use marginBottom as horizontal spacing too

  let labelText = field.label;
  if (field.required) {
    labelText += ' *';
  }

  // Position label to the right of checkbox, vertically centered
  page.drawText(labelText, {
    x: field.position.x + offsetX,
    y: field.position.y + size / 2 - fontSize / 2,
    size: fontSize,
    font,
    color: hexToRgb(labelStyle.color),
  });
}
