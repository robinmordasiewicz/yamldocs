/**
 * Branch-based GitHub Pages publishing
 * Pushes generated files directly to a branch (e.g., gh-pages)
 */
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import { mkdtemp, cp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
/**
 * Get repository information from environment
 */
function getRepoInfo() {
    const repository = process.env.GITHUB_REPOSITORY;
    if (!repository)
        return null;
    const [owner, repo] = repository.split('/');
    const serverUrl = process.env.GITHUB_SERVER_URL ?? 'https://github.com';
    return {
        owner,
        repo,
        url: `${serverUrl}/${repository}`,
    };
}
/**
 * Execute a git command
 */
async function git(args, cwd) {
    let output = '';
    let errorOutput = '';
    const exitCode = await exec.exec('git', args, {
        cwd,
        silent: true,
        listeners: {
            stdout: (data) => {
                output += data.toString();
            },
            stderr: (data) => {
                errorOutput += data.toString();
            },
        },
    });
    if (exitCode !== 0) {
        throw new Error(`git ${args[0]} failed: ${errorOutput || output}`);
    }
    return output.trim();
}
/**
 * Publish files to a branch
 */
export async function publishToBranch(options) {
    const { sourceDir, branch, message = 'Deploy to GitHub Pages' } = options;
    const repoInfo = getRepoInfo();
    if (!repoInfo) {
        return {
            success: false,
            error: 'GITHUB_REPOSITORY environment variable not set',
        };
    }
    // Create temp directory for git operations
    const tempDir = await mkdtemp(join(tmpdir(), 'yamlforms-deploy-'));
    try {
        core.info(`📦 Publishing to branch: ${branch}`);
        // Configure git
        const actor = process.env.GITHUB_ACTOR ?? 'github-actions[bot]';
        await git(['config', '--global', 'user.name', actor]);
        await git(['config', '--global', 'user.email', `${actor}@users.noreply.github.com`]);
        // Clone the repo (shallow, single branch if it exists)
        const token = process.env.GITHUB_TOKEN;
        const cloneUrl = token
            ? `https://x-access-token:${token}@github.com/${repoInfo.owner}/${repoInfo.repo}.git`
            : repoInfo.url;
        // Try to clone the branch, create orphan if it doesn't exist
        try {
            await git(['clone', '--depth', '1', '--branch', branch, cloneUrl, tempDir]);
            core.info(`  Cloned existing branch: ${branch}`);
            // Remove all existing files (except .git)
            await git(['rm', '-rf', '.'], tempDir);
        }
        catch {
            // Branch doesn't exist, initialize new repo
            core.info(`  Creating new branch: ${branch}`);
            await git(['init'], tempDir);
            await git(['checkout', '--orphan', branch], tempDir);
            await git(['remote', 'add', 'origin', cloneUrl], tempDir);
        }
        // Copy files from source to temp directory
        await cp(sourceDir, tempDir, { recursive: true });
        // Add .nojekyll to disable Jekyll processing
        const nojekyllPath = join(tempDir, '.nojekyll');
        await import('fs/promises').then((fs) => fs.writeFile(nojekyllPath, '', 'utf-8'));
        // Stage all files
        await git(['add', '-A'], tempDir);
        // Check if there are changes to commit
        const status = await git(['status', '--porcelain'], tempDir);
        if (!status) {
            core.info('  No changes to deploy');
            return {
                success: true,
                pagesUrl: `https://${repoInfo.owner}.github.io/${repoInfo.repo}/`,
                artifactPath: sourceDir,
            };
        }
        // Commit
        await git(['commit', '-m', message], tempDir);
        // Push
        await git(['push', '--force', 'origin', branch], tempDir);
        core.info(`✅ Successfully published to ${branch}`);
        return {
            success: true,
            pagesUrl: `https://${repoInfo.owner}.github.io/${repoInfo.repo}/`,
            artifactPath: sourceDir,
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        core.error(`❌ Failed to publish to branch: ${errorMessage}`);
        return {
            success: false,
            error: errorMessage,
        };
    }
    finally {
        // Cleanup temp directory
        try {
            await rm(tempDir, { recursive: true, force: true });
        }
        catch {
            // Ignore cleanup errors
        }
    }
}
//# sourceMappingURL=branch.js.map