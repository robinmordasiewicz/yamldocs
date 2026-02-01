/**
 * DOCX Generator
 * Creates DOCX documents using Pandoc
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';
import { spawn } from 'child_process';
import type { DocxConfig } from '../../types/index.js';
import { DEFAULT_CONFIG } from '../../types/index.js';
import type { ParsedMarkdown } from '../../parsers/index.js';

export interface DocxGeneratorOptions {
  markdown?: ParsedMarkdown;
  config?: Partial<DocxConfig>;
  contentPath: string;
}

/**
 * Check if Pandoc is installed
 */
async function checkPandoc(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('pandoc', ['--version']);

    proc.on('error', () => {
      resolve(false);
    });

    proc.on('close', (code) => {
      resolve(code === 0);
    });
  });
}

/**
 * Generate DOCX document using Pandoc
 */
export async function generateDocx(
  options: DocxGeneratorOptions,
  outputPath: string
): Promise<void> {
  const { contentPath, config = {} } = options;

  const docxConfig: Required<DocxConfig> = {
    ...DEFAULT_CONFIG.docx,
    ...config,
  };

  // Check if Pandoc is available
  const hasPandoc = await checkPandoc();
  if (!hasPandoc) {
    throw new Error(
      'Pandoc is not installed. Please install Pandoc to generate DOCX files.\n' +
        'See: https://pandoc.org/installing.html'
    );
  }

  // Ensure output directory exists
  await mkdir(dirname(outputPath), { recursive: true });

  // Build Pandoc arguments
  const args: string[] = [contentPath, '-o', outputPath, '--from=markdown', '--to=docx'];

  // Add reference document if specified
  if (docxConfig.referenceDoc && existsSync(docxConfig.referenceDoc)) {
    args.push(`--reference-doc=${docxConfig.referenceDoc}`);
  }

  // Add table of contents if requested
  if (docxConfig.tableOfContents) {
    args.push('--toc');
    args.push('--toc-depth=3');
  }

  // Run Pandoc
  return new Promise((resolve, reject) => {
    const proc = spawn('pandoc', args);

    let stderr = '';

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('error', (error) => {
      reject(new Error(`Failed to run Pandoc: ${error.message}`));
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Pandoc exited with code ${String(code)}: ${stderr}`));
      }
    });
  });
}

/**
 * Generate and save DOCX in one step
 */
export async function generateAndSaveDocx(
  options: DocxGeneratorOptions,
  outputPath: string
): Promise<void> {
  await generateDocx(options, outputPath);
}

/**
 * Generate DOCX from markdown string (writes temp file then converts)
 */
export async function generateDocxFromString(
  markdown: string,
  outputPath: string,
  config?: Partial<DocxConfig>
): Promise<void> {
  const tempPath = resolve(dirname(outputPath), '.temp-markdown.md');

  try {
    await writeFile(tempPath, markdown);
    await generateDocx({ contentPath: tempPath, config }, outputPath);
  } finally {
    // Clean up temp file
    const { unlink } = await import('fs/promises');
    try {
      await unlink(tempPath);
    } catch {
      // Ignore cleanup errors
    }
  }
}
