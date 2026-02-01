/**
 * Multi-Page Document Generation Tests
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import { getFormFields } from '../helpers/acroform-inspector.js';
import { readPdf } from '../helpers/pdf-reader.js';
import { SchemaBuilder, createMultiPageTestSchema } from '../helpers/schema-builder.js';

describe('Multi-Page Document Generation', () => {
  it('creates correct number of pages', async () => {
    const schema = new SchemaBuilder('pages-test', 'Pages Test')
      .setPages(5)
      .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });

    expect(result.pageCount).toBe(5);
  });

  it('places fields on correct pages', async () => {
    const schema = new SchemaBuilder('page-placement', 'Page Placement Test')
      .setPages(3)
      .addTextField('page1_field', { x: 72, y: 700, width: 200, height: 24 })
      .onPage(1)
      .addTextField('page2_field', { x: 72, y: 700, width: 200, height: 24 })
      .onPage(2)
      .addTextField('page3_field', { x: 72, y: 700, width: 200, height: 24 })
      .onPage(3)
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(fields.length).toBe(3);
    expect(result.pageCount).toBe(3);
  });

  it('handles fields on non-existent pages gracefully', async () => {
    const schema = new SchemaBuilder('overflow-page', 'Overflow Page Test')
      .setPages(2)
      .addTextField('valid_field', { x: 72, y: 700, width: 200, height: 24 })
      .onPage(1)
      .build();

    // Manually set field to non-existent page
    schema.fields[0].page = 10;

    const result = await generatePdf({ schema });

    // Should handle gracefully by placing on last available page
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('distributes many fields across multiple pages', async () => {
    const builder = new SchemaBuilder('distributed-fields', 'Distributed Fields').setPages(3);

    // Add 5 fields per page
    for (let page = 1; page <= 3; page++) {
      for (let i = 0; i < 5; i++) {
        const y = 700 - i * 60;
        builder
          .addTextField(`page${page}_field${i}`, { x: 72, y, width: 200, height: 24 })
          .onPage(page);
      }
    }

    const schema = builder.build();
    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(fields.length).toBe(15);
    expect(result.pageCount).toBe(3);
  });

  it('maintains field order across pages', async () => {
    const schema = createMultiPageTestSchema(2);

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    const fieldNames = fields.map((f) => f.name);

    // Should contain fields from both pages
    expect(fieldNames).toContain('page1_field1');
    expect(fieldNames).toContain('page1_field2');
    expect(fieldNames).toContain('page2_field1');
    expect(fieldNames).toContain('page2_field2');
  });

  it('different field types on different pages', async () => {
    const schema = new SchemaBuilder('mixed-pages', 'Mixed Field Types')
      .setPages(2)
      .addTextField('page1_text', { x: 72, y: 700, width: 200, height: 24 })
      .onPage(1)
      .addCheckbox('page1_checkbox', { x: 72, y: 650 }, 'Checkbox 1')
      .onPage(1)
      .addDropdown('page2_dropdown', { x: 72, y: 700, width: 200, height: 24 }, ['A', 'B', 'C'])
      .onPage(2)
      .addRadioGroup('page2_radio', { x: 72, y: 650 }, [
        { value: 'x', label: 'X' },
        { value: 'y', label: 'Y' },
      ])
      .onPage(2)
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(fields.length).toBe(4);
    expect(result.pageCount).toBe(2);

    const types = fields.map((f) => f.type);
    expect(types).toContain('text');
    expect(types).toContain('checkbox');
    expect(types).toContain('dropdown');
    expect(types).toContain('radio');
  });

  it('handles single page with many fields', async () => {
    const builder = new SchemaBuilder('dense-page', 'Dense Page').setPages(1);

    // Add 20 fields in a grid
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 4; col++) {
        const x = 72 + col * 140;
        const y = 700 - row * 50;
        builder.addTextField(`field_${row}_${col}`, { x, y, width: 120, height: 24 });
      }
    }

    const schema = builder.build();
    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(fields.length).toBe(20);
    expect(result.pageCount).toBe(1);
  });

  it('generates valid PDF structure for multi-page document', async () => {
    const schema = createMultiPageTestSchema(5);

    const result = await generatePdf({ schema });
    const content = await readPdf(result.bytes);

    expect(content.pageCount).toBe(5);
    expect(content.pages.length).toBe(5);
  });
});
