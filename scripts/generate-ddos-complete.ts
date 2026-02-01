#!/usr/bin/env npx tsx
/**
 * Generate DDoS Protection Sizing PDF - Complete Schema
 * Single-file schema with content elements and form fields
 */

import { mkdir } from 'fs/promises';
import { resolve, dirname } from 'path';
import { parseSchema } from '../src/parsers/schema.js';
import { generatePdf, savePdf } from '../src/generators/pdf/index.js';
import { getFormFields } from '../tests/helpers/acroform-inspector.js';
import {
  fieldsToLayoutElements,
  detectOverlaps,
  checkBoundaries,
} from '../tests/helpers/layout-analyzer.js';

const PROJECT_ROOT = resolve(dirname(import.meta.url.replace('file://', '')), '..');
const SCHEMA_FILE = resolve(PROJECT_ROOT, 'schemas/ddos-complete.yaml');
const OUTPUT_DIR = resolve(PROJECT_ROOT, 'dist');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'ddos-complete.pdf');

async function main() {
  console.log('DDoS PDF Generator (Complete Schema)');
  console.log('=====================================\n');

  try {
    // Parse schema
    console.log('Parsing schema...');
    const schema = await parseSchema(SCHEMA_FILE);
    console.log(`  Form ID: ${schema.form.id}`);
    console.log(`  Fields: ${schema.fields.length}`);
    console.log(`  Content elements: ${schema.content?.length ?? 0}`);
    console.log(`  Pages: ${String(schema.form.pages ?? 1)}`);
    console.log(`  Positioning: ${schema.form.positioning ?? 'relative'}`);

    // Generate PDF with schema content
    console.log('\nGenerating PDF (content + form fields)...');
    const pdf = await generatePdf({ schema });

    console.log(`  Pages generated: ${pdf.pageCount}`);
    console.log(`  Fields created: ${pdf.fieldCount}`);
    console.log(`  Size: ${(pdf.bytes.length / 1024).toFixed(1)} KB`);
    console.log(`  Drawn elements tracked: ${pdf.drawnElements?.length ?? 0}`);

    // Validate PDF
    console.log('\nValidating PDF...');

    const fields = await getFormFields(pdf.bytes);
    console.log(`  AcroForm fields found: ${fields.length}`);

    // Show page distribution
    const pageDistribution = fields.reduce<Record<number, number>>((acc, f) => {
      acc[f.page] = (acc[f.page] || 0) + 1;
      return acc;
    }, {});
    console.log('  Fields by page:', pageDistribution);

    const fieldTypes = fields.reduce<Record<string, number>>((acc, f) => {
      const type = f.type ?? 'unknown';
      acc[type] = (acc[type] ?? 0) + 1;
      return acc;
    }, {});
    console.log('  Field types:', fieldTypes);

    // Content element statistics
    if (pdf.drawnElements && pdf.drawnElements.length > 0) {
      const elementTypes = pdf.drawnElements.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {});
      console.log('\n  Content elements by type:', elementTypes);

      const elemByPage = pdf.drawnElements.reduce<Record<number, number>>((acc, e) => {
        acc[e.page] = (acc[e.page] || 0) + 1;
        return acc;
      }, {});
      console.log('  Content elements by page:', elemByPage);
    }

    // Check overlaps
    const elements = fieldsToLayoutElements(fields);
    const overlaps = detectOverlaps(elements);
    console.log(`\n  Field overlaps: ${overlaps.length}`);
    if (overlaps.length > 0) {
      console.log('  Overlap details (first 5):');
      for (const o of overlaps.slice(0, 5)) {
        console.log(
          `    - ${o.element1.name ?? 'unknown'} ↔ ${o.element2.name ?? 'unknown'} (${o.overlapArea.toFixed(1)}px²)`
        );
      }
    }

    // Check boundaries
    const pageSize = { width: 612, height: 792 };
    const margins = { top: 72, bottom: 72, left: 71, right: 71 };
    const violations = checkBoundaries(elements, pageSize, margins);
    console.log(`  Boundary violations: ${violations.length}`);
    if (violations.length > 0) {
      console.log('  Violation details (first 10):');
      for (const v of violations.slice(0, 10)) {
        console.log(
          `    - ${v.element.name ?? 'unknown'}: ${v.violation} by ${v.overflow.toFixed(1)}pt (y=${v.element.bounds.y})`
        );
      }
    }

    // Save PDF
    await mkdir(OUTPUT_DIR, { recursive: true });
    console.log(`\nSaving to: ${OUTPUT_FILE}`);
    await savePdf(pdf, OUTPUT_FILE);

    // Summary
    console.log(`\n${'='.repeat(50)}`);
    if (overlaps.length === 0 && violations.length === 0) {
      console.log('✅ PDF passes all quality checks!');
    } else {
      console.log('⚠️  Layout issues found:');
      if (overlaps.length > 0) console.log(`   - ${overlaps.length} overlaps`);
      if (violations.length > 0) console.log(`   - ${violations.length} boundary violations`);
    }
    console.log('='.repeat(50));

    // Final comparison note
    console.log('\n📊 File size comparison:');
    console.log(
      `   ddos-complete.pdf: ${(pdf.bytes.length / 1024).toFixed(1)} KB (content + form)`
    );
    console.log('   Expected: ~150-200 KB with all content and form fields');
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

void main();
