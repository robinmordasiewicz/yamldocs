/**
 * Radio Button Field Generator
 * Creates AcroForm radio button groups
 */

import { PDFDocument, PDFPage, PDFRadioGroup } from 'pdf-lib';
import type { NormalizedFormField } from '../../../types/index.js';
import type { ResolvedStylesheet } from '../../../types/stylesheet.js';
import { hexToRgb } from '../utils.js';
import { getFontName } from '../layout.js';

export interface RadioGroupLayout {
  direction: 'horizontal' | 'vertical';
  spacing: number;
}

/**
 * Create a radio button group
 */
export function createRadioGroup(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet,
  layout: Partial<RadioGroupLayout> = {}
): PDFRadioGroup {
  const form = doc.getForm();
  const style = stylesheet.fields.radio;
  const optionSize = style.size;
  const mergedLayout = {
    direction: layout.direction ?? ('vertical' as const),
    spacing: layout.spacing ?? 24,
  };

  // Create the radio group
  const radioGroup = form.createRadioGroup(field.name);

  // Add options to the group
  const options = field.options || [];

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    let x: number, y: number;

    if (mergedLayout.direction === 'horizontal') {
      x = field.position.x + i * (optionSize + mergedLayout.spacing + 80);
      y = field.position.y;
    } else {
      x = field.position.x;
      y = field.position.y - i * mergedLayout.spacing;
    }

    radioGroup.addOptionToPage(option.value, page, {
      x,
      y,
      width: optionSize,
      height: optionSize,
      borderWidth: style.borderWidth,
      borderColor: field.borderColor ? hexToRgb(field.borderColor) : hexToRgb(style.borderColor),
      backgroundColor: field.backgroundColor
        ? hexToRgb(field.backgroundColor)
        : hexToRgb(style.backgroundColor),
    });
  }

  // Set default value if specified
  if (typeof field.default === 'string') {
    const defaultOption = options.find((opt) => opt.value === field.default);
    if (defaultOption) {
      radioGroup.select(defaultOption.value);
    }
  }

  // Set read-only if specified
  if (field.readOnly) {
    radioGroup.enableReadOnly();
  }

  return radioGroup;
}

/**
 * Draw radio group label and option labels
 */
export async function drawRadioGroupLabels(
  doc: PDFDocument,
  page: PDFPage,
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet,
  layout: Partial<RadioGroupLayout> = {}
): Promise<void> {
  const labelStyle = stylesheet.fields.label;
  const radioStyle = stylesheet.fields.radio;
  const font = await doc.embedFont(getFontName(labelStyle.fontFamily));
  const optionSize = radioStyle.size;
  const mergedLayout = {
    direction: layout.direction ?? ('vertical' as const),
    spacing: layout.spacing ?? 24,
  };
  const fontSize = labelStyle.fontSize;

  // Draw main label above the group
  let mainLabel = field.label;
  if (field.required) {
    mainLabel += ' *';
  }

  page.drawText(mainLabel, {
    x: field.position.x,
    y: field.position.y + optionSize + 8,
    size: fontSize,
    font,
    color: hexToRgb(labelStyle.color),
  });

  // Draw option labels
  const options = field.options || [];

  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    let x: number, y: number;

    if (mergedLayout.direction === 'horizontal') {
      x = field.position.x + i * (optionSize + mergedLayout.spacing + 80) + optionSize + 4;
      y = field.position.y + optionSize / 2 - fontSize / 2;
    } else {
      x = field.position.x + optionSize + 6;
      y = field.position.y - i * mergedLayout.spacing + optionSize / 2 - fontSize / 2;
    }

    page.drawText(option.label, {
      x,
      y,
      size: fontSize,
      font,
      color: hexToRgb(labelStyle.color),
    });
  }
}
