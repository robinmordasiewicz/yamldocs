#!/usr/bin/env npx tsx
/**
 * Build All Schemas
 * Processes all YAML schemas in schemas/ folder
 * Generates both PDF and HTML for each schema
 * Creates index page listing all documents
 */

import { mkdir, readdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { parseSchema } from '../src/parsers/schema.js';
import { generatePdf, savePdf } from '../src/generators/pdf/index.js';
import { generateHtml, saveHtml } from '../src/generators/html/index.js';

const PROJECT_ROOT = resolve(dirname(import.meta.url.replace('file://', '')), '..');
const SCHEMAS_DIR = resolve(PROJECT_ROOT, 'schemas');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'dist/schemas');

interface SchemaResult {
  name: string;
  title: string;
  pdfPath: string;
  htmlPath: string;
  pdfSize: number;
  htmlSize: number;
  success: boolean;
  error?: string;
}

async function main() {
  console.log('Schema Document Generator');
  console.log('=========================\n');

  // Check if schemas directory exists
  if (!existsSync(SCHEMAS_DIR)) {
    console.log('No schemas/ directory found. Skipping schema generation.');
    console.log('This is expected when yamldocs is used as a library.');
    await mkdir(OUTPUT_DIR, { recursive: true });
    const indexHtml = generateIndexPage([]);
    await writeFile(resolve(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log('Empty index page created.\n');
    return;
  }

  // Find all YAML schemas
  const files = await readdir(SCHEMAS_DIR);
  const yamlFiles = files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));

  if (yamlFiles.length === 0) {
    console.log('No schema files found in schemas/ directory');
    await mkdir(OUTPUT_DIR, { recursive: true });
    const indexHtml = generateIndexPage([]);
    await writeFile(resolve(OUTPUT_DIR, 'index.html'), indexHtml);
    console.log('Empty index page created.\n');
    return;
  }

  console.log(`Found ${yamlFiles.length} schema file(s):\n`);

  const results: SchemaResult[] = [];

  for (const file of yamlFiles) {
    const schemaPath = resolve(SCHEMAS_DIR, file);
    const schemaName = basename(file, '.yaml').replace('.yml', '');
    const outputSubdir = resolve(OUTPUT_DIR, schemaName);

    console.log(`Processing: ${file}`);

    try {
      // Parse schema
      const schema = await parseSchema(schemaPath);
      console.log(`  Title: ${schema.form.title}`);
      console.log(`  Fields: ${schema.fields.length}`);
      console.log(`  Content elements: ${schema.content?.length ?? 0}`);

      // Create output directory
      await mkdir(outputSubdir, { recursive: true });

      // Generate PDF
      console.log('  Generating PDF...');
      const pdf = await generatePdf({ schema });
      const pdfPath = resolve(outputSubdir, `${schemaName}.pdf`);
      await savePdf(pdf, pdfPath);
      console.log(`    PDF: ${(pdf.bytes.length / 1024).toFixed(1)} KB`);

      // Generate HTML
      console.log('  Generating HTML...');
      const html = await generateHtml({ schema });
      const htmlPath = resolve(outputSubdir, `${schemaName}.html`);
      await saveHtml(html, htmlPath);
      const htmlSize = new TextEncoder().encode(html).length;
      console.log(`    HTML: ${(htmlSize / 1024).toFixed(1)} KB`);

      results.push({
        name: schemaName,
        title: schema.form.title,
        pdfPath: `${schemaName}/${schemaName}.pdf`,
        htmlPath: `${schemaName}/${schemaName}.html`,
        pdfSize: pdf.bytes.length,
        htmlSize,
        success: true,
      });

      console.log('  Done!\n');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  Error: ${errorMessage}\n`);
      results.push({
        name: schemaName,
        title: schemaName,
        pdfPath: '',
        htmlPath: '',
        pdfSize: 0,
        htmlSize: 0,
        success: false,
        error: errorMessage,
      });
    }
  }

  // Generate index page
  console.log('Generating index page...');
  const indexHtml = generateIndexPage(results);
  await writeFile(resolve(OUTPUT_DIR, 'index.html'), indexHtml);
  console.log('  Index page created\n');

  // Summary
  console.log('=========================');
  console.log('Summary:');
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  console.log(`  Successful: ${successful.length}`);
  console.log(`  Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log('\nFailed schemas:');
    for (const f of failed) {
      const errorMsg = f.error instanceof Error ? f.error.message : String(f.error);
      console.log(`  - ${f.name}: ${errorMsg}`);
    }
  }

  console.log('\nOutput directory:', OUTPUT_DIR);
}

function generateIndexPage(results: SchemaResult[]): string {
  const successful = results.filter((r) => r.success);

  const schemaList = successful
    .map(
      (r) => `
        <li>
          <strong>${escapeHtml(r.title)}</strong>
          <span class="format">
            [<a href="${r.htmlPath}">HTML</a>]
            [<a href="${r.pdfPath}">PDF</a>]
          </span>
          <span class="size">(${(r.pdfSize / 1024).toFixed(0)} KB)</span>
        </li>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schema Documents</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
      line-height: 1.6;
    }
    h1 { color: #333; margin-bottom: 0.5rem; }
    .subtitle { color: #666; margin-bottom: 2rem; }
    ul { list-style: none; padding: 0; }
    li { margin: 1rem 0; padding: 0.75rem; background: #f9f9f9; border-radius: 4px; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .format { color: #666; font-size: 0.9em; margin-left: 0.5rem; }
    .size { color: #999; font-size: 0.8em; margin-left: 0.5rem; }
    footer { margin-top: 3rem; color: #999; font-size: 0.85em; border-top: 1px solid #eee; padding-top: 1rem; }
  </style>
</head>
<body>
  <h1>Schema Documents</h1>
  <p class="subtitle">Generated from YAML schema files</p>

  ${successful.length > 0 ? `<ul>${schemaList}</ul>` : '<p>No documents available.</p>'}

  <footer>
    <p>Generated by yamldocs on ${new Date().toISOString().split('T')[0]}</p>
  </footer>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

void main();
