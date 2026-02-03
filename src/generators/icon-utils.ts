/**
 * Icon loading utilities for social media icons in footer
 * Loads PNG icon files for PDF, DOCX, and HTML generators
 */

import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Display size for social icons (in points for PDF, pixels for HTML) */
export const SOCIAL_ICON_SIZE = { width: 16, height: 16 };

/** Supported social platform icon names */
const ICON_NAMES = ['youtube', 'x', 'facebook', 'linkedin', 'github', 'website'] as const;

/**
 * Resolve the filesystem path for a social icon PNG.
 * Supports both installed (dist/assets/icons/) and development (src/assets/icons/) paths.
 */
function resolveIconPath(platform: string): string | null {
  if (!ICON_NAMES.includes(platform as (typeof ICON_NAMES)[number])) return null;

  const possiblePaths = [
    resolve(__dirname, '../assets/icons', `${platform}.png`), // Installed: dist/assets/icons/
    resolve(__dirname, '../../src/assets/icons', `${platform}.png`), // Dev: src/assets/icons/
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) return p;
  }
  return null;
}

/**
 * Load social icon as raw bytes (for PDF embedPng / DOCX ImageRun).
 * Returns null if icon not found.
 */
export async function loadSocialIconBytes(platform: string): Promise<Uint8Array | null> {
  const iconPath = resolveIconPath(platform);
  if (!iconPath) return null;
  try {
    const buf = await readFile(iconPath);
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

/**
 * Load social icon as a base64 data URI string (for HTML <img src>).
 * Returns null if icon not found.
 */
export async function loadSocialIconBase64(platform: string): Promise<string | null> {
  const iconPath = resolveIconPath(platform);
  if (!iconPath) return null;
  try {
    const buf = await readFile(iconPath);
    return `data:image/png;base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}
