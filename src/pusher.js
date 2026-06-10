// ─────────────────────────────────────────────────────────────
// src/pusher.js — Commits all changes and pushes to GitHub
// Falls back to GitHub REST API if git binary is not available (Vercel)
// ─────────────────────────────────────────────────────────────

const { execSync } = require('child_process');
const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const chalk  = require('chalk');
const ora    = require('ora');

/**
 * Check if git is available on this system.
 */
function hasGit() {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parses a GitHub URL into { owner, repo, token } parts.
 * Supports token extraction from format like:
 *   https://ghp_xxx@github.com/owner/repo.git
 *   https://oauth2:ghp_xxx@github.com/owner/repo.git
 */
function parseRepoUrl(url) {
  if (!url) return { token: null, owner: null, repo: null };
  const clean = url.replace(/\.git$/, '').replace(/\/$/, '');
  
  let token = null;
  let owner = null;
  let repo = null;

  // Check for token in username field (e.g. https://<token>@github.com/... or https://oauth2:<token>@github.com/...)
  const tokenMatch = clean.match(/https?:\/\/(?:[^:]+:(.+)|([^@]+))@github\.com\/([^/]+)\/([^/]+)/);
  if (tokenMatch) {
    token = tokenMatch[1] || tokenMatch[2];
    owner = tokenMatch[3];
    repo = tokenMatch[4];
  } else {
    const stdMatch = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (stdMatch) {
      owner = stdMatch[1];
      repo = stdMatch[2];
    }
  }

  // Fallback to environment variables if not present in URL
  if (!token) {
    token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  }

  return { token, owner, repo };
}

/**
 * Custom Promise-wrapped https request helper for GitHub API.
 */
function githubRequest(method, endpoint, token, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'explain-my-repo/1.0',
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        } else {
          reject(new Error(`GitHub API HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Gets a file's SHA from GitHub API (needed to update/overwrite it).
 */
async function getFileSha(owner, repo, filePath, branch, token) {
  try {
    const res = await githubRequest('GET', `/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, token);
    return res.sha;
  } catch {
    return null; // Return null if file does not exist yet (expected for new notes)
  }
}

/**
 * Stages all changes, commits with a descriptive message, and pushes.
 *
 * @param {string} repoPath  - Absolute path to the cloned repo
 * @param {string} branch    - Branch to push to (default: 'main')
 * @param {string} repoUrl   - The remote GitHub repository URL
 * @param {Array} files      - List of annotated source file objects
 * @param {Array} noteFiles  - List of generated study notes file objects
 */
async function pushChanges(repoPath, branch = 'main', repoUrl = '', files = [], noteFiles = []) {
  // If git is available (e.g. running locally), use simple-git
  if (hasGit()) {
    const simpleGit = require('simple-git');
    const git = simpleGit(repoPath);
    const spinner = ora('Committing and pushing changes via Git...').start();
    try {
      await git.add('.');
      const status = await git.status();
      if (status.files.length === 0) {
        spinner.info('Nothing to commit — all files already up to date.');
        return;
      }
      const date = new Date().toISOString().split('T')[0];
      await git.commit(`docs: auto-annotate code files + study notes [${date}]`);
      await git.push('origin', branch);
      spinner.succeed(chalk.green(`Pushed to origin/${branch}`));
      return;
    } catch (err) {
      spinner.fail('Git push failed');
      throw new Error(`Git push failed: ${err.message}`);
    }
  }

  // ─── Git is not available fallback (Vercel Serverless) ───
  const { token, owner, repo } = parseRepoUrl(repoUrl);

  if (!token) {
    console.log(chalk.yellow('⚠️  Git not available and no GitHub token found.'));
    console.log(chalk.dim('   To push annotations back from Vercel, pass a token in the URL:'));
    console.log(chalk.dim('   e.g. https://ghp_YOURTOKEN@github.com/username/repo.git'));
    throw new Error('No git binary or GitHub token found. Push skipped.');
  }

  console.log(`🤖 Git binary missing. Falling back to GitHub REST API pushing...`);
  
  // 1. Gather all files we need to push
  const filesToPush = [];

  // Add annotated source files
  for (const f of files) {
    try {
      const diskPath = path.join(repoPath, f.relPath);
      if (fs.existsSync(diskPath)) {
        filesToPush.push({
          gitPath: f.relPath,
          content: fs.readFileSync(diskPath, 'utf8')
        });
      }
    } catch (e) {
      console.log(`⚠️  Could not read modified file ${f.relPath}: ${e.message}`);
    }
  }

  // Add generated study notes
  for (const n of noteFiles) {
    try {
      const diskPath = path.join(repoPath, n.relPath);
      if (fs.existsSync(diskPath)) {
        filesToPush.push({
          gitPath: n.relPath,
          content: fs.readFileSync(diskPath, 'utf8')
        });
      }
    } catch (e) {
      console.log(`⚠️  Could not read note file ${n.relPath}: ${e.message}`);
    }
  }

  // Add notes/README.md main index
  try {
    const readmeDiskPath = path.join(repoPath, 'notes', 'README.md');
    if (fs.existsSync(readmeDiskPath)) {
      filesToPush.push({
        gitPath: 'notes/README.md',
        content: fs.readFileSync(readmeDiskPath, 'utf8')
      });
    }
  } catch (e) {
    console.log(`⚠️  Could not read notes index README.md: ${e.message}`);
  }

  if (filesToPush.length === 0) {
    console.log('Nothing to push.');
    return;
  }

  console.log(`Uploading ${filesToPush.length} files to GitHub repository ${owner}/${repo}...`);

  for (let i = 0; i < filesToPush.length; i++) {
    const item = filesToPush[i];
    try {
      console.log(`   [${i + 1}/${filesToPush.length}] Uploading ${item.gitPath}...`);
      
      // Get the existing SHA if any to prevent conflict errors
      const sha = await getFileSha(owner, repo, item.gitPath, branch, token);

      const body = {
        message: `docs: auto-annotate ${item.gitPath} + study notes`,
        content: Buffer.from(item.content).toString('base64'),
        branch: branch
      };

      if (sha) {
        body.sha = sha;
      }

      await githubRequest('PUT', `/repos/${owner}/${repo}/contents/${item.gitPath}`, token, body);
    } catch (err) {
      console.log(chalk.red(`❌  Failed to upload ${item.gitPath}: ${err.message}`));
    }
  }

  console.log(chalk.green('✓ All changes uploaded to GitHub via API!'));
}

module.exports = { pushChanges };
