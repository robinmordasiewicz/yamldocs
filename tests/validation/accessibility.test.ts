/**
 * Accessibility Compliance Tests
 */

import { describe, it, expect } from 'vitest';
import { generatePdf } from '../../src/generators/pdf/index.js';
import { getFormFields } from '../helpers/acroform-inspector.js';
import { readPdf } from '../helpers/pdf-reader.js';
import { fieldsToLayoutElements, getBoundingBox } from '../helpers/layout-analyzer.js';
import { SchemaBuilder, createAllFieldTypesSchema } from '../helpers/schema-builder.js';

describe('Accessibility Compliance', () => {
  describe('Logical Reading Order', () => {
    it('fields are ordered top-to-bottom', async () => {
      const schema = new SchemaBuilder('reading-order', 'Reading Order Test')
        .addTextField('first', { x: 72, y: 700, width: 200, height: 24 })
        .addTextField('second', { x: 72, y: 650, width: 200, height: 24 })
        .addTextField('third', { x: 72, y: 600, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      // Fields should be in creation order
      expect(fields[0].name).toBe('first');
      expect(fields[1].name).toBe('second');
      expect(fields[2].name).toBe('third');
    });

    it('vertical layout has logical order', async () => {
      const schema = new SchemaBuilder('vertical-order', 'Vertical Order Test')
        .addTextField('top', { x: 72, y: 700, width: 200, height: 24 })
        .addTextField('middle', { x: 72, y: 500, width: 200, height: 24 })
        .addTextField('bottom', { x: 72, y: 300, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);

      // Verify top-to-bottom ordering (higher y = higher on page)
      let previousY = Infinity;
      for (const elem of elements) {
        expect(elem.bounds.y).toBeLessThanOrEqual(previousY);
        previousY = elem.bounds.y;
      }
    });
  });

  describe('Form Field Labels', () => {
    it('all fields have labels', async () => {
      const schema = new SchemaBuilder('labeled-fields', 'Labeled Fields Test')
        .addTextField('name', { x: 72, y: 700, width: 200, height: 24 }, { label: 'Full Name' })
        .addTextField(
          'email',
          { x: 72, y: 650, width: 200, height: 24 },
          { label: 'Email Address' }
        )
        .addCheckbox('agree', { x: 72, y: 600 }, 'I agree to terms')
        .build();

      // All fields should have labels defined
      for (const field of schema.fields) {
        expect(field.label).toBeTruthy();
      }

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('labels are descriptive', async () => {
      const schema = new SchemaBuilder('descriptive-labels', 'Descriptive Labels Test')
        .addTextField(
          'first_name',
          { x: 72, y: 700, width: 200, height: 24 },
          { label: 'First Name' }
        )
        .addTextField(
          'last_name',
          { x: 72, y: 650, width: 200, height: 24 },
          { label: 'Last Name' }
        )
        .addTextField('phone', { x: 72, y: 600, width: 200, height: 24 }, { label: 'Phone Number' })
        .build();

      // Labels should be meaningful (not just field names)
      for (const field of schema.fields) {
        expect(field.label.length).toBeGreaterThan(3);
        expect(field.label).not.toBe(field.name);
      }
    });
  });

  describe('Required Field Indication', () => {
    it('required fields are marked', async () => {
      const schema = new SchemaBuilder('required-indication', 'Required Indication Test')
        .addTextField(
          'required_name',
          { x: 72, y: 700, width: 200, height: 24 },
          { required: true, label: 'Name' }
        )
        .addTextField(
          'optional_phone',
          { x: 72, y: 650, width: 200, height: 24 },
          { required: false, label: 'Phone' }
        )
        .build();

      const requiredFields = schema.fields.filter((f) => f.required);
      const optionalFields = schema.fields.filter((f) => !f.required);

      expect(requiredFields.length).toBeGreaterThan(0);
      expect(optionalFields.length).toBeGreaterThan(0);

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });

    it('distinguishes required from optional', async () => {
      const schema = new SchemaBuilder('required-distinction', 'Required Distinction Test')
        .addTextField(
          'email',
          { x: 72, y: 700, width: 200, height: 24 },
          { required: true, label: 'Email (Required)' }
        )
        .addTextField(
          'website',
          { x: 72, y: 650, width: 200, height: 24 },
          { required: false, label: 'Website (Optional)' }
        )
        .build();

      const result = await generatePdf({ schema });
      expect(result.fieldCount).toBe(2);
    });
  });

  describe('Form Structure', () => {
    it('form has clear boundaries', async () => {
      const schema = createAllFieldTypesSchema();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const elements = fieldsToLayoutElements(fields);
      const bbox = getBoundingBox(elements);

      expect(bbox).not.toBeNull();
      // All fields should be within a reasonable area
      expect(bbox!.width).toBeLessThan(600); // Less than page width
      expect(bbox!.height).toBeLessThan(700); // Less than page height
    });

    it('maintains consistent margins', async () => {
      const schema = new SchemaBuilder('consistent-margins', 'Consistent Margins Test')
        .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
        .addTextField('field2', { x: 72, y: 650, width: 200, height: 24 })
        .addTextField('field3', { x: 72, y: 600, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      // All fields should have same x position (left alignment)
      const xPositions = fields.map((f) => f.position.x);
      const allSameX = xPositions.every((x) => x === xPositions[0]);
      expect(allSameX).toBe(true);
    });

    it('uses consistent spacing', async () => {
      const schema = new SchemaBuilder('consistent-spacing', 'Consistent Spacing Test')
        .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
        .addTextField('field2', { x: 72, y: 650, width: 200, height: 24 })
        .addTextField('field3', { x: 72, y: 600, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      // Calculate spacing between fields
      const spacing1 = fields[0].position.y - fields[1].position.y;
      const spacing2 = fields[1].position.y - fields[2].position.y;

      // Spacing should be consistent
      expect(Math.abs(spacing1 - spacing2)).toBeLessThan(1);
    });
  });

  describe('Dropdown and Radio Accessibility', () => {
    it('dropdown options are selectable', async () => {
      const options = ['Option 1', 'Option 2', 'Option 3'];

      const schema = new SchemaBuilder('dropdown-accessible', 'Dropdown Accessible Test')
        .addDropdown('choice', { x: 72, y: 700, width: 200, height: 24 }, options)
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const dropdown = fields.find((f) => f.name === 'choice');

      // All options should be present
      expect(dropdown?.options).toEqual(options);
    });

    it('radio options are properly grouped', async () => {
      const schema = new SchemaBuilder('radio-grouped', 'Radio Grouped Test')
        .addRadioGroup('preference', { x: 72, y: 700 }, [
          { value: 'a', label: 'Choice A' },
          { value: 'b', label: 'Choice B' },
          { value: 'c', label: 'Choice C' },
        ])
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);
      const radio = fields.find((f) => f.name === 'preference');

      expect(radio?.type).toBe('radio');
      expect(radio?.options?.length).toBe(3);
    });
  });

  describe('Document Metadata', () => {
    it('document has title', async () => {
      const schema = new SchemaBuilder('with-title', 'My Accessible Form')
        .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const content = await readPdf(result.bytes);

      expect(content.metadata.title).toBe('My Accessible Form');
    });

    it('supports author metadata', async () => {
      const schema = new SchemaBuilder('with-author', 'Author Test')
        .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
        .build();

      schema.form.author = 'Accessibility Team';

      const result = await generatePdf({ schema });
      expect(result.bytes.length).toBeGreaterThan(0);
    });
  });

  describe('Visual Clarity', () => {
    it('fields do not overlap', async () => {
      const schema = new SchemaBuilder('no-overlap-access', 'No Overlap Test')
        .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
        .addTextField('field2', { x: 72, y: 650, width: 200, height: 24 })
        .addTextField('field3', { x: 72, y: 600, width: 200, height: 24 })
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      // Check no overlaps
      for (let i = 0; i < fields.length; i++) {
        for (let j = i + 1; j < fields.length; j++) {
          const f1 = fields[i].position;
          const f2 = fields[j].position;

          // Check if fields overlap
          const xOverlap = f1.x < f2.x + f2.width && f1.x + f1.width > f2.x;
          const yOverlap = f1.y < f2.y + f2.height && f1.y + f1.height > f2.y;

          // At least one dimension should not overlap
          expect(xOverlap && yOverlap).toBe(false);
        }
      }
    });

    it('adequate spacing between fields', async () => {
      const schema = new SchemaBuilder('adequate-spacing', 'Adequate Spacing Test')
        .addTextField('field1', { x: 72, y: 700, width: 200, height: 24 })
        .addTextField('field2', { x: 72, y: 640, width: 200, height: 24 }) // 36pt gap
        .build();

      const result = await generatePdf({ schema });
      const fields = await getFormFields(result.bytes);

      // Gap should be at least 10pt for accessibility
      const gap = fields[0].position.y - (fields[1].position.y + fields[1].position.height);
      expect(gap).toBeGreaterThanOrEqual(10);
    });
  });
});
