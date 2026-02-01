/**
 * Dropdown Field Generator
 * Creates AcroForm dropdown/select fields
 */

import { PDFDocument, PDFPage, PDFDropdown, rgb } from 'pdf-lib';
import type { NormalizedFormField } from '../../../types/index.js';
import type { ResolvedStylesheet } from '../../../types/stylesheet.js';
import { hexToRgb } from '../utils.js';
import { getFontName } from '../layout.js';

/**
 * Draw a dropdown text indicator on the page
 * This provides a visual cue that the field is a dropdown, since PDF viewers
 * typically only show the dropdown arrow when the field is focused.
 *
 * Note: Uses "(select)" text instead of an arrow to avoid duplicate arrows
 * when the PDF viewer shows its own dropdown indicator on click.
 */
export async function drawDropdownIndicator(
  doc: PDFDocument,
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  stylesheet: ResolvedStylesheet
): Promise<void> {
  const labelStyle = stylesheet.fields.label;
  const font = await doc.embedFont(getFontName(labelStyle.fontFamily));

  // Use a smaller font size for the indicator
  const fontSize = Math.max(8, Math.min(10, labelStyle.fontSize - 2));
  const gap = 4; // Gap between field and indicator

  // Position text just outside the right edge of the dropdown, vertically centered
  const textX = x + width + gap;
  // Adjust Y to vertically center the text (account for font baseline)
  const textY = y + (height - fontSize) / 2 + 2;

  // Use a muted gray color for the indicator
  const textColor = rgb(0.5, 0.5, 0.5);

  page.drawText('(select)', {
    x: textX,
    y: textY,
    size: fontSize,
    font,
    color: textColor,
  });
}

/**
 * Create a dropdown select field
 */
export async function createDropdownField(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): Promise<PDFDropdown> {
  const form = doc.getForm();
  const style = stylesheet.fields.dropdown;

  // Create the dropdown field
  const dropdown = form.createDropdown(field.name);

  // Set position and size - use stylesheet defaults if not specified
  const width = field.position.width ?? 150;
  const height = field.position.height || style.height;

  dropdown.addToPage(page, {
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

  // Add options
  const options = field.options || [];
  const optionLabels = options.map((opt) => opt.label);
  dropdown.addOptions(optionLabels);

  // Set default value if specified
  if (typeof field.default === 'string') {
    const defaultOption = options.find(
      (opt) => opt.value === field.default || opt.label === field.default
    );
    if (defaultOption) {
      dropdown.select(defaultOption.label);
    }
  }

  // Set read-only if specified
  if (field.readOnly) {
    dropdown.enableReadOnly();
  }

  // Configure font size - use stylesheet default if not specified
  dropdown.setFontSize(field.fontSize || style.fontSize);

  // Draw visual dropdown "(select)" indicator
  await drawDropdownIndicator(
    doc,
    page,
    field.position.x,
    field.position.y,
    width,
    height,
    stylesheet
  );

  return dropdown;
}

/**
 * Draw dropdown label
 * Supports four positions:
 * - 'left' (default): Label appears to the left of the field, vertically centered
 * - 'right': Label appears to the right of the field, vertically centered
 * - 'above': Label appears above the field
 * - 'none': Label is hidden
 */
export async function drawDropdownLabel(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet
): Promise<void> {
  const labelPosition = field.labelPosition || 'left';

  // Skip drawing if label position is 'none'
  if (labelPosition === 'none') {
    return;
  }

  const labelStyle = stylesheet.fields.label;
  const dropdownStyle = stylesheet.fields.dropdown;
  const font = await doc.embedFont(getFontName(labelStyle.fontFamily));
  const fontSize = labelStyle.fontSize;

  let labelText = field.label;
  if (field.required) {
    labelText += ' *';
  }
  const fieldHeight = field.position.height || dropdownStyle.height;

  let textX: number;
  let textY: number;

  const fieldWidth = field.position.width || 150;
  const gap = 8; // Gap between label and field

  if (labelPosition === 'left') {
    // Calculate label width to position it to the left of the field
    const labelWidth = font.widthOfTextAtSize(labelText, fontSize);

    // Position label to the left of the field
    textX = field.position.x - labelWidth - gap;
    // Vertically center the label with the field (adjust for baseline)
    textY = field.position.y + (fieldHeight - fontSize) / 2 + 2;
  } else if (labelPosition === 'right') {
    // Position label to the right of the field (after the "(select)" indicator)
    // Account for the "(select)" text width (~40pt) plus its gap (4pt)
    const selectIndicatorWidth = 44;
    textX = field.position.x + fieldWidth + gap + selectIndicatorWidth;
    // Vertically center the label with the field (adjust for baseline)
    textY = field.position.y + (fieldHeight - fontSize) / 2 + 2;
  } else {
    // 'above': position above the field
    const offsetY = fieldHeight + labelStyle.marginBottom;
    textX = field.position.x;
    textY = field.position.y + offsetY;
  }

  page.drawText(labelText, {
    x: textX,
    y: textY,
    size: fontSize,
    font,
    color: hexToRgb(labelStyle.color),
  });
}
