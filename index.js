#!/usr/bin/env node

// ─────────────────────────────────────────────────────────────
// index.js — Main CLI entry point for repo-auto-editor
// Auto-detects AI provider from any key provided or from .env
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
const { detectProvider } = require('./src/ai');

// ─── CLI setup ────────────────────────────────────────────────
program
  .name('repo-auto-editor')
  .description('Auto-annotate any GitHub repo with AI comments and study notes (any language)')
  .version('1.0.0')
  .requiredOption('-r, --repo <url>',    'GitHub repo URL  (e.g. https://github.com/user/repo.git)')
  .option('-p, --provider <provider>',   'AI provider: gemini, groq, openai, or auto', 'auto')
  .option('-k, --key <key>',             'API key (any provider - auto-detected)')
  .option('-b, --branch <branch>',       'Branch to push to', 'main')
  .option('--skip-push',                 'Skip git push — annotate locally only')
  .option('--only <ext>',                'Only annotate files with this extension (e.g. ".py")')
  .option('--skip <dirs>',               'Extra dirs to skip, comma-separated (e.g. "tests,docs")')
  .parse();

const opts = program.opts();

// ─── Main function ────────────────────────────────────────────
async function main() {
  let apiKey = opts.key ? opts.key.trim().replace(/[^\x20-\x7E]/g, '') : opts.key;
  let provider = opts.provider.toLowerCase();

  // If no key passed via CLI, look for any key in environment
  if (!apiKey) {
    if (process.env.GROQ_API_KEY) {
      apiKey = process.env.GROQ_API_KEY;
      if (provider === 'auto') provider = 'groq';
    } else if (process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
      if (provider === 'auto') provider = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
      if (provider === 'auto') provider = 'openai';
    } else if (process.env.API_KEY) {
      apiKey = process.env.API_KEY;
    }
  }

  // Auto-detect provider if provider is set to 'auto' and we have a key
  if (provider === 'auto' && apiKey) {
    provider = detectProvider(apiKey);
  } else if (apiKey && provider !== 'auto') {
    // Double-check if the provided key matches the requested provider, and auto-correct if needed
    const detected = detectProvider(apiKey);
    if (detected !== provider) {
      provider = detected;
    }
  }

  if (!apiKey) {
    console.error(chalk.red('\n❌  No API key found.'));
    console.error(chalk.dim('    Please set GROQ_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY in .env, or pass --key\n'));
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
