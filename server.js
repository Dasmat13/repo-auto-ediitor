// ─────────────────────────────────────────────────────────────
// server.js — Express web server for the Repo Auto-Editor UI
// Serves the UI and streams real-time progress via SSE
// ─────────────────────────────────────────────────────────────

require('dotenv').config();
const express  = require('express');
const path     = require('path');
const { cloneRepo }     = require('./src/cloner');
const { scanFiles }     = require('./src/scanner');
const { annotateFile }  = require('./src/annotator');
const { generateNotes } = require('./src/notesGen');
const { generateIndex } = require('./src/indexGen');
const { pushChanges }   = require('./src/pusher');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── SSE endpoint: runs the full pipeline and streams progress ─
app.get('/api/annotate', async (req, res) => {
  const { repo, provider = 'gemini', key, branch = 'main', only = '', skip = '', skipPush = 'false' } = req.query;

  // validate required fields
  if (!repo) return res.status(400).json({ error: 'repo URL is required' });

  // select key based on selected provider
  const prov = provider.toLowerCase();
  let envKeyName = 'GEMINI_API_KEY';
  if (prov === 'groq') envKeyName = 'GROQ_API_KEY';
  if (prov === 'openai') envKeyName = 'OPENAI_API_KEY';

  const apiKey = key || process.env[envKeyName];
  if (!apiKey) {
    return res.status(400).json({ error: `${provider.toUpperCase()} API key required` });
  }

  // set SSE headers
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();

  // helper: send progress event
  const send = (type, message, data = {}) => {
    res.write(`data: ${JSON.stringify({ type, message, ...data })}\n\n`);
  };

  try {
    // step 1: clone
    send('step', '📥 Cloning repository...', { step: 1 });
    const repoPath = await cloneRepo(repo);
    send('ok', `✅ Cloned successfully`, { step: 1 });

    // step 2: scan files
    send('step', '🔍 Scanning code files...', { step: 2 });
    const extraSkip = skip ? skip.split(',').map(s => s.trim()) : [];
    const onlyExt   = only.trim() || null;
    const files     = await scanFiles(repoPath, onlyExt, extraSkip);
    send('ok', `✅ Found ${files.length} code files`, { step: 2, total: files.length });

    if (files.length === 0) {
      send('done', 'No supported files found.', { step: 2 });
      return res.end();
    }

    // step 3: annotate each file
    const noteFiles = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      send('progress', `📝 Annotating: ${file.relPath}`, {
        step: 3,
        current: i + 1,
        total: files.length,
        file: file.relPath,
        language: file.language,
      });

      try {
        await annotateFile(file, prov, apiKey);
        const noteFile = await generateNotes(file, repoPath, prov, apiKey);
        if (noteFile) noteFiles.push(noteFile);
        send('file_done', `✓ ${file.relPath}`, { current: i + 1, total: files.length });
      } catch (err) {
        send('warn', `⚠️ Skipped ${file.relPath}: ${err.message}`, { current: i + 1 });
      }

      // rate limit
      if (i < files.length - 1) await sleep(1200);
    }

    // step 4: generate index
    send('step', '📚 Generating notes/README.md index...', { step: 4 });
    await generateIndex(repoPath, noteFiles, repo);
    send('ok', '✅ Notes index created', { step: 4 });

    // step 5: push
    if (skipPush !== 'true') {
      send('step', '🚀 Pushing changes to GitHub...', { step: 5 });
      await pushChanges(repoPath, branch);
      send('ok', '✅ Pushed to GitHub!', { step: 5 });
    }

    // all done
    send('done', '🎉 All done! Your repo is fully annotated.', {
      notesCount: noteFiles.length,
      repoUrl: repo,
    });

  } catch (err) {
    send('error', `❌ Error: ${err.message}`);
  }

  res.end();
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

app.listen(PORT, () => {
  console.log(`\n🤖 Repo Auto-Editor UI running at http://localhost:${PORT}\n`);
});
