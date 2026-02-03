/**
 * HTML Generator
 * Creates HTML documents with interactive forms
 */

import { writeFile, mkdir, readFile } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';
import type {
  ParsedFormSchema,
  NormalizedFormField,
  HtmlConfig,
  SchemaContentElement,
  HeadingContent,
  ParagraphContent,
  FieldContent,
  TableContent,
  AdmonitionContent,
  SpacerContent,
  TableColumn,
  FieldOption,
  PageLayoutConfig,
} from '../../types/index.js';
import { DEFAULT_CONFIG } from '../../types/index.js';
import { generateCssFromTokens, ptToPx } from '../../styles/index.js';
import {
  initializeHtmlLayout,
  needsPageBreak,
  addElementToPage,
  nextHtmlPage,
  estimateHtmlElementHeight,
  getContentWidthPx,
  type HtmlPageSize,
} from './layout.js';
import { renderCoverPageHtml, getCoverPageCss } from './coverpage.js';
import {
  resolveFooterConfig,
  resolvePageVariables,
  SOCIAL_PLATFORM_LABELS,
  type ResolvedFooter,
} from '../footer-utils.js';
import { loadSocialIconBase64 } from '../icon-utils.js';

export interface HtmlGeneratorOptions {
  schema: ParsedFormSchema;
  config?: Partial<HtmlConfig>;
}

/**
 * Generate HTML document
 */
export async function generateHtml(options: HtmlGeneratorOptions): Promise<string> {
  const { schema, config = {} } = options;

  const htmlConfig: Required<HtmlConfig> = {
    ...DEFAULT_CONFIG.html,
    ...config,
  };

  let html = '';

  // Check if custom template is provided
  if (htmlConfig.template && existsSync(htmlConfig.template)) {
    html = await readFile(htmlConfig.template, 'utf-8');
    // Replace placeholders in template
    html = html.replace('{{title}}', schema.form.title ?? 'Document');
    html = html.replace('{{content}}', '');
    html = html.replace('{{form}}', generateFormHtml(schema));
  } else {
    // Generate default HTML
    html = await generateDefaultHtml(schema, htmlConfig);
  }

  return html;
}

/**
 * Generate default HTML document
 */
async function generateDefaultHtml(
  schema: ParsedFormSchema,
  config: Required<HtmlConfig>
): Promise<string> {
  const hasSchemaContent = schema.content && schema.content.length > 0;
  const title = schema.form.title ?? 'Document';

  const pageLayoutEnabled = config.pageLayout?.enabled ?? true;

  const hasCoverPage = !!schema.coverPage;

  // Resolve footer config
  const resolvedFooter = resolveFooterConfig(schema.footer, schema.form);

  let styles = '';
  if (config.embedStyles) {
    styles = `
    <style>
      ${getDefaultStyles(config.pageLayout)}
      ${hasCoverPage ? getCoverPageCss() : ''}
    </style>`;
  }

  let scripts = '';
  if (config.includeJs) {
    scripts = `
    <script>
      ${getFormScripts()}
    </script>`;
  }

  const formHtml = generateFormHtml(schema);

  // Build the body content based on page layout mode
  let bodyContent: string;

  // Generate cover page HTML if configured
  const coverPageHtml =
    hasCoverPage && schema.coverPage ? renderCoverPageHtml(schema.form, schema.coverPage) : '';

  if (pageLayoutEnabled && hasSchemaContent) {
    // Use multi-page layout with pagination for schema content
    bodyContent = await generateMultiPageContent(
      schema,
      title,
      config,
      coverPageHtml,
      resolvedFooter
    );
  } else if (pageLayoutEnabled) {
    // Single page layout for simple content
    const contentHtml = hasSchemaContent ? generateContentHtml(schema) : '';
    const mainContent = hasSchemaContent
      ? `<form id="form-${schema.form.id ?? 'main'}" class="schema-content-form">
            ${contentHtml}
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Submit</button>
              <button type="reset" class="btn btn-secondary">Reset</button>
            </div>
          </form>`
      : `${contentHtml}
        ${
          formHtml
            ? `
        <form id="form-${schema.form.id ?? 'main'}" class="form">
          ${formHtml}
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Submit</button>
            <button type="reset" class="btn btn-secondary">Reset</button>
          </div>
        </form>
        `
            : ''
        }`;

    bodyContent = `
  <div class="page-layout-wrapper">
    ${coverPageHtml}
    <div class="page">
      <div class="page-content">
        <header>
          <h1>${escapeHtml(title)}</h1>
          ${schema.form.version ? `<span class="version">v${escapeHtml(schema.form.version)}</span>` : ''}
        </header>

        <main>
          ${mainContent}
        </main>

        ${await renderFooterHtml(resolvedFooter, 1, 1)}
      </div>
      ${config.pageLayout?.showPageNumbers ? '<div class="page-number">Page 1 of 1</div>' : ''}
    </div>
  </div>`;
  } else {
    // Legacy container mode (non-page-layout)
    const contentHtml = hasSchemaContent ? generateContentHtml(schema) : '';
    const mainContent = hasSchemaContent
      ? `<form id="form-${schema.form.id ?? 'main'}" class="schema-content-form">
            ${contentHtml}
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Submit</button>
              <button type="reset" class="btn btn-secondary">Reset</button>
            </div>
          </form>`
      : `${contentHtml}
        ${
          formHtml
            ? `
        <form id="form-${schema.form.id ?? 'main'}" class="form">
          ${formHtml}
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Submit</button>
            <button type="reset" class="btn btn-secondary">Reset</button>
          </div>
        </form>
        `
            : ''
        }`;

    bodyContent = `
  ${coverPageHtml}
  <div class="container">
    <header>
      <h1>${escapeHtml(title)}</h1>
      ${schema.form.version ? `<span class="version">v${escapeHtml(schema.form.version)}</span>` : ''}
    </header>

    <main>
      ${mainContent}
    </main>

    ${await renderFooterHtml(resolvedFooter, 1, 1)}
  </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${styles}
</head>
<body>
  ${bodyContent}
  ${scripts}
</body>
</html>`;
}

/**
 * Generate multi-page HTML content with pagination
 * Simulates A4/Letter printed pages like PDF renders
 */
async function generateMultiPageContent(
  schema: ParsedFormSchema,
  title: string,
  config: Required<HtmlConfig>,
  coverPageHtml = '',
  footer?: ResolvedFooter
): Promise<string> {
  const pageSize = (config.pageLayout?.pageSize ?? 'a4') as HtmlPageSize;
  const ctx = initializeHtmlLayout(pageSize);
  const contentWidthPx = getContentWidthPx(pageSize);
  const showPageNumbers = config.pageLayout?.showPageNumbers ?? true;

  // Track field numbering
  let fieldNumber = 0;
  const enableNumbering = schema.form.numbering === true;

  // Header height for first page only (PDF draws header outside content area, HTML has it inside)
  // Measured from CSS: h1 (~16px) + padding-bottom (~12px) + margin-bottom (~16px) + border (~2px) = ~46px
  const headerHeightFirstPage = 46;

  // Reserve space for header on first page only
  ctx.cursorY = headerHeightFirstPage;

  // Process each content element
  for (const element of schema.content || []) {
    const elementHeight = estimateHtmlElementHeight(element, contentWidthPx);
    const elementHtml = renderContentElement(element, enableNumbering, () => ++fieldNumber);

    // Check if we need a page break
    if (needsPageBreak(ctx, elementHeight)) {
      nextHtmlPage(ctx);
    }

    addElementToPage(ctx, elementHtml, elementHeight);
  }

  // Generate pages HTML
  const totalPages = ctx.pages.length;
  const pageHtmlArray = await Promise.all(
    ctx.pages.map(async (page, index) => {
      const isFirstPage = index === 0;
      const pageContent = page.elements.map((el) => el.html).join('\n');

      const headerHtml = isFirstPage
        ? `<header>
          <h1>${escapeHtml(title)}</h1>
          ${schema.form.version ? `<span class="version">v${escapeHtml(schema.form.version)}</span>` : ''}
        </header>`
        : '';

      const footerHtml = footer
        ? await renderFooterHtml(footer, page.pageNumber, totalPages)
        : '<footer></footer>';

      const pageNumberHtml = showPageNumbers
        ? `<div class="page-number">Page ${page.pageNumber} of ${totalPages}</div>`
        : '';

      // Wrap content in form only on first page
      const formId = `form-${schema.form.id ?? 'main'}`;
      const mainContentHtml = isFirstPage
        ? `<form id="${formId}" class="schema-content-form">
            ${pageContent}
            ${
              index === totalPages - 1
                ? `<div class="form-actions">
              <button type="submit" class="btn btn-primary">Submit</button>
              <button type="reset" class="btn btn-secondary">Reset</button>
            </div>`
                : ''
            }
          </form>`
        : `<div class="page-continuation" data-form="${formId}">
            ${pageContent}
            ${
              index === totalPages - 1
                ? `<div class="form-actions">
              <button type="submit" class="btn btn-primary">Submit</button>
              <button type="reset" class="btn btn-secondary">Reset</button>
            </div>`
                : ''
            }
          </div>`;

      return `
    <div class="page">
      <div class="page-content">
        ${headerHtml}

        <main>
          ${mainContentHtml}
        </main>

        ${footerHtml}
      </div>
      ${pageNumberHtml}
    </div>`;
    })
  );
  const pagesHtml = pageHtmlArray.join('\n');

  return `
  <div class="page-layout-wrapper">
    ${coverPageHtml}
    ${pagesHtml}
  </div>`;
}

/**
 * Render footer HTML from resolved footer config with icon-based social links
 */
async function renderFooterHtml(
  footer: ResolvedFooter,
  pageNum: number,
  totalPages: number
): Promise<string> {
  if (!footer.enabled) {
    return '<footer></footer>';
  }

  const left = escapeHtml(resolvePageVariables(footer.left, pageNum, totalPages));
  const center = escapeHtml(resolvePageVariables(footer.center, pageNum, totalPages));
  const right = escapeHtml(resolvePageVariables(footer.right, pageNum, totalPages));
  const hasSections = !!(left || center || right);

  const socialEntries = Object.entries(footer.socialLinks).filter(([, url]) => !!url);

  let html = `<footer class="document-footer${footer.separator.enabled ? ' footer-separator' : ''}">`;

  if (hasSections) {
    html += `<div class="footer-sections">`;
    html += `<span class="footer-left">${left}</span>`;
    html += `<span class="footer-center">${center}</span>`;
    html += `<span class="footer-right">${right}</span>`;
    html += `</div>`;
  }

  if (socialEntries.length > 0) {
    html += `<div class="footer-social">`;
    const links: string[] = [];
    for (const [key, url] of socialEntries) {
      const label = SOCIAL_PLATFORM_LABELS[key] ?? key;
      const dataUri = await loadSocialIconBase64(key);
      if (dataUri) {
        links.push(
          `<a href="${escapeHtml(url as string)}" target="_blank" rel="noopener noreferrer"><img src="${dataUri}" alt="${escapeHtml(label)}" width="16" height="16" /></a>`
        );
      }
    }
    html += links.join(' ');
    html += `</div>`;
  }

  html += `</footer>`;
  return html;
}

/**
 * Generate HTML from schema content elements
 */
function generateContentHtml(schema: ParsedFormSchema): string {
  if (!schema.content || schema.content.length === 0) {
    return '';
  }

  let fieldNumber = 0;
  const enableNumbering = schema.form.numbering === true;

  return schema.content
    .map((element) => renderContentElement(element, enableNumbering, () => ++fieldNumber))
    .join('\n');
}

/**
 * Render a single content element to HTML
 */
function renderContentElement(
  element: SchemaContentElement,
  enableNumbering: boolean,
  getFieldNumber: () => number
): string {
  switch (element.type) {
    case 'heading':
      return renderHeading(element);
    case 'paragraph':
      return renderParagraph(element);
    case 'rule':
      return renderRule();
    case 'field':
      return renderInlineField(element, enableNumbering, getFieldNumber);
    case 'table':
      return renderTable(element);
    case 'admonition':
      return renderAdmonition(element);
    case 'spacer':
      return renderSpacer(element);
    default:
      return `<!-- Unknown content type: ${(element as SchemaContentElement).type} -->`;
  }
}

function renderHeading(element: HeadingContent): string {
  const level = element.level ?? 2;
  return `<h${level}>${escapeHtml(element.text)}</h${level}>`;
}

function renderParagraph(element: ParagraphContent): string {
  // Convert maxWidth from pt to px for HTML
  const maxWidthPx = element.maxWidth ? Math.round(ptToPx(element.maxWidth)) : null;
  const style = maxWidthPx ? ` style="max-width: ${maxWidthPx}px"` : '';
  return `<p${style}>${escapeHtml(element.text)}</p>`;
}

function renderRule(): string {
  return '<hr class="content-rule" />';
}

function renderSpacer(element: SpacerContent): string {
  // Convert height from pt to px for HTML
  const heightPx = Math.round(ptToPx(element.height));
  return `<div class="spacer" style="height: ${heightPx}px"></div>`;
}

function renderAdmonition(element: AdmonitionContent): string {
  const variantClass = `admonition-${element.variant}`;
  return `
    <div class="admonition ${variantClass}">
      <div class="admonition-title">${escapeHtml(element.title)}</div>
      <div class="admonition-content">${escapeHtml(element.text)}</div>
    </div>`;
}

function renderInlineField(
  element: FieldContent,
  _enableNumbering: boolean,
  _getFieldNumber: () => number
): string {
  const labelPosition = element.labelPosition ?? 'above';
  // Note: numbering is already applied by schema parser, so we use the label as-is
  const label = element.label ?? '';

  const containerClass =
    labelPosition === 'left' ? 'inline-field inline-field-horizontal' : 'inline-field';
  // For labels, use min-width to allow expansion if content is wider (convert pt to px)
  const labelWidthPx = element.labelWidth ? Math.round(ptToPx(element.labelWidth)) : null;
  const labelStyle =
    labelPosition === 'left' && labelWidthPx ? ` style="min-width: ${labelWidthPx}px"` : '';
  // For horizontal layout, apply both width and max-width to prevent overflow (convert pt to px)
  const fieldWidthPx = element.width ? Math.round(ptToPx(element.width)) : null;
  const fieldStyle = fieldWidthPx
    ? ` style="width: ${fieldWidthPx}px; max-width: ${fieldWidthPx}px"`
    : '';

  let fieldHtml = '';

  switch (element.fieldType) {
    case 'text':
      fieldHtml = `<input type="text" id="${element.fieldName}" name="${element.fieldName}"
        ${element.placeholder ? `placeholder="${escapeHtml(element.placeholder)}"` : ''}
        ${element.default ? `value="${escapeHtml(String(element.default))}"` : ''}
        ${element.required ? 'required' : ''}${fieldStyle}>`;
      break;

    case 'textarea': {
      // Convert width/height from pt to px for HTML
      const taWidthPx = element.width ? Math.round(ptToPx(element.width)) : null;
      const taHeightPx = element.height ? Math.round(ptToPx(element.height)) : null;
      const textareaStyle =
        (taWidthPx ?? taHeightPx)
          ? ` style="${taWidthPx ? `width: ${taWidthPx}px;` : ''}${taHeightPx ? `height: ${taHeightPx}px;` : ''}"`
          : '';
      fieldHtml = `<textarea id="${element.fieldName}" name="${element.fieldName}"
        ${element.placeholder ? `placeholder="${escapeHtml(element.placeholder)}"` : ''}
        ${element.required ? 'required' : ''}${textareaStyle}>${element.default ? escapeHtml(String(element.default)) : ''}</textarea>`;
      break;
    }

    case 'checkbox':
      fieldHtml = `<input type="checkbox" id="${element.fieldName}" name="${element.fieldName}"
        ${element.default === true ? 'checked' : ''}>`;
      break;

    case 'dropdown': {
      const options = (element.options ?? [])
        .map((opt: FieldOption | string) => {
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const selected = element.default === optValue ? ' selected' : '';
          return `<option value="${escapeHtml(optValue)}"${selected}>${escapeHtml(optLabel)}</option>`;
        })
        .join('\n          ');
      fieldHtml = `<select id="${element.fieldName}" name="${element.fieldName}"
        ${element.required ? 'required' : ''}${fieldStyle}>
          <option value="">-- Select --</option>
          ${options}
        </select>`;
      break;
    }
  }

  return `
    <div class="${containerClass}">
      <label for="${element.fieldName}"${labelStyle}>${escapeHtml(label)}</label>
      ${fieldHtml}
    </div>`;
}

function renderTable(element: TableContent): string {
  const columns = element.columns;
  const rows = generateTableRows(element);

  const tableLabel = element.label
    ? `<div class="table-label">${escapeHtml(element.label)}</div>`
    : '';

  // Calculate total table width from column widths (convert pt to px)
  // Schema widths are in points, convert to pixels for HTML (1pt = 1.333px)
  const totalWidthPt = columns.reduce((sum, col) => sum + (col.width ?? 100), 0);
  const totalWidthPx = Math.round(ptToPx(totalWidthPt));

  // Generate header row - convert column widths from pt to px to match PDF rendering
  const headerCells = columns
    .map((col) => {
      const widthPx = Math.round(ptToPx(col.width ?? 100));
      return `<th style="width: ${widthPx}px">${escapeHtml(col.label)}</th>`;
    })
    .join('');
  const headerRow = `<tr>${headerCells}</tr>`;

  // Generate data rows
  const dataRows = rows
    .map((row) => {
      const cells = row
        .map((cell, colIdx) => {
          const col = columns[colIdx];
          // Add centering class for checkbox cells to match PDF alignment
          const cellClass = cell.type === 'checkbox' ? ' class="table-checkbox-cell"' : '';
          return `<td${cellClass}>${renderTableCell(cell, col)}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('\n');

  return `
    ${tableLabel}
    <table class="content-table" style="width: ${totalWidthPx}px">
      <thead>${headerRow}</thead>
      <tbody>${dataRows}</tbody>
    </table>`;
}

interface TableCellData {
  type: 'label' | 'text' | 'dropdown' | 'checkbox';
  value?: string;
  fieldName?: string;
  options?: FieldOption[];
  default?: string | boolean;
}

function generateTableRows(element: TableContent): TableCellData[][] {
  const columns = element.columns;
  const rows: TableCellData[][] = [];

  // If rowCount is specified, generate rows from column definitions
  if (element.rowCount && element.fieldPrefix) {
    for (let rowIdx = 1; rowIdx <= element.rowCount; rowIdx++) {
      const row: TableCellData[] = columns.map((col) => {
        const cellType = col.cellType ?? 'text';
        const prefix = element.fieldPrefix ?? 'table';
        const fieldName = col.fieldSuffix
          ? `${prefix}_${rowIdx}_${col.fieldSuffix}`
          : `${prefix}_${rowIdx}_${(col.label ?? '').toLowerCase().replace(/\s+/g, '_')}`;

        if (cellType === 'label') {
          return { type: 'label', value: '' };
        }

        return {
          type: cellType,
          fieldName,
          options: col.options,
        };
      });
      rows.push(row);
    }
  }

  // If explicit rows are defined
  if (element.rows) {
    for (const row of element.rows) {
      if (row.cells) {
        // Full cell definitions
        const cellData: TableCellData[] = row.cells.map((cell) => {
          if (cell.type === 'label') {
            return { type: 'label', value: cell.value };
          }
          return {
            type: cell.type,
            fieldName: cell.fieldName,
            options: cell.options,
            default: cell.default,
          };
        });
        rows.push(cellData);
      } else if (row.values) {
        // Compact format: values array
        const cellData: TableCellData[] = row.values.map((val, colIdx) => {
          const col = columns[colIdx];
          // Handle case where values exceed column count (skip extra values)
          if (!col) {
            return { type: 'text' as const, fieldName: String(val) };
          }
          const cellType = col.cellType ?? 'text';

          if (cellType === 'label') {
            return { type: 'label' as const, value: String(val) };
          }

          // For non-label cells, the value is the fieldName
          return {
            type: cellType,
            fieldName: String(val),
            options: col.options,
          };
        });
        rows.push(cellData);
      }
    }
  }

  return rows;
}

function renderTableCell(cell: TableCellData, _col: TableColumn): string {
  switch (cell.type) {
    case 'label':
      return escapeHtml(cell.value ?? '');

    case 'text': {
      const fieldName = cell.fieldName ?? '';
      const defaultValue = cell.default ? `value="${escapeHtml(String(cell.default))}"` : '';
      return `<input type="text" name="${fieldName}" class="table-input"
        ${defaultValue}>`;
    }

    case 'checkbox': {
      const fieldName = cell.fieldName ?? '';
      return `<input type="checkbox" name="${fieldName}"
        ${cell.default === true ? 'checked' : ''}>`;
    }

    case 'dropdown': {
      const fieldName = cell.fieldName ?? '';
      const options = (cell.options ?? [])
        .map((opt) => {
          // Handle both string and object options
          const optValue = typeof opt === 'string' ? opt : opt.value;
          const optLabel = typeof opt === 'string' ? opt : opt.label;
          const selected = cell.default === optValue ? ' selected' : '';
          return `<option value="${escapeHtml(optValue)}"${selected}>${escapeHtml(optLabel)}</option>`;
        })
        .join('');
      return `<select name="${fieldName}" class="table-select">
        <option value="">--</option>
        ${options}
      </select>`;
    }

    default:
      return '';
  }
}

/**
 * Generate HTML for form fields
 */
function generateFormHtml(schema: ParsedFormSchema): string {
  const fieldsByPage = new Map<number, NormalizedFormField[]>();

  // Group fields by page
  for (const field of schema.fields) {
    const pageFields = fieldsByPage.get(field.page) ?? [];
    pageFields.push(field);
    fieldsByPage.set(field.page, pageFields);
  }

  let html = '';

  // Generate HTML for each page
  for (const [pageNum, fields] of fieldsByPage) {
    if (fieldsByPage.size > 1) {
      html += `<fieldset class="form-page" data-page="${pageNum}">\n`;
      html += `  <legend>Page ${pageNum}</legend>\n`;
    }

    for (const field of fields) {
      html += generateFieldHtml(field);
    }

    if (fieldsByPage.size > 1) {
      html += `</fieldset>\n`;
    }
  }

  return html;
}

/**
 * Generate HTML for a single field
 */
function generateFieldHtml(field: NormalizedFormField): string {
  const requiredAttr = field.required ? ' required' : '';
  const requiredMark = field.required ? '<span class="required">*</span>' : '';

  switch (field.type) {
    case 'text':
      return `
      <div class="form-group">
        <label for="${field.name}">${escapeHtml(field.label)}${requiredMark}</label>
        <input type="text" id="${field.name}" name="${field.name}"
          ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
          ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}
          ${typeof field.default === 'string' ? `value="${escapeHtml(field.default)}"` : ''}
          ${field.readOnly ? 'readonly' : ''}
          ${requiredAttr}>
      </div>`;

    case 'textarea':
      return `
      <div class="form-group">
        <label for="${field.name}">${escapeHtml(field.label)}${requiredMark}</label>
        <textarea id="${field.name}" name="${field.name}"
          ${field.maxLength ? `maxlength="${field.maxLength}"` : ''}
          ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ''}
          ${field.readOnly ? 'readonly' : ''}
          rows="5"
          ${requiredAttr}>${typeof field.default === 'string' ? escapeHtml(field.default) : ''}</textarea>
      </div>`;

    case 'checkbox':
      return `
      <div class="form-group form-check">
        <input type="checkbox" id="${field.name}" name="${field.name}"
          ${field.default === true ? 'checked' : ''}
          ${field.readOnly ? 'disabled' : ''}>
        <label for="${field.name}">${escapeHtml(field.label)}${requiredMark}</label>
      </div>`;

    case 'radio': {
      const radioOptions = (field.options ?? [])
        .map(
          (opt, index) => `
        <div class="form-check">
          <input type="radio" id="${field.name}_${index}" name="${field.name}" value="${escapeHtml(opt.value)}"
            ${field.default === opt.value ? 'checked' : ''}
            ${field.readOnly ? 'disabled' : ''}>
          <label for="${field.name}_${index}">${escapeHtml(opt.label)}</label>
        </div>`
        )
        .join('');

      return `
      <div class="form-group">
        <label>${escapeHtml(field.label)}${requiredMark}</label>
        <div class="radio-group">
          ${radioOptions}
        </div>
      </div>`;
    }

    case 'dropdown': {
      const selectOptions = (field.options ?? [])
        .map(
          (opt) =>
            `<option value="${escapeHtml(opt.value)}" ${field.default === opt.value ? 'selected' : ''}>${escapeHtml(opt.label)}</option>`
        )
        .join('\n          ');

      return `
      <div class="form-group">
        <label for="${field.name}">${escapeHtml(field.label)}${requiredMark}</label>
        <select id="${field.name}" name="${field.name}"
          ${field.readOnly ? 'disabled' : ''}
          ${requiredAttr}>
          <option value="">-- Select --</option>
          ${selectOptions}
        </select>
      </div>`;
    }

    case 'signature':
      return `
      <div class="form-group signature-field">
        <label for="${field.name}">${escapeHtml(field.label)}${requiredMark}</label>
        <div class="signature-box">
          <canvas id="${field.name}_canvas" width="400" height="100"></canvas>
          <input type="hidden" id="${field.name}" name="${field.name}">
        </div>
        <button type="button" class="btn btn-small clear-signature" data-canvas="${field.name}_canvas">Clear</button>
      </div>`;

    default: {
      const unknownType = field.type as string;
      return `<!-- Unknown field type: ${unknownType} -->`;
    }
  }
}

/**
 * Get default CSS styles from design tokens
 */
function getDefaultStyles(pageLayout?: PageLayoutConfig): string {
  return generateCssFromTokens(pageLayout);
}

/**
 * Get form JavaScript
 */
function getFormScripts(): string {
  return `
    document.addEventListener('DOMContentLoaded', function() {
      // Handle signature canvases
      document.querySelectorAll('.signature-field canvas').forEach(function(canvas) {
        const ctx = canvas.getContext('2d');
        let drawing = false;

        canvas.addEventListener('mousedown', function(e) {
          drawing = true;
          ctx.beginPath();
          ctx.moveTo(e.offsetX, e.offsetY);
        });

        canvas.addEventListener('mousemove', function(e) {
          if (drawing) {
            ctx.lineTo(e.offsetX, e.offsetY);
            ctx.stroke();
          }
        });

        canvas.addEventListener('mouseup', function() {
          drawing = false;
          // Save signature data to hidden input
          const input = document.getElementById(canvas.id.replace('_canvas', ''));
          if (input) {
            input.value = canvas.toDataURL();
          }
        });

        canvas.addEventListener('mouseleave', function() {
          drawing = false;
        });
      });

      // Handle clear signature buttons
      document.querySelectorAll('.clear-signature').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const canvasId = this.dataset.canvas;
          const canvas = document.getElementById(canvasId);
          if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const input = document.getElementById(canvasId.replace('_canvas', ''));
            if (input) {
              input.value = '';
            }
          }
        });
      });

      // Handle form submission
      document.querySelectorAll('form').forEach(function(form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          console.log('Form submitted:', data);
          alert('Form submitted! Check console for data.');
        });
      });
    });
  `;
}

/**
 * Escape HTML special characters
 */
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

/**
 * Save HTML to file
 */
export async function saveHtml(html: string, outputPath: string): Promise<void> {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
}

/**
 * Generate and save HTML in one step
 */
export async function generateAndSaveHtml(
  options: HtmlGeneratorOptions,
  outputPath: string
): Promise<void> {
  const html = await generateHtml(options);
  await saveHtml(html, outputPath);
}
