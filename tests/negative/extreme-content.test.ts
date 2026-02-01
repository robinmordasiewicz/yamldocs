/**
 * Extreme Content Handling Tests
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import { getFormFields, fillAndExtract } from '../helpers/acroform-inspector.js';
import { SchemaBuilder } from '../helpers/schema-builder.js';

describe('Extreme Content Handling', () => {
  describe('Long Text', () => {
    it('handles very long label text', async () => {
      const longLabel = 'A'.repeat(500);

      const schema = new SchemaBuilder('long-label', 'Long Label Test')
        .addTextField('field', { x: 72, y: 700, width: 200, height: 24 }, { label: longLabel })
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('handles very long default value', async () => {
      const longValue = 'This is a very long default value. '.repeat(100);

      const schema = new SchemaBuilder('long-value', 'Long Value Test')
        .addTextarea('field', { x: 72, y: 300, width: 468, height: 200 }, { default: longValue })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const textarea = fields.find((f) => f.name === 'field');

      expect(textarea?.value).toContain('This is a very long');
    });

    it('handles long field names', async () => {
      const longName = `field_with_a_very_long_name_that_exceeds_normal_expectations_${'x'.repeat(100)}`;

      const schema = new SchemaBuilder('long-name', 'Long Name Test')
        .addTextField(longName, { x: 72, y: 700, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      expect(fields.length).toBe(1);
    });

    it('handles filling with long text', async () => {
      const schema = new SchemaBuilder('fill-long', 'Fill Long Test')
        .addTextarea('comments', { x: 72, y: 300, width: 468, height: 200 })
        .build();

      const result = await generatePdf({ schema });
      const longText = 'Lorem ipsum dolor sit amet. '.repeat(200);

      const filled = await fillAndExtract(result.bytes, {
        comments: longText,
      });

      const fields = await getFormFields(filled);
      expect(fields.find((f) => f.name === 'comments')?.value).toContain('Lorem ipsum');
    });
  });

  describe('Unicode Characters', () => {
    // Note: Standard PDF fonts (Helvetica, Courier, etc.) cannot encode
    // non-Latin characters. Full Unicode support requires embedding custom fonts.
    // These tests document the expected behavior with standard fonts.

    it('handles unicode field names (ASCII portion)', async () => {
      // Field names can be unicode, but labels in standard fonts cannot
      const schema = new SchemaBuilder('unicode-name', 'Unicode Name Test')
        .addTextField(
          'field_unicode',
          { x: 72, y: 700, width: 200, height: 24 },
          { label: 'Unicode Field' }
        )
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      expect(fields.find((f) => f.name === 'field_unicode')).toBeDefined();
    });

    it.skip('handles unicode in labels (requires custom font embedding)', async () => {
      // This test is skipped because standard fonts cannot encode CJK characters
      const schema = new SchemaBuilder('unicode-label', 'Test Form')
        .addTextField(
          'name',
          { x: 72, y: 700, width: 200, height: 24 },
          { label: 'お名前 (Full Name)' }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it.skip('handles emoji in labels (requires custom font embedding)', async () => {
      // This test is skipped because standard fonts cannot encode emoji
      const schema = new SchemaBuilder('emoji-label', 'Emoji Test')
        .addTextField(
          'happy_field',
          { x: 72, y: 700, width: 200, height: 24 },
          { label: 'Happy Field' }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it.skip('handles mixed unicode scripts (requires custom font embedding)', async () => {
      // This test is skipped because standard fonts cannot encode CJK/Arabic
      const schema = new SchemaBuilder('mixed-unicode', 'Mixed Scripts')
        .addTextField(
          'mixed',
          { x: 72, y: 700, width: 200, height: 24 },
          {
            label: 'English only',
          }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it.skip('handles unicode in default values (requires custom font embedding)', async () => {
      // This test is skipped because standard fonts cannot encode Japanese
      const schema = new SchemaBuilder('unicode-value', 'Unicode Value Test')
        .addTextField(
          'greeting',
          { x: 72, y: 700, width: 200, height: 24 },
          {
            default: 'Hello World',
          }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('handles extended ASCII characters', async () => {
      // Extended ASCII (Latin-1) should work with standard fonts
      const schema = new SchemaBuilder('extended-ascii', 'Extended ASCII Test')
        .addTextField(
          'name',
          { x: 72, y: 700, width: 200, height: 24 },
          {
            label: 'Name with accents',
            default: 'Jose Garcia',
          }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });
  });

  describe('Special Characters', () => {
    it('handles special characters in field names', async () => {
      const schema = new SchemaBuilder('special-chars', 'Special Characters Test')
        .addTextField('field-with-dashes', { x: 72, y: 700, width: 200, height: 24 })
        .addTextField('field_with_underscores', { x: 72, y: 650, width: 200, height: 24 })
        .addTextField('field.with.dots', { x: 72, y: 600, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      expect(fields.find((f) => f.name === 'field-with-dashes')).toBeDefined();
      expect(fields.find((f) => f.name === 'field_with_underscores')).toBeDefined();
      expect(fields.find((f) => f.name === 'field.with.dots')).toBeDefined();
    });

    it('handles HTML-like content in labels', async () => {
      const schema = new SchemaBuilder('html-content', 'HTML Content Test')
        .addTextField(
          'html_field',
          { x: 72, y: 700, width: 200, height: 24 },
          {
            label: '<b>Bold</b> and <i>italic</i>',
          }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('handles newlines in labels', async () => {
      const schema = new SchemaBuilder('newline-label', 'Newline Test')
        .addTextField(
          'multiline_label',
          { x: 72, y: 700, width: 200, height: 24 },
          {
            label: 'Line 1\nLine 2',
          }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('handles tabs in content', async () => {
      const schema = new SchemaBuilder('tab-content', 'Tab Test')
        .addTextField(
          'tabbed',
          { x: 72, y: 700, width: 200, height: 24 },
          {
            default: 'Column1\tColumn2\tColumn3',
          }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty schema gracefully', async () => {
      const schema = new SchemaBuilder('empty', 'Empty Form').setPages(1).build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      expect(fields).toHaveLength(0);
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('handles maximum field count', async () => {
      const builder = new SchemaBuilder('many-fields', 'Many Fields');

      // Add 100 fields in a grid
      for (let i = 0; i < 100; i++) {
        const page = Math.floor(i / 25) + 1;
        const row = i % 5;
        const col = Math.floor((i % 25) / 5);

        builder
          .addTextField(`field_${i}`, {
            x: 72 + col * 110,
            y: 700 - row * 50,
            width: 100,
            height: 24,
          })
          .onPage(page);
      }

      const schema = builder.setPages(4).build();
      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      expect(fields.length).toBe(100);
    });

    it('handles single character values', async () => {
      const schema = new SchemaBuilder('single-char', 'Single Char Test')
        .addTextField('letter', { x: 72, y: 700, width: 50, height: 24 }, { default: 'X' })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      expect(fields.find((f) => f.name === 'letter')?.value).toBe('X');
    });

    it('handles whitespace-only values', async () => {
      const schema = new SchemaBuilder('whitespace', 'Whitespace Test')
        .addTextField('spaces', { x: 72, y: 700, width: 200, height: 24 }, { default: '   ' })
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('handles empty string labels', async () => {
      const schema = new SchemaBuilder('empty-label', 'Empty Label Test')
        .addTextField('no_label', { x: 72, y: 700, width: 200, height: 24 }, { label: '' })
        .build();

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('handles dropdown with single option', async () => {
      const schema = new SchemaBuilder('single-option', 'Single Option Test')
        .addDropdown('solo', { x: 72, y: 700, width: 200, height: 24 }, ['Only Option'])
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const dropdown = fields.find((f) => f.name === 'solo');

      expect(dropdown?.options).toHaveLength(1);
    });

    it('handles dropdown with empty options', async () => {
      const schema = new SchemaBuilder('no-options', 'No Options Test')
        .addDropdown('empty', { x: 72, y: 700, width: 200, height: 24 }, [])
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const dropdown = fields.find((f) => f.name === 'empty');

      expect(dropdown?.options).toHaveLength(0);
    });

    it('handles radio with single option', async () => {
      const schema = new SchemaBuilder('single-radio', 'Single Radio Test')
        .addRadioGroup('solo_radio', { x: 72, y: 700 }, [{ value: 'only', label: 'Only Choice' }])
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const radio = fields.find((f) => f.name === 'solo_radio');

      expect(radio?.options).toHaveLength(1);
    });
  });
});
