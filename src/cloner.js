// ─────────────────────────────────────────────────────────────
// src/cloner.js — Downloads a GitHub repo as a ZIP via API
// Works on Vercel / environments without git installed
// ─────────────────────────────────────────────────────────────

const https   = require('https');
const path    = require('path');
const os      = require('os');
const fs      = require('fs');
const AdmZip  = require('adm-zip');

/**
 * Parses a GitHub URL into { owner, repo } parts.
 * Accepts formats like:
 *   https://github.com/owner/repo.git
 *   https://github.com/owner/repo
 */
function parseGitHubUrl(repoUrl) {
  const clean = repoUrl.replace(/\.git$/, '').replace(/\/$/, '');
  const match = clean.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error(`Cannot parse GitHub URL: ${repoUrl}`);
  return { owner: match[1], repo: match[2] };
}

/**
 * Downloads a file from a URL, following redirects, into a buffer.
 */
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'User-Agent': 'explain-my-repo/1.0' }
    }, (res) => {
      // Follow redirects (GitHub ZIP download uses 302)
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} downloading repo ZIP`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

/**
 * Downloads a GitHub repo as a ZIP and extracts it to a temp folder.
 * Returns the absolute path to the extracted repo root.
 *
 * @param {string} repoUrl - Full GitHub URL
 * @param {string} branch  - Branch to download (default: 'main')
 * @returns {string} - Absolute path to the extracted repo on disk
 */
async function cloneRepo(repoUrl, branch = 'main') {
  const { owner, repo } = parseGitHubUrl(repoUrl);

  // GitHub's ZIP archive endpoint
  const zipUrl = `https://codeload.github.com/${owner}/${repo}/zip/refs/heads/${branch}`;

  const clonePath = path.join(
    os.tmpdir(),
    `explain-${repo}-${Date.now()}`
  );

  try {
    // Download ZIP into memory
    const buffer = await downloadBuffer(zipUrl);

    // Extract to temp dir
    const zip = new AdmZip(buffer);
    zip.extractAllTo(clonePath, true);

    // GitHub ZIPs contain a single root folder named "repo-branch"
    // We need to return that inner folder as the repo root
    const entries = fs.readdirSync(clonePath);
    const innerFolder = entries.find(e =>
      fs.statSync(path.join(clonePath, e)).isDirectory()
    );

    if (!innerFolder) throw new Error('ZIP extraction produced no folder');

    return path.join(clonePath, innerFolder);

  } catch (err) {
    throw new Error(`Could not clone repo: ${err.message}`);
  }
}

module.exports = { cloneRepo, parseGitHubUrl };
