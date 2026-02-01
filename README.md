# markdown-2pdf

Generate fillable PDF forms with interactive AcroForm fields from markdown content and YAML schema definitions.

## Features

- **Fillable PDF Forms**: Generate PDFs with interactive form fields (text, checkbox, radio, dropdown, textarea, signature)
- **AcroForm Support**: Full AcroForm field support compatible with Adobe Reader, Chrome, and other PDF viewers
- **Multi-format Output**: Generate PDF, HTML, and DOCX from the same source
- **YAML Schema**: Define form fields declaratively with validation, positioning, and styling
- **Markdown Content**: Write form content in familiar markdown format
- **CLI Tool**: Simple command-line interface for generation and validation
- **Watch Mode**: Auto-regenerate on file changes during development
- **GitHub Actions**: Ready-to-use CI/CD workflow for automated generation

## Installation

```bash
# Install globally
npm install -g markdown-2pdf

# Or use with npx
npx markdown-2pdf generate content.md --schema schema.yaml
```

## Quick Start

1. **Initialize a new project:**

```bash
markdown-2pdf init my-forms
cd my-forms
```

2. **Edit your content and schema:**
   - `content/sample.md` - Your form content in markdown
   - `schemas/sample-form.yaml` - Form field definitions

3. **Generate documents:**

```bash
markdown-2pdf generate content/sample.md --schema schemas/sample-form.yaml --format pdf,html
```

## CLI Commands

### Generate Documents

```bash
markdown-2pdf generate <content.md> [options]

Options:
  -s, --schema <path>      Path to form schema YAML file
  -o, --output <dir>       Output directory (default: ./dist)
  -f, --format <formats>   Output formats: pdf,html,docx (default: pdf)
  -c, --config <path>      Path to configuration file
  -w, --watch              Watch for file changes
  -v, --verbose            Verbose output
```

### Validate Schema

```bash
markdown-2pdf validate <schema.yaml> [options]

Options:
  -v, --verbose    Show detailed validation info
```

### Preview Fields

```bash
markdown-2pdf preview <schema.yaml> [options]

Options:
  -f, --format <format>    Output format: table, json, yaml (default: table)
```

### Initialize Project

```bash
markdown-2pdf init [directory]
```

## Schema Format

Form fields are defined in YAML:

```yaml
$schema: 'form-schema/v1'
form:
  id: 'my-form'
  title: 'My Form'
  version: '1.0.0'
  pages: 1

fields:
  - name: 'full_name'
    type: 'text'
    label: 'Full Name'
    page: 1
    required: true
    maxLength: 100
    position:
      x: 72
      y: 650
      width: 250
      height: 24

  - name: 'email'
    type: 'text'
    label: 'Email'
    page: 1
    required: true
    validation:
      pattern: "^[\\w.-]+@[\\w.-]+\\.\\w+$"
    position:
      x: 72
      y: 590
      width: 250
      height: 24

  - name: 'department'
    type: 'dropdown'
    label: 'Department'
    page: 1
    options:
      - 'Engineering'
      - 'Marketing'
      - 'Sales'
    position:
      x: 72
      y: 530
      width: 150
      height: 24

  - name: 'subscribe'
    type: 'checkbox'
    label: 'Subscribe to newsletter'
    page: 1
    position:
      x: 72
      y: 480
```

## Field Types

| Type        | Description            | Options                                  |
| ----------- | ---------------------- | ---------------------------------------- |
| `text`      | Single-line text input | `maxLength`, `placeholder`, `validation` |
| `textarea`  | Multi-line text area   | `maxLength`, `multiline`                 |
| `checkbox`  | Boolean checkbox       | `default`                                |
| `radio`     | Radio button group     | `options`, `default`                     |
| `dropdown`  | Dropdown select        | `options`, `default`                     |
| `signature` | Signature field        | -                                        |

## Field Properties

| Property     | Type    | Description                       |
| ------------ | ------- | --------------------------------- |
| `name`       | string  | Unique field identifier           |
| `type`       | string  | Field type (see above)            |
| `label`      | string  | Display label                     |
| `page`       | number  | Page number (1-indexed)           |
| `required`   | boolean | Whether field is required         |
| `position`   | object  | `{x, y, width, height}` in points |
| `fontSize`   | number  | Font size in points               |
| `default`    | any     | Default value                     |
| `readOnly`   | boolean | Make field read-only              |
| `validation` | object  | Validation rules                  |
| `minLength`  | number  | Minimum text length               |
| `maxLength`  | number  | Maximum text length               |
| `min`        | number  | Minimum numeric value             |
| `max`        | number  | Maximum numeric value             |

## Advanced Features

### Calculated Fields

Define fields that automatically compute values based on other fields:

```yaml
calculations:
  - name: 'total'
    formula: 'price * quantity'
    format: 'currency'
    decimals: 2

  - name: 'tax'
    formula: 'total * 0.1'
    format: 'currency'

  - name: 'grand_total'
    formula: 'total + tax'
    format: 'currency'
```

Supported formats: `number`, `currency`, `percentage`, `text`

### Conditional Fields

Show or hide fields based on other field values:

```yaml
conditionalFields:
  - trigger:
      field: 'employment_type'
      value: 'contract'
    show: ['contract_duration', 'hourly_rate']
    hide: ['annual_salary']

  - trigger:
      field: 'include_shipping'
      value: true
    show: ['shipping_address']

  - trigger:
      field: 'age'
      value: '18'
      operator: 'greaterThan'
    show: ['adult_options']
```

Supported operators: `equals`, `notEquals`, `contains`, `greaterThan`, `lessThan`, `isEmpty`, `isNotEmpty`

### Validation Rules

Define custom validation rules with conditional logic:

```yaml
validation:
  rules:
    - if: 'start_date < today()'
      then: 'error: Start date must be in the future'

    - if: 'end_date < start_date'
      then: 'error: End date must be after start date'

    - if: 'quantity > 100'
      then: 'error: Maximum quantity is 100'
```

### Field Validation Patterns

Built-in validation patterns:

```yaml
fields:
  - name: 'email'
    type: 'text'
    validation:
      pattern: "^[\\w.-]+@[\\w.-]+\\.\\w+$"
      message: 'Please enter a valid email address'

  - name: 'phone'
    type: 'text'
    validation:
      pattern: "^\\+?[\\d\\s()-]{10,}$"
      message: 'Please enter a valid phone number'

  - name: 'zip_code'
    type: 'text'
    validation:
      pattern: "^\\d{5}(-\\d{4})?$"
      message: 'Please enter a valid ZIP code'
```

## Configuration

Create `markdown-2pdf.config.yaml`:

```yaml
input:
  content: './content'
  schemas: './schemas'
  styles: './styles'

output:
  directory: './dist'
  formats:
    - pdf
    - html

pdf:
  pageSize: 'letter' # or "a4"
  margins:
    top: 72
    bottom: 72
    left: 72
    right: 72

html:
  embedStyles: true
  includeJs: true
```

## GitHub Actions

The included workflow automatically generates documents when content or schemas change:

```yaml
# .github/workflows/generate-docs.yaml
name: Generate Documentation

on:
  push:
    paths:
      - 'content/**'
      - 'schemas/**'
```

## Examples

See the `examples/` directory for complete examples:

- `simple-form/` - Basic contact form
- `advanced-form/` - Multi-page job application

## Development

```bash
# Clone repository
git clone https://github.com/your-repo/markdown-2pdf.git
cd markdown-2pdf

# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Run tests
npm test
```

## Requirements

- Node.js 18+
- Pandoc (for DOCX output)

## License

MIT
