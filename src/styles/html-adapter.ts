/**
 * HTML Adapter - Converts design tokens to CSS for HTML generation
 */

import { colors, typography, spacing, borders, components, ptToRem, ptToPx } from './tokens.js';
import type { AdmonitionVariant } from '../types/stylesheet.js';
import type { PageLayoutConfig } from '../types/config.js';

/**
 * Convert points to CSS pixels using true pt-to-px conversion (1pt = 1.333px at 96 DPI)
 * This ensures HTML tables render at the same pixel heights as PDF tables
 */
const px = (pt: number): string => `${Math.round(ptToPx(pt))}px`;

/**
 * Generate CSS string from design tokens
 */
export function generateCssFromTokens(pageLayout?: PageLayoutConfig): string {
  const rem = ptToRem;
  const pageLayoutEnabled = pageLayout?.enabled ?? true;
  const pageSize = pageLayout?.pageSize ?? 'a4';

  // Get page dimensions from tokens
  const pageDimensions =
    pageSize === 'a4' ? components.pageLayout.a4 : components.pageLayout.letter;

  return `
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      font-size: ${rem(components.paragraph.fontSize)};
      line-height: ${typography.lineHeight.relaxed};
      color: ${colors.gray[900]};
      background-color: ${pageLayoutEnabled ? components.pageLayout.backgroundColor : colors.white};
      ${pageLayoutEnabled ? `min-height: 100vh; padding: ${components.pageLayout.wrapperPadding}px 0;` : ''}
    }

    /* Legacy container (for non-page-layout mode) */
    .container {
      max-width: ${px(components.container.maxWidth)};
      margin: 0 auto;
      padding: ${rem(components.container.padding)};
      background: ${colors.white};
      min-height: 100vh;
    }

    /* Page Layout Mode - Visual A4/Letter pages */
    .page-layout-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: ${components.pageLayout.pageGap}px;
    }

    .page {
      width: ${pageDimensions.width}px;
      height: ${pageDimensions.height}px;
      min-height: ${pageDimensions.height}px;
      background: ${components.pageLayout.pageBackgroundColor};
      box-shadow: ${components.pageLayout.pageShadow};
      padding: ${pageDimensions.margin}px;
      box-sizing: border-box;
      position: relative;
    }

    .page-content {
      width: ${pageDimensions.contentWidth}px;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .page-content > main {
      flex: 1 1 auto;
    }

    .page-number {
      position: absolute;
      bottom: ${pageDimensions.margin / 2}px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: ${rem(typography.fontSize.xs)};
      color: ${colors.gray[500]};
    }

    header {
      margin-bottom: ${rem(spacing[4])};
      padding-bottom: ${rem(spacing[3])};
      border-bottom: 2px solid ${colors.gray[300]};
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    header h1 {
      font-size: ${rem(components.header.fontSize)};
      font-weight: normal;
      color: ${components.header.color};
    }

    .version {
      color: ${colors.gray[700]};
      font-size: ${rem(typography.fontSize.xs)};
    }

    main {
      margin-bottom: ${rem(spacing[4])};
    }

    main h2 {
      margin-top: ${rem(components.heading.h2.marginTop)};
      margin-bottom: ${rem(components.heading.h2.marginBottom)};
      font-size: ${rem(components.heading.h2.fontSize)};
      color: ${components.heading.h2.color};
    }

    main h3 {
      margin-top: ${rem(components.heading.h3.marginTop)};
      margin-bottom: ${rem(components.heading.h3.marginBottom)};
      font-size: ${rem(components.heading.h3.fontSize)};
      color: ${components.heading.h3.color};
    }

    main p {
      margin-bottom: ${rem(components.paragraph.marginBottom)};
      font-size: ${rem(components.paragraph.fontSize)};
      color: ${components.paragraph.color};
    }

    .form {
      margin-top: ${rem(spacing[4])};
    }

    .form-page {
      margin-bottom: ${rem(spacing[4])};
      padding: ${rem(spacing[3])};
      border: 1px solid ${colors.gray[300]};
      border-radius: ${px(borders.radius.lg)};
    }

    .form-page legend {
      padding: 0 ${rem(spacing[1])};
      font-weight: 600;
      font-size: ${rem(components.field.label.fontSize)};
      color: ${colors.gray[700]};
    }

    .form-group {
      margin-bottom: ${rem(spacing[3])};
    }

    .form-group label {
      display: block;
      margin-bottom: ${rem(components.field.label.marginBottom)};
      font-weight: 500;
      font-size: ${rem(components.field.label.fontSize)};
      color: ${components.field.label.color};
    }

    .required {
      color: ${colors.error.main};
      margin-left: 0.25rem;
    }

    input[type="text"],
    textarea,
    select {
      width: 100%;
      padding: ${rem(components.field.text.padding)} ${rem(spacing[2])};
      font-size: ${rem(components.field.text.fontSize)};
      border: ${px(components.field.base.borderWidth)} solid ${colors.gray[400]};
      border-radius: ${px(borders.radius.base)};
      background-color: ${components.field.base.backgroundColor};
      transition: border-color 0.15s ease;
    }

    input[type="text"]:focus,
    textarea:focus,
    select:focus {
      outline: none;
      border-color: ${colors.primary.main};
      box-shadow: 0 0 0 2px ${colors.primary.light};
    }

    .form-check {
      display: flex;
      align-items: center;
      gap: ${rem(spacing[1])};
      margin-bottom: ${rem(spacing[1])};
    }

    .form-check input {
      width: auto;
    }

    .form-check label {
      margin-bottom: 0;
      font-weight: normal;
      font-size: ${rem(components.field.label.fontSize)};
    }

    .radio-group {
      margin-top: ${rem(spacing[1])};
    }

    .signature-field .signature-box {
      border: 1px solid ${colors.gray[400]};
      border-radius: ${px(borders.radius.md)};
      margin-bottom: ${rem(spacing[2])};
    }

    .signature-field canvas {
      display: block;
      cursor: crosshair;
    }

    .form-actions {
      margin-top: ${rem(spacing[4])};
      padding-top: ${rem(spacing[3])};
      border-top: 1px solid ${colors.gray[300]};
      display: flex;
      gap: ${rem(spacing[3])};
    }

    .btn {
      padding: ${rem(components.button.paddingY)} ${rem(components.button.paddingX)};
      font-size: ${rem(components.button.fontSize)};
      font-weight: 500;
      border: none;
      border-radius: ${px(components.button.borderRadius)};
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .btn-primary {
      background-color: ${colors.primary.main};
      color: ${colors.white};
    }

    .btn-primary:hover {
      background-color: ${colors.primary.dark};
    }

    .btn-secondary {
      background-color: ${colors.gray[300]};
      color: ${colors.gray[900]};
    }

    .btn-secondary:hover {
      background-color: ${colors.gray[400]};
    }

    .btn-small {
      padding: ${rem(spacing[1])} ${rem(spacing[2])};
      font-size: ${rem(typography.fontSize.xs)};
    }

    footer {
      margin-top: auto;
      padding-top: ${rem(spacing[3])};
      text-align: center;
      color: ${colors.gray[500]};
      font-size: ${rem(components.footer.fontSize)};
    }

    .document-footer {
      margin-top: auto;
      padding-top: ${rem(spacing[3])};
      color: ${colors.gray[500]};
      font-size: ${rem(components.footer.fontSize)};
    }

    .footer-separator {
      border-top: 1px solid ${colors.gray[300]};
    }

    .footer-sections {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      width: 100%;
    }

    .footer-sections .footer-left {
      text-align: left;
      flex: 1;
    }

    .footer-sections .footer-center {
      text-align: center;
      flex: 1;
    }

    .footer-sections .footer-right {
      text-align: right;
      flex: 1;
    }

    .footer-social {
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: 8px;
      margin-top: ${rem(spacing[1])};
    }

    .footer-social a {
      display: inline-block;
      line-height: 0;
    }

    .footer-social img {
      width: 16px;
      height: 16px;
      opacity: 0.6;
    }

    .footer-social img:hover {
      opacity: 1;
    }

    /* Schema content styles */
    .schema-content-form {
      margin-top: ${rem(spacing[3])};
    }

    .content-rule {
      border: none;
      border-top: ${px(components.rule.thickness)} solid ${components.rule.color};
      margin: ${rem(components.rule.marginTop)} 0;
    }

    .spacer {
      display: block;
    }

    /* Inline field styles */
    .inline-field {
      margin-bottom: ${rem(spacing[3])};
    }

    .inline-field label {
      display: block;
      margin-bottom: ${rem(components.field.label.marginBottom)};
      font-weight: 500;
      font-size: ${rem(components.field.label.fontSize)};
      color: ${components.field.label.color};
    }

    .inline-field-horizontal {
      display: flex;
      align-items: center;
      gap: ${rem(spacing[2])};
    }

    .inline-field-horizontal label {
      display: inline-block;
      margin-bottom: 0;
      flex-shrink: 0;
      white-space: nowrap;
    }

    .inline-field-horizontal input[type="text"],
    .inline-field-horizontal select {
      width: auto;
      flex-shrink: 0;
    }

    .inline-field input[type="text"],
    .inline-field select,
    .inline-field textarea {
      height: ${px(components.field.text.height)};
      padding: 0 ${rem(spacing[1])};
      font-size: ${rem(components.field.text.fontSize)};
      border: ${px(components.field.base.borderWidth)} solid ${colors.gray[400]};
      border-radius: ${px(borders.radius.base)};
      box-sizing: border-box;
    }

    .inline-field select {
      min-width: 100px;
      height: ${px(components.field.dropdown.height)};
    }

    /* Content table styles */
    .table-label {
      font-weight: 600;
      font-size: ${rem(components.field.label.fontSize)};
      margin: ${rem(spacing[3])} 0 ${rem(spacing[1])} 0;
      color: ${colors.gray[900]};
    }

    .content-table {
      table-layout: fixed;
      border-collapse: collapse;
      margin-bottom: ${rem(spacing[3])};
      font-size: ${rem(components.table.cellFontSize)};
    }

    .content-table th,
    .content-table td {
      border: ${px(components.table.borderWidth)} solid ${components.table.borderColor};
      padding: ${rem(components.table.cellPadding)} ${rem(spacing[1])};
      text-align: left;
      vertical-align: middle;
      height: ${px(components.table.rowHeight)};
    }

    .content-table th {
      background-color: ${components.table.headerBackgroundColor};
      font-weight: 600;
      color: ${components.table.headerTextColor};
      white-space: nowrap;
      overflow: visible;
      height: ${px(components.table.headerHeight)};
    }

    .content-table td {
      vertical-align: middle;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 2px;
    }

    .table-input {
      width: 100%;
      height: ${px(components.field.text.height)};
      padding: 0 ${rem(spacing[1])};
      border: ${px(components.field.base.borderWidth)} solid ${colors.gray[400]};
      border-radius: 0;
      font-size: ${rem(components.table.cellFontSize)};
      background-color: ${components.field.base.backgroundColor};
      box-sizing: border-box;
    }

    .table-input:focus {
      outline: none;
      border-color: ${colors.primary.main};
    }

    .table-select {
      width: 100%;
      height: ${px(components.field.dropdown.height)};
      padding: 0 ${rem(spacing[1])};
      border: ${px(components.field.base.borderWidth)} solid ${colors.gray[400]};
      border-radius: 0;
      font-size: ${rem(components.table.cellFontSize)};
      background-color: ${components.field.base.backgroundColor};
      box-sizing: border-box;
    }

    .table-select:focus {
      outline: none;
      border-color: ${colors.primary.main};
    }

    /* Table checkbox centering - match PDF alignment */
    /* Use higher specificity to override .content-table td { text-align: left } */
    .content-table td.table-checkbox-cell {
      text-align: center;
    }

    .content-table td.table-checkbox-cell input[type="checkbox"] {
      margin: 0;
      vertical-align: middle;
    }

    /* Admonition styles */
    .admonition {
      border-radius: ${px(borders.radius.base)};
      padding: ${rem(components.admonition.padding)};
      margin: ${rem(spacing[3])} 0;
      border-left: ${px(components.admonition.borderWidth)} solid;
    }

    .admonition-title {
      font-weight: 600;
      font-size: ${rem(components.admonition.titleFontSize)};
      margin-bottom: ${rem(spacing[1])};
    }

    .admonition-content {
      font-size: ${rem(components.admonition.contentFontSize)};
    }

${generateAdmonitionVariantCss()}

    /* Page continuation styling (for multi-page forms) */
    .page-continuation {
      /* Elements continue from previous page */
    }

    /* Page break control - prevent splitting these elements across pages */
    .content-table,
    .admonition,
    .form-group,
    .inline-field {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    /* Keep headings with following content */
    main h2, main h3, main h4 {
      break-after: avoid;
      page-break-after: avoid;
    }

    /* Paragraph orphan/widow control */
    main p {
      orphans: 3;
      widows: 3;
    }

    /* Responsive fallback for narrow screens */
    @media (max-width: ${pageDimensions.width + 48}px) {
      body {
        background: ${colors.white};
        padding: 0;
      }
      .page-layout-wrapper {
        gap: 0;
      }
      .page {
        width: 100%;
        min-height: auto;
        box-shadow: none;
        padding: ${rem(spacing[4])};
      }
      .page-content {
        width: 100%;
      }
      .page-number {
        display: none;
      }
    }

    @media print {
      body {
        background: ${colors.white};
        padding: 0;
      }
      .container {
        padding: 0;
      }
      .page-layout-wrapper {
        gap: 0;
      }
      .page {
        box-shadow: none;
        page-break-after: always;
        margin: 0;
        padding: 0;
        width: auto;
        min-height: auto;
      }
      .page:last-child {
        page-break-after: auto;
      }
      .page-number {
        display: none;
      }
      .form-actions {
        display: none;
      }
      .content-table {
        page-break-inside: avoid;
      }
    }

    @page {
      size: ${pageSize === 'a4' ? 'A4' : 'letter'};
      margin: 72pt;
    }
  `;
}

/**
 * Generate CSS for admonition variants
 */
function generateAdmonitionVariantCss(): string {
  const variants: AdmonitionVariant[] = ['info', 'warning', 'note', 'tip', 'danger'];

  return variants
    .map((variant) => {
      const styles = components.admonition.variants[variant];
      return `
    .admonition-${variant} {
      background-color: ${styles.backgroundColor};
      border-color: ${styles.borderColor};
    }

    .admonition-${variant} .admonition-title {
      color: ${styles.titleColor};
    }

    .admonition-${variant} .admonition-content {
      color: ${styles.contentColor};
    }`;
    })
    .join('\n');
}
