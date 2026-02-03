/**
 * HTML Cover Page Generator
 * Renders a cover page as the first page div in the HTML output
 */

import type { FormMetadata, CoverPage } from '../../types/schema.js';

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
 * Render cover page HTML
 * Returns a <div class="page cover-page"> element
 */
export function renderCoverPageHtml(formMeta: FormMetadata, coverPage: CoverPage): string {
  // Cover image as background style
  const coverImageStyle = coverPage.coverImage
    ? ` style="background-image: url('${escapeHtml(coverPage.coverImage)}'); background-size: cover; background-position: center; background-repeat: no-repeat;"`
    : '';

  // Watermark pseudo-element via inline style won't work, so we use a dedicated watermark div
  const watermarkHtml = coverPage.watermark
    ? `<div class="cover-watermark">${escapeHtml(coverPage.watermark)}</div>`
    : '';

  // Logo
  const logoHtml = coverPage.logo
    ? `<div class="cover-logo"><img src="${escapeHtml(coverPage.logo)}" alt="Logo" /></div>`
    : '';

  // Title
  const titleHtml = `<h1 class="cover-title">${escapeHtml(formMeta.title)}</h1>`;

  // Subtitle
  const subtitleHtml = coverPage.subtitle
    ? `<p class="cover-subtitle">${escapeHtml(coverPage.subtitle)}</p>`
    : '';

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

  const metaRows = metaFields
    .filter((entry): entry is [string, string] => !!entry[1])
    .map(
      ([label, value]) =>
        `<tr><td class="cover-meta-label">${escapeHtml(label)}</td><td class="cover-meta-value">${escapeHtml(value)}</td></tr>`
    )
    .join('\n');

  const metaHtml = metaRows ? `<table class="cover-metadata">${metaRows}</table>` : '';

  // Revision history
  let revisionHtml = '';
  if (coverPage.revisionHistory && coverPage.revisionHistory.length > 0) {
    const rows = coverPage.revisionHistory
      .map(
        (entry) =>
          `<tr>
            <td>${escapeHtml(entry.version)}</td>
            <td>${escapeHtml(entry.date)}</td>
            <td>${escapeHtml(entry.author)}</td>
            <td>${escapeHtml(entry.description)}</td>
          </tr>`
      )
      .join('\n');

    revisionHtml = `
      <div class="cover-revision-history">
        <h3>Revision History</h3>
        <table>
          <thead>
            <tr>
              <th>Version</th>
              <th>Date</th>
              <th>Author</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;
  }

  // Legal block
  const legalFields = [
    coverPage.copyright,
    coverPage.disclaimer,
    coverPage.distributionStatement,
  ].filter(Boolean) as string[];

  const legalHtml =
    legalFields.length > 0
      ? `<div class="cover-legal">
        ${legalFields.map((t) => `<p>${escapeHtml(t)}</p>`).join('\n')}
      </div>`
      : '';

  return `
    <div class="page cover-page"${coverImageStyle}>
      ${watermarkHtml}
      <div class="cover-content">
        ${logoHtml}
        ${titleHtml}
        ${subtitleHtml}
        <hr class="cover-divider" />
        ${metaHtml}
        ${revisionHtml}
      </div>
      ${legalHtml}
    </div>`;
}

/**
 * Get CSS styles for cover page
 */
export function getCoverPageCss(): string {
  return `
    .cover-page {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      overflow: hidden;
    }
    .cover-page header,
    .cover-page footer {
      display: none;
    }
    .cover-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(45deg);
      font-size: 72px;
      font-weight: bold;
      color: rgba(200, 200, 200, 0.15);
      white-space: nowrap;
      pointer-events: none;
      z-index: 1;
    }
    .cover-content {
      position: relative;
      z-index: 2;
      padding: 40px;
      flex: 1;
    }
    .cover-logo {
      text-align: center;
      margin-bottom: 20px;
    }
    .cover-logo img {
      max-width: 150px;
      max-height: 80px;
      object-fit: contain;
    }
    .cover-title {
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      color: #1a1a2e;
      margin-bottom: 8px;
      border: none;
      padding: 0;
    }
    .cover-subtitle {
      text-align: center;
      font-size: 16px;
      color: #444;
      margin-bottom: 16px;
    }
    .cover-divider {
      border: none;
      border-top: 1px solid #ccc;
      margin: 16px 40px 20px;
    }
    .cover-metadata {
      margin: 0 40px 20px;
      border-collapse: collapse;
    }
    .cover-metadata td {
      padding: 3px 12px 3px 0;
      font-size: 10px;
      vertical-align: top;
    }
    .cover-meta-label {
      font-weight: bold;
      color: #333;
      white-space: nowrap;
    }
    .cover-meta-value {
      color: #444;
    }
    .cover-revision-history {
      margin: 16px 40px 0;
    }
    .cover-revision-history h3 {
      font-size: 11px;
      font-weight: bold;
      color: #333;
      margin-bottom: 6px;
    }
    .cover-revision-history table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9px;
    }
    .cover-revision-history th {
      background: #f0f0f0;
      font-weight: bold;
      color: #333;
      padding: 4px 8px;
      text-align: left;
      border: 1px solid #ddd;
    }
    .cover-revision-history td {
      padding: 3px 8px;
      color: #444;
      border: 1px solid #ddd;
    }
    .cover-legal {
      position: relative;
      z-index: 2;
      text-align: center;
      padding: 0 40px 20px;
      margin-top: auto;
    }
    .cover-legal p {
      font-size: 8px;
      color: #888;
      margin: 2px 0;
    }
  `;
}
