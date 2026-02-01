/**
 * Project Initialization
 * Scaffolds a new markdown-2pdf project
 */

import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, join } from 'path';
import chalk from 'chalk';

const SAMPLE_CONFIG = `# markdown-2pdf Configuration
input:
  content: "./content"
  schemas: "./schemas"
  styles: "./styles"

output:
  directory: "./dist"
  formats:
    - pdf
    - html

pdf:
  pageSize: "letter"
  margins:
    top: 72
    bottom: 72
    left: 72
    right: 72
  fonts:
    default: "Helvetica"
    monospace: "Courier"

html:
  embedStyles: true
  includeJs: true
`;

const SAMPLE_SCHEMA = `# Form Schema
$schema: "form-schema/v1"
form:
  id: "sample-form"
  title: "Sample Form"
  version: "1.0.0"
  pages: 1

fields:
  # Text Input
  - name: "full_name"
    type: "text"
    label: "Full Name"
    page: 1
    required: true
    maxLength: 100
    position:
      x: 72
      y: 650
      width: 250
      height: 24

  # Email Field
  - name: "email"
    type: "text"
    label: "Email Address"
    page: 1
    required: true
    position:
      x: 72
      y: 580
      width: 250
      height: 24

  # Checkbox
  - name: "subscribe"
    type: "checkbox"
    label: "Subscribe to newsletter"
    page: 1
    position:
      x: 72
      y: 520

  # Dropdown
  - name: "department"
    type: "dropdown"
    label: "Department"
    page: 1
    options:
      - "Engineering"
      - "Marketing"
      - "Sales"
      - "Support"
    position:
      x: 72
      y: 450
      width: 150
      height: 24
`;

const SAMPLE_CONTENT = `---
title: Sample Form
author: Your Name
date: 2024-01-01
---

# Sample Form

Welcome to this sample form. Please fill out all required fields marked with an asterisk (*).

## Personal Information

Please provide your contact details below.

## Preferences

Select your preferences and options.

## Submission

By submitting this form, you agree to our terms and conditions.
`;

const GITIGNORE = `# Dependencies
node_modules/

# Output
dist/

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
`;

/**
 * Initialize a new project
 */
export async function initProject(directory: string): Promise<void> {
  const targetDir = resolve(directory);

  console.log(chalk.cyan('Initializing markdown-2pdf project...'));
  console.log('');

  // Create directories
  const dirs = ['content', 'schemas', 'styles', 'dist'];

  for (const dir of dirs) {
    const dirPath = join(targetDir, dir);
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
      console.log(`${chalk.green('✓')} Created: ${chalk.gray(`${dir}/`)}`);
    } else {
      console.log(`${chalk.yellow('○')} Exists: ${chalk.gray(`${dir}/`)}`);
    }
  }

  // Create files
  const files = [
    {
      path: 'markdown-2pdf.config.yaml',
      content: SAMPLE_CONFIG,
    },
    {
      path: 'schemas/sample-form.yaml',
      content: SAMPLE_SCHEMA,
    },
    {
      path: 'content/sample.md',
      content: SAMPLE_CONTENT,
    },
    {
      path: '.gitignore',
      content: GITIGNORE,
    },
  ];

  for (const file of files) {
    const filePath = join(targetDir, file.path);
    if (!existsSync(filePath)) {
      await writeFile(filePath, file.content);
      console.log(`${chalk.green('✓')} Created: ${chalk.gray(file.path)}`);
    } else {
      console.log(`${chalk.yellow('○')} Exists: ${chalk.gray(file.path)}`);
    }
  }

  console.log('');
  console.log(chalk.green('Project initialized successfully!'));
  console.log('');
  console.log('Next steps:');
  console.log(chalk.gray('  1. Edit content/sample.md with your content'));
  console.log(chalk.gray('  2. Edit schemas/sample-form.yaml to define your form fields'));
  console.log(
    chalk.gray(
      '  3. Run: markdown-2pdf generate content/sample.md --schema schemas/sample-form.yaml'
    )
  );
  console.log('');
}
