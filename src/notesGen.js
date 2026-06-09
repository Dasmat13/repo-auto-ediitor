// ─────────────────────────────────────────────────────────────
// src/notesGen.js — Generates a detailed notes .md file for
// each code file using Gemini AI.
// Notes include: key concepts, must-know points, errors, interview Q&A
// ─────────────────────────────────────────────────────────────

const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs   = require('fs');
const path = require('path');

/**
 * Generates a notes markdown file for a given code file.
 *
 * @param {Object} file     - File object (path, language, content, relPath)
 * @param {string} repoPath - Root path of the repo
 * @param {string} apiKey   - Gemini API key
 * @returns {Object|null}   - { relPath, title } info about the created note, or null on failure
 */
async function generateNotes(file, repoPath, apiKey) {
  // initialise Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  // ── Build the prompt ────────────────────────────────────────
  const prompt = `
You are an expert ${file.language} teacher writing comprehensive study notes for beginners.

Analyze this ${file.language} file and generate a complete notes document in Markdown format.

The notes MUST include ALL of these sections:

# 📝 Notes: ${path.basename(file.relPath)} — [One-line description of what this file does]

## 🔑 Key Concepts (Easy to Remember)
A table with 2 columns: Concept | What it means
Cover all important syntax, functions, or patterns used in this file.

## 📌 Must-Know Points
Bullet points of the most important things to understand about this code.
Include any "gotchas", non-obvious behavior, or things beginners get wrong.

## 🐛 Bugs / Errors Found — What, How, When, Fix
A table with 4 columns: Bug/Error | What it is | When it happens | Fix
List ALL bugs, typos, or potential issues found in the code. If no bugs, say "No bugs found ✅".

## 🎤 Interview Questions & Answers
At least 5 interview questions with detailed answers based on the concepts in this file.
Format: **Q1: Question?** followed by > A: Answer

FILE: ${file.relPath}
LANGUAGE: ${file.language}

CODE:
${file.content}

Return ONLY the markdown content. No extra explanation. No code fences around the whole output.
`.trim();

  // ── Call the API ─────────────────────────────────────────────
  const result = await model.generateContent(prompt);
  const notes  = result.response.text().trim();

  // ── Save the note file ───────────────────────────────────────
  // create the notes/ directory at repo root if it doesn't exist
  const notesDir = path.join(repoPath, 'notes');
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, { recursive: true });
  }

  // build note filename: e.g. "src/app.js" → "src_app.md"
  const noteFileName = file.relPath
    .replace(/[\/\\]/g, '_')  // replace path separators with underscores
    .replace(/\.[^.]+$/, '')  // remove the original extension
    + '.md';                   // add .md extension

  const noteFilePath = path.join(notesDir, noteFileName);

  // write the notes file
  fs.writeFileSync(noteFilePath, notes, 'utf8');

  // return metadata for the index generator
  return {
    noteFile:  noteFilePath,                              // absolute path to note file
    relPath:   path.relative(repoPath, noteFilePath),    // relative path (e.g. notes/app.md)
    sourceFile: file.relPath,                             // source code file this note covers
    language:  file.language,                             // programming language
    fileName:  noteFileName,                              // just the note filename
  };
}

module.exports = { generateNotes };
