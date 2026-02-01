/**
 * Validation Feature Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateField,
  validateAllFields,
  evaluateValidationRule,
  getValidationPattern,
  createValidator,
  generateValidationScript,
  generateValidationStyles,
  ValidationPatterns,
} from '../../../src/features/validation.js';
import type { NormalizedFormField, ParsedFormSchema } from '../../../src/types/schema.js';

describe('Validation Feature', () => {
  describe('validateField', () => {
    it('validates required field - empty value', () => {
      const field: NormalizedFormField = {
        name: 'name',
        type: 'text',
        label: 'Name',
        page: 1,
        required: true,
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, '');
      expect(errors.length).toBe(1);
      expect(errors[0].rule).toBe('required');
    });

    it('validates required field - has value', () => {
      const field: NormalizedFormField = {
        name: 'name',
        type: 'text',
        label: 'Name',
        page: 1,
        required: true,
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, 'John');
      expect(errors.length).toBe(0);
    });

    it('validates pattern - valid email', () => {
      const field: NormalizedFormField = {
        name: 'email',
        type: 'text',
        label: 'Email',
        page: 1,
        validation: {
          pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
          message: 'Invalid email',
        },
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, 'test@example.com');
      expect(errors.length).toBe(0);
    });

    it('validates pattern - invalid email', () => {
      const field: NormalizedFormField = {
        name: 'email',
        type: 'text',
        label: 'Email',
        page: 1,
        validation: {
          pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$',
          message: 'Invalid email',
        },
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, 'invalid-email');
      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Invalid email');
    });

    it('validates minLength', () => {
      const field: NormalizedFormField = {
        name: 'password',
        type: 'text',
        label: 'Password',
        page: 1,
        minLength: 8,
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, 'short');
      expect(errors.length).toBe(1);
      expect(errors[0].rule).toBe('minLength');
    });

    it('validates maxLength', () => {
      const field: NormalizedFormField = {
        name: 'code',
        type: 'text',
        label: 'Code',
        page: 1,
        maxLength: 5,
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, 'toolong');
      expect(errors.length).toBe(1);
      expect(errors[0].rule).toBe('maxLength');
    });

    it('validates min value', () => {
      const field: NormalizedFormField = {
        name: 'age',
        type: 'text',
        label: 'Age',
        page: 1,
        min: 18,
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, '15');
      expect(errors.length).toBe(1);
      expect(errors[0].rule).toBe('min');
    });

    it('validates max value', () => {
      const field: NormalizedFormField = {
        name: 'quantity',
        type: 'text',
        label: 'Quantity',
        page: 1,
        max: 100,
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, '150');
      expect(errors.length).toBe(1);
      expect(errors[0].rule).toBe('max');
    });

    it('skips validation for empty optional field', () => {
      const field: NormalizedFormField = {
        name: 'notes',
        type: 'text',
        label: 'Notes',
        page: 1,
        required: false,
        minLength: 10,
        position: { x: 0, y: 0 },
      };

      const errors = validateField(field, '');
      expect(errors.length).toBe(0);
    });
  });

  describe('validateAllFields', () => {
    const mockSchema: ParsedFormSchema = {
      form: { id: 'test', title: 'Test' },
      fields: [
        {
          name: 'name',
          type: 'text',
          label: 'Name',
          page: 1,
          required: true,
          position: { x: 0, y: 0 },
        },
        {
          name: 'email',
          type: 'text',
          label: 'Email',
          page: 1,
          required: true,
          validation: { pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$' },
          position: { x: 0, y: 0 },
        },
      ],
    };

    it('returns valid for correct values', () => {
      const result = validateAllFields(mockSchema, {
        name: 'John Doe',
        email: 'john@example.com',
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('returns invalid with errors for incorrect values', () => {
      const result = validateAllFields(mockSchema, {
        name: '',
        email: 'invalid',
      });

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2);
    });

    it('validates custom rules', () => {
      const schemaWithRules: ParsedFormSchema = {
        ...mockSchema,
        validation: {
          rules: [{ if: 'age < 18', then: 'error: Must be 18 or older' }],
        },
      };

      const result = validateAllFields(schemaWithRules, {
        name: 'John',
        email: 'john@example.com',
        age: 15,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('18'))).toBe(true);
    });
  });

  describe('evaluateValidationRule', () => {
    it('evaluates less than condition', () => {
      const rule = { if: 'value < 100', then: 'error: Value must be at least 100' };
      const errors = evaluateValidationRule(rule, { value: 50 });

      expect(errors.length).toBe(1);
      expect(errors[0].message).toBe('Value must be at least 100');
    });

    it('evaluates greater than condition', () => {
      const rule = { if: 'amount > 1000', then: 'error: Amount exceeds limit' };
      const errors = evaluateValidationRule(rule, { amount: 500 });

      expect(errors.length).toBe(0);
    });

    it('evaluates equals condition', () => {
      const rule = { if: 'status == pending', then: 'error: Cannot submit pending status' };
      const errors = evaluateValidationRule(rule, { status: 'pending' });

      expect(errors.length).toBe(1);
    });

    it('evaluates not equals condition', () => {
      const rule = { if: 'type != valid', then: 'error: Type must be valid' };
      const errors = evaluateValidationRule(rule, { type: 'invalid' });

      expect(errors.length).toBe(1);
    });

    it('handles malformed rules gracefully', () => {
      const rule = { if: 'invalid rule syntax', then: 'error: Should not match' };
      const errors = evaluateValidationRule(rule, {});

      expect(errors.length).toBe(0);
    });
  });

  describe('ValidationPatterns', () => {
    it('validates email pattern', () => {
      expect(ValidationPatterns.email.test('test@example.com')).toBe(true);
      expect(ValidationPatterns.email.test('invalid')).toBe(false);
    });

    it('validates phone pattern', () => {
      expect(ValidationPatterns.phone.test('+1 (555) 123-4567')).toBe(true);
      expect(ValidationPatterns.phone.test('123')).toBe(false);
    });

    it('validates url pattern', () => {
      expect(ValidationPatterns.url.test('https://example.com')).toBe(true);
      expect(ValidationPatterns.url.test('not-a-url')).toBe(false);
    });

    it('validates date pattern', () => {
      expect(ValidationPatterns.date.test('2024-01-15')).toBe(true);
      expect(ValidationPatterns.date.test('01/15/2024')).toBe(false);
    });

    it('validates zip code pattern', () => {
      expect(ValidationPatterns.zipCode.test('12345')).toBe(true);
      expect(ValidationPatterns.zipCode.test('12345-6789')).toBe(true);
      expect(ValidationPatterns.zipCode.test('1234')).toBe(false);
    });

    it('validates numeric pattern', () => {
      expect(ValidationPatterns.numeric.test('12345')).toBe(true);
      expect(ValidationPatterns.numeric.test('123.45')).toBe(false);
    });

    it('validates decimal pattern', () => {
      expect(ValidationPatterns.decimal.test('123.45')).toBe(true);
      expect(ValidationPatterns.decimal.test('123')).toBe(true);
    });
  });

  describe('getValidationPattern', () => {
    it('returns email pattern', () => {
      const pattern = getValidationPattern('email');
      expect(pattern).toBe(ValidationPatterns.email);
    });

    it('returns undefined for unknown pattern', () => {
      const pattern = getValidationPattern('unknown' as keyof typeof ValidationPatterns);
      expect(pattern).toBeUndefined();
    });
  });

  describe('createValidator', () => {
    it('creates validator from regex pattern', () => {
      const validator = createValidator(/^[A-Z]{3}$/, 'Must be 3 uppercase letters');

      expect(validator('ABC')).toBeNull();
      expect(validator('abc')?.message).toBe('Must be 3 uppercase letters');
    });

    it('creates validator from string pattern', () => {
      const validator = createValidator('^\\d{4}$', 'Must be 4 digits');

      expect(validator('1234')).toBeNull();
      expect(validator('12345')?.message).toBe('Must be 4 digits');
    });
  });

  describe('generateValidationScript', () => {
    it('returns empty string for schema with no validation', () => {
      const schema: ParsedFormSchema = {
        form: { id: 'test', title: 'Test' },
        fields: [
          { name: 'field1', type: 'text', label: 'Field 1', page: 1, position: { x: 0, y: 0 } },
        ],
      };

      const script = generateValidationScript(schema);
      expect(script).toBe('');
    });

    it('generates JavaScript for required fields', () => {
      const schema: ParsedFormSchema = {
        form: { id: 'test', title: 'Test' },
        fields: [
          {
            name: 'name',
            type: 'text',
            label: 'Name',
            page: 1,
            required: true,
            position: { x: 0, y: 0 },
          },
        ],
      };

      const script = generateValidationScript(schema);

      expect(script).toContain('validators');
      expect(script).toContain('name');
      expect(script).toContain('required');
      expect(script).toContain('addEventListener');
    });

    it('generates JavaScript for pattern validation', () => {
      const schema: ParsedFormSchema = {
        form: { id: 'test', title: 'Test' },
        fields: [
          {
            name: 'email',
            type: 'text',
            label: 'Email',
            page: 1,
            validation: { pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$', message: 'Invalid email' },
            position: { x: 0, y: 0 },
          },
        ],
      };

      const script = generateValidationScript(schema);

      expect(script).toContain('email');
      expect(script).toContain('.test(value)');
    });

    it('generates JavaScript for min/max length', () => {
      const schema: ParsedFormSchema = {
        form: { id: 'test', title: 'Test' },
        fields: [
          {
            name: 'password',
            type: 'text',
            label: 'Password',
            page: 1,
            minLength: 8,
            maxLength: 20,
            position: { x: 0, y: 0 },
          },
        ],
      };

      const script = generateValidationScript(schema);

      expect(script).toContain('password');
      expect(script).toContain('.length');
      expect(script).toContain('8');
      expect(script).toContain('20');
    });
  });

  describe('generateValidationStyles', () => {
    it('generates CSS for validation states', () => {
      const styles = generateValidationStyles();

      expect(styles).toContain('.is-invalid');
      expect(styles).toContain('.is-valid');
      expect(styles).toContain('.validation-error');
      expect(styles).toContain('border-color');
    });
  });
});
