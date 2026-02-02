/**
 * Content Renderer for Schema-Driven PDF Generation
 * Renders content elements (headings, paragraphs, admonitions, rules) using flow positioning
 */

import { PDFDocument, PDFPage } from 'pdf-lib';
import type {
  SchemaContentElement,
  HeadingContent,
  ParagraphContent,
  AdmonitionContent,
  RuleContent,
  SpacerContent,
  TableContent,
  TableCell,
  TableRow,
  TableColumn,
  FieldContent,
} from '../../types/index.js';
import { normalizeFieldOptions } from '../../parsers/schema.js';
import { wrapText, hexToRgb } from './utils.js';
import type { LayoutContext } from './layout.js';
import { getFontName, moveCursorDown, nextPage, getCurrentPage } from './layout.js';

/** Default spacing values for content elements */
const FLOW_SPACING = {
  heading: { marginTop: 16, marginBottom: 8 },
  paragraph: { marginTop: 0, marginBottom: 12 },
  admonition: { marginTop: 12, marginBottom: 12 },
  rule: { marginTop: 10, marginBottom: 10 },
  table: { marginTop: 12, marginBottom: 12 },
  spacer: { marginTop: 0, marginBottom: 0 },
  field: { marginTop: 8, marginBottom: 12 },
};

/** Prefix labels for admonition variants */
const ADMONITION_PREFIXES: Record<string, string> = {
  warning: 'Warning',
  note: 'Note',
  info: 'Info',
  tip: 'Tip',
  danger: 'Danger',
};

/**
 * Draw all content elements from schema using flow positioning
 * Elements stack vertically with automatic page breaks
 */
export async function drawSchemaContent(
  ctx: LayoutContext,
  content: SchemaContentElement[]
): Promise<void> {
  let currentPageNum = 1;

  for (const element of content) {
    // Handle explicit page changes (optional - for forced page breaks)
    const elementPage = element.page ?? currentPageNum;
    if (elementPage > currentPageNum) {
      while (ctx.currentPage < elementPage - 1) {
        nextPage(ctx);
      }
      currentPageNum = elementPage;
    }

    // Estimate element height and check for page break
    const estimatedHeight = estimateElementHeight(ctx, element);
    if (ctx.cursor.y - estimatedHeight < ctx.stylesheet.page.margins.bottom) {
      nextPage(ctx);
      currentPageNum = ctx.currentPage + 1;
    }

    // Render at cursor position
    const page = getCurrentPage(ctx);
    await drawContentElement(ctx, page, element, currentPageNum);
  }
}

/**
 * Estimate the height of an element for page break decisions
 */
function estimateElementHeight(ctx: LayoutContext, element: SchemaContentElement): number {
  switch (element.type) {
    case 'heading': {
      const headingEl = element;
      const level = Math.max(1, Math.min(6, headingEl.level)) as 1 | 2 | 3 | 4 | 5 | 6;
      const style = ctx.stylesheet.headings[level];
      return style.fontSize + FLOW_SPACING.heading.marginTop + FLOW_SPACING.heading.marginBottom;
    }

    case 'paragraph': {
      const paragraphEl = element;
      const style = ctx.stylesheet.paragraph;
      const fontSize = paragraphEl.fontSize || style.fontSize;
      const lineHeight = fontSize * (style.lineHeight || 1.5);
      const maxWidth = paragraphEl.maxWidth || style.maxWidth || ctx.contentArea.width;
      const lines = wrapText(paragraphEl.text, maxWidth, fontSize);
      return lines.length * lineHeight + FLOW_SPACING.paragraph.marginBottom;
    }

    case 'admonition': {
      const admonitionEl = element;
      const style =
        ctx.stylesheet.admonitions[admonitionEl.variant] || ctx.stylesheet.admonitions.note;
      const titleContentGap = 10; // Match drawAdmonitionContent
      const minPadding = 4; // Match drawAdmonitionContent
      const contentLines = wrapText(
        admonitionEl.text,
        ctx.contentArea.width - style.padding * 2 - style.borderWidth,
        style.contentFontSize
      );
      // Content height: all lines with spacing, minus trailing space after last line
      const lineHeight = style.contentFontSize * style.contentLineHeight;
      const contentHeight =
        contentLines.length > 0
          ? (contentLines.length - 1) * lineHeight + style.contentFontSize
          : 0;
      const textBlockHeight = style.titleFontSize + titleContentGap + contentHeight;
      return (
        textBlockHeight +
        minPadding * 2 +
        FLOW_SPACING.admonition.marginTop +
        FLOW_SPACING.admonition.marginBottom
      );
    }

    case 'rule': {
      const style = ctx.stylesheet.rule;
      return style.thickness + FLOW_SPACING.rule.marginTop + FLOW_SPACING.rule.marginBottom;
    }

    case 'spacer': {
      const spacerEl = element;
      return spacerEl.height;
    }

    case 'table': {
      const tableEl = element;
      const expandedEl = expandTableDefinition(tableEl);
      const style = ctx.stylesheet.table;
      const rowHeight = expandedEl.rowHeight ?? style.rowHeight;
      const headerHeight = expandedEl.headerHeight ?? style.headerHeight;
      let labelHeight = 0;
      if (expandedEl.label) {
        labelHeight = ctx.stylesheet.fields.label.fontSize - 4;
      }
      const rowCount = expandedEl.rows?.length ?? 0;
      return (
        headerHeight +
        rowCount * rowHeight +
        labelHeight +
        FLOW_SPACING.table.marginTop +
        FLOW_SPACING.table.marginBottom
      );
    }

    case 'field': {
      const fieldEl = element;
      const labelHeight = ctx.stylesheet.fields.label.fontSize + 4;
      const defaultHeight = fieldEl.fieldType === 'textarea' ? 60 : 22;
      const fieldHeight = fieldEl.height ?? defaultHeight;
      return (
        labelHeight + fieldHeight + FLOW_SPACING.field.marginTop + FLOW_SPACING.field.marginBottom
      );
    }

    default:
      return 20; // Default minimum height
  }
}

/**
 * Draw a single content element at cursor position
 */
async function drawContentElement(
  ctx: LayoutContext,
  page: PDFPage,
  element: SchemaContentElement,
  pageNum: number
): Promise<void> {
  switch (element.type) {
    case 'heading':
      await drawHeadingContent(ctx, page, element, pageNum);
      break;
    case 'paragraph':
      await drawParagraphContent(ctx, page, element, pageNum);
      break;
    case 'admonition':
      await drawAdmonitionContent(ctx, page, element, pageNum);
      break;
    case 'rule':
      await drawRuleContent(ctx, page, element, pageNum);
      break;
    case 'spacer':
      await drawSpacerContent(ctx, element);
      break;
    case 'table':
      await drawTableContent(ctx, page, element, pageNum);
      break;
    case 'field':
      await drawFieldContent(ctx, page, element, pageNum);
      break;
    default:
      console.warn(`Unknown content element type: ${(element as SchemaContentElement).type}`);
  }
}

/**
 * Draw heading content at cursor position
 */
async function drawHeadingContent(
  ctx: LayoutContext,
  page: PDFPage,
  element: HeadingContent,
  pageNum: number
): Promise<void> {
  const headingLevel = Math.max(1, Math.min(6, element.level)) as 1 | 2 | 3 | 4 | 5 | 6;
  const style = ctx.stylesheet.headings[headingLevel];
  const font = await ctx.doc.embedFont(getFontName(style.fontFamily));
  const fontSize = style.fontSize;
  const color = hexToRgb(style.color);

  // Apply margin top
  moveCursorDown(ctx, FLOW_SPACING.heading.marginTop);

  const x = element.position?.x ?? ctx.stylesheet.page.margins.left;
  const y = ctx.cursor.y;

  page.drawText(element.text, {
    x,
    y,
    size: fontSize,
    font,
    color,
  });

  // Track drawn element
  // Level 1 headings are tracked as 'title' type, others as 'heading'
  const textWidth = font.widthOfTextAtSize(element.text, fontSize);
  ctx.drawnElements.push({
    type: headingLevel === 1 ? 'title' : 'heading',
    page: pageNum,
    bounds: {
      x,
      y: y - fontSize,
      width: textWidth,
      height: fontSize,
    },
    content: element.text,
  });

  // Move cursor down
  moveCursorDown(ctx, fontSize + FLOW_SPACING.heading.marginBottom);
}

/**
 * Draw paragraph content at cursor position
 */
async function drawParagraphContent(
  ctx: LayoutContext,
  page: PDFPage,
  element: ParagraphContent,
  pageNum: number
): Promise<void> {
  const style = ctx.stylesheet.paragraph;
  const font = await ctx.doc.embedFont(getFontName(style.fontFamily));
  const fontSize = element.fontSize || style.fontSize;
  const lineHeight = fontSize * (style.lineHeight || 1.5);
  const color = hexToRgb(style.color);
  const maxWidth = element.maxWidth || style.maxWidth || ctx.contentArea.width;

  const x = element.position?.x ?? ctx.stylesheet.page.margins.left;
  const startY = ctx.cursor.y;

  // Wrap text to fit width
  const lines = wrapText(element.text, maxWidth, fontSize);
  const totalHeight = lines.length * lineHeight;

  // Draw each line
  for (const line of lines) {
    // Check for page break before each line
    if (ctx.cursor.y < ctx.stylesheet.page.margins.bottom + lineHeight) {
      nextPage(ctx);
    }

    const currentPage = getCurrentPage(ctx);
    currentPage.drawText(line, {
      x,
      y: ctx.cursor.y,
      size: fontSize,
      font,
      color,
    });
    moveCursorDown(ctx, lineHeight);
  }

  // Track drawn element
  ctx.drawnElements.push({
    type: 'paragraph',
    page: pageNum,
    bounds: {
      x,
      y: startY - totalHeight,
      width: maxWidth,
      height: totalHeight,
    },
    content: element.text.substring(0, 50) + (element.text.length > 50 ? '...' : ''),
  });

  // Apply margin bottom
  moveCursorDown(ctx, FLOW_SPACING.paragraph.marginBottom);
}

/**
 * Draw admonition content at cursor position
 */
async function drawAdmonitionContent(
  ctx: LayoutContext,
  page: PDFPage,
  element: AdmonitionContent,
  pageNum: number
): Promise<void> {
  const style = ctx.stylesheet.admonitions[element.variant] || ctx.stylesheet.admonitions.note;
  const font = await ctx.doc.embedFont(getFontName(style.contentFontFamily));
  const boldFont = await ctx.doc.embedFont(getFontName(style.titleFontFamily));

  const prefix = ADMONITION_PREFIXES[element.variant] || 'Note';
  const fontSize = style.contentFontSize;
  const titleFontSize = style.titleFontSize;
  const horizontalPadding = style.padding;
  const titleContentGap = 10; // Clear gap between title and content
  const borderWidth = style.borderWidth;
  const contentWidth = ctx.contentArea.width;

  // Calculate content height (excluding trailing line space)
  const contentLines = wrapText(
    element.text,
    contentWidth - horizontalPadding * 2 - borderWidth,
    fontSize
  );
  const lineHeight = fontSize * style.contentLineHeight;
  // Content height: all lines with spacing, minus the trailing space after last line
  const contentHeight =
    contentLines.length > 0 ? (contentLines.length - 1) * lineHeight + fontSize : 0;

  // Calculate text block height and box dimensions
  const textBlockHeight = titleFontSize + titleContentGap + contentHeight;
  const minPadding = 4; // Minimum padding top and bottom
  const totalHeight = textBlockHeight + minPadding * 2;

  // Apply margin top
  moveCursorDown(ctx, FLOW_SPACING.admonition.marginTop);

  const x = element.position?.x ?? ctx.stylesheet.page.margins.left;
  const boxTop = ctx.cursor.y;
  const boxBottom = boxTop - totalHeight;

  // Draw background
  page.drawRectangle({
    x,
    y: boxBottom,
    width: contentWidth,
    height: totalHeight,
    color: hexToRgb(style.backgroundColor),
    borderWidth: 0,
  });

  // Draw left border accent
  page.drawRectangle({
    x,
    y: boxBottom,
    width: borderWidth,
    height: totalHeight,
    color: hexToRgb(style.borderColor),
  });

  // Draw title (centered vertically)
  // Compensate for descender space: content height includes full fontSize but
  // visual bottom is only ~20% below baseline, creating extra bottom space.
  // Shift content down by 40% of fontSize to visually center.
  const visualCenterOffset = fontSize * 0.4;
  const titleText = `${prefix}: ${element.title}`;
  page.drawText(titleText, {
    x: x + borderWidth + horizontalPadding,
    y: boxTop - minPadding - visualCenterOffset - titleFontSize,
    size: titleFontSize,
    font: boldFont,
    color: hexToRgb(style.titleColor),
  });

  // Draw content lines
  let contentY = boxTop - minPadding - visualCenterOffset - titleFontSize - titleContentGap;
  for (let i = 0; i < contentLines.length; i++) {
    page.drawText(contentLines[i], {
      x: x + borderWidth + horizontalPadding,
      y: contentY,
      size: fontSize,
      font,
      color: hexToRgb(style.contentColor),
    });
    // Only add line spacing if not the last line
    if (i < contentLines.length - 1) {
      contentY -= lineHeight;
    }
  }

  // Track drawn element
  ctx.drawnElements.push({
    type: 'admonition',
    page: pageNum,
    bounds: {
      x,
      y: boxBottom,
      width: contentWidth,
      height: totalHeight,
    },
    content: element.title,
  });

  // Move cursor below admonition
  ctx.cursor.y = boxBottom;
  moveCursorDown(ctx, FLOW_SPACING.admonition.marginBottom);
}

/**
 * Draw horizontal rule at cursor position
 */
async function drawRuleContent(
  ctx: LayoutContext,
  page: PDFPage,
  element: RuleContent,
  pageNum: number
): Promise<void> {
  const style = ctx.stylesheet.rule;

  // Apply margin top
  moveCursorDown(ctx, FLOW_SPACING.rule.marginTop);

  const x = element.position?.x ?? ctx.stylesheet.page.margins.left;
  const y = ctx.cursor.y;
  const width = ctx.contentArea.width;

  page.drawLine({
    start: { x, y },
    end: { x: x + width, y },
    thickness: style.thickness,
    color: hexToRgb(style.color),
  });

  // Track drawn element
  ctx.drawnElements.push({
    type: 'rule',
    page: pageNum,
    bounds: {
      x,
      y: y - style.thickness,
      width,
      height: style.thickness * 2,
    },
  });

  // Move cursor down
  moveCursorDown(ctx, style.thickness + FLOW_SPACING.rule.marginBottom);
}

/**
 * Draw spacer - advances cursor by specified height
 */
async function drawSpacerContent(ctx: LayoutContext, element: SpacerContent): Promise<void> {
  moveCursorDown(ctx, element.height);
}

/**
 * Draw standalone field content at cursor position
 */
async function drawFieldContent(
  ctx: LayoutContext,
  page: PDFPage,
  element: FieldContent,
  pageNum: number
): Promise<void> {
  const labelStyle = ctx.stylesheet.fields.label;
  const fieldStyle = ctx.stylesheet.fields.text;
  const labelPosition = element.labelPosition ?? 'above';
  const labelWidth = element.labelWidth ?? 120;

  // Apply margin top
  moveCursorDown(ctx, FLOW_SPACING.field.marginTop);

  const startX = element.position?.x ?? ctx.contentArea.x;
  const currentY = ctx.cursor.y;

  // Embed label font
  const labelFont = await ctx.doc.embedFont(getFontName(labelStyle.fontFamily));

  // Calculate field position based on label position
  let fieldX: number;
  let fieldY: number;
  let fieldWidth: number;
  let fieldHeight: number;
  if (element.height) {
    // Use custom height if specified
    fieldHeight = element.height;
  } else if (element.fieldType === 'textarea') {
    fieldHeight = 60;
  } else {
    // Match table cell field height for visual consistency
    // Table cells use: rowHeight - cellPadding * 2
    const tableStyle = ctx.stylesheet.table;
    fieldHeight = tableStyle.rowHeight - tableStyle.cellPadding * 2;
  }
  let totalHeight: number;

  if (labelPosition === 'left') {
    // Label on the left, field on the right - vertically centered
    fieldX = startX + labelWidth;
    fieldY = currentY - fieldHeight;
    fieldWidth = element.width ?? ctx.contentArea.width - labelWidth;
    totalHeight = fieldHeight;

    // Center label vertically with the field
    // Text baseline positioned so text center aligns with field center
    const labelY = fieldY + (fieldHeight - labelStyle.fontSize) / 2;
    page.drawText(element.label, {
      x: startX,
      y: labelY,
      size: labelStyle.fontSize,
      font: labelFont,
      color: hexToRgb(labelStyle.color),
    });
  } else {
    // Label above (default)
    page.drawText(element.label, {
      x: startX,
      y: currentY,
      size: labelStyle.fontSize,
      font: labelFont,
      color: hexToRgb(labelStyle.color),
    });

    fieldX = startX;
    fieldY = currentY - labelStyle.fontSize - 4 - fieldHeight;
    fieldWidth = element.width ?? ctx.contentArea.width;
    totalHeight = labelStyle.fontSize + 4 + fieldHeight;
  }

  // Create form field
  const form = ctx.doc.getForm();

  switch (element.fieldType) {
    case 'text': {
      const textField = form.createTextField(element.fieldName);
      textField.addToPage(page, {
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
        borderWidth: fieldStyle.borderWidth,
        borderColor: hexToRgb(fieldStyle.borderColor),
        backgroundColor: hexToRgb(fieldStyle.backgroundColor),
      });
      textField.setFontSize(Math.min(fieldStyle.fontSize, fieldHeight - 4));
      if (typeof element.default === 'string') {
        textField.setText(element.default);
      }
      break;
    }

    case 'textarea': {
      const textareaField = form.createTextField(element.fieldName);
      textareaField.addToPage(page, {
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
        borderWidth: fieldStyle.borderWidth,
        borderColor: hexToRgb(fieldStyle.borderColor),
        backgroundColor: hexToRgb(fieldStyle.backgroundColor),
      });
      textareaField.enableMultiline();
      textareaField.setFontSize(Math.min(fieldStyle.fontSize, 12));
      if (typeof element.default === 'string') {
        textareaField.setText(element.default);
      }
      break;
    }

    case 'dropdown': {
      const dropdownStyle = ctx.stylesheet.fields.dropdown;
      const dropdown = form.createDropdown(element.fieldName);
      dropdown.addToPage(page, {
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
        borderWidth: 0, // Disable built-in border, draw manually
        backgroundColor: hexToRgb(dropdownStyle.backgroundColor),
      });

      // Draw manual border to ensure all sides are visible
      const borderWidth = dropdownStyle.borderWidth;
      const borderColor = hexToRgb(dropdownStyle.borderColor);
      page.drawRectangle({
        x: fieldX,
        y: fieldY,
        width: fieldWidth,
        height: fieldHeight,
        borderWidth,
        borderColor,
        color: undefined, // No fill, just border
      });

      // Add options
      const normalizedOptions = normalizeFieldOptions(element.options);
      const optionLabels = normalizedOptions.map((opt) => opt.label);
      dropdown.addOptions(optionLabels);

      if (typeof element.default === 'string') {
        const defaultOption = normalizedOptions.find(
          (opt) => opt.value === element.default || opt.label === element.default
        );
        if (defaultOption) {
          dropdown.select(defaultOption.label);
        }
      }
      break;
    }

    case 'checkbox': {
      const checkbox = form.createCheckBox(element.fieldName);
      const checkboxSize = Math.min(fieldHeight, 16);
      checkbox.addToPage(page, {
        x: fieldX,
        y: fieldY + (fieldHeight - checkboxSize) / 2,
        width: checkboxSize,
        height: checkboxSize,
        borderWidth: ctx.stylesheet.fields.checkbox.borderWidth,
        borderColor: hexToRgb(ctx.stylesheet.fields.checkbox.borderColor),
        backgroundColor: hexToRgb(ctx.stylesheet.fields.checkbox.backgroundColor),
      });
      if (element.default === true) {
        checkbox.check();
      }
      break;
    }
  }

  // Track drawn element
  ctx.drawnElements.push({
    type: 'field',
    page: pageNum,
    bounds: {
      x: startX,
      y: ctx.cursor.y - totalHeight,
      width: labelPosition === 'left' ? labelWidth + fieldWidth : fieldWidth,
      height: totalHeight,
    },
    content: `Field: ${element.fieldName} (${element.fieldType})`,
  });

  // Update cursor
  ctx.cursor.y = currentY - totalHeight;
  moveCursorDown(ctx, FLOW_SPACING.field.marginBottom);
}

/**
 * Expand simplified table definitions to full table structure
 * Handles rowCount/fieldPrefix auto-generation and values syntax
 */
function expandTableDefinition(table: TableContent): TableContent {
  // If using rowCount with fieldPrefix, generate explicit rows
  if (table.rowCount && table.fieldPrefix) {
    const rows: TableRow[] = [];
    for (let i = 1; i <= table.rowCount; i++) {
      const cells: TableCell[] = table.columns.map((col: TableColumn) => {
        if (col.cellType === 'label') {
          return { type: 'label' as const, value: '' };
        }
        const prefix = table.fieldPrefix ?? 'field';
        const fieldName = col.fieldSuffix
          ? `${prefix}_${col.fieldSuffix}_${i}`
          : `${prefix}_col${table.columns.indexOf(col)}_${i}`;
        if (col.cellType === 'dropdown') {
          return {
            type: 'dropdown' as const,
            fieldName,
            options: col.options ?? [],
          };
        }
        if (col.cellType === 'checkbox') {
          return { type: 'checkbox' as const, fieldName };
        }
        // Default to text
        return { type: 'text' as const, fieldName };
      });
      rows.push({ cells });
    }
    return { ...table, rows };
  }

  // If using values syntax in rows, expand to full cells
  if (table.rows?.some((r) => r.values)) {
    const expandedRows: TableRow[] = table.rows.map((row) => {
      if (!row.values) return row;
      const cells: TableCell[] = row.values.map((value, colIndex) => {
        const col = table.columns[colIndex];
        if (!col) {
          // Handle case where values array is longer than columns
          return { type: 'label' as const, value: String(value) };
        }

        // If column has cellType 'label', treat value as static text
        if (col.cellType === 'label') {
          return { type: 'label' as const, value: String(value) };
        }

        // For field columns, the value is the fieldName
        const fieldName = String(value);

        // Empty string means empty label cell (placeholder/spacer)
        if (fieldName === '') {
          return { type: 'label' as const, value: '' };
        }

        if (col.cellType === 'dropdown') {
          return {
            type: 'dropdown' as const,
            fieldName,
            options: col.options ?? [],
          };
        }
        if (col.cellType === 'checkbox') {
          return {
            type: 'checkbox' as const,
            fieldName,
            default: typeof value === 'boolean' ? value : undefined,
          };
        }
        if (col.cellType === 'text') {
          return { type: 'text' as const, fieldName };
        }

        // No cellType specified - infer from value type
        // If it looks like a boolean, make it a checkbox
        if (typeof value === 'boolean') {
          return { type: 'checkbox' as const, fieldName: '', default: value };
        }
        // Otherwise, if it looks like a field name (alphanumeric with underscores), make it a text field
        // If it's just a plain string, make it a label
        if (/^[a-zA-Z][a-zA-Z0-9_]*$/.test(fieldName)) {
          return { type: 'text' as const, fieldName };
        }
        return { type: 'label' as const, value: typeof value === 'string' ? value : String(value) };
      });
      return { cells };
    });
    return { ...table, rows: expandedRows };
  }

  return table;
}

/**
 * Draw table content at cursor position
 */
async function drawTableContent(
  ctx: LayoutContext,
  page: PDFPage,
  element: TableContent,
  pageNum: number
): Promise<void> {
  // Expand simplified table definition to full structure
  const expandedTable = expandTableDefinition(element);

  const style = ctx.stylesheet.table;
  const showBorders = expandedTable.showBorders !== false;
  const rowHeight = expandedTable.rowHeight ?? style.rowHeight;
  const headerHeight = expandedTable.headerHeight ?? style.headerHeight;

  // Calculate total table width
  const totalWidth = expandedTable.columns.reduce((sum, col) => sum + col.width, 0);

  // Apply margin top
  moveCursorDown(ctx, FLOW_SPACING.table.marginTop);

  const startX = expandedTable.position?.x ?? ctx.contentArea.x;
  let currentY = ctx.cursor.y;

  // Embed fonts
  const headerFont = await ctx.doc.embedFont(getFontName(style.headerFontFamily));
  const cellFont = await ctx.doc.embedFont(getFontName(style.cellFontFamily));
  const labelFont = await ctx.doc.embedFont(getFontName(ctx.stylesheet.fields.label.fontFamily));

  // --- Draw table label if provided ---
  let labelHeight = 0;
  if (expandedTable.label) {
    const labelFontSize = ctx.stylesheet.fields.label.fontSize;
    const labelMargin = -4;

    page.drawText(expandedTable.label, {
      x: startX,
      y: currentY,
      size: labelFontSize,
      font: labelFont,
      color: hexToRgb(ctx.stylesheet.fields.label.color),
    });

    labelHeight = labelFontSize + labelMargin;
    currentY -= labelHeight;
  }

  // --- Draw header row ---
  const headerTop = currentY;
  const headerBottom = headerTop - headerHeight;

  // Header background
  page.drawRectangle({
    x: startX,
    y: headerBottom,
    width: totalWidth,
    height: headerHeight,
    color: hexToRgb(style.headerBackgroundColor),
  });

  // Draw header text for each column
  let colX = startX;
  for (const column of expandedTable.columns) {
    const textWidth = headerFont.widthOfTextAtSize(column.label, style.headerFontSize);
    const textX = colX + (column.width - textWidth) / 2;
    const textY = headerBottom + (headerHeight - style.headerFontSize) / 2 + 2;

    page.drawText(column.label, {
      x: textX,
      y: textY,
      size: style.headerFontSize,
      font: headerFont,
      color: hexToRgb(style.headerTextColor),
    });

    if (showBorders && colX !== startX) {
      page.drawLine({
        start: { x: colX, y: headerTop },
        end: { x: colX, y: headerBottom },
        thickness: style.borderWidth,
        color: hexToRgb(style.borderColor),
      });
    }

    colX += column.width;
  }

  // Draw header borders
  if (showBorders) {
    page.drawLine({
      start: { x: startX, y: headerTop },
      end: { x: startX + totalWidth, y: headerTop },
      thickness: style.borderWidth,
      color: hexToRgb(style.borderColor),
    });
    page.drawLine({
      start: { x: startX, y: headerBottom },
      end: { x: startX + totalWidth, y: headerBottom },
      thickness: style.borderWidth,
      color: hexToRgb(style.borderColor),
    });
    page.drawLine({
      start: { x: startX, y: headerTop },
      end: { x: startX, y: headerBottom },
      thickness: style.borderWidth,
      color: hexToRgb(style.borderColor),
    });
    page.drawLine({
      start: { x: startX + totalWidth, y: headerTop },
      end: { x: startX + totalWidth, y: headerBottom },
      thickness: style.borderWidth,
      color: hexToRgb(style.borderColor),
    });
  }

  // --- Draw data rows ---
  let rowY = headerBottom;
  const rows = expandedTable.rows || [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const rowTop = rowY;
    const rowBottom = rowTop - rowHeight;
    const isAlternate = rowIndex % 2 === 1;

    const bgColor = isAlternate ? style.alternateRowColor : style.rowBackgroundColor;
    page.drawRectangle({
      x: startX,
      y: rowBottom,
      width: totalWidth,
      height: rowHeight,
      color: hexToRgb(bgColor),
    });

    // Draw cells
    colX = startX;
    const cells = row.cells || [];
    for (
      let cellIndex = 0;
      cellIndex < cells.length && cellIndex < expandedTable.columns.length;
      cellIndex++
    ) {
      const cell = cells[cellIndex];
      const column = expandedTable.columns[cellIndex];

      const cellX = colX + style.cellPadding;
      const cellY = rowBottom + style.cellPadding;
      const cellWidth = column.width - style.cellPadding * 2;
      const cellHeight = rowHeight - style.cellPadding * 2;

      if (cell.type === 'label') {
        const textY = rowBottom + (rowHeight - style.cellFontSize) / 2 + 2;
        page.drawText(cell.value, {
          x: cellX,
          y: textY,
          size: style.cellFontSize,
          font: cellFont,
          color: hexToRgb(style.cellTextColor),
        });
      } else {
        await createTableCellField(
          ctx.doc,
          page,
          cell,
          cellX,
          cellY,
          cellWidth,
          cellHeight,
          ctx.stylesheet
        );
      }

      if (showBorders && colX !== startX) {
        page.drawLine({
          start: { x: colX, y: rowTop },
          end: { x: colX, y: rowBottom },
          thickness: style.borderWidth,
          color: hexToRgb(style.borderColor),
        });
      }

      colX += column.width;
    }

    // Draw row borders
    if (showBorders) {
      page.drawLine({
        start: { x: startX, y: rowBottom },
        end: { x: startX + totalWidth, y: rowBottom },
        thickness: style.borderWidth,
        color: hexToRgb(style.borderColor),
      });
      page.drawLine({
        start: { x: startX, y: rowTop },
        end: { x: startX, y: rowBottom },
        thickness: style.borderWidth,
        color: hexToRgb(style.borderColor),
      });
      page.drawLine({
        start: { x: startX + totalWidth, y: rowTop },
        end: { x: startX + totalWidth, y: rowBottom },
        thickness: style.borderWidth,
        color: hexToRgb(style.borderColor),
      });
    }

    rowY = rowBottom;
  }

  // Track drawn element
  const tableHeight = headerHeight + rows.length * rowHeight;
  const totalHeight = tableHeight + labelHeight;
  ctx.drawnElements.push({
    type: 'table',
    page: pageNum,
    bounds: {
      x: startX,
      y: ctx.cursor.y - totalHeight,
      width: totalWidth,
      height: totalHeight,
    },
    content: `Table with ${expandedTable.columns.length} columns and ${rows.length} rows`,
  });

  // Update cursor position
  ctx.cursor.y = rowY;
  moveCursorDown(ctx, FLOW_SPACING.table.marginBottom);
}

/**
 * Create a form field inside a table cell
 */
async function createTableCellField(
  doc: PDFDocument,
  page: PDFPage,
  cell: TableCell,
  x: number,
  y: number,
  width: number,
  height: number,
  stylesheet: import('../../types/stylesheet.js').ResolvedStylesheet
): Promise<void> {
  if (cell.type === 'label') {
    return; // Labels are drawn as text, not as form fields
  }

  const form = doc.getForm();

  switch (cell.type) {
    case 'text': {
      const textField = form.createTextField(cell.fieldName);
      textField.addToPage(page, {
        x,
        y,
        width,
        height,
        borderWidth: stylesheet.fields.text.borderWidth,
        borderColor: hexToRgb(stylesheet.fields.text.borderColor),
        backgroundColor: hexToRgb(stylesheet.fields.text.backgroundColor),
      });
      textField.setFontSize(Math.min(stylesheet.fields.text.fontSize, height - 4));
      if (typeof cell.default === 'string') {
        textField.setText(cell.default);
      }
      break;
    }

    case 'dropdown': {
      const dropdown = form.createDropdown(cell.fieldName);
      dropdown.addToPage(page, {
        x,
        y,
        width,
        height,
        borderWidth: 0, // Disable built-in border, draw manually for consistent rendering
        backgroundColor: hexToRgb(stylesheet.fields.dropdown.backgroundColor),
      });

      // Draw manual border overlay to ensure all sides render correctly
      // (pdf-lib's built-in dropdown border has rendering issues)
      const dropdownBorderWidth = stylesheet.fields.dropdown.borderWidth;
      const dropdownBorderColor = hexToRgb(stylesheet.fields.dropdown.borderColor);
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderWidth: dropdownBorderWidth,
        borderColor: dropdownBorderColor,
        color: undefined, // No fill, just border
      });

      // Add options
      const normalizedOptions = normalizeFieldOptions(cell.options);
      const optionLabels = normalizedOptions.map((opt) => opt.label);
      dropdown.addOptions(optionLabels);

      // Set default if specified
      if (typeof cell.default === 'string') {
        const defaultOption = normalizedOptions.find(
          (opt) => opt.value === cell.default || opt.label === cell.default
        );
        if (defaultOption) {
          dropdown.select(defaultOption.label);
        }
      }

      dropdown.setFontSize(Math.min(stylesheet.fields.dropdown.fontSize, height - 4));
      break;
    }

    case 'checkbox': {
      const checkbox = form.createCheckBox(cell.fieldName);
      // Center checkbox in cell
      const checkboxSize = Math.min(height - 2, stylesheet.fields.checkbox.size);
      const checkboxX = x + (width - checkboxSize) / 2;
      const checkboxY = y + (height - checkboxSize) / 2;
      checkbox.addToPage(page, {
        x: checkboxX,
        y: checkboxY,
        width: checkboxSize,
        height: checkboxSize,
        borderWidth: stylesheet.fields.checkbox.borderWidth,
        borderColor: hexToRgb(stylesheet.fields.checkbox.borderColor),
        backgroundColor: hexToRgb(stylesheet.fields.checkbox.backgroundColor),
      });
      if (cell.default === true) {
        checkbox.check();
      }
      break;
    }
  }
}
