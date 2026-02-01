/**
 * Text Field Generator
 * Creates AcroForm text input fields
 */

import { PDFDocument, PDFPage, PDFTextField } from 'pdf-lib';
import type { NormalizedFormField } from '../../../types/index.js';
import type { ResolvedStylesheet } from '../../../types/stylesheet.js';
import { hexToRgb } from '../utils.js';
import { getFontName } from '../layout.js';

/**
 * Create a text input field
 */
export function createTextField(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): PDFTextField {
  const form = doc.getForm();
  const style = stylesheet.fields.text;

  // Create the text field
  const textField = form.createTextField(field.name);

  // Set position and size - use stylesheet defaults if not specified
  const width = field.position.width ?? 200;
  const height = field.position.height || style.height;

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

  // Configure field properties - use stylesheet default if not specified
  textField.setFontSize(field.fontSize || style.fontSize);

  // Enable multiline if specified
  if (field.multiline) {
    textField.enableMultiline();
  }

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
 * Create a label for a field
 */
export async function drawFieldLabel(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): Promise<void> {
  const style = stylesheet.fields.label;
  const font = await doc.embedFont(getFontName(style.fontFamily));
  const fontSize = style.fontSize;
  const offsetY = (field.position.height || stylesheet.fields.text.height) + style.marginBottom;

  let labelText = field.label;
  if (field.required) {
    labelText += ' *';
  }

  page.drawText(labelText, {
    x: field.position.x,
    y: field.position.y + offsetY,
    size: fontSize,
    font,
    color: hexToRgb(style.color),
  });
}
