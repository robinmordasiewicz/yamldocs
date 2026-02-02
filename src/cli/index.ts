#!/usr/bin/env node

/**
 * markdown-2pdf CLI
 * Generate fillable PDF forms from YAML schemas
 */

import { Command } from 'commander';
import chalk from 'chalk';
import chokidar from 'chokidar';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import type { OutputFormat } from '../types/index.js';
import {
  executeGenerate,
  printGenerateResults,
  executeValidate,
  printValidateResult,
  executePreview,
  printPreviewTable,
  printPreviewJson,
  printPreviewYaml,
} from './commands/index.js';

// CLI option interfaces
interface GenerateCliOptions {
  output?: string;
  format: string;
  config?: string;
  watch?: boolean;
  verbose?: boolean;
}

interface ValidateCliOptions {
  verbose?: boolean;
}

interface PreviewCliOptions {
  format: 'table' | 'json' | 'yaml';
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load package.json for version
function getVersion(): string {
  try {
    const packagePath = resolve(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8')) as {
      version?: string;
    };
    return packageJson.version ?? '1.0.0';
  } catch {
    return '1.0.0';
  }
}

const program = new Command();

program
  .name('markdown-2pdf')
  .description('Generate fillable PDF forms from YAML schemas')
  .version(getVersion());

// Generate command
program
  .command('generate')
  .description('Generate documents from form schema')
  .argument('<schema>', 'Path to form schema YAML file')
  .option('-o, --output <directory>', 'Output directory')
  .option('-f, --format <formats>', 'Output formats (comma-separated: pdf,html)', 'pdf')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-w, --watch', 'Watch for file changes and regenerate')
  .option('-v, --verbose', 'Verbose output')
  .action(async (schema: string, options: GenerateCliOptions) => {
    try {
      // Parse formats
      const formats = options.format.split(',').map((f) => f.trim()) as OutputFormat[];

      const generateOptions = {
        schema,
        output: options.output,
        format: formats,
        config: options.config,
        verbose: options.verbose,
      };

      if (options.watch) {
        // Watch mode
        console.log(chalk.cyan('Watching for changes...'));
        console.log(chalk.gray('Press Ctrl+C to stop'));
        console.log('');

        const filesToWatch: string[] = [schema];
        if (options.config) {
          filesToWatch.push(options.config);
        }

        const watcher = chokidar.watch(filesToWatch, {
          persistent: true,
          ignoreInitial: false,
        });

        let isGenerating = false;

        const generate = async (): Promise<void> => {
          if (isGenerating) return;
          isGenerating = true;

          try {
            console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] Generating...`));
            const results = await executeGenerate(generateOptions);
            printGenerateResults(results);
          } catch (err) {
            const error = err as Error;
            console.error(chalk.red('Error:'), error.message);
          } finally {
            isGenerating = false;
          }
        };

        watcher.on('change', (path) => {
          console.log(chalk.gray(`File changed: ${path}`));
          void generate();
        });

        watcher.on('ready', () => {
          void generate();
        });
      } else {
        // Single generation
        console.log(chalk.cyan('Generating documents...'));

        if (options.verbose) {
          console.log(chalk.gray(`  Schema: ${resolve(schema)}`));
        }

        const results = await executeGenerate(generateOptions);
        printGenerateResults(results);

        // Exit with error if any generation failed
        const hasError = results.some((r) => !r.success);
        if (hasError) {
          process.exit(1);
        }
      }
    } catch (err) {
      const error = err as Error;
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate a form schema YAML file')
  .argument('<schema>', 'Path to form schema YAML file')
  .option('-v, --verbose', 'Verbose output')
  .action(async (schema: string, options: ValidateCliOptions) => {
    try {
      const result = await executeValidate({ schema, verbose: options.verbose });
      printValidateResult(result, options.verbose ?? false);

      if (!result.valid) {
        process.exit(1);
      }
    } catch (err) {
      const error = err as Error;
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Preview command
program
  .command('preview')
  .description('Preview form fields from a schema (dry run)')
  .argument('<schema>', 'Path to form schema YAML file')
  .option('-f, --format <format>', 'Output format (table, json, yaml)', 'table')
  .action(async (schema: string, options: PreviewCliOptions) => {
    try {
      const result = await executePreview({ schema, format: options.format });

      switch (options.format) {
        case 'json':
          printPreviewJson(result);
          break;
        case 'yaml':
          printPreviewYaml(result);
          break;
        default:
          printPreviewTable(result);
      }

      if (!result.success) {
        process.exit(1);
      }
    } catch (err) {
      const error = err as Error;
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Init command (scaffolds a new project)
program
  .command('init')
  .description('Initialize a new markdown-2pdf project')
  .argument('[directory]', 'Directory to initialize', '.')
  .action(async (directory: string) => {
    try {
      const { initProject } = await import('./init.js');
      await initProject(directory);
    } catch (err) {
      const error = err as Error;
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();
