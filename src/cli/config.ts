/**
 * Configuration Loader
 * Loads and merges configuration from files and CLI options
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname, basename, extname } from 'path';
import * as yaml from 'js-yaml';
import type { Config, GenerateOptions } from '../types/index.js';
import { DEFAULT_CONFIG as DEFAULTS } from '../types/index.js';

const CONFIG_FILENAMES = [
  'markdown-2pdf.config.yaml',
  'markdown-2pdf.config.yml',
  'markdown-2pdf.config.json',
  '.markdown-2pdfrc',
  '.markdown-2pdfrc.yaml',
  '.markdown-2pdfrc.yml',
  '.markdown-2pdfrc.json',
];

/**
 * Find configuration file in directory hierarchy
 */
function findConfigFile(startDir: string): string | null {
  let currentDir = resolve(startDir);

  // Traverse up the directory tree looking for config files
  for (let i = 0; i < 100; i++) {
    // Safety limit to prevent infinite loops
    for (const filename of CONFIG_FILENAMES) {
      const configPath = resolve(currentDir, filename);
      if (existsSync(configPath)) {
        return configPath;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      break; // Reached root
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * Load configuration from a file
 */
async function loadConfigFile(filePath: string): Promise<Partial<Config>> {
  const content = await readFile(filePath, 'utf-8');
  const ext = extname(filePath).toLowerCase();

  if (ext === '.json' || basename(filePath).endsWith('rc.json')) {
    return JSON.parse(content) as Partial<Config>;
  }

  return yaml.load(content) as Partial<Config>;
}

/**
 * Merge configuration from file with defaults
 */
function mergeConfig(base: Config, override: Partial<Config>): Config {
  return {
    input: {
      ...base.input,
      ...override.input,
    },
    output: {
      ...base.output,
      ...override.output,
    },
    pdf: {
      ...base.pdf,
      margins: {
        ...base.pdf.margins,
        ...override.pdf?.margins,
      },
      fonts: {
        ...base.pdf.fonts,
        ...override.pdf?.fonts,
      },
      ...override.pdf,
    },
    html: {
      ...base.html,
      ...override.html,
    },
  };
}

/**
 * Load configuration, merging defaults with file config and CLI options
 */
export async function loadConfig(
  options: GenerateOptions,
  cwd: string = process.cwd()
): Promise<Config> {
  // Start with defaults
  let config: Config = { ...DEFAULTS };

  // Find and load config file
  const configPath = options.config ? resolve(options.config) : findConfigFile(cwd);

  if (configPath && existsSync(configPath)) {
    const fileConfig = await loadConfigFile(configPath);
    config = mergeConfig(config, fileConfig);
  }

  // Apply CLI overrides
  if (options.output) {
    config.output.directory = options.output;
  }

  if (options.format) {
    const formats = Array.isArray(options.format) ? options.format : [options.format];
    config.output.formats = formats;
  }

  return config;
}

/**
 * Resolve input paths relative to config file or cwd
 */
export function resolveInputPaths(
  config: Config,
  baseDir: string
): {
  schemasDir: string;
  stylesDir: string;
} {
  return {
    schemasDir: resolve(baseDir, config.input.schemas),
    stylesDir: resolve(baseDir, config.input.styles),
  };
}

/**
 * Resolve output path
 */
export function resolveOutputPath(config: Config, baseDir: string): string {
  return resolve(baseDir, config.output.directory);
}

/**
 * Generate output filename from template
 */
export function generateOutputFilename(
  template: string,
  name: string,
  format: string,
  version?: string
): string {
  return `${template
    .replace('{name}', name)
    .replace('{format}', format)
    .replace('{version}', version ?? '1.0.0')
    .replace('{date}', new Date().toISOString().split('T')[0])}.${format}`;
}
