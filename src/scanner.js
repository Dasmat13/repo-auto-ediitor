// ─────────────────────────────────────────────────────────────
// src/scanner.js — Scans the repo for ALL supported code files
// Supports any language. Skips binaries, lock files, node_modules etc.
// ─────────────────────────────────────────────────────────────

const fs   = require('fs');    // file system
const path = require('path');  // path utilities
const glob = require('glob');  // file pattern matching

// ── Language detection map ─────────────────────────────────────
// Maps file extension → human-readable language name
const LANGUAGE_MAP = {
  // JavaScript / TypeScript
  '.js':   'JavaScript',   '.mjs': 'JavaScript',  '.cjs': 'JavaScript',
  '.jsx':  'JavaScript',   '.ts':  'TypeScript',   '.tsx': 'TypeScript',
  // Python
  '.py':   'Python',       '.pyw': 'Python',
  // Go
  '.go':   'Go',
  // Rust
  '.rs':   'Rust',
  // Java / Kotlin
  '.java': 'Java',         '.kt':  'Kotlin',       '.kts': 'Kotlin',
  // C / C++
  '.c':    'C',            '.h':   'C',
  '.cpp':  'C++',          '.cc':  'C++',           '.hpp': 'C++',
  // C#
  '.cs':   'C#',
  // PHP
  '.php':  'PHP',
  // Ruby
  '.rb':   'Ruby',
  // Shell
  '.sh':   'Shell',        '.bash':'Shell',          '.zsh': 'Shell',
  // Swift
  '.swift':'Swift',
  // Dart / Flutter
  '.dart': 'Dart',
  // R
  '.r':    'R',            '.R':   'R',
  // Scala
  '.scala':'Scala',
  // Lua
  '.lua':  'Lua',
  // YAML / TOML / JSON
  '.yaml': 'YAML',         '.yml': 'YAML',
  '.toml': 'TOML',         '.json':'JSON',
  // SQL
  '.sql':  'SQL',
  // Web
  '.html': 'HTML',         '.htm': 'HTML',
  '.css':  'CSS',          '.scss':'SCSS',           '.sass':'SASS',
  // Config / scripts
  '.env':  'ENV',          '.dockerfile': 'Dockerfile',
};

// ── Directories to ALWAYS skip ────────────────────────────────
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out',
  '__pycache__', '.venv', 'venv', 'env',
  '.next', '.nuxt', '.svelte-kit',
  'vendor', 'target', 'bin', 'obj',
  'coverage', '.nyc_output', '.cache',
  'logs', 'tmp', 'temp',
]);

// ── File names to ALWAYS skip ─────────────────────────────────
const SKIP_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Gemfile.lock', 'Cargo.lock', 'composer.lock',
  '.DS_Store', 'Thumbs.db',
]);

// ── Max file size to annotate (100 KB) ────────────────────────
const MAX_BYTES = 100 * 1024;

/**
 * Scans a directory recursively for all supported code files.
 * @param {string} repoPath   - Root path of the cloned repo
 * @param {string|null} only  - Only include this extension (e.g. ".py"), or null for all
 * @param {string[]} extraSkip - Additional directory names to skip
 * @returns {Array<{path, language, ext, content}>}
 */
async function scanFiles(repoPath, only = null, extraSkip = []) {
  // merge default skip dirs + any user-provided ones
  const skipSet = new Set([...SKIP_DIRS, ...extraSkip]);

  const results = [];

  // walk the directory tree recursively
  walkDir(repoPath, repoPath, skipSet, only, results);

  return results;
}

/**
 * Recursive directory walker — fills `results` with file info objects.
 */
function walkDir(rootPath, currentPath, skipSet, only, results) {
  let entries;

  try {
    entries = fs.readdirSync(currentPath, { withFileTypes: true });
  } catch {
    return; // skip directories we can't read
  }

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      // skip blacklisted directories
      if (skipSet.has(entry.name)) continue;
      // skip hidden directories (e.g. .github, .vscode) except root-level ones you want
      if (entry.name.startsWith('.')) continue;
      // recurse into this directory
      walkDir(rootPath, fullPath, skipSet, only, results);

    } else if (entry.isFile()) {
      // skip blacklisted file names
      if (SKIP_FILES.has(entry.name)) continue;

      const ext = path.extname(entry.name).toLowerCase();

      // filter by --only flag if provided
      if (only && ext !== only) continue;

      // check if this extension is supported
      const language = LANGUAGE_MAP[ext] || LANGUAGE_MAP[path.extname(entry.name)];
      if (!language) continue;

      // skip files that are too large
      try {
        const stat = fs.statSync(fullPath);
        if (stat.size > MAX_BYTES) continue;
        if (stat.size === 0) continue; // skip empty files
      } catch {
        continue;
      }

      // read file content
      let content;
      try {
        content = fs.readFileSync(fullPath, 'utf8');
      } catch {
        continue; // skip unreadable/binary files
      }

      // skip files that look binary (contain null bytes)
      if (content.includes('\0')) continue;

      results.push({
        path:     fullPath,                           // absolute path on disk
        relPath:  path.relative(rootPath, fullPath), // relative to repo root
        language: language,                           // e.g. "JavaScript"
        ext:      ext,                                // e.g. ".js"
        content:  content,                            // file content as string
      });
    }
  }
}

module.exports = { scanFiles };
