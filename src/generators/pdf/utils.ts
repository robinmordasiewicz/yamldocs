/**
 * PDF Generation Utilities
 */

import { rgb, type RGB } from 'pdf-lib';

/**
 * Convert hex color string to PDF-lib RGB
 */
export function hexToRgb(hex: string): RGB {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  return rgb(r, g, b);
}

/**
 * Calculate text width (approximate)
 * Used internally by wrapText
 */
function estimateTextWidth(text: string, fontSize: number): number {
  // Average character width is approximately 0.5 * fontSize for Helvetica
  return text.length * fontSize * 0.5;
}

/**
 * Wrap text to fit within a width
 */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = estimateTextWidth(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}
