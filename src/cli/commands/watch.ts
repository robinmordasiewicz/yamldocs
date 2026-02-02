/**
 * Watch Command
 * Watches for file changes and regenerates outputs
 */

import { resolve } from 'path';
import { existsSync } from 'fs';
import chalk from 'chalk';
import chokidar from 'chokidar';
import type { GenerateOptions } from '../../types/index.js';
import { executeGenerate, printGenerateResults } from './generate.js';

export interface WatchOptions extends GenerateOptions {
  debounce?: number;
}

/**
 * Execute the watch command
 */
export async function executeWatch(options: WatchOptions): Promise<void> {
  const { schema, debounce = 300 } = options;

  const schemaPath = resolve(schema);
  if (!existsSync(schemaPath)) {
    throw new Error(`Schema file not found: ${schemaPath}`);
  }

  // Files to watch
  const watchPaths: string[] = [schemaPath];

  console.log(chalk.cyan('\n📁 Watching for changes...\n'));
  console.log(chalk.gray('  Files being watched:'));
  for (const path of watchPaths) {
    console.log(chalk.gray(`    • ${path}`));
  }
  console.log('');

  // Debounce timer
  let debounceTimer: NodeJS.Timeout | null = null;

  // Generate function
  const generate = async (): Promise<void> => {
    console.log(chalk.yellow('\n🔄 Changes detected, regenerating...\n'));

    try {
      const results = await executeGenerate(options);
      printGenerateResults(results);

      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        console.log(chalk.green(`✓ All ${successCount} outputs generated successfully`));
      } else {
        console.log(chalk.yellow(`⚠ ${successCount} succeeded, ${failCount} failed`));
      }
    } catch (error) {
      const err = error as Error;
      console.error(chalk.red(`\n✗ Error: ${err.message}`));
    }

    console.log(chalk.gray('\n  Watching for changes... (Ctrl+C to exit)\n'));
  };

  // Initial generation
  await generate();

  // Set up file watcher
  const watcher = chokidar.watch(watchPaths, {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50,
    },
  });

  // Handle file changes with debouncing
  const handleChange = (path: string, event: string): void => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      console.log(chalk.gray(`  ${event}: ${path}`));
      void generate();
    }, debounce);
  };

  watcher.on('change', (path) => {
    handleChange(path, 'Modified');
  });
  watcher.on('add', (path) => {
    handleChange(path, 'Added');
  });
  watcher.on('unlink', (path) => {
    console.log(chalk.yellow(`\n⚠ File removed: ${path}`));
    console.log(chalk.gray('  Watching for changes... (Ctrl+C to exit)\n'));
  });

  watcher.on('error', (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(chalk.red(`\nWatcher error: ${message}`));
  });

  // Handle graceful shutdown
  const shutdown = (): void => {
    console.log(chalk.cyan('\n\n👋 Stopping watch mode...\n'));
    void watcher.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process alive
  await new Promise<void>(() => {
    // Intentionally empty - keeps process alive
  });
}
