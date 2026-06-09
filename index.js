#!/usr/bin/env node

// ─────────────────────────────────────────────────────────────
// index.js — Main CLI entry point for repo-auto-editor
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');

const { cloneRepo }      = require('./src/cloner');
const { scanFiles }      = require('./src/scanner');
const { annotateFile }   = require('./src/annotator');
const { generateNotes }  = require('./src/notesGen');
const { generateIndex }  = require('./src/indexGen');
const { pushChanges }    = require('./src/pusher');

// ─── CLI setup ────────────────────────────────────────────────
program
  .name('repo-auto-editor')
  .description('Auto-annotate any GitHub repo with AI comments and study notes (any language)')
  .version('1.0.0')
  .requiredOption('-r, --repo <url>',    'GitHub repo URL  (e.g. https://github.com/user/repo.git)')
  .option('-p, --provider <provider>',   'AI provider: gemini, groq, or openai', 'gemini')
  .option('-k, --key <key>',             'API key (overrides environment variables)')
  .option('-b, --branch <branch>',       'Branch to push to', 'main')
  .option('--skip-push',                 'Skip git push — annotate locally only')
  .option('--only <ext>',                'Only annotate files with this extension (e.g. ".py")')
  .option('--skip <dirs>',               'Extra dirs to skip, comma-separated (e.g. "tests,docs")')
  .parse();

const opts = program.opts();

// ─── Main function ────────────────────────────────────────────
async function main() {
  const provider = opts.provider.toLowerCase();
  
  // select appropriate environment variable based on provider
  let envKeyName = 'GEMINI_API_KEY';
  if (provider === 'groq') envKeyName = 'GROQ_API_KEY';
  if (provider === 'openai') envKeyName = 'OPENAI_API_KEY';

  const apiKey = opts.key || process.env[envKeyName];

  if (!apiKey) {
    console.error(chalk.red(`\n❌  ${provider.toUpperCase()} API key required.`));
    console.error(chalk.dim(`    Use --key YOUR_KEY  or  add ${envKeyName}=... to .env\n`));
    process.exit(1);
  }

  // print header
  console.log(chalk.bold.cyan('\n╔══════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan(`║   🤖  Repo Auto-Editor  ·  Using ${provider.toUpperCase().padEnd(6)}  ║`));
  console.log(chalk.bold.cyan('╚══════════════════════════════════════════╝\n'));

  const extraSkip = opts.skip ? opts.skip.split(',').map(s => s.trim()) : [];
  const repoPath = await cloneRepo(opts.repo);
  const files = await scanFiles(repoPath, opts.only, extraSkip);

  if (files.length === 0) {
    console.log(chalk.yellow('\n⚠️  No supported code files found in the repo.\n'));
    process.exit(0);
  }

  console.log(chalk.green(`\n✅  Found ${chalk.bold(files.length)} code files\n`));

  const noteFiles = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relPath = path.relative(repoPath, file.path);

    console.log(chalk.yellow(`\n[${i + 1}/${files.length}]  📄  ${relPath}  ${chalk.dim('(' + file.language + ')')}`));

    try {
      // annotate actual source file using the provider
      await annotateFile(file, provider, apiKey);
      console.log(chalk.green('    ✓  Comments added'));

      // generate notes file using the provider
      const noteFile = await generateNotes(file, repoPath, provider, apiKey);
      if (noteFile) {
        noteFiles.push(noteFile);
        console.log(chalk.green('    ✓  Notes generated'));
      }
    } catch (err) {
      console.log(chalk.red(`    ⚠️  Skipped — ${err.message}`));
    }

    // rate limit between calls
    if (i < files.length - 1) {
      await sleep(1200);
    }
  }

  await generateIndex(repoPath, noteFiles, opts.repo);
  console.log(chalk.green('\n✅  notes/README.md index created'));

  if (!opts.skipPush) {
    await pushChanges(repoPath, opts.branch);
    console.log(chalk.green('✅  Changes pushed to GitHub'));
  }

  console.log(chalk.bold.green('\n╔══════════════════════════════╗'));
  console.log(chalk.bold.green('║   ✅  All done! Repo updated.  ║'));
  console.log(chalk.bold.green('╚══════════════════════════════╝\n'));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error(chalk.red('\n❌  Fatal error:'), err.message);
  process.exit(1);
});
