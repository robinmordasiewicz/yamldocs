/**
 * Conditional Field Visibility
 * Enables show/hide logic based on field values
 */

import type { ParsedFormSchema } from '../types/schema.js';
import type { FieldValues } from './validation.js';

export interface ConditionalRule {
  trigger: {
    field: string;
    value: string | string[] | boolean;
    operator?:
      | 'equals'
      | 'notEquals'
      | 'contains'
      | 'greaterThan'
      | 'lessThan'
      | 'isEmpty'
      | 'isNotEmpty';
  };
  show?: string[];
  hide?: string[];
}

export type FieldVisibility = Record<string, boolean>;

/**
 * Evaluate a single trigger condition
 */
export function evaluateTrigger(trigger: ConditionalRule['trigger'], values: FieldValues): boolean {
  const fieldValue = values[trigger.field];
  const operator = trigger.operator ?? 'equals';

  switch (operator) {
    case 'equals':
      if (Array.isArray(trigger.value)) {
        return trigger.value.includes(String(fieldValue));
      }
      if (typeof trigger.value === 'boolean') {
        return fieldValue === trigger.value;
      }
      return String(fieldValue) === trigger.value;

    case 'notEquals':
      if (Array.isArray(trigger.value)) {
        return !trigger.value.includes(String(fieldValue));
      }
      if (typeof trigger.value === 'boolean') {
        return fieldValue !== trigger.value;
      }
      return String(fieldValue) !== trigger.value;

    case 'contains':
      if (typeof fieldValue !== 'string') return false;
      if (Array.isArray(trigger.value)) {
        return trigger.value.some((v) => fieldValue.includes(v));
      }
      return fieldValue.includes(String(trigger.value));

    case 'greaterThan': {
      const gtNum = parseFloat(String(fieldValue));
      const gtThreshold = parseFloat(String(trigger.value));
      return !isNaN(gtNum) && !isNaN(gtThreshold) && gtNum > gtThreshold;
    }

    case 'lessThan': {
      const ltNum = parseFloat(String(fieldValue));
      const ltThreshold = parseFloat(String(trigger.value));
      return !isNaN(ltNum) && !isNaN(ltThreshold) && ltNum < ltThreshold;
    }

    case 'isEmpty':
      return fieldValue === undefined || fieldValue === '';

    case 'isNotEmpty':
      return fieldValue !== undefined && fieldValue !== '';

    default:
      return false;
  }
}

/**
 * Evaluate all conditional rules and return field visibility
 */
export function evaluateConditionals(
  rules: ConditionalRule[],
  values: FieldValues,
  allFieldNames: string[]
): FieldVisibility {
  // Start with all fields visible
  const visibility: FieldVisibility = {};
  for (const name of allFieldNames) {
    visibility[name] = true;
  }

  // Apply each rule
  for (const rule of rules) {
    const triggered = evaluateTrigger(rule.trigger, values);

    if (triggered) {
      // Show specified fields
      if (rule.show) {
        for (const fieldName of rule.show) {
          visibility[fieldName] = true;
        }
      }

      // Hide specified fields
      if (rule.hide) {
        for (const fieldName of rule.hide) {
          visibility[fieldName] = false;
        }
      }
    }
  }

  return visibility;
}

/**
 * Get fields affected by conditional rules
 */
export function getConditionalFields(rules: ConditionalRule[]): Set<string> {
  const fields = new Set<string>();

  for (const rule of rules) {
    if (rule.show) {
      rule.show.forEach((f) => fields.add(f));
    }
    if (rule.hide) {
      rule.hide.forEach((f) => fields.add(f));
    }
  }

  return fields;
}

/**
 * Get trigger fields (fields that control conditionals)
 */
export function getTriggerFields(rules: ConditionalRule[]): Set<string> {
  const fields = new Set<string>();

  for (const rule of rules) {
    fields.add(rule.trigger.field);
  }

  return fields;
}

/**
 * Validate conditional rules against schema
 */
export function validateConditionalRules(
  rules: ConditionalRule[],
  schema: ParsedFormSchema
): string[] {
  const errors: string[] = [];
  const fieldNames = new Set(schema.fields.map((f) => f.name));

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];

    // Check trigger field exists
    if (!fieldNames.has(rule.trigger.field)) {
      errors.push(`Rule ${i + 1}: Trigger field '${rule.trigger.field}' does not exist`);
    }

    // Check show fields exist
    if (rule.show) {
      for (const fieldName of rule.show) {
        if (!fieldNames.has(fieldName)) {
          errors.push(`Rule ${i + 1}: Show field '${fieldName}' does not exist`);
        }
      }
    }

    // Check hide fields exist
    if (rule.hide) {
      for (const fieldName of rule.hide) {
        if (!fieldNames.has(fieldName)) {
          errors.push(`Rule ${i + 1}: Hide field '${fieldName}' does not exist`);
        }
      }
    }
  }

  return errors;
}

/**
 * Generate JavaScript code for client-side conditional logic
 */
export function generateConditionalScript(rules: ConditionalRule[]): string {
  if (rules.length === 0) {
    return '';
  }

  const triggerFields = getTriggerFields(rules);

  const ruleEvaluations = rules
    .map((rule, index) => {
      const conditionCode = generateConditionCode(rule.trigger);
      const showCode = (rule.show ?? []).map((f) => `showField('${f}');`).join('\n        ');
      const hideCode = (rule.hide ?? []).map((f) => `hideField('${f}');`).join('\n        ');

      return `
      // Rule ${index + 1}: ${rule.trigger.field} ${rule.trigger.operator ?? 'equals'} ${JSON.stringify(rule.trigger.value)}
      if (${conditionCode}) {
        ${showCode}
        ${hideCode}
      }`;
    })
    .join('\n');

  const eventListeners = Array.from(triggerFields)
    .map(
      (field) =>
        `document.getElementById('${field}')?.addEventListener('change', evaluateConditionals);`
    )
    .join('\n    ');

  return `
  // Conditional field visibility
  (function() {
    function showField(name) {
      const wrapper = document.querySelector('[data-field="' + name + '"]') ||
                      document.getElementById(name)?.closest('.form-group');
      if (wrapper) wrapper.style.display = '';
    }

    function hideField(name) {
      const wrapper = document.querySelector('[data-field="' + name + '"]') ||
                      document.getElementById(name)?.closest('.form-group');
      if (wrapper) wrapper.style.display = 'none';
    }

    function getFieldValue(name) {
      const field = document.getElementById(name);
      if (!field) return undefined;
      if (field.type === 'checkbox') return field.checked;
      if (field.type === 'radio') {
        const checked = document.querySelector('input[name="' + name + '"]:checked');
        return checked ? checked.value : undefined;
      }
      return field.value;
    }

    function evaluateConditionals() {
      ${ruleEvaluations}
    }

    document.addEventListener('DOMContentLoaded', function() {
      ${eventListeners}

      // Initial evaluation
      evaluateConditionals();
    });
  })();`;
}

/**
 * Generate JavaScript condition code for a trigger
 */
function generateConditionCode(trigger: ConditionalRule['trigger']): string {
  const fieldRef = `getFieldValue('${trigger.field}')`;
  const operator = trigger.operator ?? 'equals';
  const value = JSON.stringify(trigger.value);

  switch (operator) {
    case 'equals':
      if (Array.isArray(trigger.value)) {
        return `${value}.includes(String(${fieldRef}))`;
      }
      if (typeof trigger.value === 'boolean') {
        return `${fieldRef} === ${value}`;
      }
      return `String(${fieldRef}) === ${value}`;

    case 'notEquals':
      if (Array.isArray(trigger.value)) {
        return `!${value}.includes(String(${fieldRef}))`;
      }
      if (typeof trigger.value === 'boolean') {
        return `${fieldRef} !== ${value}`;
      }
      return `String(${fieldRef}) !== ${value}`;

    case 'contains':
      if (Array.isArray(trigger.value)) {
        return `${value}.some(v => String(${fieldRef}).includes(v))`;
      }
      return `String(${fieldRef}).includes(${value})`;

    case 'greaterThan':
      return `parseFloat(${fieldRef}) > ${value}`;

    case 'lessThan':
      return `parseFloat(${fieldRef}) < ${value}`;

    case 'isEmpty':
      return `(${fieldRef} === undefined || ${fieldRef} === '' || ${fieldRef} === null)`;

    case 'isNotEmpty':
      return `(${fieldRef} !== undefined && ${fieldRef} !== '' && ${fieldRef} !== null)`;

    default:
      return 'false';
  }
}
