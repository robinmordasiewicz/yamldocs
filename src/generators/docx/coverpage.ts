/**
 * DOCX Cover Page Generator
 * Creates a cover page section for Word documents
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  AlignmentType,
  BorderStyle,
  WidthType,
  ImageRun,
  PageOrientation,
  ShadingType,
} from 'docx';
import type { FormMetadata, CoverPage } from '../../types/schema.js';
import type { ResolvedStylesheet } from '../../types/stylesheet.js';
import { ptToTwip, ptToEmu } from './utils.js';
import { getPageDimensions } from './layout.js';

/**
 * Create a cover page section for DOCX with no headers/footers
 */
export async function createCoverPageSection(
  formMeta: FormMetadata,
  coverPage: CoverPage,
  stylesheet: ResolvedStylesheet,
  _config: unknown,
  basePath: string
): Promise<{
  properties: object;
  children: (Paragraph | Table)[];
}> {
  const pageDimensions = getPageDimensions(stylesheet.page.size);
  const margins = stylesheet.page.margins;
  const children: (Paragraph | Table)[] = [];

  // Cover image (as paragraph image)
  if (coverPage.coverImage) {
    const imageParagraph = await createImageParagraph(
      coverPage.coverImage,
      basePath,
      ptToEmu(stylesheet.page.size === 'letter' ? 612 : 595.28), // page width in EMU
      ptToEmu(200) // max height
    );
    if (imageParagraph) {
      children.push(imageParagraph);
    }
  }

  // Logo
  if (coverPage.logo) {
    const logoParagraph = await createImageParagraph(
      coverPage.logo,
      basePath,
      ptToEmu(150), // max width
      ptToEmu(80), // max height
      AlignmentType.CENTER
    );
    if (logoParagraph) {
      children.push(logoParagraph);
    }
  }

  // Spacer
  children.push(new Paragraph({ spacing: { after: ptToTwip(20) }, children: [] }));

  // Title (from form.title)
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: ptToTwip(8) },
      children: [
        new TextRun({
          text: formMeta.title,
          font: 'Arial',
          size: 56, // 28pt in half-points
          bold: true,
          color: '1a1a2e',
        }),
      ],
    })
  );

  // Subtitle
  if (coverPage.subtitle) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: ptToTwip(16) },
        children: [
          new TextRun({
            text: coverPage.subtitle,
            font: 'Arial',
            size: 32, // 16pt
            color: '444444',
          }),
        ],
      })
    );
  }

  // Horizontal rule
  children.push(
    new Paragraph({
      spacing: { before: ptToTwip(10), after: ptToTwip(20) },
      border: {
        bottom: {
          style: BorderStyle.SINGLE,
          size: 1,
          color: 'cccccc',
        },
      },
      children: [],
    })
  );

  // Metadata block
  const metaFields: [string, string | undefined][] = [
    ['Organization', coverPage.organization],
    ['Department', coverPage.department],
    ['Document #', coverPage.documentNumber],
    ['Type', coverPage.documentType],
    ['Status', coverPage.status],
    ['Classification', coverPage.classification],
    ['Date', coverPage.date],
    ['Effective Date', coverPage.effectiveDate],
    ['Review Date', coverPage.reviewDate],
    ['Version', formMeta.version],
    ['Author', formMeta.author],
    ['Prepared By', coverPage.preparedBy],
    ['Reviewed By', coverPage.reviewedBy],
    ['Approved By', coverPage.approvedBy],
  ];

  for (const [label, value] of metaFields) {
    if (!value) continue;
    children.push(
      new Paragraph({
        spacing: { after: ptToTwip(4) },
        indent: { left: ptToTwip(40) },
        children: [
          new TextRun({
            text: `${label}: `,
            font: 'Arial',
            size: 20, // 10pt
            bold: true,
            color: '333333',
          }),
          new TextRun({
            text: value,
            font: 'Arial',
            size: 20,
            color: '444444',
          }),
        ],
      })
    );
  }

  // Revision history table
  if (coverPage.revisionHistory && coverPage.revisionHistory.length > 0) {
    children.push(new Paragraph({ spacing: { before: ptToTwip(16) }, children: [] }));
    children.push(
      new Paragraph({
        indent: { left: ptToTwip(40) },
        spacing: { after: ptToTwip(6) },
        children: [
          new TextRun({
            text: 'Revision History',
            font: 'Arial',
            size: 18, // 9pt
            bold: true,
            color: '333333',
          }),
        ],
      })
    );

    const noBorders = {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'dddddd' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'dddddd' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'dddddd' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'dddddd' },
    };

    // Header row
    const headerRow = new TableRow({
      children: ['Version', 'Date', 'Author', 'Description'].map(
        (header) =>
          new TableCell({
            borders: noBorders,
            shading: { type: ShadingType.SOLID, fill: 'f0f0f0', color: 'f0f0f0' },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: header,
                    font: 'Arial',
                    size: 16,
                    bold: true,
                    color: '333333',
                  }),
                ],
              }),
            ],
          })
      ),
    });

    // Data rows
    const dataRows = coverPage.revisionHistory.map(
      (entry) =>
        new TableRow({
          children: [entry.version, entry.date, entry.author, entry.description].map(
            (value) =>
              new TableCell({
                borders: noBorders,
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: value,
                        font: 'Arial',
                        size: 16,
                        color: '444444',
                      }),
                    ],
                  }),
                ],
              })
          ),
        })
    );

    const revisionTable = new Table({
      rows: [headerRow, ...dataRows],
      width: { size: 80, type: WidthType.PERCENTAGE },
      indent: { size: ptToTwip(40), type: WidthType.DXA },
    });

    children.push(revisionTable);
  }

  // Spacer before legal
  children.push(new Paragraph({ spacing: { before: ptToTwip(40) }, children: [] }));

  // Legal block
  const legalFields = [
    coverPage.copyright,
    coverPage.disclaimer,
    coverPage.distributionStatement,
  ].filter(Boolean) as string[];

  for (const text of legalFields) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: ptToTwip(4) },
        children: [
          new TextRun({
            text,
            font: 'Arial',
            size: 16, // 8pt
            color: '888888',
          }),
        ],
      })
    );
  }

  // Section properties: no headers/footers, page break after
  const sectionProperties = {
    page: {
      size: {
        width: pageDimensions.width,
        height: pageDimensions.height,
        orientation: PageOrientation.PORTRAIT,
      },
      margin: {
        top: ptToTwip(margins.top),
        right: ptToTwip(margins.right),
        bottom: ptToTwip(margins.bottom),
        left: ptToTwip(margins.left),
      },
    },
  };

  return {
    properties: sectionProperties,
    children,
  };
}

/**
 * Create a paragraph with an embedded image
 */
async function createImageParagraph(
  imagePath: string,
  basePath: string,
  maxWidthEmu: number,
  maxHeightEmu: number,
  alignment: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.CENTER
): Promise<Paragraph | null> {
  const resolvedPath = resolve(basePath, imagePath);
  if (!existsSync(resolvedPath)) {
    console.warn(`Image not found: ${resolvedPath}`);
    return null;
  }

  try {
    const imageBytes = await readFile(resolvedPath);

    // Use fixed dimensions since we can't easily get image dimensions without a parser
    // Scale to fit within max bounds
    const imageRun = new ImageRun({
      data: imageBytes,
      transformation: {
        width: Math.round((maxWidthEmu / 914400) * 72),
        height: Math.round((maxHeightEmu / 914400) * 72),
      },
      type: imagePath.toLowerCase().endsWith('.png') ? 'png' : 'jpg',
    });

    return new Paragraph({
      alignment,
      spacing: { after: ptToTwip(10) },
      children: [imageRun],
    });
  } catch (err) {
    console.warn(`Failed to embed image: ${(err as Error).message}`);
    return null;
  }
}
