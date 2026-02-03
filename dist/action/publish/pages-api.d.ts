/**
 * GitHub Pages API publishing preparation
 * Prepares artifact for use with actions/deploy-pages
 */
import type { PublishResult } from './types.js';
interface PagesApiOptions {
    /** Directory containing files to publish */
    sourceDir: string;
}
/**
 * Prepare for Pages API deployment
 * Sets outputs that can be used with actions/upload-pages-artifact and actions/deploy-pages
 */
export declare function prepareForPagesApi(options: PagesApiOptions): PublishResult;
export {};
//# sourceMappingURL=pages-api.d.ts.map