/**
 * Stylesheet Types
 * Defines the structure for parsed CSS stylesheets used in PDF generation
 */

/**
 * Standard font family names that map to pdf-lib StandardFonts
 */
export type FontFamily =
  | 'Helvetica'
  | 'HelveticaBold'
  | 'HelveticaOblique'
  | 'HelveticaBoldOblique'
  | 'Courier'
  | 'CourierBold'
  | 'CourierOblique'
  | 'CourierBoldOblique'
  | 'TimesRoman'
  | 'TimesRomanBold'
  | 'TimesRomanItalic'
  | 'TimesRomanBoldItalic';

/**
 * Page size options
 */
export type StylesheetPageSize = 'letter' | 'a4' | 'legal' | 'tabloid';

/**
 * Admonition variant types
 */
export type AdmonitionVariant = 'warning' | 'note' | 'info' | 'tip' | 'danger';

/**
 * Base text styling properties
 */
export interface TextStyle {
  fontFamily: FontFamily;
  fontSize: number;
  color: string;
  lineHeight?: number;
}

/**
 * Page layout styles
 */
export interface PageStyles {
  size: StylesheetPageSize;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

/**
 * Heading level styles
 */
export interface HeadingStyle extends TextStyle {
  marginTop: number;
  marginBottom: number;
}

/**
 * Paragraph styles
 */
export interface ParagraphStyle extends TextStyle {
  marginBottom: number;
  maxWidth?: number;
}

/**
 * Horizontal rule styles
 */
export interface RuleStyle {
  thickness: number;
  color: string;
  marginTop: number;
  marginBottom: number;
}

/**
 * Admonition box styles
 */
export interface AdmonitionStyle {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  padding: number;
  titleFontFamily: FontFamily;
  titleFontSize: number;
  titleColor: string;
  contentFontFamily: FontFamily;
  contentFontSize: number;
  contentColor: string;
  contentLineHeight: number;
}

/**
 * Base field styling (shared across field types)
 */
export interface FieldBaseStyle {
  borderWidth: number;
  borderColor: string;
  backgroundColor: string;
}

/**
 * Text input field styles
 */
export interface TextFieldStyle extends FieldBaseStyle {
  fontSize: number;
  height: number;
  padding: number;
}

/**
 * Textarea field styles
 */
export interface TextareaFieldStyle extends FieldBaseStyle {
  fontSize: number;
  padding: number;
  lineHeight: number;
}

/**
 * Checkbox field styles
 */
export interface CheckboxFieldStyle extends FieldBaseStyle {
  size: number;
}

/**
 * Radio button field styles
 */
export interface RadioFieldStyle extends FieldBaseStyle {
  size: number;
}

/**
 * Dropdown field styles
 */
export interface DropdownFieldStyle extends FieldBaseStyle {
  fontSize: number;
  height: number;
  padding: number;
}

/**
 * Signature field styles
 */
export interface SignatureFieldStyle extends FieldBaseStyle {
  fontSize: number;
  requiredBorderColor: string;
  requiredBorderWidth: number;
}

/**
 * Field label styles
 */
export interface LabelStyle {
  fontFamily: FontFamily;
  fontSize: number;
  color: string;
  marginBottom: number;
}

/**
 * Header/Footer text styles
 */
export type HeaderFooterStyle = TextStyle;

/**
 * Table content styles
 */
export interface TableStyle {
  headerBackgroundColor: string;
  headerTextColor: string;
  headerFontFamily: FontFamily;
  headerFontSize: number;
  rowBackgroundColor: string;
  alternateRowColor: string;
  borderColor: string;
  borderWidth: number;
  cellPadding: number;
  cellFontFamily: FontFamily;
  cellFontSize: number;
  cellTextColor: string;
  rowHeight: number;
  headerHeight: number;
}

/**
 * Complete resolved stylesheet structure
 */
export interface ResolvedStylesheet {
  /** CSS custom properties (variables) */
  variables: Record<string, string>;

  /** Page layout configuration */
  page: PageStyles;

  /** Heading styles by level (1-6) */
  headings: Record<1 | 2 | 3 | 4 | 5 | 6, HeadingStyle>;

  /** Paragraph text styles */
  paragraph: ParagraphStyle;

  /** Horizontal rule styles */
  rule: RuleStyle;

  /** Admonition box styles by variant */
  admonitions: Record<AdmonitionVariant, AdmonitionStyle>;

  /** Form field styles */
  fields: {
    base: FieldBaseStyle;
    text: TextFieldStyle;
    textarea: TextareaFieldStyle;
    checkbox: CheckboxFieldStyle;
    radio: RadioFieldStyle;
    dropdown: DropdownFieldStyle;
    signature: SignatureFieldStyle;
    label: LabelStyle;
  };

  /** Page header styles */
  header: HeaderFooterStyle;

  /** Page footer styles */
  footer: HeaderFooterStyle;

  /** Table content styles */
  table: TableStyle;
}
