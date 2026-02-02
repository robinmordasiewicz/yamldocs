/**
 * YAML Quality Standards Tests
 *
 * Validates YAML file quality beyond schema compliance:
 * - Consistent formatting and indentation
 * - No trailing whitespace
 * - Proper line endings
 * - No duplicate keys
 * - Document start markers
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

const YAML_DIRS = ['schemas', 'tests/fixtures/schemas'];

interface YamlFile {
  path: string;
  content: string;
  lines: string[];
}

function findYamlFiles(dir: string): string[] {
  const files: string[] = [];
  const basePath = path.resolve(process.cwd(), dir);

  if (!fs.existsSync(basePath)) {
    return files;
  }

  function walk(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
        files.push(fullPath);
      }
    }
  }

  walk(basePath);
  return files;
}

function loadYamlFile(filePath: string): YamlFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  return {
    path: filePath,
    content,
    lines: content.split('\n'),
  };
}

function getRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}

describe('YAML Quality Standards', () => {
  const yamlFiles: YamlFile[] = [];

  // Collect all YAML files
  for (const dir of YAML_DIRS) {
    const files = findYamlFiles(dir);
    for (const file of files) {
      yamlFiles.push(loadYamlFile(file));
    }
  }

  describe('Document Structure', () => {
    it('all YAML files have document start marker (---)', () => {
      const violations: string[] = [];

      for (const file of yamlFiles) {
        // Skip empty files
        if (file.content.trim() === '') continue;

        // Check for document start marker (allowing for leading comments)
        const firstNonEmptyLine = file.lines.find(
          (line) => line.trim() !== '' && !line.trim().startsWith('#')
        );
        const hasDocStart = file.lines.some((line) => line.trim() === '---');

        if (!hasDocStart && firstNonEmptyLine) {
          violations.push(getRelativePath(file.path));
        }
      }

      expect(
        violations,
        `Files missing document start marker (---): ${violations.join(', ')}`
      ).toHaveLength(0);
    });

    it('all YAML files end with newline', () => {
      const violations: string[] = [];

      for (const file of yamlFiles) {
        if (file.content.length > 0 && !file.content.endsWith('\n')) {
          violations.push(getRelativePath(file.path));
        }
      }

      expect(violations, `Files not ending with newline: ${violations.join(', ')}`).toHaveLength(0);
    });
  });

  describe('Indentation', () => {
    it('uses consistent 2-space indentation', () => {
      const violations: { file: string; line: number; content: string }[] = [];

      for (const file of yamlFiles) {
        file.lines.forEach((line, index) => {
          // Skip empty lines and comments
          if (line.trim() === '' || line.trim().startsWith('#')) return;

          // Check for tabs
          if (line.includes('\t')) {
            violations.push({
              file: getRelativePath(file.path),
              line: index + 1,
              content: 'contains tab character',
            });
          }

          // Check leading spaces are multiple of 2
          const leadingSpaces = /^( *)/.exec(line)?.[1]?.length || 0;
          if (leadingSpaces > 0 && leadingSpaces % 2 !== 0) {
            violations.push({
              file: getRelativePath(file.path),
              line: index + 1,
              content: `odd indentation (${leadingSpaces} spaces)`,
            });
          }
        });
      }

      const violationMessages = violations.map((v) => `${v.file}:${v.line} - ${v.content}`);
      expect(violations, `Indentation issues:\n${violationMessages.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Whitespace', () => {
    it('has no trailing whitespace', () => {
      const violations: { file: string; line: number }[] = [];

      for (const file of yamlFiles) {
        file.lines.forEach((line, index) => {
          if (line !== line.trimEnd()) {
            violations.push({
              file: getRelativePath(file.path),
              line: index + 1,
            });
          }
        });
      }

      const violationMessages = violations.map((v) => `${v.file}:${v.line}`);
      expect(
        violations,
        `Files with trailing whitespace:\n${violationMessages.join('\n')}`
      ).toHaveLength(0);
    });
  });

  describe('YAML Validity', () => {
    it('all YAML files parse without errors', () => {
      const errors: { file: string; error: string }[] = [];

      for (const file of yamlFiles) {
        try {
          yaml.load(file.content);
        } catch (e) {
          errors.push({
            file: getRelativePath(file.path),
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }

      const errorMessages = errors.map((e) => `${e.file}: ${e.error}`);
      expect(errors, `YAML parse errors:\n${errorMessages.join('\n')}`).toHaveLength(0);
    });

    it('has no duplicate keys', () => {
      const violations: { file: string; key: string }[] = [];

      for (const file of yamlFiles) {
        // Use js-yaml with custom duplicate key detection
        try {
          yaml.load(file.content, {
            onWarning: (warning) => {
              if (warning.message.includes('duplicate key')) {
                violations.push({
                  file: getRelativePath(file.path),
                  key: warning.message,
                });
              }
            },
          });
        } catch {
          // Parse errors handled in other test
        }
      }

      const violationMessages = violations.map((v) => `${v.file}: ${v.key}`);
      expect(violations, `Duplicate keys found:\n${violationMessages.join('\n')}`).toHaveLength(0);
    });
  });

  describe('Line Length', () => {
    it('has reasonable line lengths (warning at 120 chars)', () => {
      const warnings: { file: string; line: number; length: number }[] = [];

      for (const file of yamlFiles) {
        file.lines.forEach((line, index) => {
          if (line.length > 120) {
            warnings.push({
              file: getRelativePath(file.path),
              line: index + 1,
              length: line.length,
            });
          }
        });
      }

      // Report but don't fail - this is a warning
      if (warnings.length > 0) {
        const warningMessages = warnings.map((w) => `${w.file}:${w.line} (${w.length} chars)`);
        console.warn(`Lines exceeding 120 characters:\n${warningMessages.join('\n')}`);
      }

      // Allow warnings, but ensure no extremely long lines (>200)
      const criticalViolations = warnings.filter((w) => w.length > 200);
      expect(
        criticalViolations,
        `Lines exceeding 200 characters: ${criticalViolations.map((v) => `${v.file}:${v.line}`).join(', ')}`
      ).toHaveLength(0);
    });
  });

  describe('Content Quality', () => {
    it('schema files have required form metadata', () => {
      const violations: { file: string; missing: string[] }[] = [];

      for (const file of yamlFiles) {
        // Only check schema files in schemas/ directory
        if (!file.path.includes('/schemas/') && !file.path.includes('\\schemas\\')) continue;

        try {
          const data = yaml.load(file.content) as Record<string, unknown>;

          // Skip if not a form schema
          if (!data || typeof data !== 'object' || !('form' in data)) continue;

          const form = data.form as Record<string, unknown>;
          const missing: string[] = [];

          if (!form.id) missing.push('id');
          if (!form.title) missing.push('title');
          if (!form.version) missing.push('version');

          if (missing.length > 0) {
            violations.push({
              file: getRelativePath(file.path),
              missing,
            });
          }
        } catch {
          // Parse errors handled in other test
        }
      }

      const violationMessages = violations.map((v) => `${v.file}: missing ${v.missing.join(', ')}`);
      expect(
        violations,
        `Schema files missing required fields:\n${violationMessages.join('\n')}`
      ).toHaveLength(0);
    });
  });
});
