/**
 * Generate Command
 * Generates PDF and HTML outputs from schema
 */

import { resolve, basename, extname } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import type { GenerateOptions, OutputFormat } from '../../types/index.js';
import { loadConfig, generateOutputFilename } from '../config.js';
import { parseSchema } from '../../parsers/schema.js';
import { generateAndSavePdf } from '../../generators/pdf/index.js';
import { generateAndSaveHtml } from '../../generators/html/index.js';

export interface GenerateResult {
  format: OutputFormat;
  outputPath: string;
  success: boolean;
  error?: string;
  details?: {
    fieldCount?: number;
    pageCount?: number;
  };
}

/**
 * Execute the generate command
 */
export async function executeGenerate(options: GenerateOptions): Promise<GenerateResult[]> {
  const results: GenerateResult[] = [];

  // Load configuration
  const config = await loadConfig(options);

  // Validate schema file
  const schemaPath = resolve(options.schema);
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  // Parse schema
  const schema = await parseSchema(schemaPath);
  if (options.verbose) {
    console.log(
      chalk.gray(`  Parsed schema: ${schema.form.title} (${schema.fields.length} fields)`)
    );
  }

  // Determine output formats
  const formats = config.output.formats;

  // Determine base output name from schema file
  const schemaName = basename(schemaPath, extname(schemaPath));
  const outputDir = resolve(options.output ?? config.output.directory);

  // Generate each format
  for (const format of formats) {
    const outputFilename = generateOutputFilename(
      config.output.filenameTemplate,
      schemaName,
      format,
      schema.form.version
    );
    const outputPath = resolve(outputDir, outputFilename);

    try {
      switch (format) {
        case 'pdf': {
          const pdfResult = await generateAndSavePdf({ schema, config: config.pdf }, outputPath);
          results.push({
            format,
            outputPath,
            success: true,
            details: {
              fieldCount: pdfResult.fieldCount,
              pageCount: pdfResult.pageCount,
            },
          });
          break;
        }

        case 'html':
          await generateAndSaveHtml({ schema, config: config.html }, outputPath);
          results.push({
            format,
            outputPath,
            success: true,
          });
          break;

        default: {
          const unknownFormat = format as string;
          results.push({
            format,
            outputPath,
            success: false,
            error: `Unknown format: ${unknownFormat}`,
          });
        }
      }
    } catch (err) {
      const error = err as Error;
      results.push({
        format,
        outputPath,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Print generate results
 */
export function printGenerateResults(results: GenerateResult[]): void {
  console.log('');
  for (const result of results) {
    if (result.success) {
      let message = `${chalk.green('✓')} Generated: ${chalk.cyan(result.outputPath)}`;
      if (result.details) {
        const details: string[] = [];
        if (result.details.fieldCount !== undefined) {
          details.push(`${result.details.fieldCount} form fields`);
        }
        if (result.details.pageCount !== undefined) {
          details.push(`${result.details.pageCount} pages`);
        }
        if (details.length > 0) {
          message += chalk.gray(` (${details.join(', ')})`);
        }
      }
      console.log(message);
    } else {
      console.log(
        `${chalk.red('✗')} Failed: ${result.format} - ${result.error ?? 'Unknown error'}`
      );
    }
  }
  console.log('');
}
