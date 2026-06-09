#!/usr/bin/env node

// ─────────────────────────────────────────────────────────────
// index.js — Main CLI entry point for repo-auto-editor
// Usage: node index.js --repo https://github.com/user/repo.git
// ─────────────────────────────────────────────────────────────

require('dotenv').config();                       // loads GEMINI_API_KEY from .env file
const { program } = require('commander');         // CLI argument parser
const chalk = require('chalk');                   // colorful terminal output
const path = require('path');                     // path utilities

// import all our modules
const { cloneRepo }      = require('./src/cloner');     // step 1: clone the repo
const { scanFiles }      = require('./src/scanner');    // step 2: find all code files
const { annotateFile }   = require('./src/annotator');  // step 3: add inline comments
const { generateNotes }  = require('./src/notesGen');   // step 4: create notes .md file
const { generateIndex }  = require('./src/indexGen');   // step 5: create notes/README.md
const { pushChanges }    = require('./src/pusher');     // step 6: git commit + push

// ─── CLI setup ────────────────────────────────────────────────
program
  .name('repo-auto-editor')
  .description('Auto-annotate any GitHub repo with AI comments and study notes (any language)')
  .version('1.0.0')
  .requiredOption('-r, --repo <url>',    'GitHub repo URL  (e.g. https://github.com/user/repo.git)')
  .option('-k, --key <key>',             'Gemini API key   (or set GEMINI_API_KEY in .env)')
  .option('-b, --branch <branch>',       'Branch to push to', 'main')
  .option('--skip-push',                 'Skip git push — annotate locally only')
  .option('--only <ext>',                'Only annotate files with this extension  (e.g. ".py")')
  .option('--skip <dirs>',               'Extra dirs to skip, comma-separated  (e.g. "tests,docs")')
  .parse();

const opts = program.opts();

// ─── Main function ────────────────────────────────────────────
async function main() {
  // get the API key from flag or environment variable
  const apiKey = opts.key || process.env.GEMINI_API_KEY;

  // exit early if no API key provided
  if (!apiKey) {
    console.error(chalk.red('\n❌  Gemini API key required.'));
    console.error(chalk.dim('    Use --key YOUR_KEY  or  add GEMINI_API_KEY=... to .env\n'));
    process.exit(1);
  }

  // print header
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║   🤖  Repo Auto-Editor  ·  Powered by Gemini  ║'));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'));

  // parse extra skip directories
  const extraSkip = opts.skip ? opts.skip.split(',').map(s => s.trim()) : [];

  // ── Step 1: Clone the repo ──────────────────────────────────
  const repoPath = await cloneRepo(opts.repo);

  // ── Step 2: Scan all code files ────────────────────────────
  const files = await scanFiles(repoPath, opts.only, extraSkip);

  if (files.length === 0) {
    console.log(chalk.yellow('\n⚠️  No supported code files found in the repo.\n'));
    process.exit(0);
  }

  console.log(chalk.green(`\n✅  Found ${chalk.bold(files.length)} code files\n`));

  // ── Step 3 & 4: Annotate each file + generate its notes ───
  const noteFiles = [];    // tracks all generated note file paths

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = path.relative(repoPath, file.path);   // e.g. "src/app.js"

    console.log(chalk.yellow(`\n[${i + 1}/${files.length}]  📄  ${relPath}  ${chalk.dim('(' + file.language + ')')}`));

    try {
      // add inline comments to the actual source file
      await annotateFile(file, apiKey);
      console.log(chalk.green('    ✓  Comments added'));

      // generate a notes .md file in the notes/ folder
      const noteFile = await generateNotes(file, repoPath, apiKey);
      if (noteFile) {
        noteFiles.push(noteFile);
        console.log(chalk.green('    ✓  Notes generated'));
      }
    } catch (err) {
      // if one file fails, log it and continue with the rest
      console.log(chalk.red(`    ⚠️  Skipped — ${err.message}`));
    }

    // rate limit: wait 1.2s between API calls to avoid hitting Gemini quota
    if (i < files.length - 1) {
      await sleep(1200);
    }
  }

  // ── Step 5: Create notes/README.md index ───────────────────
  await generateIndex(repoPath, noteFiles, opts.repo);
  console.log(chalk.green('\n✅  notes/README.md index created'));

  // ── Step 6: Git commit + push ──────────────────────────────
  if (!opts.skipPush) {
    await pushChanges(repoPath, opts.branch);
    console.log(chalk.green('✅  Changes pushed to GitHub'));
  }

  // done!
  console.log(chalk.bold.green('\n╔══════════════════════════════╗'));
  console.log(chalk.bold.green('║   ✅  All done! Repo updated.  ║'));
  console.log(chalk.bold.green('╚══════════════════════════════╝\n'));
}

// small helper: pause execution for `ms` milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// run and catch any fatal errors
main().catch(err => {
  console.error(chalk.red('\n❌  Fatal error:'), err.message);
  process.exit(1);
});
