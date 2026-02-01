/**
 * PDF Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { hexToRgb, wrapText } from '../utils.js';

describe('hexToRgb', () => {
  it('should convert hex to RGB', () => {
    const result = hexToRgb('#ff0000');
    expect(result.red).toBeCloseTo(1, 2);
    expect(result.green).toBeCloseTo(0, 2);
    expect(result.blue).toBeCloseTo(0, 2);
  });

  it('should handle hex without #', () => {
    const result = hexToRgb('00ff00');
    expect(result.red).toBeCloseTo(0, 2);
    expect(result.green).toBeCloseTo(1, 2);
    expect(result.blue).toBeCloseTo(0, 2);
  });

  it('should handle black', () => {
    const result = hexToRgb('#000000');
    expect(result.red).toBeCloseTo(0, 2);
    expect(result.green).toBeCloseTo(0, 2);
    expect(result.blue).toBeCloseTo(0, 2);
  });

  it('should handle white', () => {
    const result = hexToRgb('#ffffff');
    expect(result.red).toBeCloseTo(1, 2);
    expect(result.green).toBeCloseTo(1, 2);
    expect(result.blue).toBeCloseTo(1, 2);
  });
});

describe('wrapText', () => {
  it('should wrap long text', () => {
    const text = 'This is a long sentence that should be wrapped into multiple lines';
    const lines = wrapText(text, 100, 12);
    expect(lines.length).toBeGreaterThan(1);
  });

  it('should not wrap short text', () => {
    const text = 'Short';
    const lines = wrapText(text, 200, 12);
    expect(lines.length).toBe(1);
    expect(lines[0]).toBe('Short');
  });

  it('should handle empty string', () => {
    const lines = wrapText('', 100, 12);
    expect(lines.length).toBe(0);
  });
});
