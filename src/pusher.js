// ─────────────────────────────────────────────────────────────
// src/pusher.js — Commits all changes and pushes to GitHub
// Falls back gracefully when git binary is not available (Vercel)
// ─────────────────────────────────────────────────────────────

const { execSync } = require('child_process');
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
 * Stages all changes, commits with a descriptive message, and pushes.
 *
 * @param {string} repoPath  - Absolute path to the cloned repo
 * @param {string} branch    - Branch to push to (default: 'main')
 */
async function pushChanges(repoPath, branch = 'main') {
  // If git is not installed (e.g. Vercel serverless), skip push gracefully
  if (!hasGit()) {
    console.log(chalk.yellow('⚠️  Git not available in this environment — skipping push.'));
    console.log(chalk.dim('   Annotations were applied locally. Run locally with git to push.'));
    return;
  }

  const simpleGit = require('simple-git');
  const git = simpleGit(repoPath);

  const spinner = ora('Committing and pushing changes...').start();

  try {
    // stage ALL changes (new note files + annotated source files)
    await git.add('.');

    // check if there's actually anything to commit
    const status = await git.status();
    if (status.files.length === 0) {
      spinner.info('Nothing to commit — all files already up to date.');
      return;
    }

    // build commit message with current date
    const date = new Date().toISOString().split('T')[0];   // e.g. "2026-06-10"
    const commitMsg = `docs: auto-annotate all code files + generate study notes [${date}]`;

    // commit with our message
    await git.commit(commitMsg);

    // push to origin/<branch>
    await git.push('origin', branch);

    spinner.succeed(chalk.green(`Pushed to origin/${branch}`));
  } catch (err) {
    spinner.fail('Push failed');

    // helpful hint for auth errors
    if (err.message.includes('Authentication')) {
      console.log(chalk.yellow('\n  💡 Auth tip: make sure you have SSH keys set up or use a GitHub token.'));
      console.log(chalk.yellow('  Use: git remote set-url origin https://TOKEN@github.com/user/repo.git\n'));
    }

    throw new Error(`Git push failed: ${err.message}`);
  }
}

module.exports = { pushChanges };
