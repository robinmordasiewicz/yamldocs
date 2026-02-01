/**
 * Signature Field Generator
 * Creates signature fields (implemented as styled text fields)
 */

import { PDFDocument, PDFPage, PDFTextField } from 'pdf-lib';
import type { NormalizedFormField } from '../../../types/index.js';
import type { ResolvedStylesheet } from '../../../types/stylesheet.js';
import { hexToRgb } from '../utils.js';
import { getFontName } from '../layout.js';

/**
 * Create a signature field
 * Note: True digital signatures require certificates and are complex to implement.
 * This creates a styled text field intended for typed signatures or a placeholder
 * for manual signatures when printed.
 */
export function createSignatureField(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): PDFTextField {
  const form = doc.getForm();
  const style = stylesheet.fields.signature;

  // Create the text field for signature
  const signatureField = form.createTextField(field.name);

  // Set position and size
  const width = field.position.width ?? 200;
  const height = field.position.height ?? 50;

  // Use required styling if field is required
  const borderColor = field.required
    ? style.requiredBorderColor
    : field.borderColor || style.borderColor;
  const borderWidth = field.required ? style.requiredBorderWidth : style.borderWidth;

  signatureField.addToPage(page, {
    x: field.position.x,
    y: field.position.y,
    width,
    height,
    borderWidth,
    borderColor: hexToRgb(borderColor),
    backgroundColor: field.backgroundColor
      ? hexToRgb(field.backgroundColor)
      : hexToRgb(style.backgroundColor),
  });

  // Configure field properties - use stylesheet default if not specified
  signatureField.setFontSize(field.fontSize || style.fontSize);

  // Set read-only if specified
  if (field.readOnly) {
    signatureField.enableReadOnly();
  }

  return signatureField;
}

/**
 * Draw signature field with label and styling
 */
export async function drawSignatureFieldWithLabel(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet,
  options: { includeDate?: boolean; includeLine?: boolean } = {}
): Promise<void> {
  const labelStyle = stylesheet.fields.label;
  const signatureStyle = stylesheet.fields.signature;
  const font = await doc.embedFont(getFontName(labelStyle.fontFamily));
  const height = field.position.height || 50;
  const width = field.position.width || 200;

  // Draw label above the signature field
  let labelText = field.label;
  if (field.required) {
    labelText += ' *';
  }

  page.drawText(labelText, {
    x: field.position.x,
    y: field.position.y + height + labelStyle.marginBottom,
    size: labelStyle.fontSize,
    font,
    color: hexToRgb(labelStyle.color),
  });

  // Draw signature line at the bottom of the field area
  if (options.includeLine !== false) {
    page.drawLine({
      start: { x: field.position.x, y: field.position.y },
      end: { x: field.position.x + width, y: field.position.y },
      thickness: 1,
      color: hexToRgb(signatureStyle.borderColor),
    });
  }

  // Draw "Date" field next to signature if requested
  if (options.includeDate) {
    const dateX = field.position.x + width + 20;
    const dateWidth = 100;

    page.drawText('Date:', {
      x: dateX,
      y: field.position.y + height + labelStyle.marginBottom,
      size: labelStyle.fontSize,
      font,
      color: hexToRgb(labelStyle.color),
    });

    page.drawLine({
      start: { x: dateX, y: field.position.y },
      end: { x: dateX + dateWidth, y: field.position.y },
      thickness: 1,
      color: hexToRgb(signatureStyle.borderColor),
    });
  }
}

/**
 * Draw a "Sign here" indicator
 */
export async function drawSignHereIndicator(
  doc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  stylesheet: ResolvedStylesheet
): Promise<void> {
  const labelStyle = stylesheet.fields.label;
  const font = await doc.embedFont(getFontName(labelStyle.fontFamily));

  // Draw "X" mark
  page.drawText('X', {
    x: x - 15,
    y: y + 15,
    size: 16,
    font,
    color: hexToRgb(stylesheet.admonitions.danger.borderColor), // Use danger color for emphasis
  });

  // Draw "Sign Here" text
  page.drawText('Sign Here', {
    x: x - 15,
    y: y - 12,
    size: 8,
    font,
    color: hexToRgb(labelStyle.color),
  });
}
