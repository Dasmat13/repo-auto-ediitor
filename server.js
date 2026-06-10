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
const { detectProvider, generateText } = require('./src/ai');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// ── Validation endpoint: checks if API key works ─────────────────
app.post('/api/validate-key', async (req, res) => {
  const { provider, key } = req.body;

  let apiKey = key ? key.trim().replace(/[^\x20-\x7E]/g, '') : key;
  let prov = provider.toLowerCase();

  // If no key passed via parameter, try to find any valid key in environment
  if (!apiKey) {
    if (prov === 'groq' && process.env.GROQ_API_KEY) apiKey = process.env.GROQ_API_KEY;
    else if (prov === 'gemini' && process.env.GEMINI_API_KEY) apiKey = process.env.GEMINI_API_KEY;
    else if (prov === 'openai' && process.env.OPENAI_API_KEY) apiKey = process.env.OPENAI_API_KEY;
  }

  // Detect provider based on key format
  if (apiKey) {
    const detected = detectProvider(apiKey);
    if (prov === 'auto' || prov !== detected) {
      prov = detected;
    }
  }

  if (!apiKey) {
    return res.status(400).json({ valid: false, error: 'No API key provided.' });
  }

  try {
    const response = await generateText({
      provider: prov,
      apiKey: apiKey,
      prompt: 'Respond with exactly one word "OK" to verify this connection.'
    });

    if (response.trim().toUpperCase().includes('OK')) {
      return res.json({ valid: true, provider: prov });
    } else {
      return res.json({ valid: false, error: `Unexpected response from ${prov}: ${response.substring(0, 100)}` });
    }
  } catch (err) {
    return res.json({ valid: false, error: err.message });
  }
});

// ── SSE endpoint: runs the full pipeline and streams progress ─
app.get('/api/annotate', async (req, res) => {
  const { repo, provider = 'auto', key, branch = 'main', only = '', skip = '', skipPush = 'false' } = req.query;

  // validate required fields
  if (!repo) return res.status(400).json({ error: 'repo URL is required' });

  let apiKey = key ? key.trim().replace(/[^\x20-\x7E]/g, '') : key;
  let prov = provider.toLowerCase();

  // If no key passed via parameter, try to find any valid key in environment
  if (!apiKey) {
    if (process.env.GROQ_API_KEY) {
      apiKey = process.env.GROQ_API_KEY;
      if (prov === 'auto') prov = 'groq';
    } else if (process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
      if (prov === 'auto') prov = 'gemini';
    } else if (process.env.OPENAI_API_KEY) {
      apiKey = process.env.OPENAI_API_KEY;
      if (prov === 'auto') prov = 'openai';
    } else if (process.env.API_KEY) {
      apiKey = process.env.API_KEY;
    }
  }

  // Detect provider based on key format
  if (apiKey) {
    const detected = detectProvider(apiKey);
    if (prov === 'auto' || prov !== detected) {
      prov = detected;
    }
  }

  if (!apiKey) {
    return res.status(400).json({ error: 'No API key provided. Please check your inputs or server .env file.' });
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
    const repoPath = await cloneRepo(repo, branch);
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
      send('progress', `📝 Annotating: ${file.relPath} (Using ${prov.toUpperCase()})`, {
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
    send('done', `🎉 All done! Your repo is fully annotated using ${prov.toUpperCase()}.`, {
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
