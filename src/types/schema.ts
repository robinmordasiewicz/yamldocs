/**
 * Form Schema Types
 * Defines the structure for YAML form schema files
 */

export type FieldType = 'text' | 'checkbox' | 'radio' | 'dropdown' | 'textarea' | 'signature';

// Content element types for schema-driven PDF generation
export type ContentType =
  | 'heading'
  | 'paragraph'
  | 'rule'
  | 'admonition'
  | 'spacer'
  | 'table'
  | 'field';

export interface ContentPosition {
  x?: number;
  y?: number; // Optional in flow mode
}

export interface BaseContentElement {
  type: ContentType;
  page?: number; // Optional in flow mode - content flows automatically
  position?: ContentPosition; // Optional in flow mode
}

export interface HeadingContent extends BaseContentElement {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface ParagraphContent extends BaseContentElement {
  type: 'paragraph';
  text: string;
  maxWidth?: number;
  fontSize?: number;
}

export interface AdmonitionContent extends BaseContentElement {
  type: 'admonition';
  variant: 'warning' | 'note' | 'info' | 'tip' | 'danger';
  title: string;
  text: string;
}

export interface RuleContent extends BaseContentElement {
  type: 'rule';
}

export interface SpacerContent extends BaseContentElement {
  type: 'spacer';
  height: number;
}

// Table content types
export interface TableColumn {
  label: string;
  width: number; // Width in points
  cellType?: 'text' | 'dropdown' | 'checkbox' | 'label'; // Default cell type for column
  fieldSuffix?: string; // Suffix for auto-generated field names
  options?: FieldOption[]; // Column-level options for dropdown cells
}

export interface TableCellLabel {
  type: 'label'; // Static text (non-editable)
  value: string;
}

export interface TableCellField {
  type: 'text' | 'dropdown' | 'checkbox';
  fieldName: string;
  options?: FieldOption[]; // For dropdown
  default?: string | boolean;
}

export type TableCell = TableCellLabel | TableCellField;

export interface TableRow {
  cells?: TableCell[]; // Full cell definitions (optional if using values)
  values?: (string | boolean)[]; // Compact format: labels/fieldNames
}

export interface TableContent extends BaseContentElement {
  type: 'table';
  label?: string; // Optional label/description above the table
  columns: TableColumn[];
  fieldPrefix?: string; // Base for auto-generated field names
  rowCount?: number; // Generate N identical rows using column definitions
  rows?: TableRow[]; // Explicit rows (optional if rowCount used)
  rowHeight?: number; // Default: 22pt
  headerHeight?: number; // Default: 24pt
  showBorders?: boolean; // Default: true
}

// Standalone field content type for flow mode
export interface FieldContent extends BaseContentElement {
  type: 'field';
  label: string; // Label displayed above or beside the field
  labelPosition?: 'above' | 'left'; // Label position (default: above)
  labelWidth?: number; // Label width when position is 'left' (default: 120)
  fieldType: 'text' | 'dropdown' | 'checkbox' | 'textarea';
  fieldName: string; // Unique field identifier
  width?: number; // Field width in points (default: full width)
  height?: number; // Field height in points (for textarea, default: 60)
  options?: FieldOption[]; // For dropdown fields
  default?: string | boolean;
  placeholder?: string;
  required?: boolean;
}

export type SchemaContentElement =
  | HeadingContent
  | ParagraphContent
  | AdmonitionContent
  | RuleContent
  | SpacerContent
  | TableContent
  | FieldContent;

export interface FieldPosition {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface FieldValidation {
  pattern?: string;
  message?: string;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FormField {
  name: string;
  type: FieldType;
  label: string;
  page: number;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  minLength?: number;
  min?: number;
  max?: number;
  multiline?: boolean;
  options?: (FieldOption | string)[];
  default?: string | boolean;
  validation?: FieldValidation;
  position: FieldPosition;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  readOnly?: boolean;
  hidden?: boolean;
  /**
   * Position of the field label:
   * - 'left': Label appears to the left of the field (default for dropdowns)
   * - 'right': Label appears to the right of the field
   * - 'above': Label appears above the field
   * - 'none': Label is hidden
   */
  labelPosition?: 'left' | 'right' | 'above' | 'none';
}

export interface CalculatedField {
  name: string;
  formula: string;
  format?: 'number' | 'currency' | 'percentage' | 'text';
  decimals?: number;
}

export interface ConditionalField {
  trigger: {
    field: string;
    value: string | boolean | number;
    operator?: 'equals' | 'not_equals' | 'contains' | 'greater' | 'less';
  };
  show?: string[];
  hide?: string[];
  enable?: string[];
  disable?: string[];
}

export interface ValidationRule {
  if: string;
  then: string;
}

export interface FormMetadata {
  id: string;
  title: string;
  version?: string;
  pages?: number;
  author?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  /**
   * Field positioning mode:
   * - 'flow': Content elements stack vertically without explicit y coordinates (default)
   */
  positioning?: 'flow';
  /**
   * Path to custom CSS stylesheet for PDF styling.
   * If not specified, uses default stylesheet.
   */
  stylesheet?: string;
  /**
   * Enable auto-numbering for standalone field labels.
   * When true, field labels are prefixed with sequential numbers (1., 2., 3., etc.)
   * Tables are excluded from numbering.
   */
  numbering?: boolean;
}

export interface RevisionHistoryEntry {
  version: string;
  date: string;
  author: string;
  description: string;
}

export interface CoverPage {
  subtitle?: string;
  organization?: string;
  department?: string;
  documentNumber?: string;
  documentType?: string;
  status?: string;
  classification?: string;
  date?: string;
  effectiveDate?: string;
  reviewDate?: string;
  preparedBy?: string;
  reviewedBy?: string;
  approvedBy?: string;
  copyright?: string;
  disclaimer?: string;
  distributionStatement?: string;
  logo?: string;
  coverImage?: string;
  watermark?: string;
  revisionHistory?: RevisionHistoryEntry[];
}

export interface FooterSeparator {
  enabled?: boolean;
  color?: string;
  thickness?: number;
}

export interface FooterSocialLinks {
  youtube?: string;
  x?: string;
  facebook?: string;
  linkedin?: string;
  github?: string;
  website?: string;
}

export interface FooterConfig {
  enabled?: boolean;
  left?: string;
  center?: string;
  right?: string;
  text?: string;
  copyright?: string;
  showPageNumbers?: boolean;
  showVersion?: boolean;
  showDate?: boolean;
  separator?: FooterSeparator;
  socialLinks?: FooterSocialLinks;
}

export interface FormSchema {
  $schema?: string;
  form: FormMetadata;
  coverPage?: CoverPage;
  footer?: FooterConfig;
  content?: SchemaContentElement[];
  fields: FormField[];
  calculations?: CalculatedField[];
  conditionalFields?: ConditionalField[];
  validation?: {
    rules?: ValidationRule[];
  };
}

// Normalized field option (always has value and label)
export interface NormalizedFieldOption {
  value: string;
  label: string;
}

// Normalized form field (with all options normalized)
export interface NormalizedFormField extends Omit<FormField, 'options'> {
  options?: NormalizedFieldOption[];
}

// Parsed and validated schema
export interface ParsedFormSchema extends Omit<FormSchema, 'fields'> {
  fields: NormalizedFormField[];
}
