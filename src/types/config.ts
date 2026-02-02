/**
 * Configuration Types
 * Defines the structure for markdown-2pdf.config.yaml
 */

export type OutputFormat = 'pdf' | 'html';

export type PageSize = 'letter' | 'a4' | 'legal' | 'tabloid';

export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface FontConfig {
  default: string;
  monospace: string;
  bold?: string;
  italic?: string;
}

export interface PdfConfig {
  pageSize: PageSize;
  margins: PageMargins;
  fonts: FontConfig;
  embedFonts: boolean;
  compress: boolean;
}

export interface PageLayoutConfig {
  enabled: boolean;
  pageSize: PageSize;
  showPageNumbers: boolean;
}

export interface HtmlConfig {
  template: string;
  embedStyles: boolean;
  includeJs: boolean;
  cssFile: string;
  pageLayout: PageLayoutConfig;
}

export interface InputConfig {
  schemas: string;
  styles: string;
}

export interface OutputConfig {
  directory: string;
  formats: OutputFormat[];
  filenameTemplate: string;
}

export interface Config {
  input: InputConfig;
  output: OutputConfig;
  pdf: PdfConfig;
  html: HtmlConfig;
}

export interface GenerateOptions {
  schema: string;
  output?: string;
  format?: OutputFormat | OutputFormat[];
  config?: string;
  watch?: boolean;
  verbose?: boolean;
}

export interface ValidateOptions {
  schema: string;
  verbose?: boolean;
}

export interface PreviewOptions {
  schema: string;
  format?: 'table' | 'json' | 'yaml';
}

// Default configuration values
export const DEFAULT_CONFIG: Config = {
  input: {
    schemas: './schemas',
    styles: './styles',
  },
  output: {
    directory: './dist',
    formats: ['pdf'],
    filenameTemplate: '{name}',
  },
  pdf: {
    pageSize: 'letter',
    margins: {
      top: 72,
      bottom: 72,
      left: 72,
      right: 72,
    },
    fonts: {
      default: 'Helvetica',
      monospace: 'Courier',
    },
    embedFonts: false,
    compress: true,
  },
  html: {
    template: '',
    embedStyles: true,
    includeJs: true,
    cssFile: '',
    pageLayout: {
      enabled: true,
      pageSize: 'letter', // Match PDF default for consistent table widths
      showPageNumbers: true,
    },
  },
};

// Page dimensions in points (72 points = 1 inch)
export const PAGE_SIZES: Record<PageSize, { width: number; height: number }> = {
  letter: { width: 612, height: 792 },
  a4: { width: 595.28, height: 841.89 },
  legal: { width: 612, height: 1008 },
  tabloid: { width: 792, height: 1224 },
};
