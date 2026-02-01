/**
 * Validate Command
 * Validates form schema YAML files against the JSON Schema
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import type { ValidateOptions } from '../../types/index.js';
import { parseSchema, SchemaValidationError } from '../../parsers/schema.js';

export interface ValidateResult {
  valid: boolean;
  schemaPath: string;
  formId?: string;
  formTitle?: string;
  fieldCount?: number;
  errors?: { path: string; message: string }[];
}

/**
 * Execute the validate command
 */
export async function executeValidate(options: ValidateOptions): Promise<ValidateResult> {
  const schemaPath = resolve(options.schema);

  // Check if file exists
  if (!existsSync(schemaPath)) {
    return {
      valid: false,
      schemaPath,
      errors: [{ path: '/', message: `Schema file not found: ${schemaPath}` }],
    };
  }

  try {
    const schema = await parseSchema(schemaPath);

    return {
      valid: true,
      schemaPath,
      formId: schema.form.id,
      formTitle: schema.form.title,
      fieldCount: schema.fields.length,
    };
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      return {
        valid: false,
        schemaPath,
        errors: err.errors,
      };
    }

    const error = err as Error;
    return {
      valid: false,
      schemaPath,
      errors: [{ path: '/', message: error.message }],
    };
  }
}

/**
 * Print validation results
 */
export function printValidateResult(result: ValidateResult, verbose = false): void {
  console.log('');

  if (result.valid) {
    console.log(`${chalk.green('✓')} Schema is valid: ${chalk.cyan(result.schemaPath)}`);

    if (verbose) {
      console.log(chalk.gray('  Form ID:    ') + (result.formId ?? ''));
      console.log(chalk.gray('  Form Title: ') + (result.formTitle ?? ''));
      console.log(chalk.gray('  Fields:     ') + String(result.fieldCount ?? 0));
    }
  } else {
    console.log(`${chalk.red('✗')} Schema validation failed: ${chalk.cyan(result.schemaPath)}`);
    console.log('');

    if (result.errors) {
      console.log(chalk.yellow('Errors:'));
      for (const error of result.errors) {
        console.log(`  ${chalk.gray(error.path)}: ${error.message}`);
      }
    }
  }

  console.log('');
}
