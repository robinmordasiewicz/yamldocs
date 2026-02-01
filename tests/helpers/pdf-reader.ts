/**
 * PDF Reader Helper
 * Extract text content, metadata, and structure from PDF
 */

import {
  PDFDocument,
  PDFPage,
  PDFTextField,
  PDFCheckBox,
  PDFDropdown,
  PDFRadioGroup,
} from 'pdf-lib';

export interface PdfMetadata {
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface TextPosition {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
}

export interface PageContent {
  pageNumber: number;
  text: string;
  textPositions: TextPosition[];
  width: number;
  height: number;
}

export interface PdfContent {
  text: string;
  pages: PageContent[];
  metadata: PdfMetadata;
  pageCount: number;
}

/**
 * Read and parse a PDF from bytes
 */
export async function readPdf(pdfBytes: Uint8Array): Promise<PdfContent> {
  const doc = await PDFDocument.load(pdfBytes);

  const metadata: PdfMetadata = {
    title: doc.getTitle(),
    author: doc.getAuthor(),
    creator: doc.getCreator(),
    producer: doc.getProducer(),
    creationDate: doc.getCreationDate(),
    modificationDate: doc.getModificationDate(),
  };

  const pages: PageContent[] = [];
  const pdfPages = doc.getPages();

  for (let i = 0; i < pdfPages.length; i++) {
    const page = pdfPages[i];
    const { width, height } = page.getSize();

    // Note: pdf-lib doesn't provide text extraction directly
    // We capture structural info; actual text extraction would need pdfjs-dist
    pages.push({
      pageNumber: i + 1,
      text: '', // Would need external library for actual text extraction
      textPositions: [],
      width,
      height,
    });
  }

  return {
    text: pages.map((p) => p.text).join('\n'),
    pages,
    metadata,
    pageCount: pdfPages.length,
  };
}

/**
 * Load a PDF document from bytes
 */
export async function loadPdfDocument(pdfBytes: Uint8Array): Promise<PDFDocument> {
  return PDFDocument.load(pdfBytes);
}

/**
 * Get page dimensions
 */
export function getPageDimensions(page: PDFPage): { width: number; height: number } {
  return page.getSize();
}

/**
 * Verify PDF structure is valid
 */
export async function isPdfValid(pdfBytes: Uint8Array): Promise<boolean> {
  try {
    await PDFDocument.load(pdfBytes);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get PDF byte size
 */
export function getPdfSize(pdfBytes: Uint8Array): number {
  return pdfBytes.length;
}
