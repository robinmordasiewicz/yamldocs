/**
 * Markdown Parser
 * Parses markdown content with optional frontmatter
 */

import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export interface Admonition {
  type: 'warning' | 'note' | 'info' | 'tip' | 'danger';
  title: string;
  content: string;
}

export interface ParsedMarkdown {
  content: string;
  html: string;
  frontmatter: Record<string, unknown>;
  title?: string;
  sections: MarkdownSection[];
  admonitions: Admonition[];
}

export interface MarkdownSection {
  level: number;
  title: string;
  content: string;
  html: string;
}

/**
 * Configure marked options
 */
marked.setOptions({
  gfm: true,
  breaks: true,
});

/**
 * Parse admonitions from markdown content
 * Supports !!! warning "Title", !!! note "Title", etc.
 */
function parseAdmonitions(content: string): { admonitions: Admonition[]; cleanedContent: string } {
  const admonitions: Admonition[] = [];
  const admonitionRegex =
    /^!!!\s+(warning|note|info|tip|danger)\s+"([^"]+)"\s*\n((?:\s{4}.*\n?)*)/gm;

  const cleanedContent = content;
  let match;

  while ((match = admonitionRegex.exec(content)) !== null) {
    const type = match[1] as Admonition['type'];
    const title = match[2];
    const rawContent = match[3]
      .split('\n')
      .map((line) => line.replace(/^\s{4}/, ''))
      .join('\n')
      .trim();

    admonitions.push({ type, title, content: rawContent });
  }

  // Don't remove admonitions from content - they'll be rendered specially
  return { admonitions, cleanedContent };
}

/**
 * Strip form HTML elements from content (they become form fields)
 */
function stripFormHtml(content: string): string {
  return (
    content
      // Remove checkbox-option spans but keep text for reading
      .replace(/<span\s+class="checkbox-option">([^<]+)<\/span>/g, '[ ] $1')
      // Remove radio-option spans but keep text for reading
      .replace(/<span\s+class="radio-option">([^<]+)<\/span>/g, '($1)')
      // Remove form container divs
      .replace(/<div\s+class="form-[^"]*"[^>]*>/g, '')
      .replace(/<\/div>/g, '')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
  );
}

/**
 * Extract sections from markdown content
 */
function extractSections(content: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = content.split('\n');

  let currentSection: MarkdownSection | null = null;
  let contentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);

    if (headingMatch) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentLines.join('\n').trim();
        currentSection.html = marked.parse(currentSection.content) as string;
        sections.push(currentSection);
      }

      // Start new section
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: '',
        html: '',
      };
      contentLines = [];
    } else if (currentSection) {
      contentLines.push(line);
    }
  }

  // Save last section
  if (currentSection) {
    currentSection.content = contentLines.join('\n').trim();
    currentSection.html = marked.parse(currentSection.content) as string;
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content: string, frontmatter: Record<string, unknown>): string | undefined {
  // Check frontmatter first
  if (frontmatter.title && typeof frontmatter.title === 'string') {
    return frontmatter.title;
  }

  // Look for first h1
  const h1Match = /^#\s+(.+)$/m.exec(content);
  if (h1Match) {
    return h1Match[1].trim();
  }

  return undefined;
}

/**
 * Parse markdown file
 */
export async function parseMarkdown(filePath: string): Promise<ParsedMarkdown> {
  const resolvedPath = resolve(filePath);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Markdown file not found: ${resolvedPath}`);
  }

  const fileContent = await readFile(resolvedPath, 'utf-8');
  return parseMarkdownString(fileContent);
}

/**
 * Parse markdown from string
 */
export function parseMarkdownString(content: string): ParsedMarkdown {
  // Parse frontmatter
  const { data: frontmatter, content: markdownContent } = matter(content);

  // Parse admonitions
  const { admonitions, cleanedContent } = parseAdmonitions(markdownContent);

  // Strip form HTML for cleaner text rendering
  const processedContent = stripFormHtml(cleanedContent);

  // Parse markdown to HTML
  const html = marked.parse(processedContent) as string;

  // Extract sections
  const sections = extractSections(processedContent);

  // Extract title
  const title = extractTitle(processedContent, frontmatter);

  return {
    content: markdownContent, // Keep original for form extraction
    html,
    frontmatter,
    title,
    sections,
    admonitions,
  };
}

/**
 * Convert markdown to plain text (strip formatting)
 */
export function markdownToPlainText(content: string): string {
  return (
    content
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold/italic
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      // Remove links but keep text
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      // Remove inline code
      .replace(/`(.+?)`/g, '$1')
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // Remove horizontal rules
      .replace(/^---+$/gm, '')
      // Remove list markers
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^[\s]*\d+\.\s+/gm, '')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Extract all headings from markdown
 */
export function extractHeadings(content: string): { level: number; text: string }[] {
  const headings: { level: number; text: string }[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
      });
    }
  }

  return headings;
}
