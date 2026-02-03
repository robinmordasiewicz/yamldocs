/**
 * Branch-based GitHub Pages publishing
 * Pushes generated files directly to a branch (e.g., gh-pages)
 */
import type { PublishResult } from './types.js';
interface BranchPublishOptions {
    /** Source directory containing files to publish */
    sourceDir: string;
    /** Target branch name */
    branch: string;
    /** Commit message */
    message?: string;
}
/**
 * Publish files to a branch
 */
export declare function publishToBranch(options: BranchPublishOptions): Promise<PublishResult>;
export {};
//# sourceMappingURL=branch.d.ts.map