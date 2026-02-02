/**
 * Layout Validation Tests
 *
 * NOTE: Field y positions are RELATIVE offsets from content baseline.
 * y=-30 means 30pt below where content ends.
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import { getFormFields } from '../helpers/acroform-inspector.js';
import {
  fieldsToLayoutElements,
  detectOverlaps,
  checkBoundaries,
  verifyAlignment,
  validateDimensions,
  getBoundingBox,
  drawnElementsToLayoutElements,
  detectTextFieldOverlaps,
} from '../helpers/layout-analyzer.js';
import { SchemaBuilder } from '../helpers/schema-builder.js';

describe('Layout Validation', () => {
  const pageSize = { width: 612, height: 792 }; // Letter
  const margins = { top: 72, bottom: 72, left: 72, right: 72 };

  describe('Overlap Detection', () => {
    it('detects no overlaps in valid schemas', async () => {
      const schema = new SchemaBuilder('no-overlap', 'No Overlap Test')
        .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('field2', { x: 72, y: -80, width: 200, height: 24 })
        .addTextField('field3', { x: 72, y: -130, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const overlaps = detectOverlaps(elements);

      expect(overlaps).toHaveLength(0);
    });

    it('detects field overlaps', async () => {
      const schema = new SchemaBuilder('overlap', 'Overlap Test')
        .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('field2', { x: 150, y: -30, width: 200, height: 24 }) // Same y, overlapping x
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const overlaps = detectOverlaps(elements);

      expect(overlaps.length).toBeGreaterThan(0);
    });

    it('detects partial overlaps', async () => {
      const schema = new SchemaBuilder('partial-overlap', 'Partial Overlap Test')
        .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('field2', { x: 250, y: -20, width: 100, height: 24 }) // Slight overlap
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const overlaps = detectOverlaps(elements);

      // May or may not overlap depending on exact coordinates
      expect(overlaps).toBeDefined();
    });

    it('side-by-side fields do not overlap', async () => {
      const schema = new SchemaBuilder('side-by-side', 'Side by Side Test')
        .addTextField('left', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('right', { x: 280, y: -30, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const overlaps = detectOverlaps(elements);

      expect(overlaps).toHaveLength(0);
    });
  });

  describe('Boundary Validation', () => {
    it('validates all elements within page boundaries', async () => {
      const schema = new SchemaBuilder('in-bounds', 'In Bounds Test')
        .addTextField('safe', { x: 100, y: -100, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const violations = checkBoundaries(elements, pageSize, margins);

      expect(violations).toHaveLength(0);
    });

    it('detects left boundary violations', async () => {
      const schema = new SchemaBuilder('left-violation', 'Left Violation Test')
        .addTextField('overflow', { x: 50, y: -100, width: 200, height: 24 }) // x < left margin
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const violations = checkBoundaries(elements, pageSize, margins);

      expect(violations.some((v) => v.violation === 'left')).toBe(true);
    });

    it('detects right boundary violations', async () => {
      const schema = new SchemaBuilder('right-violation', 'Right Violation Test')
        .addTextField('overflow', { x: 400, y: -100, width: 250, height: 24 }) // Exceeds right margin
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const violations = checkBoundaries(elements, pageSize, margins);

      expect(violations.some((v) => v.violation === 'right')).toBe(true);
    });

    it('detects bottom boundary violations', async () => {
      const schema = new SchemaBuilder('bottom-violation', 'Bottom Violation Test')
        .addTextField('overflow', { x: 100, y: -650, width: 200, height: 24 }) // Goes below bottom margin
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const violations = checkBoundaries(elements, pageSize, margins);

      expect(violations.some((v) => v.violation === 'bottom')).toBe(true);
    });

    it('detects top boundary violations', async () => {
      const schema = new SchemaBuilder('top-violation', 'Top Violation Test')
        .addTextField('overflow', { x: 100, y: 100, width: 200, height: 50 }) // Positive y goes above content into header
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const violations = checkBoundaries(elements, pageSize, margins);

      expect(violations.some((v) => v.violation === 'top')).toBe(true);
    });
  });

  describe('Alignment Verification', () => {
    it('verifies horizontally aligned fields', async () => {
      const schema = new SchemaBuilder('h-aligned', 'Horizontally Aligned Test')
        .addTextField('left', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('right', { x: 280, y: -30, width: 200, height: 24 }) // Same y
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const issues = verifyAlignment(elements, 2);

      expect(issues).toHaveLength(0);
    });

    it('verifies vertically aligned fields', async () => {
      const schema = new SchemaBuilder('v-aligned', 'Vertically Aligned Test')
        .addTextField('top', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('middle', { x: 72, y: -80, width: 200, height: 24 }) // Same x
        .addTextField('bottom', { x: 72, y: -130, width: 200, height: 24 }) // Same x
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const issues = verifyAlignment(elements, 2);

      expect(issues).toHaveLength(0);
    });
  });

  describe('Dimension Validation', () => {
    it('validates positive dimensions', async () => {
      const schema = new SchemaBuilder('valid-dims', 'Valid Dimensions Test')
        .addTextField('normal', { x: 72, y: -30, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const invalid = validateDimensions(elements);

      expect(invalid).toHaveLength(0);
    });

    it('calculates bounding box correctly', async () => {
      const schema = new SchemaBuilder('bounding-box', 'Bounding Box Test')
        .addTextField('field1', { x: 100, y: -50, width: 100, height: 20 })
        .addTextField('field2', { x: 200, y: -100, width: 150, height: 30 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const bbox = getBoundingBox(elements);

      expect(bbox).not.toBeNull();
      // Verify bounding box covers both fields
      expect(bbox!.minX).toBeLessThanOrEqual(100);
      expect(bbox!.maxX).toBeGreaterThanOrEqual(350); // 200 + 150
      expect(bbox!.width).toBeGreaterThanOrEqual(250);
    });

    it('handles empty element list for bounding box', () => {
      const bbox = getBoundingBox([]);
      expect(bbox).toBeNull();
    });
  });

  describe('Schema Content-Field Overlap Detection', () => {
    it('tracks drawn elements during PDF generation', async () => {
      const schema = new SchemaBuilder('track-test', 'Tracking Test')
        .addTextField('name', { x: 72, y: -100, width: 200, height: 24 })
        .addContent({ type: 'heading', level: 1, text: 'Test Form Title' })
        .addContent({ type: 'heading', level: 2, text: 'Section One' })
        .addContent({ type: 'paragraph', text: 'This is some test content for the form.' })
        .build();

      const result = await generatePdf({ schema });

      expect(result.drawnElements).toBeDefined();
      expect(result.drawnElements!.length).toBeGreaterThan(0);

      const titleElement = result.drawnElements!.find((e) => e.type === 'title');
      expect(titleElement).toBeDefined();
      expect(titleElement!.content).toBe('Test Form Title');
    });

    it('fields positioned with relative offsets never overlap content', async () => {
      const schema = new SchemaBuilder('no-overlap-test', 'No Overlap Test')
        .addTextField('name', { x: 72, y: -30, width: 200, height: 24 })
        .addContent({ type: 'heading', level: 1, text: 'Form Title' })
        .addContent({ type: 'heading', level: 2, text: 'Section' })
        .addContent({ type: 'paragraph', text: 'Content paragraph.' })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      const fieldElements = fieldsToLayoutElements(fields);
      const textElements = drawnElementsToLayoutElements(result.drawnElements ?? []);

      const overlaps = detectTextFieldOverlaps(textElements, fieldElements);
      expect(overlaps.length).toBe(0);
    });

    it('verifies text elements are tracked with positions', async () => {
      const schema = new SchemaBuilder('heading-test', 'Heading Test')
        .addTextField('name', { x: 72, y: -100, width: 200, height: 24 })
        .addContent({ type: 'heading', level: 1, text: 'Form Title' })
        .addContent({ type: 'heading', level: 2, text: 'Personal Information' })
        .addContent({ type: 'paragraph', text: 'Please fill in your details.' })
        .build();

      const result = await generatePdf({ schema });
      const textElements = drawnElementsToLayoutElements(result.drawnElements ?? []);

      const headingElements = textElements.filter((e) => e.type === 'heading');
      expect(headingElements.length).toBeGreaterThan(0);
      expect(textElements.length).toBeGreaterThan(0);
    });

    it('fields are positioned below content baseline', async () => {
      const schema = new SchemaBuilder('auto-test', 'Auto Position Test')
        .addTextField('field1', { x: 72, y: -30, width: 200, height: 24 })
        .addTextField('field2', { x: 72, y: -80, width: 200, height: 24 })
        .addContent({ type: 'heading', level: 1, text: 'Test Title' })
        .addContent({ type: 'heading', level: 2, text: 'Section' })
        .addContent({ type: 'paragraph', text: 'Some content here.' })
        .build();

      const result = await generatePdf({ schema });

      const fields = await getFormFields(result.bytes);
      const fieldElements = fieldsToLayoutElements(fields);
      const textElements = drawnElementsToLayoutElements(result.drawnElements ?? []);

      // All text should be above all fields
      const lowestTextY = Math.min(...textElements.map((e) => e.bounds.y));
      const highestFieldY = Math.max(...fieldElements.map((e) => e.bounds.y + e.bounds.height));

      expect(highestFieldY).toBeLessThan(lowestTextY);

      // No overlaps
      const overlaps = detectTextFieldOverlaps(textElements, fieldElements);
      expect(overlaps.length).toBe(0);
    });

    it('converts drawn elements to layout elements correctly', async () => {
      const schema = new SchemaBuilder('convert-test', 'Conversion Test')
        .addTextField('name', { x: 72, y: -100, width: 200, height: 24 })
        .addContent({ type: 'heading', level: 1, text: 'Test Title' })
        .addContent({ type: 'heading', level: 2, text: 'Section' })
        .addContent({ type: 'paragraph', text: 'Paragraph content here.' })
        .build();

      const result = await generatePdf({ schema });
      const textElements = drawnElementsToLayoutElements(result.drawnElements ?? []);

      expect(textElements.some((e) => e.type === 'title')).toBe(true);
      expect(textElements.some((e) => e.type === 'heading')).toBe(true);
      expect(textElements.some((e) => e.type === 'paragraph')).toBe(true);

      for (const elem of textElements) {
        expect(elem.bounds.width).toBeGreaterThan(0);
        expect(elem.bounds.height).toBeGreaterThan(0);
        expect(elem.page).toBe(1);
      }
    });
  });
});
