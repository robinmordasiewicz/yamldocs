/**
 * GitHub Pages API publishing preparation
 * Prepares artifact for use with actions/deploy-pages
 */
import * as core from '@actions/core';
/**
 * Get repository information from environment
 */
function getRepoInfo() {
    const repository = process.env.GITHUB_REPOSITORY;
    if (!repository)
        return null;
    const [owner, repo] = repository.split('/');
    return { owner, repo };
}
/**
 * Prepare for Pages API deployment
 * Sets outputs that can be used with actions/upload-pages-artifact and actions/deploy-pages
 */
export function prepareForPagesApi(options) {
    const { sourceDir } = options;
    const repoInfo = getRepoInfo();
    core.info('📦 Preparing for GitHub Pages API deployment');
    core.info(`  Artifact path: ${sourceDir}`);
    core.info('');
    core.info('To complete deployment, add these steps to your workflow:');
    core.info('');
    core.info('  - uses: actions/upload-pages-artifact@v4');
    core.info('    with:');
    core.info(`      path: ${sourceDir}`);
    core.info('');
    core.info('  - uses: actions/deploy-pages@v4');
    // Calculate expected pages URL
    const pagesUrl = repoInfo ? `https://${repoInfo.owner}.github.io/${repoInfo.repo}/` : undefined;
    return {
        success: true,
        pagesUrl,
        artifactPath: sourceDir,
    };
}
//# sourceMappingURL=pages-api.js.map