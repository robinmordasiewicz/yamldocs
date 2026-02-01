/**
 * Form Field Extractor
 * Extracts form fields from markdown custom HTML elements
 */

import type { NormalizedFormField, ParsedFormSchema, FormMetadata } from '../types/index.js';

export interface ExtractedField {
  type: 'checkbox' | 'radio' | 'text';
  name: string;
  label: string;
  options?: string[]; // for radio groups
  section?: string; // which heading it belongs under
  context?: string; // surrounding text context
}

interface CheckboxGroup {
  heading: string;
  items: string[];
  lineStart: number;
}

interface RadioGroup {
  context: string;
  options: string[];
  lineNumber: number;
}

interface TextPlaceholder {
  context: string;
  lineNumber: number;
  columnContext?: string; // for table columns
}

/**
 * Generate a safe field name from label text
 * Always includes index to ensure uniqueness
 */
function generateFieldName(label: string, prefix: string, index: number): string {
  const safeName = label
    .toLowerCase()
    .replace(/[*_]/g, '') // Remove markdown bold/italic
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, '') // Trim leading/trailing underscores
    .substring(0, 30); // Limit length

  // Always include index to ensure uniqueness
  return `${prefix}_${index}_${safeName || 'field'}`;
}

/**
 * Extract checkbox options from markdown content
 * Supports both standard markdown checkboxes (- [ ]) and HTML spans
 */
export function extractCheckboxes(content: string): CheckboxGroup[] {
  const groups: CheckboxGroup[] = [];
  const lines = content.split('\n');

  let currentHeading = 'General';
  let currentGroup: CheckboxGroup | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current heading
    const headingMatch = /^#{1,6}\s+(.+)$/.exec(line);
    if (headingMatch) {
      currentHeading = headingMatch[1].trim();
      // Save any pending group when we hit a new heading
      if (currentGroup && currentGroup.items.length > 0) {
        groups.push(currentGroup);
        currentGroup = null;
      }
    }

    // Check for standard markdown checkbox: - [ ] or - [x]
    const markdownCheckbox = /^-\s+\[[ x]\]\s+(.+)$/.exec(line);
    if (markdownCheckbox) {
      const checkboxText = markdownCheckbox[1].trim();
      if (!currentGroup || i - currentGroup.lineStart > 5) {
        // Start new group
        if (currentGroup && currentGroup.items.length > 0) {
          groups.push(currentGroup);
        }
        currentGroup = {
          heading: currentHeading,
          items: [checkboxText],
          lineStart: i,
        };
      } else {
        // Add to existing group
        currentGroup.items.push(checkboxText);
      }
      continue;
    }

    // Check for inline checkbox: [ ] text (used in tables or inline)
    const inlineCheckboxes = [
      ...line.matchAll(/\[\s*[x ]?\s*\]\s+([^|[\]]+?)(?=\s*\[|\s*$|\s*\|)/g),
    ];
    if (inlineCheckboxes.length > 0) {
      for (const match of inlineCheckboxes) {
        const checkboxText = match[1].trim();
        if (checkboxText) {
          if (!currentGroup) {
            currentGroup = {
              heading: currentHeading,
              items: [checkboxText],
              lineStart: i,
            };
          } else {
            currentGroup.items.push(checkboxText);
          }
        }
      }
      continue;
    }

    // Legacy: Find checkbox-option spans (for backwards compatibility)
    const checkboxMatches = line.matchAll(/<span\s+class="checkbox-option">([^<]+)<\/span>/g);
    const checkboxItems = [...checkboxMatches].map((m) => m[1].trim());

    if (checkboxItems.length > 0) {
      if (!currentGroup) {
        currentGroup = {
          heading: currentHeading,
          items: checkboxItems,
          lineStart: i,
        };
      } else {
        currentGroup.items.push(...checkboxItems);
      }
    }

    // Check for end of div (legacy)
    if (line.includes('</div>') && currentGroup) {
      groups.push(currentGroup);
      currentGroup = null;
    }

    // Empty line can end a checkbox group
    if (line.trim() === '' && currentGroup && currentGroup.items.length > 0) {
      groups.push(currentGroup);
      currentGroup = null;
    }
  }

  // Push final group if exists
  if (currentGroup && currentGroup.items.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
}

/**
 * Extract radio button groups from markdown content
 * Supports both ( ) Option syntax and HTML spans
 */
export function extractRadioGroups(content: string): RadioGroup[] {
  const groups: RadioGroup[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find radio options using ( ) syntax: ( ) Option1  ( ) Option2
    const radioPattern = /\(\s*\)\s+([^()|]+?)(?=\s+\(\s*\)|\s*$|\s*\|)/g;
    const radioMatches = [...line.matchAll(radioPattern)];

    // Also check for legacy HTML spans
    const htmlRadioMatches = [...line.matchAll(/<span\s+class="radio-option">([^<]+)<\/span>/g)];

    const allMatches = [
      ...radioMatches.map((m) => m[1].trim()),
      ...htmlRadioMatches.map((m) => m[1].trim()),
    ].filter((opt) => opt.length > 0);

    if (allMatches.length >= 2) {
      // This line has a radio group
      const options = allMatches;

      // Get context from table header or preceding text
      let context = '';

      // Check if in a table row
      if (line.includes('|')) {
        // Try to get column header context
        const tableLines = lines.slice(Math.max(0, i - 10), i);
        for (let j = tableLines.length - 1; j >= 0; j--) {
          if (tableLines[j].includes('|') && !tableLines[j].includes('---')) {
            // This is likely the header row
            const headerCells = tableLines[j]
              .split('|')
              .map((c) => c.trim())
              .filter((c) => c);
            const currentCells = line
              .split('|')
              .map((c) => c.trim())
              .filter((c) => c);

            // Find which column the radio group is in
            for (let col = 0; col < currentCells.length; col++) {
              if (currentCells[col].includes('( )') || currentCells[col].includes('radio-option')) {
                context = headerCells[col] || `column_${col}`;
                break;
              }
            }
            break;
          }
        }
      }

      if (!context) {
        // Look for preceding heading or text
        for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
          const prevLine = lines[j].trim();
          if (
            prevLine &&
            !prevLine.includes('<') &&
            !prevLine.includes('|') &&
            !prevLine.startsWith('-')
          ) {
            context = prevLine.substring(0, 50);
            break;
          }
          const headingMatch = /^#{1,6}\s+(.+)$/.exec(prevLine);
          if (headingMatch) {
            context = headingMatch[1];
            break;
          }
        }
      }

      groups.push({
        context: context || `radio_group_${i}`,
        options,
        lineNumber: i,
      });
    }
  }

  return groups;
}

/**
 * Extract text placeholders (___) from markdown content
 */
export function extractTextPlaceholders(content: string): TextPlaceholder[] {
  const placeholders: TextPlaceholder[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find ___ patterns (3+ underscores)
    const matches = [...line.matchAll(/_{3,}/g)];

    if (matches.length > 0) {
      // Get context
      let context = '';

      // Check if in a table
      if (line.includes('|')) {
        // Get table header for context
        const tableLines = lines.slice(Math.max(0, i - 10), i);
        for (let j = tableLines.length - 1; j >= 0; j--) {
          if (
            tableLines[j].includes('|') &&
            !tableLines[j].includes('---') &&
            !tableLines[j].includes('___')
          ) {
            const headerCells = tableLines[j]
              .split('|')
              .map((c) => c.trim())
              .filter((c) => c);
            context = headerCells.join(' | ');
            break;
          }
        }
      } else {
        // Look for preceding text
        const colonMatch = /^([^:]+):\s*_{3,}/.exec(line);
        if (colonMatch) {
          context = colonMatch[1].trim();
        } else {
          // Look at previous lines
          for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
            const prevLine = lines[j].trim();
            if (prevLine && !prevLine.startsWith('#') && !prevLine.includes('|')) {
              context = prevLine.substring(0, 50);
              break;
            }
            const headingMatch = /^#{1,6}\s+(.+)$/.exec(prevLine);
            if (headingMatch) {
              context = headingMatch[1];
              break;
            }
          }
        }
      }

      for (const _match of matches) {
        placeholders.push({
          context: context ?? `text_field_${i}`,
          lineNumber: i,
          columnContext: line.includes('|') ? 'table' : undefined,
        });
      }
    }
  }

  return placeholders;
}

/**
 * Extract all form fields from markdown content
 */
export function extractFormFields(markdownContent: string): ExtractedField[] {
  const fields: ExtractedField[] = [];

  // Extract checkboxes
  const checkboxGroups = extractCheckboxes(markdownContent);
  for (const group of checkboxGroups) {
    for (const item of group.items) {
      fields.push({
        type: 'checkbox',
        name: generateFieldName(item, 'cb', fields.length),
        label: item.replace(/\*\*/g, ''), // Remove bold markers
        section: group.heading,
      });
    }
  }

  // Extract radio groups
  const radioGroups = extractRadioGroups(markdownContent);
  for (const group of radioGroups) {
    fields.push({
      type: 'radio',
      name: generateFieldName(group.context, 'radio', fields.length),
      label: group.context.replace(/\*\*/g, ''),
      options: group.options,
      context: group.context,
    });
  }

  // Extract text placeholders
  const textPlaceholders = extractTextPlaceholders(markdownContent);
  for (const placeholder of textPlaceholders) {
    fields.push({
      type: 'text',
      name: generateFieldName(placeholder.context, 'txt', fields.length),
      label: placeholder.context.replace(/\*\*/g, ''),
      context: placeholder.columnContext,
    });
  }

  return fields;
}

/**
 * Convert extracted fields to a ParsedFormSchema
 */
export function fieldsToSchema(
  fields: ExtractedField[],
  title = 'Form',
  pageHeight = 792
): ParsedFormSchema {
  const formFields: NormalizedFormField[] = [];
  let yPosition = pageHeight - 150; // Start below title
  const xBase = 72; // Left margin
  const lineHeight = 24;

  for (const field of fields) {
    const normalizedField: NormalizedFormField = {
      name: field.name,
      type: field.type,
      label: field.label,
      page: 1,
      position: {
        x: xBase,
        y: yPosition,
        width: field.type === 'text' ? 150 : 16,
        height: field.type === 'text' ? 20 : 16,
      },
    };

    if (field.type === 'radio' && field.options) {
      normalizedField.options = field.options.map((opt) => ({
        value: opt.toLowerCase().replace(/\s+/g, '_'),
        label: opt,
      }));
    }

    formFields.push(normalizedField);
    yPosition -= lineHeight;

    // Page break
    if (yPosition < 100) {
      yPosition = pageHeight - 100;
    }
  }

  const metadata: FormMetadata = {
    id: 'auto-generated',
    title,
    version: '1.0',
    pages: 1,
  };

  return {
    form: metadata,
    fields: formFields,
  };
}

/**
 * Extract form fields from markdown and generate a complete schema
 */
export function generateFormSchema(markdownContent: string, title = 'Form'): ParsedFormSchema {
  const fields = extractFormFields(markdownContent);
  return fieldsToSchema(fields, title);
}
