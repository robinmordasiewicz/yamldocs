/**
 * PDF Generator
 * Creates fillable PDF forms with AcroForm fields
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { PDFDocument } from 'pdf-lib';
import type { ParsedFormSchema, NormalizedFormField, PdfConfig } from '../../types/index.js';
import type { ResolvedStylesheet } from '../../types/stylesheet.js';
import { DEFAULT_CONFIG } from '../../types/index.js';
import { parseStylesheet, getDefaultStylesheet } from '../../parsers/stylesheet.js';
import {
  createTextField,
  drawFieldLabel,
  createCheckboxField,
  drawCheckboxLabel,
  createRadioGroup,
  drawRadioGroupLabels,
  createDropdownField,
  drawDropdownLabel,
  createTextareaField,
  drawTextareaLabel,
  createSignatureField,
  drawSignatureFieldWithLabel,
} from './fields/index.js';
import {
  initializeLayout,
  drawTitle,
  drawHeader,
  drawFooter,
  nextPage,
  type LayoutContext,
  type DrawnElement,
} from './layout.js';
import { drawSchemaContent } from './content.js';
import { drawCoverPage } from './coverpage.js';
import { resolveFooterConfig } from '../footer-utils.js';

export interface PdfGeneratorOptions {
  schema: ParsedFormSchema;
  config?: Partial<PdfConfig>;
  /** Base directory for resolving relative stylesheet paths */
  basePath?: string;
}

export interface GeneratedPdf {
  bytes: Uint8Array;
  fieldCount: number;
  pageCount: number;
  /** Tracked drawn elements for overlap detection */
  drawnElements?: DrawnElement[];
}

/**
 * Generate a fillable PDF from schema
 */
export async function generatePdf(options: PdfGeneratorOptions): Promise<GeneratedPdf> {
  const { schema, config = {}, basePath = process.cwd() } = options;

  // Merge config with defaults
  const pdfConfig: Required<PdfConfig> = {
    ...DEFAULT_CONFIG.pdf,
    ...config,
    margins: { ...DEFAULT_CONFIG.pdf.margins, ...(config.margins ?? {}) },
    fonts: { ...DEFAULT_CONFIG.pdf.fonts, ...(config.fonts ?? {}) },
  };

  // Load stylesheet - from schema path or use defaults
  let stylesheet: ResolvedStylesheet;
  if (schema.form.stylesheet) {
    const stylesheetPath = resolve(basePath, schema.form.stylesheet);
    stylesheet = await parseStylesheet(stylesheetPath);
  } else {
    stylesheet = getDefaultStylesheet();
  }

  // Create PDF document
  const doc = await PDFDocument.create();

  // Set document metadata
  doc.setTitle(schema.form.title);
  if (schema.form.author) {
    doc.setAuthor(schema.form.author);
  }
  doc.setCreator('yamldocs');
  doc.setProducer('pdf-lib');
  doc.setCreationDate(new Date());

  // Initialize layout with stylesheet
  const hasCoverPage = !!schema.coverPage;
  const pageCount = schema.form.pages ?? 1;
  const totalPages = hasCoverPage ? pageCount + 1 : pageCount;
  const ctx = initializeLayout(doc, pdfConfig, totalPages, stylesheet);

  // Draw cover page if configured
  if (hasCoverPage && schema.coverPage) {
    await drawCoverPage(ctx, schema.form, schema.coverPage, basePath);
    // Move to next page for content — cover page has no header/footer
    nextPage(ctx);
  }

  // Draw header and footer on content pages only (skip cover page)
  const startPage = hasCoverPage ? 1 : 0;
  await drawHeader(ctx, schema.form.title, { pageNumber: true, startPage });

  const resolvedFooter = resolveFooterConfig(schema.footer, schema.form);
  await drawFooter(ctx, resolvedFooter, { startPage });

  // Draw content: use schema content when available
  const hasSchemaContentToDraw = schema.content && schema.content.length > 0;
  if (hasSchemaContentToDraw && schema.content) {
    // Draw schema-defined content elements using flow positioning
    await drawSchemaContent(ctx, schema.content);
  } else {
    // Draw form title only
    await drawTitle(ctx, schema.form.title, { centered: true });
  }

  // Add form fields - positions are relative to content baseline
  const contentBaselineY = ctx.cursor.y;

  // Skip field labels when schema content provides the context (text field labels above)

  // Page offset: when cover page is present, schema page 1 maps to array index 1
  const pageOffset = hasCoverPage ? 1 : 0;

  let fieldCount = 0;
  for (const field of schema.fields) {
    const adjustedField = adjustFieldPosition(field, contentBaselineY);
    await addFieldToDocument(doc, ctx, adjustedField, hasSchemaContentToDraw, pageOffset);
    fieldCount++;
  }

  // Serialize PDF
  const bytes = await doc.save();

  return {
    bytes,
    fieldCount,
    pageCount: ctx.pages.length,
    drawnElements: ctx.drawnElements,
  };
}

/**
 * Adjust field position relative to content baseline (flow mode).
 * Field y positions are offsets from the content baseline:
 *   y=0   -> at content baseline
 *   y=-50 -> 50pt below baseline
 */
function adjustFieldPosition(
  field: NormalizedFormField,
  contentBaselineY: number
): NormalizedFormField {
  // Only adjust fields on page 1 (where content is drawn)
  if (field.page !== 1) {
    return field;
  }

  return {
    ...field,
    position: {
      ...field.position,
      y: contentBaselineY + field.position.y,
    },
  };
}

/**
 * Add a form field to the document
 * @param skipLabels - When true, skip drawing field labels (useful when schema content provides labels)
 */
async function addFieldToDocument(
  doc: PDFDocument,
  ctx: LayoutContext,
  field: NormalizedFormField,
  skipLabels = false,
  pageOffset = 0
): Promise<void> {
  // Get the appropriate page (1-indexed in schema, 0-indexed in array)
  // pageOffset accounts for cover page occupying index 0
  const pageIndex = Math.min(field.page - 1 + pageOffset, ctx.pages.length - 1);
  const page = ctx.pages[pageIndex];
  const stylesheet = ctx.stylesheet;

  switch (field.type) {
    case 'text':
      createTextField(doc, page, field, stylesheet);
      if (!skipLabels) {
        await drawFieldLabel(doc, page, field, stylesheet);
      }
      break;

    case 'checkbox':
      createCheckboxField(doc, page, field, stylesheet);
      // Checkbox labels are drawn next to the checkbox, always needed
      await drawCheckboxLabel(doc, page, field, stylesheet);
      break;

    case 'radio':
      createRadioGroup(doc, page, field, stylesheet);
      // Radio labels are drawn next to options, always needed
      await drawRadioGroupLabels(doc, page, field, stylesheet);
      break;

    case 'dropdown':
      await createDropdownField(doc, page, field, stylesheet);
      // Always draw dropdown labels (they appear to the left by default, not above like other fields)
      await drawDropdownLabel(doc, page, field, stylesheet);
      break;

    case 'textarea':
      createTextareaField(doc, page, field, stylesheet);
      if (!skipLabels) {
        await drawTextareaLabel(doc, page, field, stylesheet);
      }
      break;

    case 'signature':
      createSignatureField(doc, page, field, stylesheet);
      await drawSignatureFieldWithLabel(doc, page, field, stylesheet, {
        includeDate: true,
        includeLine: true,
      });
      break;

    default: {
      const unknownType = field.type as string;
      console.warn(`Unknown field type: ${unknownType}`);
    }
  }
}

/**
 * Save generated PDF to file
 */
export async function savePdf(pdf: GeneratedPdf, outputPath: string): Promise<void> {
  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Write PDF file
  await writeFile(outputPath, pdf.bytes);
}

/**
 * Generate and save PDF in one step
 */
export async function generateAndSavePdf(
  options: PdfGeneratorOptions,
  outputPath: string
): Promise<GeneratedPdf> {
  const pdf = await generatePdf(options);
  await savePdf(pdf, outputPath);
  return pdf;
}

// Re-export utilities and types
export * from './utils.js';
export * from './layout.js';
export * from './content.js';
export * from './fields/index.js';
