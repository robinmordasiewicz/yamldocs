/**
 * Index page generator for GitHub Pages
 * Creates an HTML index listing all generated documents
 */
import type { IndexPageOptions, GeneratedFile } from './types.js';
/**
 * Generate the index.html file
 */
export declare function generateIndexPage(options: IndexPageOptions): Promise<string>;
/**
 * Create GeneratedFile objects from file paths
 */
export declare function createGeneratedFiles(filePaths: string[]): GeneratedFile[];
//# sourceMappingURL=index-generator.d.ts.map