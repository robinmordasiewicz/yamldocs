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

content:
  - type: heading
    level: 1
    text: "Sample Form"

  - type: paragraph
    text: "Welcome to this sample form. Please fill out all required fields."

  - type: heading
    level: 2
    text: "Personal Information"

  - type: field
    fieldType: text
    fieldName: "full_name"
    label: "Full Name"
    required: true
    width: 250

  - type: field
    fieldType: text
    fieldName: "email"
    label: "Email Address"
    required: true
    width: 250

  - type: heading
    level: 2
    text: "Preferences"

  - type: field
    fieldType: checkbox
    fieldName: "subscribe"
    label: "Subscribe to newsletter"

  - type: field
    fieldType: dropdown
    fieldName: "department"
    label: "Department"
    width: 150
    options:
      - value: "engineering"
        label: "Engineering"
      - value: "marketing"
        label: "Marketing"
      - value: "sales"
        label: "Sales"
      - value: "support"
        label: "Support"

fields: []
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
  const dirs = ['schemas', 'styles', 'dist'];

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
  console.log(chalk.gray('  1. Edit schemas/sample-form.yaml to define your form'));
  console.log(chalk.gray('  2. Run: markdown-2pdf generate schemas/sample-form.yaml'));
  console.log('');
}
