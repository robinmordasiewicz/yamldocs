/**
 * GitHub Pages publishing orchestration
 * Coordinates index generation and publishing methods
 */
import type { PublishOptions, PublishResult, GeneratedFile } from './types.js';
export type { PublishOptions, PublishResult, GeneratedFile };
interface PublishContext {
    /** Publishing options */
    options: PublishOptions;
    /** Output directory containing generated files */
    outputDir: string;
    /** List of successfully generated file paths */
    generatedFiles: string[];
}
/**
 * Publish generated files to GitHub Pages
 */
export declare function publish(context: PublishContext): Promise<PublishResult>;
/**
 * Parse publish options from action inputs
 */
export declare function parsePublishOptions(publish: boolean, publishMethod: string, pagesBranch: string, generateIndex: boolean, indexTitle: string): PublishOptions;
//# sourceMappingURL=index.d.ts.map