/**
 * CSS Stylesheet Parser
 * Parses CSS files and converts them to ResolvedStylesheet structure
 */

import { readFile } from 'fs/promises';
import * as csstree from 'css-tree';
import type {
  ResolvedStylesheet,
  FontFamily,
  StylesheetPageSize,
  AdmonitionVariant,
  HeadingStyle,
  ParagraphStyle,
  RuleStyle,
  AdmonitionStyle,
  TextFieldStyle,
  TextareaFieldStyle,
  CheckboxFieldStyle,
  RadioFieldStyle,
  DropdownFieldStyle,
  SignatureFieldStyle,
  LabelStyle,
  FieldBaseStyle,
  TableStyle,
} from '../types/stylesheet.js';

/**
 * Font family mapping from CSS names to pdf-lib StandardFonts names
 */
const FONT_FAMILY_MAP: Record<string, FontFamily> = {
  helvetica: 'Helvetica',
  helveticabold: 'HelveticaBold',
  'helvetica-bold': 'HelveticaBold',
  helveticaoblique: 'HelveticaOblique',
  'helvetica-oblique': 'HelveticaOblique',
  helveticaboldoblique: 'HelveticaBoldOblique',
  'helvetica-bold-oblique': 'HelveticaBoldOblique',
  courier: 'Courier',
  courierbold: 'CourierBold',
  'courier-bold': 'CourierBold',
  courieroblique: 'CourierOblique',
  'courier-oblique': 'CourierOblique',
  courierboldoblique: 'CourierBoldOblique',
  'courier-bold-oblique': 'CourierBoldOblique',
  timesroman: 'TimesRoman',
  'times-roman': 'TimesRoman',
  times: 'TimesRoman',
  timesromanbold: 'TimesRomanBold',
  'times-roman-bold': 'TimesRomanBold',
  'times-bold': 'TimesRomanBold',
  timesromanitalic: 'TimesRomanItalic',
  'times-roman-italic': 'TimesRomanItalic',
  'times-italic': 'TimesRomanItalic',
  timesromanbolditalic: 'TimesRomanBoldItalic',
  'times-roman-bold-italic': 'TimesRomanBoldItalic',
  'times-bold-italic': 'TimesRomanBoldItalic',
};

/**
 * Parse a CSS file and return a resolved stylesheet
 */
export async function parseStylesheet(cssPath: string): Promise<ResolvedStylesheet> {
  const cssContent = await readFile(cssPath, 'utf-8');
  return parseStylesheetContent(cssContent);
}

/**
 * Parse CSS content string and return a resolved stylesheet
 */
export function parseStylesheetContent(cssContent: string): ResolvedStylesheet {
  const ast = csstree.parse(cssContent);
  const stylesheet = getDefaultStylesheet();

  // First pass: extract CSS variables from :root
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      if (node.prelude.type === 'SelectorList') {
        const selectors = csstree.generate(node.prelude);
        if (selectors === ':root') {
          extractVariables(node, stylesheet.variables);
        }
      }
    },
  });

  // Second pass: process all rules with resolved variables
  csstree.walk(ast, {
    visit: 'Rule',
    enter(node) {
      if (node.prelude.type === 'SelectorList') {
        const selectors = csstree.generate(node.prelude);
        processRule(selectors, node, stylesheet);
      }
    },
  });

  // Process @page rule
  csstree.walk(ast, {
    visit: 'Atrule',
    enter(node) {
      if (node.name === 'page' && node.block) {
        processPageRule(node, stylesheet);
      }
    },
  });

  return stylesheet;
}

/**
 * Extract CSS variables from a :root rule
 */
function extractVariables(node: csstree.Rule, variables: Record<string, string>): void {
  if (node.block.type !== 'Block') return;

  for (const declaration of node.block.children) {
    if (declaration.type === 'Declaration' && declaration.property.startsWith('--')) {
      const value = csstree.generate(declaration.value);
      variables[declaration.property] = value.trim();
    }
  }
}

/**
 * Process a CSS rule and update the stylesheet
 */
function processRule(selectors: string, node: csstree.Rule, stylesheet: ResolvedStylesheet): void {
  const declarations = extractDeclarations(node, stylesheet.variables);

  // Handle multiple selectors (e.g., "h1, h2, h3")
  const selectorList = selectors.split(',').map((s) => s.trim());

  for (const selector of selectorList) {
    // Headings
    if (/^h[1-6]$/.test(selector)) {
      const level = parseInt(selector[1]) as 1 | 2 | 3 | 4 | 5 | 6;
      applyHeadingStyles(declarations, stylesheet.headings[level]);
    }

    // Paragraphs
    if (selector === 'p') {
      applyParagraphStyles(declarations, stylesheet.paragraph);
    }

    // Horizontal rules
    if (selector === 'hr') {
      applyRuleStyles(declarations, stylesheet.rule);
    }

    // Header
    if (selector === '.header') {
      applyTextStyles(declarations, stylesheet.header);
    }

    // Footer
    if (selector === '.footer') {
      applyTextStyles(declarations, stylesheet.footer);
    }

    // Admonitions
    if (selector === '.admonition') {
      applyAdmonitionBaseStyles(declarations, stylesheet.admonitions);
    }
    if (selector === '.admonition-title') {
      applyAdmonitionTitleStyles(declarations, stylesheet.admonitions);
    }
    if (selector === '.admonition-content') {
      applyAdmonitionContentStyles(declarations, stylesheet.admonitions);
    }
    for (const variant of ['warning', 'note', 'info', 'tip', 'danger'] as AdmonitionVariant[]) {
      if (selector === `.admonition-${variant}`) {
        applyAdmonitionVariantStyles(declarations, stylesheet.admonitions[variant]);
      }
      // Handle nested title/content selectors
      if (selector === `.admonition-${variant} .admonition-title`) {
        applyAdmonitionVariantTitleStyles(declarations, stylesheet.admonitions[variant]);
      }
      if (selector === `.admonition-${variant} .admonition-content`) {
        applyAdmonitionVariantContentStyles(declarations, stylesheet.admonitions[variant]);
      }
    }

    // Form fields
    if (selector === '.field') {
      applyFieldBaseStyles(declarations, stylesheet.fields.base);
      // Also apply base to all field types
      applyFieldBaseStyles(declarations, stylesheet.fields.text);
      applyFieldBaseStyles(declarations, stylesheet.fields.textarea);
      applyFieldBaseStyles(declarations, stylesheet.fields.checkbox);
      applyFieldBaseStyles(declarations, stylesheet.fields.radio);
      applyFieldBaseStyles(declarations, stylesheet.fields.dropdown);
      applyFieldBaseStyles(declarations, stylesheet.fields.signature);
    }
    if (selector === '.field-text') {
      applyTextFieldStyles(declarations, stylesheet.fields.text);
    }
    if (selector === '.field-textarea') {
      applyTextareaFieldStyles(declarations, stylesheet.fields.textarea);
    }
    if (selector === '.field-checkbox') {
      applyCheckboxFieldStyles(declarations, stylesheet.fields.checkbox);
    }
    if (selector === '.field-radio') {
      applyRadioFieldStyles(declarations, stylesheet.fields.radio);
    }
    if (selector === '.field-dropdown') {
      applyDropdownFieldStyles(declarations, stylesheet.fields.dropdown);
    }
    if (selector === '.field-signature') {
      applySignatureFieldStyles(declarations, stylesheet.fields.signature);
    }
    if (selector === '.field-signature.required') {
      applySignatureRequiredStyles(declarations, stylesheet.fields.signature);
    }
    if (selector === '.field-label') {
      applyLabelStyles(declarations, stylesheet.fields.label);
    }

    // Table styles
    if (selector === '.table') {
      applyTableBaseStyles(declarations, stylesheet.table);
    }
    if (selector === '.table-header') {
      applyTableHeaderStyles(declarations, stylesheet.table);
    }
    if (selector === '.table-row') {
      applyTableRowStyles(declarations, stylesheet.table);
    }
    if (selector === '.table-cell') {
      applyTableCellStyles(declarations, stylesheet.table);
    }
    if (selector === '.table-row-alternate' || selector === '.table-row:nth-child(even)') {
      applyTableAlternateRowStyles(declarations, stylesheet.table);
    }
  }
}

/**
 * Process @page rule for page size and margins
 */
function processPageRule(node: csstree.Atrule, stylesheet: ResolvedStylesheet): void {
  if (node.block?.type !== 'Block') return;

  for (const declaration of node.block.children) {
    if (declaration.type === 'Declaration') {
      const value = resolveVariables(csstree.generate(declaration.value), stylesheet.variables);

      switch (declaration.property) {
        case 'size': {
          const size = parsePageSize(value);
          if (size) stylesheet.page.size = size;
          break;
        }
        case 'margin': {
          const margins = parseMargins(value);
          if (margins) stylesheet.page.margins = margins;
          break;
        }
        case 'margin-top':
          stylesheet.page.margins.top = parseSize(value);
          break;
        case 'margin-bottom':
          stylesheet.page.margins.bottom = parseSize(value);
          break;
        case 'margin-left':
          stylesheet.page.margins.left = parseSize(value);
          break;
        case 'margin-right':
          stylesheet.page.margins.right = parseSize(value);
          break;
      }
    }
  }
}

/**
 * Extract declarations from a rule as a key-value map
 */
function extractDeclarations(
  node: csstree.Rule,
  variables: Record<string, string>
): Record<string, string> {
  const declarations: Record<string, string> = {};

  if (node.block.type !== 'Block') return declarations;

  for (const declaration of node.block.children) {
    if (declaration.type === 'Declaration') {
      const rawValue = csstree.generate(declaration.value);
      declarations[declaration.property] = resolveVariables(rawValue, variables);
    }
  }

  return declarations;
}

/**
 * Resolve CSS var() references in a value
 */
export function resolveVariables(value: string, variables: Record<string, string>): string {
  // Match var(--name) or var(--name, fallback)
  return value.replace(
    /var\(\s*(--[\w-]+)(?:\s*,\s*([^)]+))?\s*\)/g,
    (_match: string, name: string, fallback: string | undefined) => {
      const resolved = variables[name];
      if (resolved !== undefined) {
        // Recursively resolve in case of nested vars
        return resolveVariables(resolved, variables);
      }
      if (fallback !== undefined) {
        return resolveVariables(fallback.trim(), variables);
      }
      return '';
    }
  );
}

/**
 * Parse a color value to hex format
 */
export function parseColor(value: string): string {
  value = value.trim();

  // Already hex
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) {
    // Expand 3-char hex to 6-char
    if (value.length === 4) {
      return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
    }
    return value.toLowerCase();
  }

  // RGB/RGBA
  const rgbMatch = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]).toString(16).padStart(2, '0');
    const g = parseInt(rgbMatch[2]).toString(16).padStart(2, '0');
    const b = parseInt(rgbMatch[3]).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }

  // Named colors (common ones)
  const namedColors: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#00ff00',
    blue: '#0000ff',
    gray: '#808080',
    grey: '#808080',
  };
  if (namedColors[value.toLowerCase()]) {
    return namedColors[value.toLowerCase()];
  }

  // Return as-is if unrecognized (may already be hex without #)
  return value.startsWith('#') ? value : `#${value}`;
}

/**
 * Parse a size value to points
 */
export function parseSize(value: string): number {
  value = value.trim();

  // Points
  const ptMatch = /^([\d.]+)\s*pt$/i.exec(value);
  if (ptMatch) return parseFloat(ptMatch[1]);

  // Pixels (approximate: 1px ≈ 0.75pt)
  const pxMatch = /^([\d.]+)\s*px$/i.exec(value);
  if (pxMatch) return parseFloat(pxMatch[1]) * 0.75;

  // Inches
  const inMatch = /^([\d.]+)\s*in$/i.exec(value);
  if (inMatch) return parseFloat(inMatch[1]) * 72;

  // Centimeters
  const cmMatch = /^([\d.]+)\s*cm$/i.exec(value);
  if (cmMatch) return parseFloat(cmMatch[1]) * 28.3465;

  // Millimeters
  const mmMatch = /^([\d.]+)\s*mm$/i.exec(value);
  if (mmMatch) return parseFloat(mmMatch[1]) * 2.83465;

  // Ems (approximate: 1em ≈ 12pt base)
  const emMatch = /^([\d.]+)\s*em$/i.exec(value);
  if (emMatch) return parseFloat(emMatch[1]) * 12;

  // Unitless number (assume points)
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse a font family value
 */
export function parseFontFamily(value: string): FontFamily {
  // Remove quotes and normalize
  const normalized = value
    .replace(/["']/g, '')
    .split(',')[0] // Take first font in stack
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

  return FONT_FAMILY_MAP[normalized] || 'Helvetica';
}

/**
 * Parse a line-height value
 */
export function parseLineHeight(value: string): number {
  value = value.trim();

  // Unitless number
  const num = parseFloat(value);
  if (!isNaN(num) && !/[a-z%]/i.exec(value)) {
    return num;
  }

  // Percentage
  const pctMatch = /^([\d.]+)%$/.exec(value);
  if (pctMatch) return parseFloat(pctMatch[1]) / 100;

  // Em
  const emMatch = /^([\d.]+)em$/i.exec(value);
  if (emMatch) return parseFloat(emMatch[1]);

  return 1.5; // Default
}

/**
 * Parse page size
 */
function parsePageSize(value: string): StylesheetPageSize | null {
  const normalized = value.toLowerCase().trim();
  if (['letter', 'a4', 'legal', 'tabloid'].includes(normalized)) {
    return normalized as StylesheetPageSize;
  }
  return null;
}

/**
 * Parse margin shorthand
 */
function parseMargins(
  value: string
): { top: number; bottom: number; left: number; right: number } | null {
  const parts = value.trim().split(/\s+/);
  const sizes = parts.map(parseSize);

  switch (sizes.length) {
    case 1:
      return { top: sizes[0], bottom: sizes[0], left: sizes[0], right: sizes[0] };
    case 2:
      return { top: sizes[0], bottom: sizes[0], left: sizes[1], right: sizes[1] };
    case 3:
      return { top: sizes[0], left: sizes[1], right: sizes[1], bottom: sizes[2] };
    case 4:
      return { top: sizes[0], right: sizes[1], bottom: sizes[2], left: sizes[3] };
    default:
      return null;
  }
}

// Style application functions

function applyTextStyles(
  decl: Record<string, string>,
  style: { fontFamily?: FontFamily; fontSize?: number; color?: string }
): void {
  if (decl['font-family']) style.fontFamily = parseFontFamily(decl['font-family']);
  if (decl['font-size']) style.fontSize = parseSize(decl['font-size']);
  if (decl.color) style.color = parseColor(decl.color);
}

function applyHeadingStyles(decl: Record<string, string>, style: HeadingStyle): void {
  applyTextStyles(decl, style);
  if (decl['line-height']) style.lineHeight = parseLineHeight(decl['line-height']);
  if (decl['margin-top']) style.marginTop = parseSize(decl['margin-top']);
  if (decl['margin-bottom']) style.marginBottom = parseSize(decl['margin-bottom']);
}

function applyParagraphStyles(decl: Record<string, string>, style: ParagraphStyle): void {
  applyTextStyles(decl, style);
  if (decl['line-height']) style.lineHeight = parseLineHeight(decl['line-height']);
  if (decl['margin-bottom']) style.marginBottom = parseSize(decl['margin-bottom']);
  if (decl['max-width']) style.maxWidth = parseSize(decl['max-width']);
}

function applyRuleStyles(decl: Record<string, string>, style: RuleStyle): void {
  if (decl['border-top-width']) style.thickness = parseSize(decl['border-top-width']);
  if (decl['border-top-color']) style.color = parseColor(decl['border-top-color']);
  if (decl['margin-top']) style.marginTop = parseSize(decl['margin-top']);
  if (decl['margin-bottom']) style.marginBottom = parseSize(decl['margin-bottom']);
  // Handle shorthand: border-top: 1pt solid #color
  if (decl['border-top']) {
    const parts = decl['border-top'].split(/\s+/);
    for (const part of parts) {
      if (/^\d/.exec(part)) style.thickness = parseSize(part);
      else if (part.startsWith('#') || /^[a-z]+$/i.exec(part)) style.color = parseColor(part);
    }
  }
}

function applyAdmonitionBaseStyles(
  decl: Record<string, string>,
  admonitions: Record<AdmonitionVariant, AdmonitionStyle>
): void {
  const variants: AdmonitionVariant[] = ['warning', 'note', 'info', 'tip', 'danger'];
  for (const variant of variants) {
    if (decl.padding) admonitions[variant].padding = parseSize(decl.padding);
    if (decl['border-left-width'])
      admonitions[variant].borderWidth = parseSize(decl['border-left-width']);
  }
}

function applyAdmonitionTitleStyles(
  decl: Record<string, string>,
  admonitions: Record<AdmonitionVariant, AdmonitionStyle>
): void {
  const variants: AdmonitionVariant[] = ['warning', 'note', 'info', 'tip', 'danger'];
  for (const variant of variants) {
    if (decl['font-family'])
      admonitions[variant].titleFontFamily = parseFontFamily(decl['font-family']);
    if (decl['font-size']) admonitions[variant].titleFontSize = parseSize(decl['font-size']);
  }
}

function applyAdmonitionContentStyles(
  decl: Record<string, string>,
  admonitions: Record<AdmonitionVariant, AdmonitionStyle>
): void {
  const variants: AdmonitionVariant[] = ['warning', 'note', 'info', 'tip', 'danger'];
  for (const variant of variants) {
    if (decl['font-family'])
      admonitions[variant].contentFontFamily = parseFontFamily(decl['font-family']);
    if (decl['font-size']) admonitions[variant].contentFontSize = parseSize(decl['font-size']);
    if (decl['line-height'])
      admonitions[variant].contentLineHeight = parseLineHeight(decl['line-height']);
  }
}

function applyAdmonitionVariantStyles(decl: Record<string, string>, style: AdmonitionStyle): void {
  if (decl['background-color']) style.backgroundColor = parseColor(decl['background-color']);
  if (decl['border-left-color']) style.borderColor = parseColor(decl['border-left-color']);
  if (decl['border-left-width']) style.borderWidth = parseSize(decl['border-left-width']);
  if (decl.padding) style.padding = parseSize(decl.padding);
}

function applyAdmonitionVariantTitleStyles(
  decl: Record<string, string>,
  style: AdmonitionStyle
): void {
  if (decl.color) style.titleColor = parseColor(decl.color);
  if (decl['font-family']) style.titleFontFamily = parseFontFamily(decl['font-family']);
  if (decl['font-size']) style.titleFontSize = parseSize(decl['font-size']);
}

function applyAdmonitionVariantContentStyles(
  decl: Record<string, string>,
  style: AdmonitionStyle
): void {
  if (decl.color) style.contentColor = parseColor(decl.color);
  if (decl['font-family']) style.contentFontFamily = parseFontFamily(decl['font-family']);
  if (decl['font-size']) style.contentFontSize = parseSize(decl['font-size']);
  if (decl['line-height']) style.contentLineHeight = parseLineHeight(decl['line-height']);
}

function applyFieldBaseStyles(decl: Record<string, string>, style: FieldBaseStyle): void {
  if (decl['border-width']) style.borderWidth = parseSize(decl['border-width']);
  if (decl['border-color']) style.borderColor = parseColor(decl['border-color']);
  if (decl['background-color']) style.backgroundColor = parseColor(decl['background-color']);
}

function applyTextFieldStyles(decl: Record<string, string>, style: TextFieldStyle): void {
  applyFieldBaseStyles(decl, style);
  if (decl['font-size']) style.fontSize = parseSize(decl['font-size']);
  if (decl.height) style.height = parseSize(decl.height);
  if (decl.padding) style.padding = parseSize(decl.padding);
}

function applyTextareaFieldStyles(decl: Record<string, string>, style: TextareaFieldStyle): void {
  applyFieldBaseStyles(decl, style);
  if (decl['font-size']) style.fontSize = parseSize(decl['font-size']);
  if (decl.padding) style.padding = parseSize(decl.padding);
  if (decl['line-height']) style.lineHeight = parseLineHeight(decl['line-height']);
}

function applyCheckboxFieldStyles(decl: Record<string, string>, style: CheckboxFieldStyle): void {
  applyFieldBaseStyles(decl, style);
  if (decl.width) style.size = parseSize(decl.width);
  if (decl.height) style.size = parseSize(decl.height);
}

function applyRadioFieldStyles(decl: Record<string, string>, style: RadioFieldStyle): void {
  applyFieldBaseStyles(decl, style);
  if (decl.width) style.size = parseSize(decl.width);
  if (decl.height) style.size = parseSize(decl.height);
}

function applyDropdownFieldStyles(decl: Record<string, string>, style: DropdownFieldStyle): void {
  applyFieldBaseStyles(decl, style);
  if (decl['font-size']) style.fontSize = parseSize(decl['font-size']);
  if (decl.height) style.height = parseSize(decl.height);
  if (decl.padding) style.padding = parseSize(decl.padding);
}

function applySignatureFieldStyles(decl: Record<string, string>, style: SignatureFieldStyle): void {
  applyFieldBaseStyles(decl, style);
  if (decl['font-size']) style.fontSize = parseSize(decl['font-size']);
}

function applySignatureRequiredStyles(
  decl: Record<string, string>,
  style: SignatureFieldStyle
): void {
  if (decl['border-color']) style.requiredBorderColor = parseColor(decl['border-color']);
  if (decl['border-width']) style.requiredBorderWidth = parseSize(decl['border-width']);
}

function applyLabelStyles(decl: Record<string, string>, style: LabelStyle): void {
  if (decl['font-family']) style.fontFamily = parseFontFamily(decl['font-family']);
  if (decl['font-size']) style.fontSize = parseSize(decl['font-size']);
  if (decl.color) style.color = parseColor(decl.color);
  if (decl['margin-bottom']) style.marginBottom = parseSize(decl['margin-bottom']);
}

// Table style application functions

function applyTableBaseStyles(decl: Record<string, string>, style: TableStyle): void {
  if (decl['border-color']) style.borderColor = parseColor(decl['border-color']);
  if (decl['border-width']) style.borderWidth = parseSize(decl['border-width']);
  if (decl.padding) style.cellPadding = parseSize(decl.padding);
}

function applyTableHeaderStyles(decl: Record<string, string>, style: TableStyle): void {
  if (decl['background-color']) style.headerBackgroundColor = parseColor(decl['background-color']);
  if (decl.color) style.headerTextColor = parseColor(decl.color);
  if (decl['font-family']) style.headerFontFamily = parseFontFamily(decl['font-family']);
  if (decl['font-size']) style.headerFontSize = parseSize(decl['font-size']);
  if (decl.height) style.headerHeight = parseSize(decl.height);
}

function applyTableRowStyles(decl: Record<string, string>, style: TableStyle): void {
  if (decl['background-color']) style.rowBackgroundColor = parseColor(decl['background-color']);
  if (decl.height) style.rowHeight = parseSize(decl.height);
  // Handle alternate row color via a special property or class
}

function applyTableCellStyles(decl: Record<string, string>, style: TableStyle): void {
  if (decl['font-family']) style.cellFontFamily = parseFontFamily(decl['font-family']);
  if (decl['font-size']) style.cellFontSize = parseSize(decl['font-size']);
  if (decl.color) style.cellTextColor = parseColor(decl.color);
  if (decl.padding) style.cellPadding = parseSize(decl.padding);
}

function applyTableAlternateRowStyles(decl: Record<string, string>, style: TableStyle): void {
  if (decl['background-color']) style.alternateRowColor = parseColor(decl['background-color']);
}

/**
 * Get the default stylesheet with all values initialized
 * Based on industry standards: ISO 9241-115, PDF/UA, WCAG 2.1 AA
 */
export function getDefaultStylesheet(): ResolvedStylesheet {
  return {
    variables: {},

    page: {
      size: 'letter',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    },

    headings: {
      1: {
        fontFamily: 'HelveticaBold',
        fontSize: 20,
        color: '#000000',
        lineHeight: 1.2,
        marginTop: 0,
        marginBottom: 18,
      },
      2: {
        fontFamily: 'HelveticaBold',
        fontSize: 16,
        color: '#000000',
        lineHeight: 1.2,
        marginTop: 24,
        marginBottom: 12,
      },
      3: {
        fontFamily: 'HelveticaBold',
        fontSize: 14,
        color: '#000000',
        lineHeight: 1.2,
        marginTop: 18,
        marginBottom: 12,
      },
      4: {
        fontFamily: 'HelveticaBold',
        fontSize: 12,
        color: '#000000',
        lineHeight: 1.2,
        marginTop: 12,
        marginBottom: 12,
      },
      5: {
        fontFamily: 'HelveticaBold',
        fontSize: 11,
        color: '#000000',
        lineHeight: 1.2,
        marginTop: 12,
        marginBottom: 12,
      },
      6: {
        fontFamily: 'HelveticaBold',
        fontSize: 11,
        color: '#000000',
        lineHeight: 1.2,
        marginTop: 12,
        marginBottom: 12,
      },
    },

    paragraph: {
      fontFamily: 'Helvetica',
      fontSize: 12,
      color: '#333333',
      lineHeight: 1.5,
      marginBottom: 12,
      maxWidth: 468,
    },

    rule: {
      thickness: 1,
      color: '#d1d1d1',
      marginTop: 24,
      marginBottom: 24,
    },

    admonitions: {
      warning: {
        backgroundColor: '#fef3cd',
        borderColor: '#856404',
        borderWidth: 4,
        padding: 12,
        titleFontFamily: 'HelveticaBold',
        titleFontSize: 12,
        titleColor: '#664d03',
        contentFontFamily: 'Helvetica',
        contentFontSize: 11,
        contentColor: '#664d03',
        contentLineHeight: 1.4,
      },
      note: {
        backgroundColor: '#cce5ff',
        borderColor: '#004085',
        borderWidth: 4,
        padding: 12,
        titleFontFamily: 'HelveticaBold',
        titleFontSize: 12,
        titleColor: '#004085',
        contentFontFamily: 'Helvetica',
        contentFontSize: 11,
        contentColor: '#004085',
        contentLineHeight: 1.4,
      },
      info: {
        backgroundColor: '#d1ecf1',
        borderColor: '#0c5460',
        borderWidth: 4,
        padding: 12,
        titleFontFamily: 'HelveticaBold',
        titleFontSize: 12,
        titleColor: '#0c5460',
        contentFontFamily: 'Helvetica',
        contentFontSize: 11,
        contentColor: '#0c5460',
        contentLineHeight: 1.4,
      },
      tip: {
        backgroundColor: '#d4edda',
        borderColor: '#155724',
        borderWidth: 4,
        padding: 12,
        titleFontFamily: 'HelveticaBold',
        titleFontSize: 12,
        titleColor: '#155724',
        contentFontFamily: 'Helvetica',
        contentFontSize: 11,
        contentColor: '#155724',
        contentLineHeight: 1.4,
      },
      danger: {
        backgroundColor: '#f8d7da',
        borderColor: '#721c24',
        borderWidth: 4,
        padding: 12,
        titleFontFamily: 'HelveticaBold',
        titleFontSize: 12,
        titleColor: '#721c24',
        contentFontFamily: 'Helvetica',
        contentFontSize: 11,
        contentColor: '#721c24',
        contentLineHeight: 1.4,
      },
    },

    fields: {
      base: {
        borderWidth: 1,
        borderColor: '#767676',
        backgroundColor: '#ffffff',
      },
      text: {
        borderWidth: 1,
        borderColor: '#767676',
        backgroundColor: '#ffffff',
        fontSize: 12,
        height: 28,
        padding: 6,
      },
      textarea: {
        borderWidth: 1,
        borderColor: '#767676',
        backgroundColor: '#ffffff',
        fontSize: 12,
        padding: 6,
        lineHeight: 1.4,
      },
      checkbox: {
        borderWidth: 1,
        borderColor: '#767676',
        backgroundColor: '#ffffff',
        size: 24,
      },
      radio: {
        borderWidth: 1,
        borderColor: '#767676',
        backgroundColor: '#ffffff',
        size: 24,
      },
      dropdown: {
        borderWidth: 1,
        borderColor: '#767676',
        backgroundColor: '#ffffff',
        fontSize: 12,
        height: 28,
        padding: 6,
      },
      signature: {
        borderWidth: 1.5,
        borderColor: '#767676',
        backgroundColor: '#fafafa',
        fontSize: 14,
        requiredBorderColor: '#721c24',
        requiredBorderWidth: 2,
      },
      label: {
        fontFamily: 'Helvetica',
        fontSize: 11,
        color: '#333333',
        marginBottom: 6,
      },
    },

    header: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#666666',
    },

    footer: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#666666',
    },

    table: {
      headerBackgroundColor: '#f0f0f0',
      headerTextColor: '#000000',
      headerFontFamily: 'HelveticaBold',
      headerFontSize: 10,
      rowBackgroundColor: '#ffffff',
      alternateRowColor: '#f9f9f9',
      borderColor: '#cccccc',
      borderWidth: 0.5,
      cellPadding: 4,
      cellFontFamily: 'Helvetica',
      cellFontSize: 10,
      cellTextColor: '#333333',
      rowHeight: 22,
      headerHeight: 24,
    },
  };
}
