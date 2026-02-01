/**
 * Conditionals Feature Tests
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateTrigger,
  evaluateConditionals,
  getConditionalFields,
  getTriggerFields,
  validateConditionalRules,
  generateConditionalScript,
  type ConditionalRule,
  type FieldValues,
} from '../../../src/features/conditionals.js';
import type { ParsedFormSchema } from '../../../src/types/schema.js';

describe('Conditionals Feature', () => {
  describe('evaluateTrigger', () => {
    it('evaluates equals operator for string', () => {
      const trigger = { field: 'status', value: 'active' };
      const values: FieldValues = { status: 'active' };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates equals operator - false case', () => {
      const trigger = { field: 'status', value: 'active' };
      const values: FieldValues = { status: 'inactive' };
      expect(evaluateTrigger(trigger, values)).toBe(false);
    });

    it('evaluates equals operator for boolean', () => {
      const trigger = { field: 'active', value: true };
      const values: FieldValues = { active: true };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates equals operator for array of values', () => {
      const trigger = { field: 'type', value: ['a', 'b', 'c'] };
      const values: FieldValues = { type: 'b' };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates notEquals operator', () => {
      const trigger = { field: 'status', value: 'active', operator: 'notEquals' as const };
      const values: FieldValues = { status: 'inactive' };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates contains operator', () => {
      const trigger = { field: 'email', value: '@example.com', operator: 'contains' as const };
      const values: FieldValues = { email: 'user@example.com' };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates contains operator with array', () => {
      const trigger = { field: 'text', value: ['foo', 'bar'], operator: 'contains' as const };
      const values: FieldValues = { text: 'hello bar world' };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates greaterThan operator', () => {
      const trigger = { field: 'age', value: '18', operator: 'greaterThan' as const };
      const values: FieldValues = { age: 21 };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates lessThan operator', () => {
      const trigger = { field: 'price', value: '100', operator: 'lessThan' as const };
      const values: FieldValues = { price: 50 };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates isEmpty operator', () => {
      const trigger = { field: 'notes', value: '', operator: 'isEmpty' as const };
      const values: FieldValues = { notes: '' };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });

    it('evaluates isNotEmpty operator', () => {
      const trigger = { field: 'name', value: '', operator: 'isNotEmpty' as const };
      const values: FieldValues = { name: 'John' };
      expect(evaluateTrigger(trigger, values)).toBe(true);
    });
  });

  describe('evaluateConditionals', () => {
    it('returns all fields visible by default', () => {
      const rules: ConditionalRule[] = [];
      const values: FieldValues = {};
      const allFields = ['field1', 'field2', 'field3'];

      const visibility = evaluateConditionals(rules, values, allFields);

      expect(visibility.field1).toBe(true);
      expect(visibility.field2).toBe(true);
      expect(visibility.field3).toBe(true);
    });

    it('hides fields when rule triggers', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'type', value: 'simple' },
          hide: ['advanced_option'],
        },
      ];
      const values: FieldValues = { type: 'simple' };
      const allFields = ['type', 'advanced_option', 'other'];

      const visibility = evaluateConditionals(rules, values, allFields);

      expect(visibility.advanced_option).toBe(false);
      expect(visibility.other).toBe(true);
    });

    it('shows fields when rule triggers', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'show_extra', value: true },
          show: ['extra_field'],
        },
      ];
      const values: FieldValues = { show_extra: true };
      const allFields = ['show_extra', 'extra_field'];

      const visibility = evaluateConditionals(rules, values, allFields);

      expect(visibility.extra_field).toBe(true);
    });

    it('handles multiple rules', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'employment', value: 'contract' },
          show: ['contract_duration'],
          hide: ['salary'],
        },
        {
          trigger: { field: 'remote', value: true },
          show: ['location_preference'],
        },
      ];
      const values: FieldValues = { employment: 'contract', remote: true };
      const allFields = [
        'employment',
        'remote',
        'contract_duration',
        'salary',
        'location_preference',
      ];

      const visibility = evaluateConditionals(rules, values, allFields);

      expect(visibility.contract_duration).toBe(true);
      expect(visibility.salary).toBe(false);
      expect(visibility.location_preference).toBe(true);
    });
  });

  describe('getConditionalFields', () => {
    it('returns fields affected by rules', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'type', value: 'a' },
          show: ['field1', 'field2'],
          hide: ['field3'],
        },
      ];

      const fields = getConditionalFields(rules);

      expect(fields.has('field1')).toBe(true);
      expect(fields.has('field2')).toBe(true);
      expect(fields.has('field3')).toBe(true);
    });

    it('returns empty set for no rules', () => {
      const fields = getConditionalFields([]);
      expect(fields.size).toBe(0);
    });
  });

  describe('getTriggerFields', () => {
    it('returns trigger fields from rules', () => {
      const rules: ConditionalRule[] = [
        { trigger: { field: 'type', value: 'a' }, show: ['x'] },
        { trigger: { field: 'status', value: 'active' }, hide: ['y'] },
      ];

      const fields = getTriggerFields(rules);

      expect(fields.has('type')).toBe(true);
      expect(fields.has('status')).toBe(true);
      expect(fields.size).toBe(2);
    });
  });

  describe('validateConditionalRules', () => {
    const mockSchema: ParsedFormSchema = {
      form: { id: 'test', title: 'Test' },
      fields: [
        { name: 'type', type: 'dropdown', label: 'Type', page: 1, position: { x: 0, y: 0 } },
        { name: 'field1', type: 'text', label: 'Field 1', page: 1, position: { x: 0, y: 0 } },
        { name: 'field2', type: 'text', label: 'Field 2', page: 1, position: { x: 0, y: 0 } },
      ],
    };

    it('returns no errors for valid rules', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'type', value: 'a' },
          show: ['field1'],
          hide: ['field2'],
        },
      ];

      const errors = validateConditionalRules(rules, mockSchema);
      expect(errors.length).toBe(0);
    });

    it('returns error for non-existent trigger field', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'nonexistent', value: 'a' },
          show: ['field1'],
        },
      ];

      const errors = validateConditionalRules(rules, mockSchema);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('nonexistent');
    });

    it('returns error for non-existent show field', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'type', value: 'a' },
          show: ['nonexistent_field'],
        },
      ];

      const errors = validateConditionalRules(rules, mockSchema);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('nonexistent_field');
    });

    it('returns error for non-existent hide field', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'type', value: 'a' },
          hide: ['missing_field'],
        },
      ];

      const errors = validateConditionalRules(rules, mockSchema);
      expect(errors.length).toBe(1);
      expect(errors[0]).toContain('missing_field');
    });
  });

  describe('generateConditionalScript', () => {
    it('returns empty string for no rules', () => {
      const script = generateConditionalScript([]);
      expect(script).toBe('');
    });

    it('generates JavaScript for conditional rules', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'type', value: 'special' },
          show: ['special_field'],
          hide: ['normal_field'],
        },
      ];

      const script = generateConditionalScript(rules);

      expect(script).toContain('showField');
      expect(script).toContain('hideField');
      expect(script).toContain('getFieldValue');
      expect(script).toContain("'type'");
      expect(script).toContain('addEventListener');
    });

    it('handles different operators in generated script', () => {
      const rules: ConditionalRule[] = [
        {
          trigger: { field: 'amount', value: '100', operator: 'greaterThan' },
          show: ['discount'],
        },
      ];

      const script = generateConditionalScript(rules);
      expect(script).toContain('parseFloat');
      expect(script).toContain('>');
    });
  });
});
