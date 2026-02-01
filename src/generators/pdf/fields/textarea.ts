/**
 * Textarea Field Generator
 * Creates AcroForm multiline text fields
 */

import { PDFDocument, PDFPage, PDFTextField } from 'pdf-lib';
import type { NormalizedFormField } from '../../../types/index.js';
import type { ResolvedStylesheet } from '../../../types/stylesheet.js';
import { hexToRgb } from '../utils.js';
import { getFontName } from '../layout.js';

/**
 * Create a multiline textarea field
 */
export function createTextareaField(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): PDFTextField {
  const form = doc.getForm();
  const style = stylesheet.fields.textarea;

  // Create the text field
  const textField = form.createTextField(field.name);

  // Set position and size - larger defaults for textareas
  const width = field.position.width ?? 400;
  const height = field.position.height ?? 100;

  textField.addToPage(page, {
    x: field.position.x,
    y: field.position.y,
    width,
    height,
    borderWidth: style.borderWidth,
    borderColor: field.borderColor ? hexToRgb(field.borderColor) : hexToRgb(style.borderColor),
    backgroundColor: field.backgroundColor
      ? hexToRgb(field.backgroundColor)
      : hexToRgb(style.backgroundColor),
  });

  // Enable multiline
  textField.enableMultiline();

  // Configure field properties - use stylesheet default if not specified
  textField.setFontSize(field.fontSize || style.fontSize);

  // Set max length if specified
  if (field.maxLength) {
    textField.setMaxLength(field.maxLength);
  }

  // Set default value if specified
  if (typeof field.default === 'string') {
    textField.setText(field.default);
  }

  // Set read-only if specified
  if (field.readOnly) {
    textField.enableReadOnly();
  }

  return textField;
}

/**
 * Draw textarea label above the field
 */
export async function drawTextareaLabel(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): Promise<void> {
  const labelStyle = stylesheet.fields.label;
  const font = await doc.embedFont(getFontName(labelStyle.fontFamily));
  const fontSize = labelStyle.fontSize;
  const offsetY = (field.position.height || 100) + labelStyle.marginBottom;

  let labelText = field.label;
  if (field.required) {
    labelText += ' *';
  }

  page.drawText(labelText, {
    x: field.position.x,
    y: field.position.y + offsetY,
    size: fontSize,
    font,
    color: hexToRgb(labelStyle.color),
  });
}
