/**
 * DOCX Generator
 * Creates Word documents with styled form field visuals
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { Document, Paragraph, Table, Packer, TextRun } from 'docx';
import type { ParsedFormSchema, NormalizedFormField, DocxConfig } from '../../types/index.js';
import type { ResolvedStylesheet } from '../../types/stylesheet.js';
import { DEFAULT_CONFIG } from '../../types/index.js';
import { parseStylesheet, getDefaultStylesheet } from '../../parsers/stylesheet.js';
import { createSectionProperties, createHeader, createFooter } from './layout.js';
import { renderSchemaContent } from './content.js';
import {
  createTextFieldLabel,
  createTextFieldVisual,
  createTextareaLabel,
  createTextareaVisual,
  createCheckboxWithLabel,
  createRadioGroupWithLabel,
  createDropdownWithLabel,
  createSignatureWithLabel,
} from './fields/index.js';
import { mapFontFamily, hexToDocxColor, ptToTwip } from './utils.js';
import { createCoverPageSection } from './coverpage.js';
import { resolveFooterConfig } from '../footer-utils.js';

export interface DocxGeneratorOptions {
  schema: ParsedFormSchema;
  config?: Partial<DocxConfig>;
  /** Base directory for resolving relative stylesheet paths */
  basePath?: string;
}

export interface GeneratedDocx {
  bytes: Uint8Array;
  fieldCount: number;
  pageCount: number;
}

/**
 * Generate a Word document from schema
 */
export async function generateDocx(options: DocxGeneratorOptions): Promise<GeneratedDocx> {
  const { schema, config = {}, basePath = process.cwd() } = options;

  // Merge config with defaults
  const docxConfig: Required<DocxConfig> = {
    ...DEFAULT_CONFIG.docx,
    ...config,
    margins: { ...DEFAULT_CONFIG.docx.margins, ...(config.margins ?? {}) },
    fonts: { ...DEFAULT_CONFIG.docx.fonts, ...(config.fonts ?? {}) },
  };

  // Load stylesheet - from schema path or use defaults
  let stylesheet: ResolvedStylesheet;
  if (schema.form.stylesheet) {
    const stylesheetPath = resolve(basePath, schema.form.stylesheet);
    stylesheet = await parseStylesheet(stylesheetPath);
  } else {
    stylesheet = getDefaultStylesheet();
  }

  // Build document sections
  const sections = [];

  // Add cover page section if configured (no headers/footers)
  if (schema.coverPage) {
    const coverSection = await createCoverPageSection(
      schema.form,
      schema.coverPage,
      stylesheet,
      docxConfig,
      basePath
    );
    sections.push(coverSection);
  }

  const children: (Paragraph | Table)[] = [];

  // Draw content: use schema content when available
  const hasSchemaContent = schema.content && schema.content.length > 0;
  if (hasSchemaContent && schema.content) {
    // Render schema-defined content elements
    const contentElements = renderSchemaContent(schema.content, stylesheet);
    children.push(...contentElements);
  } else {
    // Render form title only
    const titleStyle = stylesheet.headings[1];
    children.push(
      new Paragraph({
        spacing: {
          after: ptToTwip(titleStyle.marginBottom),
        },
        children: [
          new TextRun({
            text: schema.form.title,
            font: mapFontFamily(titleStyle.fontFamily),
            size: titleStyle.fontSize * 2,
            color: hexToDocxColor(titleStyle.color),
            bold: true,
          }),
        ],
      })
    );
  }

  // Add form fields
  let fieldCount = 0;
  for (const field of schema.fields) {
    const fieldElements = renderFormField(field, stylesheet, hasSchemaContent);
    children.push(...fieldElements);
    fieldCount++;
  }

  // Create section with header and footer
  const sectionProps = createSectionProperties(docxConfig, stylesheet);
  const header = createHeader(schema.form.title, stylesheet, schema.form.pages !== 1);
  const resolvedFooter = resolveFooterConfig(schema.footer, schema.form);
  const footer = await createFooter(resolvedFooter, stylesheet);

  sections.push({
    properties: sectionProps,
    headers: {
      default: header,
    },
    footers: footer
      ? {
          default: footer,
        }
      : undefined,
    children,
  });

  // Create document
  const doc = new Document({
    title: schema.form.title,
    creator: 'yamldocs',
    description: schema.form.description,
    sections,
  });

  // Serialize document
  const buffer = await Packer.toBuffer(doc);
  const bytes = new Uint8Array(buffer);

  return {
    bytes,
    fieldCount,
    pageCount: schema.form.pages ?? 1,
  };
}

/**
 * Render a form field to DOCX elements
 */
function renderFormField(
  field: NormalizedFormField,
  stylesheet: ResolvedStylesheet,
  skipLabels = false
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];

  switch (field.type) {
    case 'text': {
      if (!skipLabels) {
        elements.push(createTextFieldLabel(field.label, field.required ?? false, stylesheet));
      }
      elements.push(
        createTextFieldVisual(
          field.name,
          typeof field.default === 'string' ? field.default : undefined,
          stylesheet
        )
      );
      break;
    }

    case 'textarea': {
      if (!skipLabels) {
        elements.push(createTextareaLabel(field.label, field.required ?? false, stylesheet));
      }
      elements.push(
        createTextareaVisual(
          field.name,
          typeof field.default === 'string' ? field.default : undefined,
          stylesheet,
          field.position.height
        )
      );
      break;
    }

    case 'checkbox': {
      // Checkbox always shows label next to it
      elements.push(
        createCheckboxWithLabel(
          field.name,
          field.label,
          field.default === true,
          field.required ?? false,
          stylesheet
        )
      );
      break;
    }

    case 'radio': {
      // Radio group always shows labels
      const radioElements = createRadioGroupWithLabel(
        field.name,
        field.label,
        field.options || [],
        typeof field.default === 'string' ? field.default : undefined,
        field.required ?? false,
        stylesheet
      );
      elements.push(...radioElements);
      break;
    }

    case 'dropdown': {
      const dropdownElements = createDropdownWithLabel(
        field.name,
        field.label,
        field.options || [],
        typeof field.default === 'string' ? field.default : undefined,
        field.required ?? false,
        field.labelPosition || 'left',
        stylesheet
      );
      elements.push(...dropdownElements);
      break;
    }

    case 'signature': {
      const signatureElements = createSignatureWithLabel(
        field.name,
        field.label,
        field.required ?? false,
        stylesheet,
        {
          includeDate: true,
          includeLine: true,
        }
      );
      elements.push(...signatureElements);
      break;
    }

    default: {
      const unknownType = field.type as string;
      console.warn(`Unknown field type: ${unknownType}`);
    }
  }

  return elements;
}

/**
 * Save generated DOCX to file
 */
export async function saveDocx(docx: GeneratedDocx, outputPath: string): Promise<void> {
  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Write DOCX file
  await writeFile(outputPath, docx.bytes);
}

/**
 * Generate and save DOCX in one step
 */
export async function generateAndSaveDocx(
  options: DocxGeneratorOptions,
  outputPath: string
): Promise<GeneratedDocx> {
  const docx = await generateDocx(options);
  await saveDocx(docx, outputPath);
  return docx;
}
