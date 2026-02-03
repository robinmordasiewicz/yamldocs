/**
 * Type definitions for GitHub Pages publishing
 */
export interface PublishOptions {
    /** Enable GitHub Pages publishing */
    enabled: boolean;
    /** Publishing method: 'pages-api' or 'branch' */
    method: 'pages-api' | 'branch';
    /** Branch name for branch-based publishing */
    branch: string;
    /** Generate index.html listing documents */
    generateIndex: boolean;
    /** Title for the index page */
    indexTitle: string;
}
export interface PublishResult {
    /** Whether publishing was successful */
    success: boolean;
    /** URL of deployed GitHub Pages site (if available) */
    pagesUrl?: string;
    /** Path to generated index.html */
    indexFile?: string;
    /** Path for upload-pages-artifact */
    artifactPath?: string;
    /** Error message if publishing failed */
    error?: string;
}
export interface GeneratedFile {
    /** Full path to the file */
    path: string;
    /** File type */
    type: 'pdf' | 'html' | 'docx';
    /** File name */
    name: string;
}
export interface IndexPageOptions {
    /** Title for the index page */
    title: string;
    /** List of generated files to include */
    files: GeneratedFile[];
    /** Output directory for the index file */
    outputDir: string;
    /** Repository name for URLs */
    repository?: string;
}
//# sourceMappingURL=types.d.ts.map