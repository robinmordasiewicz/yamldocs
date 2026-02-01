/**
 * Calculated Fields Support
 * Enables formula-based field values in forms
 */

import type { ParsedFormSchema } from '../types/schema.js';

export interface CalculationDefinition {
  name: string;
  formula: string;
  format?: 'number' | 'currency' | 'percentage' | 'text';
  decimals?: number;
}

export type CalculationContext = Record<string, string | number | boolean | undefined>;

/**
 * Parse a formula string into tokens
 */
function tokenize(formula: string): string[] {
  // Split on operators while keeping them
  return formula
    .replace(/([+\-*/()])/g, ' $1 ')
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

/**
 * Evaluate a simple arithmetic formula
 * Supports: +, -, *, /, parentheses, field references
 */
export function evaluateFormula(formula: string, context: CalculationContext): number | null {
  try {
    const tokens = tokenize(formula);
    const expression = tokens
      .map((token) => {
        // Check if token is a field reference
        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token)) {
          const value = context[token];
          if (value === undefined || value === '') {
            return '0';
          }
          if (typeof value === 'boolean') {
            return value ? '1' : '0';
          }
          const num = parseFloat(String(value));
          return isNaN(num) ? '0' : String(num);
        }
        return token;
      })
      .join(' ');

    // Safely evaluate arithmetic expression (numbers and operators only)
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      console.warn(`Invalid formula expression: ${expression}`);
      return null;
    }

    // Use Function constructor for safe evaluation (only arithmetic)
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call
    const result = new Function(`return (${expression})`)() as unknown;
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch (error) {
    console.warn(`Failed to evaluate formula: ${formula}`, error);
    return null;
  }
}

/**
 * Format a calculated value
 */
export function formatCalculatedValue(
  value: number,
  format: CalculationDefinition['format'] = 'number',
  decimals = 2
): string {
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);

    case 'percentage':
      return new Intl.NumberFormat('en-US', {
        style: 'percent',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value / 100);

    case 'text':
      return String(value);

    case 'number':
    default:
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}

/**
 * Calculate all calculated fields in a schema
 */
export function calculateAllFields(
  schema: ParsedFormSchema,
  currentValues: CalculationContext
): Map<string, string> {
  const results = new Map<string, string>();
  const calculations = schema.calculations ?? [];

  for (const calc of calculations) {
    const value = evaluateFormula(calc.formula, currentValues);
    if (value !== null) {
      const formatted = formatCalculatedValue(value, calc.format, calc.decimals);
      results.set(calc.name, formatted);
    }
  }

  return results;
}

/**
 * Get calculation dependencies for a field
 */
export function getCalculationDependencies(formula: string): string[] {
  const tokens = tokenize(formula);
  return tokens.filter((token) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token));
}

/**
 * Sort calculations by dependency order
 */
export function sortCalculationsByDependency(
  calculations: CalculationDefinition[]
): CalculationDefinition[] {
  const sorted: CalculationDefinition[] = [];
  const remaining = [...calculations];
  const resolved = new Set<string>();

  // Simple topological sort
  let maxIterations = calculations.length * 2;
  while (remaining.length > 0 && maxIterations > 0) {
    maxIterations--;

    for (let i = remaining.length - 1; i >= 0; i--) {
      const calc = remaining[i];
      const deps = getCalculationDependencies(calc.formula);
      const unresolvedDeps = deps.filter(
        (dep) => !resolved.has(dep) && calculations.some((c) => c.name === dep)
      );

      if (unresolvedDeps.length === 0) {
        sorted.push(calc);
        resolved.add(calc.name);
        remaining.splice(i, 1);
      }
    }
  }

  // Add any remaining (might have circular dependencies)
  sorted.push(...remaining);

  return sorted;
}

/**
 * Generate JavaScript code for client-side calculations
 */
export function generateCalculationScript(calculations: CalculationDefinition[]): string {
  if (calculations.length === 0) {
    return '';
  }

  const sorted = sortCalculationsByDependency(calculations);

  const calcFunctions = sorted
    .map((calc) => {
      const deps = getCalculationDependencies(calc.formula);
      return `
      // Calculate ${calc.name}
      function calc_${calc.name}() {
        ${deps.map((dep) => `const ${dep} = parseFloat(document.getElementById('${dep}')?.value) || 0;`).join('\n        ')}
        const result = ${calc.formula};
        const formatted = ${formatFunctionCode(calc.format, calc.decimals)};
        const field = document.getElementById('${calc.name}');
        if (field) field.value = formatted;
      }`;
    })
    .join('\n');

  const eventListeners = sorted
    .flatMap((calc) => {
      const deps = getCalculationDependencies(calc.formula);
      return deps.map(
        (dep) => `document.getElementById('${dep}')?.addEventListener('input', calc_${calc.name});`
      );
    })
    .join('\n    ');

  return `
  // Calculated fields
  (function() {
    ${calcFunctions}

    // Attach event listeners
    document.addEventListener('DOMContentLoaded', function() {
      ${eventListeners}

      // Initial calculation
      ${sorted.map((c) => `calc_${c.name}();`).join('\n      ')}
    });
  })();`;
}

/**
 * Generate format function code for client-side
 */
function formatFunctionCode(
  format: CalculationDefinition['format'] = 'number',
  decimals = 2
): string {
  switch (format) {
    case 'currency':
      return `new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: ${decimals}, maximumFractionDigits: ${decimals} }).format(result)`;
    case 'percentage':
      return `new Intl.NumberFormat('en-US', { style: 'percent', minimumFractionDigits: ${decimals}, maximumFractionDigits: ${decimals} }).format(result / 100)`;
    case 'text':
      return `String(result)`;
    default:
      return `new Intl.NumberFormat('en-US', { minimumFractionDigits: ${decimals}, maximumFractionDigits: ${decimals} }).format(result)`;
  }
}
