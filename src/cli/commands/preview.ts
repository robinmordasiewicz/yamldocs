/**
 * Preview Command
 * Previews form field definitions from schema (dry run)
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import type { PreviewOptions } from '../../types/index.js';
import { parseSchema, SchemaValidationError } from '../../parsers/schema.js';

export interface PreviewResult {
  success: boolean;
  schemaPath: string;
  formTitle?: string;
  formVersion?: string;
  pageCount?: number;
  fields?: PreviewField[];
  error?: string;
}

export interface PreviewField {
  name: string;
  type: string;
  label: string;
  page: number;
  required: boolean;
  position: string;
  options?: string[];
}

/**
 * Execute the preview command
 */
export async function executePreview(options: PreviewOptions): Promise<PreviewResult> {
  const schemaPath = resolve(options.schema);

  // Check if file exists
  if (!existsSync(schemaPath)) {
    return {
      success: false,
      schemaPath,
      error: `Schema file not found: ${schemaPath}`,
    };
  }

  try {
    const schema = await parseSchema(schemaPath);

    const fields: PreviewField[] = schema.fields.map((field) => ({
      name: field.name,
      type: field.type,
      label: field.label,
      page: field.page,
      required: field.required ?? false,
      position: `(${field.position.x}, ${field.position.y})`,
      options: field.options?.map((opt) => opt.label),
    }));

    return {
      success: true,
      schemaPath,
      formTitle: schema.form.title,
      formVersion: schema.form.version,
      pageCount: schema.form.pages ?? 1,
      fields,
    };
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      return {
        success: false,
        schemaPath,
        error: `Validation errors: ${err.errors.map((e) => e.message).join(', ')}`,
      };
    }

    const error = err as Error;
    return {
      success: false,
      schemaPath,
      error: error.message,
    };
  }
}

/**
 * Print preview results in table format
 */
export function printPreviewTable(result: PreviewResult): void {
  console.log('');

  if (!result.success) {
    console.log(`${chalk.red('✗')} Preview failed: ${result.error ?? 'Unknown error'}`);
    console.log('');
    return;
  }

  console.log(chalk.cyan('Form Preview'));
  console.log(chalk.gray('─'.repeat(60)));
  console.log(`${chalk.gray('Title:')}    ${result.formTitle ?? 'Untitled'}`);
  console.log(`${chalk.gray('Version:')}  ${result.formVersion ?? 'N/A'}`);
  console.log(`${chalk.gray('Pages:')}    ${String(result.pageCount ?? 0)}`);
  console.log(`${chalk.gray('Fields:')}   ${result.fields?.length ?? 0}`);
  console.log('');

  if (result.fields && result.fields.length > 0) {
    // Print table header
    const header = [
      chalk.bold('Name'.padEnd(20)),
      chalk.bold('Type'.padEnd(12)),
      chalk.bold('Page'.padEnd(6)),
      chalk.bold('Req'.padEnd(5)),
      chalk.bold('Label'),
    ].join(' ');

    console.log(header);
    console.log(chalk.gray('─'.repeat(80)));

    // Print fields
    for (const field of result.fields) {
      const row = [
        field.name.padEnd(20),
        field.type.padEnd(12),
        field.page.toString().padEnd(6),
        (field.required ? '✓' : '').padEnd(5),
        field.label,
      ].join(' ');

      console.log(row);

      // Print options if present
      if (field.options && field.options.length > 0) {
        console.log(chalk.gray(`${''.padEnd(20)} Options: ${field.options.join(', ')}`));
      }
    }
  }

  console.log('');
}

/**
 * Print preview results in JSON format
 */
export function printPreviewJson(result: PreviewResult): void {
  console.log(JSON.stringify(result, null, 2));
}

/**
 * Print preview results in YAML format
 */
export function printPreviewYaml(result: PreviewResult): void {
  const lines: string[] = [];

  if (!result.success) {
    lines.push(`success: false`);
    lines.push(`error: "${result.error ?? 'Unknown error'}"`);
  } else {
    lines.push(`success: true`);
    lines.push(`formTitle: "${result.formTitle ?? 'Untitled'}"`);
    lines.push(`formVersion: "${result.formVersion ?? 'N/A'}"`);
    lines.push(`pageCount: ${String(result.pageCount ?? 0)}`);
    lines.push(`fields:`);

    for (const field of result.fields || []) {
      lines.push(`  - name: "${field.name}"`);
      lines.push(`    type: "${field.type}"`);
      lines.push(`    label: "${field.label}"`);
      lines.push(`    page: ${field.page}`);
      lines.push(`    required: ${field.required}`);
      lines.push(`    position: "${field.position}"`);
      if (field.options) {
        lines.push(`    options: [${field.options.map((o) => `"${o}"`).join(', ')}]`);
      }
    }
  }

  console.log(lines.join('\n'));
}
