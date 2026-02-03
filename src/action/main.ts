/**
 * GitHub Action Main Logic
 * Handles input parsing, schema processing, and output generation
 */

import * as core from '@actions/core';
import * as glob from '@actions/glob';
import { resolve, basename, dirname, join } from 'path';
import { mkdir } from 'fs/promises';
import { parseSchema, SchemaValidationError } from '../parsers/schema.js';
import { generatePdf, savePdf } from '../generators/pdf/index.js';
import { generateHtml, saveHtml } from '../generators/html/index.js';
import { generateDocx, saveDocx } from '../generators/docx/index.js';
import { publish, parsePublishOptions, type PublishOptions } from './publish/index.js';
import { generateIndexPage, createGeneratedFiles } from './publish/index-generator.js';

interface ActionInputs {
  command: 'generate' | 'validate';
  schema: string;
  output: string;
  format: string[];
  failOnError: boolean;
  publish: PublishOptions;
}

interface GenerationResult {
  file: string;
  type: 'pdf' | 'html' | 'docx';
  success: boolean;
  error?: string;
}

interface ValidationError {
  file: string;
  errors: { path: string; message: string }[];
}

/**
 * Parse action inputs from environment
 */
function getInputs(): ActionInputs {
  const command = core.getInput('command') || 'generate';
  const schema = core.getInput('schema', { required: true });
  const output = core.getInput('output') || 'dist';
  const formatInput = core.getInput('format') || 'pdf';
  const failOnError = core.getBooleanInput('fail-on-error');

  // Parse publish options
  const publishEnabled = core.getBooleanInput('publish');
  const publishMethod = core.getInput('publish-method') || 'pages-api';
  const pagesBranch = core.getInput('pages-branch') || 'gh-pages';
  const generateIndex = core.getBooleanInput('generate-index');
  const indexTitle = core.getInput('index-title') || 'Generated Documents';

  // Parse format input
  const format = formatInput
    .split(',')
    .map((f) => f.trim().toLowerCase())
    .filter((f) => f === 'pdf' || f === 'html' || f === 'docx');

  if (format.length === 0) {
    format.push('pdf');
  }

  if (command !== 'generate' && command !== 'validate') {
    throw new Error(`Invalid command: ${command}. Must be 'generate' or 'validate'.`);
  }

  return {
    command,
    schema,
    output,
    format,
    failOnError,
    publish: parsePublishOptions(
      publishEnabled,
      publishMethod,
      pagesBranch,
      generateIndex,
      indexTitle
    ),
  };
}

/**
 * Find schema files matching the input pattern
 */
async function findSchemaFiles(pattern: string): Promise<string[]> {
  const globber = await glob.create(pattern, {
    followSymbolicLinks: false,
  });

  const files = await globber.glob();

  // Filter for YAML files only
  return files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
}

/**
 * Validate a single schema file
 */
async function validateSchemaFile(
  filePath: string
): Promise<{ valid: boolean; errors?: { path: string; message: string }[] }> {
  try {
    await parseSchema(filePath);
    return { valid: true };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return { valid: false, errors: error.errors };
    }
    return {
      valid: false,
      errors: [{ path: '/', message: error instanceof Error ? error.message : String(error) }],
    };
  }
}

/**
 * Generate documents from a schema file
 */
async function generateFromSchema(
  schemaPath: string,
  outputDir: string,
  formats: string[]
): Promise<GenerationResult[]> {
  const results: GenerationResult[] = [];
  const schemaName = basename(schemaPath, '.yaml').replace('.yml', '');
  const schemaDir = dirname(schemaPath);

  try {
    // Parse schema
    const schema = await parseSchema(schemaPath);

    // Ensure output directory exists
    await mkdir(outputDir, { recursive: true });

    // Generate PDF if requested
    if (formats.includes('pdf')) {
      try {
        const pdf = await generatePdf({
          schema,
          basePath: schemaDir,
        });

        const pdfPath = join(outputDir, `${schemaName}.pdf`);
        await savePdf(pdf, pdfPath);

        results.push({
          file: pdfPath,
          type: 'pdf',
          success: true,
        });

        core.info(
          `✅ Generated PDF: ${pdfPath} (${pdf.fieldCount} fields, ${pdf.pageCount} pages)`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          file: join(outputDir, `${schemaName}.pdf`),
          type: 'pdf',
          success: false,
          error: errorMessage,
        });
        core.error(`❌ Failed to generate PDF for ${schemaPath}: ${errorMessage}`);
      }
    }

    // Generate HTML if requested
    if (formats.includes('html')) {
      try {
        const html = await generateHtml({ schema });
        const htmlPath = join(outputDir, `${schemaName}.html`);
        await saveHtml(html, htmlPath);

        results.push({
          file: htmlPath,
          type: 'html',
          success: true,
        });

        core.info(`✅ Generated HTML: ${htmlPath}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          file: join(outputDir, `${schemaName}.html`),
          type: 'html',
          success: false,
          error: errorMessage,
        });
        core.error(`❌ Failed to generate HTML for ${schemaPath}: ${errorMessage}`);
      }
    }

    // Generate DOCX if requested
    if (formats.includes('docx')) {
      try {
        const docx = await generateDocx({
          schema,
          basePath: schemaDir,
        });

        const docxPath = join(outputDir, `${schemaName}.docx`);
        await saveDocx(docx, docxPath);

        results.push({
          file: docxPath,
          type: 'docx',
          success: true,
        });

        core.info(
          `✅ Generated DOCX: ${docxPath} (${docx.fieldCount} fields, ${docx.pageCount} pages)`
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          file: join(outputDir, `${schemaName}.docx`),
          type: 'docx',
          success: false,
          error: errorMessage,
        });
        core.error(`❌ Failed to generate DOCX for ${schemaPath}: ${errorMessage}`);
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    core.error(`❌ Failed to parse schema ${schemaPath}: ${errorMessage}`);

    // Add failure results for all requested formats
    for (const format of formats) {
      results.push({
        file: join(outputDir, `${schemaName}.${format}`),
        type: format as 'pdf' | 'html' | 'docx',
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Run the validate command
 */
async function runValidate(inputs: ActionInputs): Promise<void> {
  core.info(`🔍 Validating schemas: ${inputs.schema}`);

  const files = await findSchemaFiles(inputs.schema);

  if (files.length === 0) {
    core.warning(`No schema files found matching: ${inputs.schema}`);
    return;
  }

  core.info(`Found ${files.length} schema file(s)`);

  const validationErrors: ValidationError[] = [];
  let validCount = 0;

  for (const file of files) {
    const result = await validateSchemaFile(file);

    if (result.valid) {
      core.info(`✅ ${file}: Valid`);
      validCount++;
    } else {
      core.error(`❌ ${file}: Invalid`);
      validationErrors.push({
        file,
        errors: result.errors ?? [],
      });

      // Log individual errors
      for (const err of result.errors ?? []) {
        core.error(`   ${err.path}: ${err.message}`);
      }
    }
  }

  // Set outputs
  core.setOutput('validation-errors', JSON.stringify(validationErrors));

  // Summary
  core.info('');
  core.info(`📊 Validation Summary: ${validCount}/${files.length} valid`);

  if (validationErrors.length > 0 && inputs.failOnError) {
    core.setFailed(`${validationErrors.length} schema(s) failed validation`);
  }
}

/**
 * Run the generate command
 */
async function runGenerate(inputs: ActionInputs): Promise<void> {
  core.info(`📄 Generating documents from: ${inputs.schema}`);
  core.info(`   Output: ${inputs.output}`);
  core.info(`   Formats: ${inputs.format.join(', ')}`);

  const files = await findSchemaFiles(inputs.schema);

  if (files.length === 0) {
    core.warning(`No schema files found matching: ${inputs.schema}`);
    core.setOutput('files', JSON.stringify([]));
    core.setOutput('pdf-count', '0');
    core.setOutput('html-count', '0');
    core.setOutput('docx-count', '0');
    return;
  }

  core.info(`Found ${files.length} schema file(s)`);

  const allResults: GenerationResult[] = [];
  const validationErrors: ValidationError[] = [];

  for (const file of files) {
    core.info(`\n📝 Processing: ${file}`);

    const results = await generateFromSchema(file, resolve(inputs.output), inputs.format);
    allResults.push(...results);

    // Check for failures that indicate validation errors
    const failures = results.filter((r) => !r.success);
    if (failures.length > 0) {
      validationErrors.push({
        file,
        errors: failures.map((f) => ({ path: '/', message: f.error ?? 'Unknown error' })),
      });
    }
  }

  // Calculate counts
  const successfulFiles = allResults.filter((r) => r.success).map((r) => r.file);
  const pdfCount = allResults.filter((r) => r.type === 'pdf' && r.success).length;
  const htmlCount = allResults.filter((r) => r.type === 'html' && r.success).length;
  const docxCount = allResults.filter((r) => r.type === 'docx' && r.success).length;
  const failureCount = allResults.filter((r) => !r.success).length;

  // Set outputs
  core.setOutput('files', JSON.stringify(successfulFiles));
  core.setOutput('pdf-count', String(pdfCount));
  core.setOutput('html-count', String(htmlCount));
  core.setOutput('docx-count', String(docxCount));
  core.setOutput('validation-errors', JSON.stringify(validationErrors));

  // Summary
  core.info('');
  core.info('📊 Generation Summary:');
  core.info(`   PDF files: ${pdfCount}`);
  core.info(`   HTML files: ${htmlCount}`);
  core.info(`   DOCX files: ${docxCount}`);

  if (failureCount > 0) {
    core.info(`   Failures: ${failureCount}`);

    if (inputs.failOnError) {
      core.setFailed(`${failureCount} file(s) failed to generate`);
      return;
    }
  }

  // Generate index page if requested (runs even when publishing is disabled)
  if (inputs.publish.generateIndex && successfulFiles.length > 0) {
    try {
      const files = createGeneratedFiles(successfulFiles);
      const indexFile = await generateIndexPage({
        title: inputs.publish.indexTitle,
        files,
        outputDir: resolve(inputs.output),
      });
      core.setOutput('index-file', indexFile);
      core.info(`✅ Generated index: ${indexFile}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      core.warning(`⚠️ Failed to generate index page: ${errorMessage}`);
    }
  }

  // Publish to GitHub Pages if enabled
  if (inputs.publish.enabled && successfulFiles.length > 0) {
    const publishResult = await publish({
      options: inputs.publish,
      outputDir: resolve(inputs.output),
      generatedFiles: successfulFiles,
    });

    // Set publish outputs
    if (publishResult.pagesUrl) {
      core.setOutput('pages-url', publishResult.pagesUrl);
    }
    if (publishResult.indexFile) {
      core.setOutput('index-file', publishResult.indexFile);
    }
    if (publishResult.artifactPath) {
      core.setOutput('pages-artifact-path', publishResult.artifactPath);
    }

    if (!publishResult.success && inputs.failOnError) {
      core.setFailed(`Publishing failed: ${publishResult.error ?? 'Unknown error'}`);
    }
  }
}

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
  try {
    const inputs = getInputs();

    core.info('🚀 yamlforms GitHub Action');
    core.info(`   Command: ${inputs.command}`);

    switch (inputs.command) {
      case 'validate':
        await runValidate(inputs);
        break;
      case 'generate':
        await runGenerate(inputs);
        break;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`Action failed: ${message}`);
  }
}
