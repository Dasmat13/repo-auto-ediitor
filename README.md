# 🤖 Explain My Repo

> Give it **any GitHub repo URL** — it automatically annotates every code file with beginner-friendly inline comments and generates structured study notes. Supports **Gemini**, **Groq**, and **OpenAI**.

Supports **any programming language**: JavaScript, TypeScript, Python, Go, Rust, Java, C, C++, C#, PHP, Ruby, Shell, Swift, Kotlin, Dart, SQL, YAML, HTML, CSS, and more.

---

## ✨ Features

- **Multi-Provider Support**: Choose between Google Gemini, Groq (Llama 3/Mixtral - free & super fast), or OpenAI.
- **Web UI & CLI**: Run it through an elegant dark glassmorphism web panel or via raw terminal commands.
- **Pedagogical Annotations**: Adds a step-by-step explanatory comment to every single line.
- **Comprehensive Notes**: Creates a `notes/` folder in the target repo containing key concepts, interview Q&As, and bug trackers.
- **Automatic GitHub Push**: Commits and pushes the generated notes and annotations back to your repo automatically.

---

## 🚀 Setup

### 1. Clone this tool
```bash
git clone https://github.com/Dasmat13/explain-my-repo.git
cd explain-my-repo
npm install
```

### 2. Configure API Keys
Copy `.env.example` to `.env` and fill in whichever API key you want to use:
```bash
cp .env.example .env
```
- **Gemini Key** (Free): [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Groq Key** (Free & Fast): [Groq Console](https://console.groq.com/keys)
- **OpenAI Key** (Paid): [OpenAI Platform](https://platform.openai.com/api-keys)

---

## 💻 Usage

### Option A: Web User Interface (Recommended)
Start the local server:
```bash
npm run web
```
Open **`http://localhost:3000`** in your browser. Select your preferred provider, paste your repo URL, enter your API key (or leave blank if it's set in `.env`), and run it with live SSE tracking!

---

### Option B: Command Line Interface (CLI)

```bash
# Annotate using Groq (Llama 3.3) - fast and free
node index.js --provider groq --repo https://github.com/yourname/your-repo.git

# Annotate using Gemini (Default)
node index.js --provider gemini --repo https://github.com/yourname/your-repo.git

# Only annotate Python files
node index.js --provider groq --repo https://github.com/yourname/your-repo.git --only .py

# Skip specific folders
node index.js --provider groq --repo https://github.com/yourname/your-repo.git --skip "tests,docs"

# Annotate but DON'T push (preview locally first)
node index.js --provider groq --repo https://github.com/yourname/your-repo.git --skip-push
```

---

## ⚙️ CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `-r, --repo <url>` | GitHub repo URL **(required)** | — |
| `-p, --provider <name>`| AI provider: `gemini`, `groq`, or `openai` | `gemini` |
| `-k, --key <key>` | AI provider API key (or use `.env`) | — |
| `-b, --branch <name>` | Branch to push to | `main` |
| `--only <ext>` | Only annotate this extension (e.g. `.py`) | all |
| `--skip <dirs>` | Extra dirs to skip, comma-separated | — |
| `--skip-push` | Don't push — just annotate locally | false |

---

## 📁 Output Structure

After running, your target repo will look like:

```
your-repo/
├── src/
│   ├── app.js          ← now has inline comments on every line
│   └── utils.py        ← same for every language
├── notes/
│   ├── README.md       ← master index of all notes
│   ├── src_app.md      ← key concepts, bugs, interview Q&A for app.js
│   └── src_utils.md    ← same for utils.py
└── ...
```

---

## 📄 License

MIT — free to use, modify, and share.
