// ─────────────────────────────────────────────────────────────
// src/annotator.js — Calls AI to add inline comments
// to every line of a code file. Logic is NEVER changed.
// ─────────────────────────────────────────────────────────────

const fs = require('fs');
const { generateText } = require('./ai');

/**
 * Sends a code file to AI and replaces its content with a
 * fully commented version. The code logic is never modified.
 *
 * @param {Object} file       - File object from scanner.js
 * @param {string} provider   - 'gemini', 'groq', or 'openai'
 * @param {string} apiKey     - AI API key
 */
async function annotateFile(file, provider, apiKey) {
  // ── Build the prompt ────────────────────────────────────────
  const prompt = `
You are an expert ${file.language} teacher creating study material for beginners.

Your task: Add inline comments to EVERY line of this ${file.language} code file.

STRICT RULES:
1. Add a comment on EVERY single line — even blank lines get a short explanation of why there is a blank line (e.g. "// blank line for readability").
2. Keep comments simple, beginner-friendly, and logical.
3. Do NOT change ANY code logic whatsoever — only add comments.
4. If there is a bug, explain what the current code does in the comment, then on the NEXT line add: // ⚠️ BUG: <description> — FIX: <fix>
5. Use the correct comment syntax for ${file.language}.
6. Keep formatting clean and consistent.
7. Return ONLY the commented code — no markdown fences, no explanation outside the code.

FILE: ${file.relPath}
LANGUAGE: ${file.language}

CODE:
${file.content}
`.trim();

  // ── Call the AI client wrapper ────────────────────────────────
  let annotated = await generateText({ provider, apiKey, prompt });
  annotated = annotated.trim();

  // strip any accidental markdown code fences AI might add
  annotated = stripCodeFences(annotated);

  // write the annotated content back to the file on disk
  fs.writeFileSync(file.path, annotated, 'utf8');

  // update the in-memory content too (used later by notesGen)
  file.annotatedContent = annotated;
}

/**
 * Removes markdown code fences if AI wraps output in them.
 * e.g. ```javascript ... ``` → just the code inside
 */
function stripCodeFences(text) {
  const fenceRegex = /^```[\w]*\n?([\s\S]*?)```\s*$/m;
  const match = text.match(fenceRegex);
  return match ? match[1].trim() : text;
}

module.exports = { annotateFile };
