/**
 * Field Validation
 * Enables validation rules for form fields
 */

import type { NormalizedFormField, ParsedFormSchema } from '../types/schema.js';

export interface ValidationRule {
  if: string;
  then: string;
}

export interface FieldValidation {
  pattern?: string;
  message?: string;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  custom?: (value: string) => boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  rule: string;
}

export type FieldValues = Record<string, string | number | boolean | undefined>;

/**
 * Built-in validation patterns
 */
export const ValidationPatterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  phone: /^\+?[\d\s()-]{10,}$/,
  url: /^https?:\/\/[\w.-]+\.\w+/,
  date: /^\d{4}-\d{2}-\d{2}$/,
  time: /^\d{2}:\d{2}(:\d{2})?$/,
  zipCode: /^\d{5}(-\d{4})?$/,
  ssn: /^\d{3}-\d{2}-\d{4}$/,
  creditCard: /^\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alpha: /^[a-zA-Z]+$/,
  numeric: /^\d+$/,
  decimal: /^\d+\.?\d*$/,
};

/**
 * Validate a single field value
 */
export function validateField(
  field: NormalizedFormField,
  value: string | number | boolean | undefined
): ValidationError[] {
  const errors: ValidationError[] = [];
  const stringValue = value !== undefined ? String(value) : '';

  // Required validation
  if (field.required && (value === undefined || value === '')) {
    errors.push({
      field: field.name,
      message: `${field.label || field.name} is required`,
      rule: 'required',
    });
    return errors; // Don't continue if required field is empty
  }

  // Skip other validations if value is empty and not required
  if (value === undefined || value === '') {
    return errors;
  }

  // Pattern validation
  if (field.validation?.pattern) {
    const pattern = new RegExp(field.validation.pattern);
    if (!pattern.test(stringValue)) {
      errors.push({
        field: field.name,
        message: field.validation.message || `${field.label || field.name} is invalid`,
        rule: 'pattern',
      });
    }
  }

  // Min length validation
  if (field.minLength !== undefined && stringValue.length < field.minLength) {
    errors.push({
      field: field.name,
      message: `${field.label || field.name} must be at least ${field.minLength} characters`,
      rule: 'minLength',
    });
  }

  // Max length validation
  if (field.maxLength !== undefined && stringValue.length > field.maxLength) {
    errors.push({
      field: field.name,
      message: `${field.label || field.name} must be at most ${field.maxLength} characters`,
      rule: 'maxLength',
    });
  }

  // Min value validation (for numeric fields)
  if (field.min !== undefined) {
    const numValue = parseFloat(stringValue);
    if (!isNaN(numValue) && numValue < field.min) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be at least ${field.min}`,
        rule: 'min',
      });
    }
  }

  // Max value validation (for numeric fields)
  if (field.max !== undefined) {
    const numValue = parseFloat(stringValue);
    if (!isNaN(numValue) && numValue > field.max) {
      errors.push({
        field: field.name,
        message: `${field.label || field.name} must be at most ${field.max}`,
        rule: 'max',
      });
    }
  }

  return errors;
}

/**
 * Validate all fields in a schema
 */
export function validateAllFields(schema: ParsedFormSchema, values: FieldValues): ValidationResult {
  const errors: ValidationError[] = [];

  for (const field of schema.fields) {
    const fieldErrors = validateField(field, values[field.name]);
    errors.push(...fieldErrors);
  }

  // Evaluate custom validation rules
  if (schema.validation?.rules) {
    for (const rule of schema.validation.rules) {
      const ruleErrors = evaluateValidationRule(rule, values);
      errors.push(...ruleErrors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Evaluate a custom validation rule
 */
export function evaluateValidationRule(
  rule: ValidationRule,
  values: FieldValues
): ValidationError[] {
  const errors: ValidationError[] = [];

  try {
    // Parse the condition
    const conditionMatch = /^(\w+)\s*(<=?|>=?|==|!=|<|>)\s*(.+)$/.exec(rule.if);
    if (!conditionMatch) {
      console.warn(`Invalid validation rule condition: ${rule.if}`);
      return errors;
    }

    const [, fieldName, operator, compareValue] = conditionMatch;
    const fieldValue = values[fieldName];

    // Evaluate condition
    let conditionMet = false;
    const numFieldValue = parseFloat(String(fieldValue));
    const numCompareValue = parseFloat(compareValue.trim());

    // Handle special functions like today()
    const compareString = compareValue.trim();
    let resolvedCompareValue = compareString;

    if (compareString === 'today()') {
      resolvedCompareValue = new Date().toISOString().split('T')[0] ?? '';
    }

    switch (operator) {
      case '<':
        conditionMet = !isNaN(numFieldValue) && numFieldValue < numCompareValue;
        break;
      case '<=':
        conditionMet = !isNaN(numFieldValue) && numFieldValue <= numCompareValue;
        break;
      case '>':
        conditionMet = !isNaN(numFieldValue) && numFieldValue > numCompareValue;
        break;
      case '>=':
        conditionMet = !isNaN(numFieldValue) && numFieldValue >= numCompareValue;
        break;
      case '==':
        conditionMet = String(fieldValue) === resolvedCompareValue;
        break;
      case '!=':
        conditionMet = String(fieldValue) !== resolvedCompareValue;
        break;
    }

    // If condition is met, parse and return the error
    if (conditionMet) {
      const errorMatch = /^(error|warning|info):\s*(.+)$/.exec(rule.then);
      if (errorMatch) {
        const [, severity, message] = errorMatch;
        if (severity === 'error') {
          errors.push({
            field: fieldName,
            message: message.trim(),
            rule: 'custom',
          });
        }
      }
    }
  } catch (error) {
    console.warn(`Failed to evaluate validation rule: ${rule.if}`, error);
  }

  return errors;
}

/**
 * Get validation pattern by name
 */
export function getValidationPattern(name: keyof typeof ValidationPatterns): RegExp | undefined {
  return ValidationPatterns[name];
}

/**
 * Create a custom validation function
 */
export function createValidator(
  pattern: RegExp | string,
  message: string
): (value: string) => ValidationError | null {
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  return (value: string): ValidationError | null => {
    if (!regex.test(value)) {
      return {
        field: '',
        message,
        rule: 'custom',
      };
    }
    return null;
  };
}

/**
 * Generate JavaScript code for client-side validation
 */
export function generateValidationScript(schema: ParsedFormSchema): string {
  const fieldsWithValidation = schema.fields.filter(
    (f) => f.required || f.validation?.pattern || f.minLength || f.maxLength || f.min || f.max
  );

  if (fieldsWithValidation.length === 0) {
    return '';
  }

  const fieldValidations = fieldsWithValidation
    .map((field) => {
      const validations: string[] = [];

      if (field.required) {
        validations.push(`
        if (value === '' || value === undefined || value === null) {
          return '${field.label || field.name} is required';
        }`);
      }

      if (field.validation?.pattern) {
        const message = field.validation.message || `${field.label || field.name} is invalid`;
        validations.push(`
        if (value && !/${field.validation.pattern}/.test(value)) {
          return '${message.replace(/'/g, "\\'")}';
        }`);
      }

      if (field.minLength !== undefined) {
        validations.push(`
        if (value && value.length < ${field.minLength}) {
          return '${field.label || field.name} must be at least ${field.minLength} characters';
        }`);
      }

      if (field.maxLength !== undefined) {
        validations.push(`
        if (value && value.length > ${field.maxLength}) {
          return '${field.label || field.name} must be at most ${field.maxLength} characters';
        }`);
      }

      if (field.min !== undefined) {
        validations.push(`
        if (value && parseFloat(value) < ${field.min}) {
          return '${field.label || field.name} must be at least ${field.min}';
        }`);
      }

      if (field.max !== undefined) {
        validations.push(`
        if (value && parseFloat(value) > ${field.max}) {
          return '${field.label || field.name} must be at most ${field.max}';
        }`);
      }

      return `
      '${field.name}': function(value) {
        ${validations.join('')}
        return null;
      }`;
    })
    .join(',\n');

  return `
  // Field validation
  (function() {
    const validators = {
      ${fieldValidations}
    };

    function validateField(name, value) {
      const validator = validators[name];
      return validator ? validator(value) : null;
    }

    function showError(field, message) {
      clearError(field);
      const input = document.getElementById(field);
      if (input) {
        input.classList.add('is-invalid');
        const error = document.createElement('div');
        error.className = 'validation-error';
        error.textContent = message;
        input.parentNode.appendChild(error);
      }
    }

    function clearError(field) {
      const input = document.getElementById(field);
      if (input) {
        input.classList.remove('is-invalid');
        const error = input.parentNode.querySelector('.validation-error');
        if (error) error.remove();
      }
    }

    function validateForm(form) {
      let isValid = true;
      const formData = new FormData(form);

      for (const [name, validator] of Object.entries(validators)) {
        const value = formData.get(name);
        const error = validator(value);
        if (error) {
          showError(name, error);
          isValid = false;
        } else {
          clearError(name);
        }
      }

      return isValid;
    }

    document.addEventListener('DOMContentLoaded', function() {
      // Validate on blur
      for (const name of Object.keys(validators)) {
        const input = document.getElementById(name);
        if (input) {
          input.addEventListener('blur', function() {
            const error = validateField(name, this.value);
            if (error) {
              showError(name, error);
            } else {
              clearError(name);
            }
          });
        }
      }

      // Validate on submit
      document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
          if (!validateForm(form)) {
            e.preventDefault();
          }
        });
      });
    });
  })();`;
}

/**
 * Generate CSS for validation styling
 */
export function generateValidationStyles(): string {
  return `
    .is-invalid {
      border-color: #dc3545 !important;
    }

    .is-invalid:focus {
      box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.25) !important;
    }

    .validation-error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .is-valid {
      border-color: #28a745 !important;
    }

    .is-valid:focus {
      box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.25) !important;
    }
  `;
}
