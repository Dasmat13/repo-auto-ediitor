# 🤖 Repo Auto-Editor

> Give it **any GitHub repo URL** — it automatically annotates every code file with beginner-friendly inline comments and generates structured study notes. Powered by **Gemini AI**.

Supports **any programming language**: JavaScript, TypeScript, Python, Go, Rust, Java, C, C++, C#, PHP, Ruby, Shell, Swift, Kotlin, Dart, SQL, YAML, HTML, CSS, and more.

---

## ✨ What it does

1. **Clones** your GitHub repo to a temp folder
2. **Scans** every code file (any language, skips node_modules/.git/binaries)
3. **Annotates** each file — adds an inline comment on EVERY line (logic never changed)
4. **Generates** a `notes/filename.md` for each file with:
   - 🔑 Key Concepts table
   - 📌 Must-Know Points
   - 🐛 Bugs found (what / how / when / fix)
   - 🎤 Interview Questions & Answers
5. **Creates** `notes/README.md` — a master index of all notes
6. **Commits & pushes** everything back to your repo

---

## 🚀 Setup

### 1. Clone this tool
```bash
git clone https://github.com/Dasmat13/repo-auto-ediitor.git
cd repo-auto-ediitor
npm install
```

### 2. Get a Gemini API key (free)
→ https://aistudio.google.com/app/apikey

### 3. Add your key
```bash
cp .env.example .env
# edit .env and add your key:
# GEMINI_API_KEY=your_key_here
```

---

## 💻 Usage

```bash
# Annotate an entire repo (all languages)
node index.js --repo https://github.com/yourname/your-repo.git

# Only annotate Python files
node index.js --repo https://github.com/yourname/repo.git --only .py

# Skip specific folders
node index.js --repo https://github.com/yourname/repo.git --skip "tests,docs"

# Annotate but DON'T push (preview locally first)
node index.js --repo https://github.com/yourname/repo.git --skip-push

# Push to a different branch
node index.js --repo https://github.com/yourname/repo.git --branch dev

# Pass API key directly (no .env needed)
node index.js --repo https://github.com/yourname/repo.git --key YOUR_KEY
```

---

## ⚙️ Options

| Flag | Description | Default |
|------|-------------|---------|
| `-r, --repo <url>` | GitHub repo URL **(required)** | — |
| `-k, --key <key>` | Gemini API key (or use `.env`) | — |
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

## 🌍 Supported Languages

| Language | Extensions |
|----------|-----------|
| JavaScript | `.js` `.mjs` `.cjs` `.jsx` |
| TypeScript | `.ts` `.tsx` |
| Python | `.py` `.pyw` |
| Go | `.go` |
| Rust | `.rs` |
| Java | `.java` |
| Kotlin | `.kt` `.kts` |
| C / C++ | `.c` `.h` `.cpp` `.cc` `.hpp` |
| C# | `.cs` |
| PHP | `.php` |
| Ruby | `.rb` |
| Shell | `.sh` `.bash` `.zsh` |
| Swift | `.swift` |
| Dart | `.dart` |
| SQL | `.sql` |
| YAML | `.yaml` `.yml` |
| HTML/CSS | `.html` `.css` `.scss` |
| + more | `.toml` `.json` `.r` `.scala` `.lua` |

---

## 👤 Author

**Dasmat Hansda** — [@Dasmat13](https://github.com/Dasmat13)

---

## 📄 License

MIT — free to use, modify, and share.
