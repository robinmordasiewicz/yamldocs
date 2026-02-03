/**
 * YAML Schema Parser
 * Parses and validates form schema YAML files
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'js-yaml';
import Ajv from 'ajv';
import type {
  FormSchema,
  ParsedFormSchema,
  FormField,
  NormalizedFormField,
  NormalizedFieldOption,
  FieldOption,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load the JSON Schema for validation
async function loadJsonSchema(): Promise<object> {
  // Support both installed (dist/schemas/) and development (src/schemas/) paths
  const possiblePaths = [
    resolve(__dirname, '../schemas/form-schema.json'), // Installed: dist/schemas/
    resolve(__dirname, '../../src/schemas/form-schema.json'), // Dev: src/schemas/
  ];

  for (const schemaPath of possiblePaths) {
    if (existsSync(schemaPath)) {
      const schemaContent = await readFile(schemaPath, 'utf-8');
      return JSON.parse(schemaContent) as object;
    }
  }
  throw new Error('form-schema.json not found. Try reinstalling yamldocs.');
}

/**
 * Normalize field options to always have value and label
 */
export function normalizeFieldOptions(
  options: (FieldOption | string)[] | undefined
): NormalizedFieldOption[] {
  if (!options) return [];

  return options.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });
}

/**
 * Normalize a form field
 */
function normalizeField(field: FormField): NormalizedFormField {
  return {
    ...field,
    options: normalizeFieldOptions(field.options),
  };
}

/**
 * Validation error with details
 */
export class SchemaValidationError extends Error {
  constructor(
    message: string,
    public errors: { path: string; message: string }[]
  ) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Parse and validate a form schema from a YAML file
 */
export async function parseSchema(filePath: string): Promise<ParsedFormSchema> {
  // Check if file exists
  const resolvedPath = resolve(filePath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`Schema file not found: ${resolvedPath}`);
  }

  // Read and parse YAML
  const content = await readFile(resolvedPath, 'utf-8');
  let schema: FormSchema;

  try {
    schema = yaml.load(content) as FormSchema;
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to parse YAML: ${error.message}`);
  }

  // Validate against JSON Schema
  const jsonSchema = await loadJsonSchema();
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(jsonSchema);

  if (!validate(schema)) {
    const errors = (validate.errors || []).map((err) => ({
      path: err.instancePath || '/',
      message: err.message || 'Unknown validation error',
    }));

    throw new SchemaValidationError(
      `Schema validation failed with ${errors.length} error(s)`,
      errors
    );
  }

  // Apply auto-numbering to fields and tables if enabled
  if (schema.form?.numbering && schema.content) {
    let counter = 0;
    for (const element of schema.content) {
      if (element.type === 'field') {
        counter++;
        const fieldElement = element;
        fieldElement.label = `${counter}. ${fieldElement.label}`;
      } else if (element.type === 'table') {
        counter++;
        const tableElement = element;
        // Prepend number to existing label, or create label with just the number
        tableElement.label = tableElement.label
          ? `${counter}. ${tableElement.label}`
          : `${counter}.`;
      }
    }
  }

  // Normalize fields
  const normalizedFields = schema.fields.map(normalizeField);

  // Validate field names are unique
  const fieldNames = new Set<string>();
  for (const field of normalizedFields) {
    if (fieldNames.has(field.name)) {
      throw new SchemaValidationError(`Duplicate field name: ${field.name}`, [
        { path: `/fields/${field.name}`, message: 'Field name must be unique' },
      ]);
    }
    fieldNames.add(field.name);
  }

  // Validate page numbers
  const maxPage = schema.form.pages || 1;
  for (const field of normalizedFields) {
    if (field.page > maxPage) {
      throw new SchemaValidationError(
        `Field "${field.name}" is on page ${field.page}, but form only has ${maxPage} page(s)`,
        [
          {
            path: `/fields/${field.name}/page`,
            message: `Page number exceeds form page count`,
          },
        ]
      );
    }
  }

  // Validate conditional field references
  if (schema.conditionalFields) {
    for (const conditional of schema.conditionalFields) {
      if (!fieldNames.has(conditional.trigger.field)) {
        throw new SchemaValidationError(
          `Conditional trigger references unknown field: ${conditional.trigger.field}`,
          [
            {
              path: '/conditionalFields/trigger/field',
              message: 'Referenced field does not exist',
            },
          ]
        );
      }

      const referencedFields = [
        ...(conditional.show || []),
        ...(conditional.hide || []),
        ...(conditional.enable || []),
        ...(conditional.disable || []),
      ];

      for (const fieldName of referencedFields) {
        if (!fieldNames.has(fieldName)) {
          throw new SchemaValidationError(`Conditional references unknown field: ${fieldName}`, [
            {
              path: '/conditionalFields',
              message: `Referenced field "${fieldName}" does not exist`,
            },
          ]);
        }
      }
    }
  }

  // Validate calculated field references
  if (schema.calculations) {
    for (const calc of schema.calculations) {
      // Simple check for field references in formula
      // This is a basic implementation - could be enhanced with proper expression parsing
      const formulaTokens = calc.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
      for (const token of formulaTokens) {
        // Skip known operators and functions
        if (['sum', 'avg', 'min', 'max', 'if', 'and', 'or'].includes(token.toLowerCase())) {
          continue;
        }
        // Check if token might be a field reference
        if (fieldNames.has(token) || schema.calculations.some((c) => c.name === token)) {
          continue;
        }
      }
    }
  }

  return {
    ...schema,
    fields: normalizedFields,
  };
}

/**
 * Parse schema from a YAML string
 */
export async function parseSchemaFromString(content: string): Promise<ParsedFormSchema> {
  let schema: FormSchema;

  try {
    schema = yaml.load(content) as FormSchema;
  } catch (err) {
    const error = err as Error;
    throw new Error(`Failed to parse YAML: ${error.message}`);
  }

  // Validate against JSON Schema
  const jsonSchema = await loadJsonSchema();
  const ajv = new Ajv({ allErrors: true, strict: false });
  const validate = ajv.compile(jsonSchema);

  if (!validate(schema)) {
    const errors = (validate.errors || []).map((err) => ({
      path: err.instancePath || '/',
      message: err.message || 'Unknown validation error',
    }));

    throw new SchemaValidationError(
      `Schema validation failed with ${errors.length} error(s)`,
      errors
    );
  }

  // Normalize fields
  const normalizedFields = schema.fields.map(normalizeField);

  return {
    ...schema,
    fields: normalizedFields,
  };
}

/**
 * Get field by name from schema
 */
export function getFieldByName(
  schema: ParsedFormSchema,
  name: string
): NormalizedFormField | undefined {
  return schema.fields.find((f) => f.name === name);
}

/**
 * Get fields for a specific page
 */
export function getFieldsByPage(schema: ParsedFormSchema, page: number): NormalizedFormField[] {
  return schema.fields.filter((f) => f.page === page);
}

/**
 * Get required fields
 */
export function getRequiredFields(schema: ParsedFormSchema): NormalizedFormField[] {
  return schema.fields.filter((f) => f.required);
}
