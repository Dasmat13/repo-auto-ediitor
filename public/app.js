// ─────────────────────────────────────────────────────────────
// app.js — Frontend logic for Repo Auto-Editor UI
// Handles form submit, SSE stream, progress UI updates
// ─────────────────────────────────────────────────────────────

// ── DOM references ─────────────────────────────────────────
const form         = document.getElementById('annotateForm');
const formCard     = document.getElementById('formCard');
const progressCard = document.getElementById('progressCard');
const terminalBody = document.getElementById('terminalBody');
const progressFill = document.getElementById('progressFill');
const progressLabel = document.getElementById('progressLabel');
const progressCount = document.getElementById('progressCount');
const progressBarWrap = document.getElementById('progressBarWrap');
const resultEl     = document.getElementById('result');
const backBtn      = document.getElementById('backBtn');
const submitBtn    = document.getElementById('submitBtn');
const btnText      = document.getElementById('btnText');
const repoPill     = document.getElementById('repoPill');
const progressTitle = document.getElementById('progressTitle');
const toggleKeyBtn = document.getElementById('toggleKey');
const apiKeyInput  = document.getElementById('apiKey');
const testKeyBtn   = document.getElementById('testKeyBtn');
const keyStatusMsg = document.getElementById('keyStatusMsg');

// ── Toggle password visibility ──────────────────────────────
toggleKeyBtn.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleKeyBtn.textContent = isPassword ? '🙈' : '👁';
});

// ── Test Key verification ───────────────────────────────────
testKeyBtn.addEventListener('click', async () => {
  const key      = apiKeyInput.value.trim();
  const provider = providerSelect.value;

  if (!key) {
    keyStatusMsg.textContent = 'Please enter a key first.';
    keyStatusMsg.style.color = 'var(--yellow)';
    return;
  }

  keyStatusMsg.textContent = 'Testing connection...';
  keyStatusMsg.style.color = 'var(--muted)';
  testKeyBtn.disabled = true;

  try {
    const res = await fetch('/api/validate-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, key })
    });
    
    const data = await res.json();
    if (data.valid) {
      keyStatusMsg.textContent = `✓ Key is valid! (${data.provider.toUpperCase()})`;
      keyStatusMsg.style.color = 'var(--green)';
    } else {
      let errMsg = data.error || 'Invalid key';
      if (errMsg.includes('API_KEY_INVALID')) {
        errMsg = 'API key is invalid or not registered.';
      }
      keyStatusMsg.textContent = `✗ ${errMsg}`;
      keyStatusMsg.style.color = 'var(--red)';
    }
  } catch (err) {
    keyStatusMsg.textContent = `✗ Connection error: ${err.message}`;
    keyStatusMsg.style.color = 'var(--red)';
  } finally {
    testKeyBtn.disabled = false;
  }
});

// ── Handle provider change ──────────────────────────────────
const providerSelect = document.getElementById('provider');
const keyLabel       = document.getElementById('keyLabel');
const keyLink        = document.getElementById('keyLink');

providerSelect.addEventListener('change', () => {
  const val = providerSelect.value;
  if (val === 'auto') {
    apiKeyInput.placeholder = 'Paste your API key (Gemini, Groq, or OpenAI)';
    detectAndSetLabel();
  } else if (val === 'gemini') {
    keyLabel.textContent = 'Gemini API Key';
    apiKeyInput.placeholder = 'AIza...';
    keyLink.textContent = 'Get free key →';
    keyLink.href = 'https://aistudio.google.com/app/apikey';
  } else if (val === 'groq') {
    keyLabel.textContent = 'Groq API Key';
    apiKeyInput.placeholder = 'gsk_...';
    keyLink.textContent = 'Get free key →';
    keyLink.href = 'https://console.groq.com/keys';
  } else if (val === 'openai') {
    keyLabel.textContent = 'OpenAI API Key';
    apiKeyInput.placeholder = 'sk-proj-...';
    keyLink.textContent = 'Get key →';
    keyLink.href = 'https://platform.openai.com/api-keys';
  }
});

function detectAndSetLabel() {
  const key = apiKeyInput.value.trim();
  if (key.startsWith('gsk_')) {
    keyLabel.textContent = 'Detected: Groq API Key';
    keyLink.textContent = 'Groq Console →';
    keyLink.href = 'https://console.groq.com/keys';
  } else if (key.startsWith('AIza')) {
    keyLabel.textContent = 'Detected: Gemini API Key';
    keyLink.textContent = 'Google AI Studio →';
    keyLink.href = 'https://aistudio.google.com/app/apikey';
  } else if (key.startsWith('sk-')) {
    keyLabel.textContent = 'Detected: OpenAI API Key';
    keyLink.textContent = 'OpenAI Platform →';
    keyLink.href = 'https://platform.openai.com/api-keys';
  } else {
    keyLabel.textContent = 'API Key';
    keyLink.textContent = 'Get key →';
    keyLink.href = '#';
  }
}

apiKeyInput.addEventListener('input', () => {
  if (providerSelect.value === 'auto') {
    detectAndSetLabel();
  }
});

// initialize label state
if (providerSelect.value === 'auto') {
  apiKeyInput.placeholder = 'Paste your API key (Gemini, Groq, or OpenAI)';
  detectAndSetLabel();
}

// ── Form submit handler ─────────────────────────────────────
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const repo     = document.getElementById('repoUrl').value.trim();
  const provider = document.getElementById('provider').value;
  const key      = apiKeyInput.value.trim();
  const branch   = document.getElementById('branch').value.trim() || 'main';
  const only     = document.getElementById('onlyExt').value.trim();
  const skip     = document.getElementById('skipDirs').value.trim();
  const skipPush = document.getElementById('skipPush').checked;

  // show progress UI
  showProgress(repo);

  // build SSE URL with query params
  const params = new URLSearchParams({ repo, provider, key, branch, only, skip, skipPush });
  const eventSource = new EventSource(`/api/annotate?${params}`);

  let totalFiles = 0;
  let doneFiles  = 0;

  eventSource.onmessage = (e) => {
    const data = JSON.parse(e.data);

    switch (data.type) {

      case 'step':
        // activate the current step indicator
        activateStep(data.step);
        addLog(data.message, 'step');
        break;

      case 'ok':
        // mark step as done
        completeStep(data.step);
        addLog(data.message, 'ok');
        // if we got the file count, show the progress bar
        if (data.total !== undefined) {
          totalFiles = data.total;
          progressBarWrap.classList.remove('hidden');
          progressCount.textContent = `0 / ${totalFiles}`;
        }
        break;

      case 'progress':
        // update current file being processed
        activateStep(3);
        addLog(`  → ${data.file} (${data.language})`, 'prog');
        progressLabel.textContent = `Annotating: ${data.file}`;
        break;

      case 'file_done':
        // update progress bar after each file completes
        doneFiles = data.current;
        const pct = Math.round((doneFiles / totalFiles) * 100);
        progressFill.style.width = pct + '%';
        progressCount.textContent = `${doneFiles} / ${totalFiles}`;
        addLog(`  ✓ done`, 'ok');
        break;

      case 'warn':
        addLog(data.message, 'warn');
        break;

      case 'error':
        addLog(data.message, 'err');
        showResult(data.message, 'error');
        eventSource.close();
        showBackBtn();
        break;

      case 'done':
        // all finished!
        completeStep(5);
        progressTitle.textContent = '✅ Complete!';
        progressFill.style.width = '100%';
        addLog('─'.repeat(40), 'dim');
        addLog(data.message, 'ok');
        showResult(data.message, 'success');
        eventSource.close();
        showBackBtn();
        break;
    }
  };

  eventSource.onerror = () => {
    addLog('Connection lost. Check the server.', 'err');
    showResult('Connection error. Is the server running?', 'error');
    eventSource.close();
    showBackBtn();
  };
});

// ── UI helpers ──────────────────────────────────────────────

function showProgress(repo) {
  formCard.classList.add('hidden');
  progressCard.classList.remove('hidden');
  terminalBody.innerHTML = '';
  resultEl.classList.add('hidden');
  backBtn.classList.add('hidden');
  repoPill.textContent = repo.replace('https://github.com/', '').replace('.git', '');
  // reset all steps
  document.querySelectorAll('.step').forEach(s => {
    s.classList.remove('active', 'done');
  });
  progressFill.style.width = '0%';
}

function activateStep(stepNum) {
  // set all previous steps as done, current as active
  document.querySelectorAll('.step').forEach(s => {
    const n = parseInt(s.dataset.step);
    if (n < stepNum)  s.classList.add('done'),   s.classList.remove('active');
    if (n === stepNum) s.classList.add('active'), s.classList.remove('done');
    if (n > stepNum)  s.classList.remove('active', 'done');
  });
}

function completeStep(stepNum) {
  document.querySelectorAll('.step').forEach(s => {
    const n = parseInt(s.dataset.step);
    if (n <= stepNum) s.classList.add('done'), s.classList.remove('active');
  });
}

function addLog(message, type = 'dim') {
  // remove placeholder text
  const placeholder = terminalBody.querySelector('.t-dim');
  if (placeholder && placeholder.textContent === 'Waiting for output...') {
    placeholder.remove();
  }

  const line = document.createElement('div');
  line.className = `t-line t-${type}`;

  // add a timestamp prefix
  const now  = new Date();
  const time = now.toTimeString().slice(0, 8); // HH:MM:SS
  line.innerHTML = `<span class="t-dim" style="user-select:none">${time}</span><span>${escapeHtml(message)}</span>`;

  terminalBody.appendChild(line);
  // auto-scroll to bottom
  terminalBody.scrollTop = terminalBody.scrollHeight;
}

function showResult(message, type) {
  resultEl.className = `result ${type}`;
  resultEl.textContent = message;
  resultEl.classList.remove('hidden');
}

function showBackBtn() {
  backBtn.classList.remove('hidden');
  submitBtn.disabled = false;
  btnText.textContent = '✨ Annotate Repo';
}

function resetForm() {
  formCard.classList.remove('hidden');
  progressCard.classList.add('hidden');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
