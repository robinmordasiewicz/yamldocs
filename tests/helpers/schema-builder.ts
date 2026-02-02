/**
 * Schema Builder Helper
 * Programmatic test schema generation
 */

import yaml from 'js-yaml';
import type {
  FormSchema,
  ParsedFormSchema,
  NormalizedFormField,
  NormalizedFieldOption,
  FieldPosition,
  FieldValidation,
  SchemaContentElement,
} from '../../src/types/schema.js';

export interface Position {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface TextFieldOptions {
  label?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  default?: string;
  readOnly?: boolean;
  fontSize?: number;
  validation?: FieldValidation;
}

export interface TextareaOptions extends TextFieldOptions {
  multiline?: boolean;
}

export interface RadioOption {
  value: string;
  label: string;
}

/**
 * Schema builder for creating test schemas programmatically
 */
export class SchemaBuilder {
  private formId: string;
  private title: string;
  private version = '1.0.0';
  private pageCount = 1;
  private fields: NormalizedFormField[] = [];
  private content: SchemaContentElement[] = [];

  constructor(formId: string, title: string) {
    this.formId = formId;
    this.title = title;
  }

  /**
   * Set the schema version
   */
  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  /**
   * Set page count
   */
  setPages(count: number): this {
    this.pageCount = count;
    return this;
  }

  /**
   * Add a content element (heading, paragraph, rule, etc.)
   */
  addContent(element: SchemaContentElement): this {
    this.content.push(element);
    return this;
  }

  /**
   * Add a text field
   */
  addTextField(name: string, position: Position, options: TextFieldOptions = {}): this {
    this.fields.push({
      name,
      type: 'text',
      label: options.label || name,
      page: 1,
      required: options.required,
      maxLength: options.maxLength,
      placeholder: options.placeholder,
      default: options.default,
      readOnly: options.readOnly,
      fontSize: options.fontSize,
      validation: options.validation,
      position: {
        x: position.x,
        y: position.y,
        width: position.width ?? 200,
        height: position.height ?? 24,
      },
    });
    return this;
  }

  /**
   * Add a checkbox field
   */
  addCheckbox(
    name: string,
    position: Position,
    label: string,
    options: { required?: boolean; default?: boolean; readOnly?: boolean } = {}
  ): this {
    this.fields.push({
      name,
      type: 'checkbox',
      label,
      page: 1,
      required: options.required,
      default: options.default,
      readOnly: options.readOnly,
      position: {
        x: position.x,
        y: position.y,
        width: position.width ?? 16,
        height: position.height ?? 16,
      },
    });
    return this;
  }

  /**
   * Add a radio group
   */
  addRadioGroup(
    name: string,
    position: Position,
    options: RadioOption[],
    settings: { required?: boolean; default?: string; readOnly?: boolean; label?: string } = {}
  ): this {
    const normalizedOptions: NormalizedFieldOption[] = options.map((opt) => ({
      value: opt.value,
      label: opt.label,
    }));

    this.fields.push({
      name,
      type: 'radio',
      label: settings.label || name,
      page: 1,
      required: settings.required,
      default: settings.default,
      readOnly: settings.readOnly,
      options: normalizedOptions,
      position: {
        x: position.x,
        y: position.y,
        width: position.width ?? 14,
        height: position.height ?? 14,
      },
    });
    return this;
  }

  /**
   * Add a dropdown field
   */
  addDropdown(
    name: string,
    position: Position,
    options: string[],
    settings: { required?: boolean; default?: string; readOnly?: boolean; label?: string } = {}
  ): this {
    const normalizedOptions: NormalizedFieldOption[] = options.map((opt) => ({
      value: opt,
      label: opt,
    }));

    this.fields.push({
      name,
      type: 'dropdown',
      label: settings.label || name,
      page: 1,
      required: settings.required,
      default: settings.default,
      readOnly: settings.readOnly,
      options: normalizedOptions,
      position: {
        x: position.x,
        y: position.y,
        width: position.width ?? 150,
        height: position.height ?? 24,
      },
    });
    return this;
  }

  /**
   * Add a textarea field
   */
  addTextarea(name: string, position: Position, options: TextareaOptions = {}): this {
    this.fields.push({
      name,
      type: 'textarea',
      label: options.label || name,
      page: 1,
      required: options.required,
      maxLength: options.maxLength,
      placeholder: options.placeholder,
      default: options.default,
      readOnly: options.readOnly,
      fontSize: options.fontSize,
      multiline: options.multiline ?? true,
      position: {
        x: position.x,
        y: position.y,
        width: position.width ?? 400,
        height: position.height ?? 100,
      },
    });
    return this;
  }

  /**
   * Add a signature field
   */
  addSignature(
    name: string,
    position: Position,
    options: { required?: boolean; readOnly?: boolean; label?: string } = {}
  ): this {
    this.fields.push({
      name,
      type: 'signature',
      label: options.label || name,
      page: 1,
      required: options.required,
      readOnly: options.readOnly,
      position: {
        x: position.x,
        y: position.y,
        width: position.width ?? 200,
        height: position.height ?? 50,
      },
    });
    return this;
  }

  /**
   * Set page for the last added field
   */
  onPage(pageNumber: number): this {
    if (this.fields.length > 0) {
      this.fields[this.fields.length - 1].page = pageNumber;
    }
    return this;
  }

  /**
   * Get a field by name (for modification)
   */
  getField(name: string): NormalizedFormField | undefined {
    return this.fields.find((f) => f.name === name);
  }

  /**
   * Remove a field by name
   */
  removeField(name: string): this {
    this.fields = this.fields.filter((f) => f.name !== name);
    return this;
  }

  /**
   * Build the parsed form schema
   */
  build(): ParsedFormSchema {
    return {
      $schema: 'form-schema/v1',
      form: {
        id: this.formId,
        title: this.title,
        version: this.version,
        pages: this.pageCount,
      },
      fields: [...this.fields],
      content: this.content.length > 0 ? [...this.content] : undefined,
    };
  }

  /**
   * Convert to YAML string
   */
  toYaml(): string {
    const schema: FormSchema = {
      $schema: 'form-schema/v1',
      form: {
        id: this.formId,
        title: this.title,
        version: this.version,
        pages: this.pageCount,
      },
      fields: this.fields.map((f) => ({
        ...f,
        options: f.options?.map((opt) => (typeof opt === 'string' ? opt : opt.label)),
      })),
    };

    return yaml.dump(schema, { indent: 2 });
  }

  /**
   * Clone the builder
   */
  clone(): SchemaBuilder {
    const cloned = new SchemaBuilder(this.formId, this.title);
    cloned.version = this.version;
    cloned.pageCount = this.pageCount;
    cloned.fields = JSON.parse(JSON.stringify(this.fields));
    cloned.content = JSON.parse(JSON.stringify(this.content));
    return cloned;
  }
}

/**
 * Create a simple test schema with common fields
 *
 * NOTE: Field y positions are RELATIVE offsets from content baseline.
 * y=-30 means 30pt below where content ends.
 */
export function createSimpleTestSchema(): ParsedFormSchema {
  return new SchemaBuilder('test-form', 'Test Form')
    .addTextField(
      'name',
      { x: 72, y: -30, width: 200, height: 24 },
      { label: 'Name', required: true }
    )
    .addTextField('email', { x: 72, y: -80, width: 200, height: 24 }, { label: 'Email' })
    .addCheckbox('agree', { x: 72, y: -130 }, 'I agree to terms')
    .build();
}

/**
 * Create a multi-page test schema
 *
 * NOTE: Page 1 fields use RELATIVE y positions (offsets from content baseline).
 * Page 2+ fields use ABSOLUTE y positions (no adjustment applied).
 */
export function createMultiPageTestSchema(pageCount = 2): ParsedFormSchema {
  const builder = new SchemaBuilder('multi-page-form', 'Multi-Page Form').setPages(pageCount);

  for (let page = 1; page <= pageCount; page++) {
    // Page 1: relative positions (negative offsets from content baseline)
    // Page 2+: absolute positions (no adjustment applied)
    const y1 = page === 1 ? -30 : 700;
    const y2 = page === 1 ? -80 : 650;

    builder
      .addTextField(
        `page${page}_field1`,
        { x: 72, y: y1, width: 200, height: 24 },
        { label: `Page ${page} Field 1` }
      )
      .onPage(page)
      .addTextField(
        `page${page}_field2`,
        { x: 72, y: y2, width: 200, height: 24 },
        { label: `Page ${page} Field 2` }
      )
      .onPage(page);
  }

  return builder.build();
}

/**
 * Create a schema with all field types
 *
 * NOTE: Field y positions are RELATIVE offsets from content baseline.
 * y=-30 means 30pt below where content ends.
 */
export function createAllFieldTypesSchema(): ParsedFormSchema {
  return new SchemaBuilder('all-fields-form', 'All Field Types Form')
    .addTextField('text_field', { x: 72, y: -30, width: 200, height: 24 }, { label: 'Text Field' })
    .addCheckbox('checkbox_field', { x: 72, y: -80 }, 'Checkbox Field')
    .addRadioGroup(
      'radio_field',
      { x: 72, y: -130 },
      [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' },
      ],
      { label: 'Radio Field' }
    )
    .addDropdown('dropdown_field', { x: 72, y: -230 }, ['Choice A', 'Choice B', 'Choice C'], {
      label: 'Dropdown Field',
    })
    .addTextarea(
      'textarea_field',
      { x: 72, y: -280, width: 400, height: 100 },
      { label: 'Textarea Field' }
    )
    .addSignature(
      'signature_field',
      { x: 72, y: -430, width: 200, height: 50 },
      { label: 'Signature Field' }
    )
    .build();
}
