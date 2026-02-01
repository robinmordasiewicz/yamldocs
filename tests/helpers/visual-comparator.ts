/**
 * Visual Comparator Helper
 * Visual regression testing with screenshot comparison
 */

import { writeFile, readFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

export interface ComparisonResult {
  match: boolean;
  diffPercentage: number;
  diffPixels: number;
  diffImage?: Buffer;
}

export interface VisualTestConfig {
  threshold: number; // 0-1, percentage of allowed difference
  baselineDir: string;
  diffDir: string;
}

const DEFAULT_CONFIG: VisualTestConfig = {
  threshold: 0.01, // 1% tolerance
  baselineDir: 'tests/visual/baselines',
  diffDir: 'tests/visual/__diff__',
};

/**
 * Compare two image buffers
 * Uses a simple pixel-by-pixel comparison
 */
export function compareImages(
  actual: Buffer,
  expected: Buffer,
  threshold = 0.01
): ComparisonResult {
  // Simple size comparison first
  if (actual.length !== expected.length) {
    return {
      match: false,
      diffPercentage: 1,
      diffPixels: Math.max(actual.length, expected.length),
    };
  }

  let diffPixels = 0;
  const totalPixels = actual.length;

  for (let i = 0; i < actual.length; i++) {
    if (actual[i] !== expected[i]) {
      diffPixels++;
    }
  }

  const diffPercentage = diffPixels / totalPixels;

  return {
    match: diffPercentage <= threshold,
    diffPercentage,
    diffPixels,
  };
}

/**
 * Save baseline image
 */
export async function saveBaseline(
  testName: string,
  imageBuffer: Buffer,
  config: Partial<VisualTestConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const baselinePath = join(mergedConfig.baselineDir, `${testName}.png`);

  await mkdir(dirname(baselinePath), { recursive: true });
  await writeFile(baselinePath, imageBuffer);

  return baselinePath;
}

/**
 * Load baseline image
 */
export async function loadBaseline(
  testName: string,
  config: Partial<VisualTestConfig> = {}
): Promise<Buffer | null> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const baselinePath = join(mergedConfig.baselineDir, `${testName}.png`);

  if (!existsSync(baselinePath)) {
    return null;
  }

  return readFile(baselinePath);
}

/**
 * Save diff image for debugging
 */
export async function saveDiffImage(
  testName: string,
  diffBuffer: Buffer,
  config: Partial<VisualTestConfig> = {}
): Promise<string> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const diffPath = join(mergedConfig.diffDir, `${testName}-diff.png`);

  await mkdir(dirname(diffPath), { recursive: true });
  await writeFile(diffPath, diffBuffer);

  return diffPath;
}

/**
 * Run visual comparison test
 */
export async function runVisualTest(
  testName: string,
  actualImageBuffer: Buffer,
  config: Partial<VisualTestConfig> = {}
): Promise<ComparisonResult & { baselineExists: boolean }> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  // Check for UPDATE_BASELINES environment variable
  const updateBaselines = process.env.UPDATE_BASELINES === '1';

  const baseline = await loadBaseline(testName, mergedConfig);

  if (!baseline) {
    if (updateBaselines) {
      await saveBaseline(testName, actualImageBuffer, mergedConfig);
      return {
        match: true,
        diffPercentage: 0,
        diffPixels: 0,
        baselineExists: false,
      };
    }

    return {
      match: false,
      diffPercentage: 1,
      diffPixels: actualImageBuffer.length,
      baselineExists: false,
    };
  }

  const result = compareImages(actualImageBuffer, baseline, mergedConfig.threshold);

  // Update baseline if flag is set
  if (updateBaselines && !result.match) {
    await saveBaseline(testName, actualImageBuffer, mergedConfig);
    return {
      ...result,
      match: true,
      baselineExists: true,
    };
  }

  return {
    ...result,
    baselineExists: true,
  };
}

/**
 * Check if baseline exists for a test
 */
export async function baselineExists(
  testName: string,
  config: Partial<VisualTestConfig> = {}
): Promise<boolean> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const baselinePath = join(mergedConfig.baselineDir, `${testName}.png`);
  return existsSync(baselinePath);
}

/**
 * Delete baseline (for cleanup)
 */
export async function deleteBaseline(
  testName: string,
  config: Partial<VisualTestConfig> = {}
): Promise<void> {
  const { unlink } = await import('fs/promises');
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const baselinePath = join(mergedConfig.baselineDir, `${testName}.png`);

  if (existsSync(baselinePath)) {
    await unlink(baselinePath);
  }
}

/**
 * Generate a simple placeholder image buffer for testing
 * This creates a simple PNG-like buffer for testing purposes
 */
export function generateTestImageBuffer(width: number, height: number, color = 255): Buffer {
  // Create a simple grayscale buffer
  const pixels = width * height;
  const buffer = Buffer.alloc(pixels);
  buffer.fill(color);
  return buffer;
}
