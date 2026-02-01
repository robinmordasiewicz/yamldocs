/**
 * Layout Analyzer Helper
 * Detect layout issues: overlaps, boundary violations, misalignment
 */

import type { AcroFormField } from './acroform-inspector.js';
import type { DrawnElement } from '../../src/generators/pdf/layout.js';

export interface LayoutElement {
  type: 'field' | 'label' | 'text' | 'title' | 'heading' | 'paragraph' | 'rule';
  name?: string;
  bounds: { x: number; y: number; width: number; height: number };
  page: number;
}

export interface PageSize {
  width: number;
  height: number;
}

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface OverlapResult {
  element1: LayoutElement;
  element2: LayoutElement;
  overlapArea: number;
  overlapPercentage: number;
}

export interface BoundaryViolation {
  element: LayoutElement;
  violation: 'left' | 'right' | 'top' | 'bottom';
  overflow: number;
}

export interface AlignmentIssue {
  elements: LayoutElement[];
  type: 'horizontal' | 'vertical';
  deviation: number;
}

/**
 * Convert AcroFormFields to LayoutElements
 */
export function fieldsToLayoutElements(fields: AcroFormField[]): LayoutElement[] {
  return fields.map((field) => ({
    type: 'field' as const,
    name: field.name,
    bounds: field.position,
    page: field.page,
  }));
}

/**
 * Calculate rectangle intersection area
 */
function getIntersectionArea(
  rect1: { x: number; y: number; width: number; height: number },
  rect2: { x: number; y: number; width: number; height: number }
): number {
  const x1 = Math.max(rect1.x, rect2.x);
  const y1 = Math.max(rect1.y, rect2.y);
  const x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width);
  const y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);

  const width = Math.max(0, x2 - x1);
  const height = Math.max(0, y2 - y1);

  return width * height;
}

/**
 * Get area of a rectangle
 */
function getArea(rect: { width: number; height: number }): number {
  return rect.width * rect.height;
}

/**
 * Detect overlapping elements
 */
export function detectOverlaps(elements: LayoutElement[]): OverlapResult[] {
  const overlaps: OverlapResult[] = [];

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const elem1 = elements[i];
      const elem2 = elements[j];

      // Only check elements on the same page
      if (elem1.page !== elem2.page) continue;

      const intersectionArea = getIntersectionArea(elem1.bounds, elem2.bounds);

      if (intersectionArea > 0) {
        const smallerArea = Math.min(getArea(elem1.bounds), getArea(elem2.bounds));
        const overlapPercentage = smallerArea > 0 ? intersectionArea / smallerArea : 0;

        overlaps.push({
          element1: elem1,
          element2: elem2,
          overlapArea: intersectionArea,
          overlapPercentage,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Check if elements stay within page boundaries
 */
export function checkBoundaries(
  elements: LayoutElement[],
  pageSize: PageSize,
  margins: Margins
): BoundaryViolation[] {
  const violations: BoundaryViolation[] = [];

  const contentArea = {
    left: margins.left,
    right: pageSize.width - margins.right,
    top: pageSize.height - margins.top,
    bottom: margins.bottom,
  };

  for (const element of elements) {
    const { x, y, width, height } = element.bounds;

    // Check left boundary
    if (x < contentArea.left) {
      violations.push({
        element,
        violation: 'left',
        overflow: contentArea.left - x,
      });
    }

    // Check right boundary
    if (x + width > contentArea.right) {
      violations.push({
        element,
        violation: 'right',
        overflow: x + width - contentArea.right,
      });
    }

    // Check bottom boundary
    if (y < contentArea.bottom) {
      violations.push({
        element,
        violation: 'bottom',
        overflow: contentArea.bottom - y,
      });
    }

    // Check top boundary
    if (y + height > contentArea.top) {
      violations.push({
        element,
        violation: 'top',
        overflow: y + height - contentArea.top,
      });
    }
  }

  return violations;
}

/**
 * Verify element alignment within tolerance
 */
export function verifyAlignment(elements: LayoutElement[], tolerance = 2): AlignmentIssue[] {
  const issues: AlignmentIssue[] = [];

  // Group elements by page
  const byPage = new Map<number, LayoutElement[]>();
  for (const elem of elements) {
    const pageElems = byPage.get(elem.page) || [];
    pageElems.push(elem);
    byPage.set(elem.page, pageElems);
  }

  for (const [page, pageElements] of byPage) {
    // Check horizontal alignment (same y position)
    const yPositions = new Map<number, LayoutElement[]>();
    for (const elem of pageElements) {
      // Round to tolerance
      const roundedY = Math.round(elem.bounds.y / tolerance) * tolerance;
      const group = yPositions.get(roundedY) || [];
      group.push(elem);
      yPositions.set(roundedY, group);
    }

    // Check for near-misses (elements that should be aligned but aren't quite)
    const yValues = Array.from(yPositions.keys()).sort((a, b) => a - b);
    for (let i = 0; i < yValues.length - 1; i++) {
      const y1 = yValues[i];
      const y2 = yValues[i + 1];
      const diff = y2 - y1;

      // If within 3x tolerance but not within tolerance, it's a potential issue
      if (diff > tolerance && diff < tolerance * 3) {
        const elements1 = yPositions.get(y1) || [];
        const elements2 = yPositions.get(y2) || [];

        issues.push({
          elements: [...elements1, ...elements2],
          type: 'horizontal',
          deviation: diff,
        });
      }
    }

    // Check vertical alignment (same x position)
    const xPositions = new Map<number, LayoutElement[]>();
    for (const elem of pageElements) {
      const roundedX = Math.round(elem.bounds.x / tolerance) * tolerance;
      const group = xPositions.get(roundedX) || [];
      group.push(elem);
      xPositions.set(roundedX, group);
    }

    const xValues = Array.from(xPositions.keys()).sort((a, b) => a - b);
    for (let i = 0; i < xValues.length - 1; i++) {
      const x1 = xValues[i];
      const x2 = xValues[i + 1];
      const diff = x2 - x1;

      if (diff > tolerance && diff < tolerance * 3) {
        const elements1 = xPositions.get(x1) || [];
        const elements2 = xPositions.get(x2) || [];

        issues.push({
          elements: [...elements1, ...elements2],
          type: 'vertical',
          deviation: diff,
        });
      }
    }
  }

  return issues;
}

/**
 * Validate element dimensions are positive
 */
export function validateDimensions(elements: LayoutElement[]): LayoutElement[] {
  const invalid: LayoutElement[] = [];

  for (const element of elements) {
    if (element.bounds.width <= 0 || element.bounds.height <= 0) {
      invalid.push(element);
    }
  }

  return invalid;
}

/**
 * Check for elements with zero area
 */
export function findZeroAreaElements(elements: LayoutElement[]): LayoutElement[] {
  return elements.filter((elem) => getArea(elem.bounds) === 0);
}

/**
 * Get bounding box of all elements
 */
export function getBoundingBox(elements: LayoutElement[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
} | null {
  if (elements.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const elem of elements) {
    minX = Math.min(minX, elem.bounds.x);
    minY = Math.min(minY, elem.bounds.y);
    maxX = Math.max(maxX, elem.bounds.x + elem.bounds.width);
    maxY = Math.max(maxY, elem.bounds.y + elem.bounds.height);
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert DrawnElements from PDF generator to LayoutElements
 */
export function drawnElementsToLayoutElements(drawnElements: DrawnElement[]): LayoutElement[] {
  return drawnElements.map((elem) => ({
    type: elem.type as LayoutElement['type'],
    name: elem.content?.substring(0, 30),
    bounds: elem.bounds,
    page: elem.page,
  }));
}

/**
 * Detect overlaps between text/markdown elements and form fields
 */
export function detectTextFieldOverlaps(
  textElements: LayoutElement[],
  fieldElements: LayoutElement[]
): OverlapResult[] {
  const overlaps: OverlapResult[] = [];

  for (const text of textElements) {
    for (const field of fieldElements) {
      // Only check elements on the same page
      if (text.page !== field.page) continue;

      const intersectionArea = getIntersectionArea(text.bounds, field.bounds);

      if (intersectionArea > 0) {
        const smallerArea = Math.min(getArea(text.bounds), getArea(field.bounds));
        overlaps.push({
          element1: text,
          element2: field,
          overlapArea: intersectionArea,
          overlapPercentage: smallerArea > 0 ? intersectionArea / smallerArea : 0,
        });
      }
    }
  }

  return overlaps;
}
