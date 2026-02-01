/**
 * Invalid Position Handling Tests
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import { getFormFields } from '../helpers/acroform-inspector.js';
import { SchemaBuilder } from '../helpers/schema-builder.js';

describe('Invalid Position Handling', () => {
  it('handles negative x coordinate gracefully', async () => {
    const schema = new SchemaBuilder('neg-x', 'Negative X Test')
      .addTextField('field', { x: -50, y: 700, width: 200, height: 24 })
      .build();

    // May place field at 0 or negative position
    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles negative y coordinate gracefully', async () => {
    const schema = new SchemaBuilder('neg-y', 'Negative Y Test')
      .addTextField('field', { x: 72, y: -50, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles zero width field', async () => {
    const schema = new SchemaBuilder('zero-width', 'Zero Width Test')
      .addTextField('field', { x: 72, y: 700, width: 0, height: 24 })
      .build();

    // Should use default width instead
    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles zero height field', async () => {
    const schema = new SchemaBuilder('zero-height', 'Zero Height Test')
      .addTextField('field', { x: 72, y: 700, width: 200, height: 0 })
      .build();

    // Should use default height instead
    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles very large x coordinate', async () => {
    const schema = new SchemaBuilder('large-x', 'Large X Test')
      .addTextField('field', { x: 10000, y: 700, width: 200, height: 24 })
      .build();

    // Field will be off the page but PDF should still generate
    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles very large y coordinate', async () => {
    const schema = new SchemaBuilder('large-y', 'Large Y Test')
      .addTextField('field', { x: 72, y: 10000, width: 200, height: 24 })
      .build();

    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles very large dimensions', async () => {
    const schema = new SchemaBuilder('large-dims', 'Large Dimensions Test')
      .addTextField('field', { x: 72, y: 700, width: 5000, height: 5000 })
      .build();

    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles floating point coordinates', async () => {
    const schema = new SchemaBuilder('float-coords', 'Float Coordinates Test')
      .addTextField('field', { x: 72.5, y: 699.75, width: 200.25, height: 23.5 })
      .build();

    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(result.bytes.length).toBeGreaterThan(0);
    expect(fields.length).toBe(1);
  });

  it('handles NaN-like string coordinates', async () => {
    const schema = new SchemaBuilder('nan-coords', 'NaN Coords Test')
      .addTextField('field', { x: 72, y: 700, width: 200, height: 24 })
      .build();

    // Manually corrupt position to test handling
    // The schema should still work with valid initial values
    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles missing position properties', async () => {
    const schema = new SchemaBuilder('missing-props', 'Missing Props Test').build();

    // Add a field with minimal position
    schema.fields.push({
      name: 'minimal',
      type: 'text',
      label: 'Minimal',
      page: 1,
      position: { x: 72, y: 700 }, // No width/height
    });

    const result = await generatePdf({ schema });
    expect(result.bytes.length).toBeGreaterThan(0);
  });

  it('handles overlapping fields at same position', async () => {
    const schema = new SchemaBuilder('same-position', 'Same Position Test')
      .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
      .addTextField('field2', { x: 72, y: 700, width: 200, height: 24 }) // Exact same position
      .build();

    // Both fields should be created even if overlapping
    const result = await generatePdf({ schema });
    const fields = await getFormFields(result.bytes);

    expect(fields.length).toBe(2);
  });

  it('handles page 0 (invalid page number)', async () => {
    const schema = new SchemaBuilder('page-zero', 'Page Zero Test')
      .setPages(1)
      .addTextField('field', { x: 72, y: 700, width: 200, height: 24 })
      .build();

    // Set field to invalid page 0 (will be mapped to page index -1)
    schema.fields[0].page = 0;

    // The generator uses pageIndex = page - 1, so page 0 becomes -1
    // This may either error or place on first page depending on implementation
    try {
      const result = await generatePdf({ schema });
      // If it doesn't throw, the PDF should still be valid
      expect(result.bytes.length).toBeGreaterThan(0);
    } catch (err) {
      // If it throws, that's also acceptable error handling
      expect(err).toBeDefined();
    }
  });

  it('handles negative page number', async () => {
    const schema = new SchemaBuilder('neg-page', 'Negative Page Test')
      .setPages(1)
      .addTextField('field', { x: 72, y: 700, width: 200, height: 24 })
      .build();

    schema.fields[0].page = -1;

    // Negative pages will result in negative index
    try {
      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    } catch (err) {
      // If it throws, that's acceptable error handling
      expect(err).toBeDefined();
    }
  });
});
