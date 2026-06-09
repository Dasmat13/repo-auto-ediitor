<div align="center">

# 🤖 Explain My Repo

**AI-powered code annotation tool — point it at any GitHub repo and watch every line get explained.**

[![MIT License](https://img.shields.io/badge/License-MIT-violet?style=flat-square)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![Gemini](https://img.shields.io/badge/Gemini-1.5--flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://aistudio.google.com)
[![Groq](https://img.shields.io/badge/Groq-Llama--3.3-E8C97E?style=flat-square)](https://console.groq.com)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o--mini-10B981?style=flat-square&logo=openai&logoColor=white)](https://platform.openai.com)

<br/>

> Give it **any GitHub repo URL** — it auto-annotates every code file with beginner-friendly inline comments and generates structured study notes with key concepts, interview Q&As, and bug analysis.

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🌐 **Web UI + CLI** | Glassmorphic web console with real-time SSE progress **or** classic terminal CLI |
| 🤖 **Multi-Provider AI** | Auto-detects provider from your API key — supports Gemini, Groq & OpenAI |
| 💬 **Inline Annotations** | Every single line of code gets a clear, beginner-friendly explanation |
| 📓 **Study Notes** | Generates a `notes/` folder with key concepts, bug tracker & interview Q&As per file |
| 🔁 **Auto Push** | Commits and pushes annotated files + notes back to your GitHub repo |
| 🧠 **20+ Languages** | JS, TS, Python, Go, Rust, Java, C/C++, C#, PHP, Ruby, Swift, Kotlin, Dart, SQL, and more |
| 🔑 **Key Validator** | Built-in diagnostic tool to test your API key before running |
| ⚡ **Free Tier Ready** | Use Groq (Llama 3.3) for fast, high-quality annotations at **zero cost** |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/Dasmat13/explain-my-repo.git
cd explain-my-repo
npm install
```

### 2. Add Your API Key

Copy the example env file and add your key:

```bash
cp .env.example .env
```

Then open `.env` and fill in **one** of these:

```env
GEMINI_API_KEY=AIza...          # Free — Google AI Studio
GROQ_API_KEY=gsk_...            # Free & Fast — Groq Console
OPENAI_API_KEY=sk-proj-...      # Paid — OpenAI Platform
```

| Provider | Speed | Cost | Model | Get Key |
|---|---|---|---|---|
| **Groq** | ⚡ Fastest | Free | `llama-3.3-70b-versatile` | [console.groq.com](https://console.groq.com/keys) |
| **Gemini** | 🚀 Fast | Free | `gemini-1.5-flash` | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **OpenAI** | 🎯 Precise | Paid | `gpt-4o-mini` | [platform.openai.com](https://platform.openai.com/api-keys) |

---

## 💻 Usage

### Option A — Web UI *(Recommended)*

```bash
npm run web
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

- Paste any GitHub repo URL (or click a suggestion)
- Select your AI provider — the target model auto-detects
- Paste your API key and click **⚡ Test Key** to validate
- Hit **✨ Annotate Repo** and watch real-time progress stream in

---

### Option B — CLI

```bash
# Annotate with Groq (free & fast)
node index.js --provider groq --repo https://github.com/yourname/repo.git

# Annotate with Gemini
node index.js --provider gemini --repo https://github.com/yourname/repo.git

# Only annotate Python files
node index.js --provider groq --repo https://github.com/yourname/repo.git --only .py

# Skip specific folders
node index.js --provider groq --repo https://github.com/yourname/repo.git --skip "tests,docs"

# Preview locally without pushing to GitHub
node index.js --provider groq --repo https://github.com/yourname/repo.git --skip-push
```

---

## ⚙️ CLI Options

| Flag | Description | Default |
|---|---|---|
| `-r, --repo <url>` | GitHub repo URL **(required)** | — |
| `-p, --provider <name>` | AI provider: `gemini`, `groq`, or `openai` | `auto` |
| `-k, --key <key>` | API key (overrides `.env`) | — |
| `-b, --branch <name>` | Branch to push annotated files to | `main` |
| `--only <ext>` | Only annotate files with this extension (e.g. `.py`) | all |
| `--skip <dirs>` | Comma-separated list of directories to skip | — |
| `--skip-push` | Annotate locally only — don't push to GitHub | `false` |

---

## 📁 Output Structure

After running, your **target repo** will look like this:

```
your-repo/
├── src/
│   ├── app.js          ← every line now has an AI-generated comment
│   └── utils.py        ← same treatment for every language
├── notes/
│   ├── README.md       ← master index of all generated notes
│   ├── src_app.md      ← key concepts, bugs, interview Q&A for app.js
│   └── src_utils.md    ← same for utils.py
└── ...
```

Each `notes/*.md` file contains:
- 📌 **Key Concepts** — what the file does and how it works
- 🐛 **Bug Tracker** — potential issues spotted by the AI
- 🎤 **Interview Q&A** — questions you could be asked about this code

---

## 🗂️ Project Structure

```
explain-my-repo/
├── index.js          ← CLI entry point
├── server.js         ← Express web server + SSE streaming
├── src/
│   ├── ai.js         ← unified AI provider abstraction (Gemini/Groq/OpenAI)
│   ├── annotator.js  ← core annotation engine
│   ├── notes.js      ← study notes generator
│   └── utils.js      ← language detection, file filters
├── public/
│   ├── index.html    ← glassmorphic web UI (landing + console)
│   └── app.js        ← frontend JS (SSE handling, form logic)
├── .env.example      ← environment variable template
└── package.json
```

---

## 📄 License

MIT — free to use, modify, and share.

---

<div align="center">

Built by [Dasmat13](https://github.com/Dasmat13) · Powered by **Gemini, Groq & OpenAI**

</div>
