/**
 * GitHub Pages publishing orchestration
 * Coordinates index generation and publishing methods
 */
import * as core from '@actions/core';
import { publishToBranch } from './branch.js';
import { prepareForPagesApi } from './pages-api.js';
/**
 * Publish generated files to GitHub Pages
 */
export async function publish(context) {
    const { options, outputDir, generatedFiles } = context;
    if (!options.enabled) {
        return { success: true };
    }
    core.info('');
    core.info('🚀 Publishing to GitHub Pages');
    // Publish based on method
    let result;
    if (options.method === 'branch') {
        result = await publishToBranch({
            sourceDir: outputDir,
            branch: options.branch,
            message: `Deploy yamlforms: ${generatedFiles.length} file(s)`,
        });
    }
    else {
        result = prepareForPagesApi({
            sourceDir: outputDir,
        });
    }
    return result;
}
/**
 * Parse publish options from action inputs
 */
export function parsePublishOptions(publish, publishMethod, pagesBranch, generateIndex, indexTitle) {
    // Validate publish method
    const method = publishMethod === 'branch' ? 'branch' : 'pages-api';
    return {
        enabled: publish,
        method,
        branch: pagesBranch || 'gh-pages',
        generateIndex,
        indexTitle: indexTitle || 'Generated Documents',
    };
}
//# sourceMappingURL=index.js.map