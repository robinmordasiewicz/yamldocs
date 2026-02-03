/**
 * GitHub Pages publishing orchestration
 * Coordinates index generation and publishing methods
 */

import * as core from '@actions/core';
import type { PublishOptions, PublishResult, GeneratedFile } from './types.js';
import { publishToBranch } from './branch.js';
import { prepareForPagesApi } from './pages-api.js';

export type { PublishOptions, PublishResult, GeneratedFile };

interface PublishContext {
  /** Publishing options */
  options: PublishOptions;
  /** Output directory containing generated files */
  outputDir: string;
  /** List of successfully generated file paths */
  generatedFiles: string[];
}

/**
 * Publish generated files to GitHub Pages
 */
export async function publish(context: PublishContext): Promise<PublishResult> {
  const { options, outputDir, generatedFiles } = context;

  if (!options.enabled) {
    return { success: true };
  }

  core.info('');
  core.info('🚀 Publishing to GitHub Pages');

  // Publish based on method
  let result: PublishResult;

  if (options.method === 'branch') {
    result = await publishToBranch({
      sourceDir: outputDir,
      branch: options.branch,
      message: `Deploy yamlforms: ${generatedFiles.length} file(s)`,
    });
  } else {
    result = prepareForPagesApi({
      sourceDir: outputDir,
    });
  }

  return result;
}

/**
 * Parse publish options from action inputs
 */
export function parsePublishOptions(
  publish: boolean,
  publishMethod: string,
  pagesBranch: string,
  generateIndex: boolean,
  indexTitle: string
): PublishOptions {
  // Validate publish method
  const method = publishMethod === 'branch' ? 'branch' : 'pages-api';

  return {
    enabled: publish,
    method,
    branch: pagesBranch || 'gh-pages',
    generateIndex,
    indexTitle: indexTitle || 'Generated Documents',
  };
}
