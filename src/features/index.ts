/**
 * Features Module
 * Exports all advanced form feature functionality
 */

// Calculations
export {
  type CalculationDefinition,
  type CalculationContext,
  evaluateFormula,
  formatCalculatedValue,
  calculateAllFields,
  getCalculationDependencies,
  sortCalculationsByDependency,
  generateCalculationScript,
} from './calculations.js';

// Conditionals
export {
  type ConditionalRule,
  type FieldVisibility,
  evaluateTrigger,
  evaluateConditionals,
  getConditionalFields,
  getTriggerFields,
  validateConditionalRules,
  generateConditionalScript,
} from './conditionals.js';

// Validation
export {
  type ValidationRule,
  type FieldValidation,
  type ValidationResult,
  type ValidationError,
  type FieldValues,
  ValidationPatterns,
  validateField,
  validateAllFields,
  evaluateValidationRule,
  getValidationPattern,
  createValidator,
  generateValidationScript,
  generateValidationStyles,
} from './validation.js';
