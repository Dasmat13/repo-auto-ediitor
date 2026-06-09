// ─────────────────────────────────────────────────────────────
// src/cloner.js — Clones the target GitHub repo to a temp folder
// ─────────────────────────────────────────────────────────────

const simpleGit = require('simple-git');   // git operations library
const path      = require('path');         // path utilities
const os        = require('os');           // gives us os.tmpdir()
const chalk     = require('chalk');        // terminal colors
const ora       = require('ora');          // loading spinner

/**
 * Clones a GitHub repo to a temporary directory and returns the path.
 * @param {string} repoUrl - Full GitHub URL (https or ssh)
 * @returns {string} - Absolute path to the cloned repo on disk
 */
async function cloneRepo(repoUrl) {
  // extract the repo name from the URL — e.g. "backend_freeCodeCamp"
  const repoName = repoUrl
    .split('/')
    .pop()                   // get last segment: "repo-name.git"
    .replace(/\.git$/, '');  // remove .git suffix

  // create a unique temp folder so multiple runs don't clash
  const clonePath = path.join(
    os.tmpdir(),                           // system temp dir: /tmp on Linux
    `auto-editor-${repoName}-${Date.now()}` // unique name with timestamp
  );

  // show a spinner while cloning
  const spinner = ora(`Cloning ${chalk.cyan(repoUrl)} ...`).start();

  try {
    const git = simpleGit();          // create a git instance
    await git.clone(repoUrl, clonePath); // clone into our temp folder
    spinner.succeed(`Cloned → ${chalk.dim(clonePath)}`);
    return clonePath;                 // return the local path
  } catch (err) {
    spinner.fail('Clone failed');
    // throw a descriptive error — caught in main()
    throw new Error(`Could not clone repo: ${err.message}`);
  }
}

module.exports = { cloneRepo };
