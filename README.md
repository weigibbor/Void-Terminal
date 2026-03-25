# VOID TERMINAL

**AI that sees your terminal.**

Fix errors, run commands, diagnose servers — without leaving your terminal. The AI reads your output, suggests fixes, and executes them in one click.

![Void Terminal](https://img.shields.io/badge/version-1.1.0-F97316?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-28C840?style=flat-square) ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-5B9BD5?style=flat-square) ![Features](https://img.shields.io/badge/features-70%2B-C586C0?style=flat-square)

**[Download](https://github.com/weigibbor/Void-Terminal/releases/tag/v1.1.0)** · **[Website](https://voidterminal.dev)**

---

## AI Chat — The Core Feature

An AI assistant **embedded inside your terminal** that sees everything you see.

### How it works
```
1. You run a command → error appears in terminal
2. Open AI Chat → type "fix this" (or just click "Fix error" button)
3. AI already knows the error — it reads your last 50 lines automatically
4. AI explains the problem + suggests a fix command
5. Click "Insert" to paste it, or "Run" to execute immediately
6. Done. No copy-pasting to ChatGPT. No context switching.
```

### Features
- **Context-aware** — AI sees your terminal output. No copy-paste needed.
- **Code blocks with actions** — Every command suggestion has `Copy` | `Insert` | `Run` buttons
- **Slash commands** — `/fix`, `/explain`, `/diagnose`, `/deploy`, `/security`, `/optimize`
- **Quick prompts** — One-click: "Fix error", "Explain", "Disk usage", "Services"
- **BYOK** — Bring your own API key. Claude, GPT-4o, Gemini, or Ollama (fully offline)
- **Zero background cost** — AI does nothing until you ask. No wasted tokens.
- **Your data stays local** — Terminal context never stored. Only sent when you message.

### Why not just use ChatGPT?

| | Void Terminal AI | ChatGPT in browser |
|---|:---:|:---:|
| Sees terminal context | Automatically | Copy-paste manually |
| Insert command to terminal | One click | Copy → switch → paste |
| Run command directly | One click | Not possible |
| Works offline | Yes (Ollama) | No |
| Privacy | Data stays local | Sent to cloud |
| Knows your server | Yes | No |

---

## 70+ Features

### Core Terminal
- **Multi-tab** — SSH, local shell, browser panes, settings as tabs
- **Tab colors + tear-off** — Color-code by environment, drag to new window
- **Split views** — 2-col, 3-col, 2+1 grid with draggable dividers
- **Jump host / bastion** — SSH through proxy servers
- **SSH agent forwarding** — Forward local keys to remote
- **SSH config import** — Auto-import from `~/.ssh/config`
- **Quick connect** — Type `user@host` in Cmd+K to connect instantly
- **Smart paste** — Detects multi-line, asks before executing
- **Clickable links** — URLs in terminal are clickable
- **Tab pinning** — Prevent accidental close
- **Notifications** — Native OS alerts when long commands finish
- **3 themes** — Dark, Light, Midnight + community themes (Nord, Dracula, Solarized, Monokai)
- **Custom shortcuts** — Click-to-rebind every keyboard shortcut

### Files & SFTP
- **Dual-pane SFTP** — Local ↔ remote side-by-side
- **Drag-drop upload** — Drop files on terminal, pick destination
- **Batch operations** — Cmd+Click to multi-select, bulk download/delete
- **File preview** — Double-click to preview text/images
- **Code editor** — Line numbers, syntax detection, save to remote
- **File diff** — Side-by-side comparison with color-coded changes
- **Folder sync** — One-click local ↔ remote sync
- **Dotfile manager** — Quick edit .bashrc, .zshrc, .ssh/config

### Productivity
- **Command palette** — Cmd+K with 29 tools, quick connect, bookmarks
- **Command bookmarks** — Star commands per server
- **Snippet variables** — `${host}`, `${user}`, `${port}` auto-fill
- **Connection groups** — Organize into folders
- **Session recording** — Record and replay sessions
- **Migration wizard** — Import from SSH config, iTerm2, Termius
- **Interactive tutorial** — 8-step guided onboarding

### Server Management (Pro)
- **Server dashboard** — Live CPU, RAM, disk with progress rings
- **Docker integration** — Container list, start/stop/restart, logs
- **Kubernetes panel** — Context/namespace switch, pod list, logs
- **Process monitor** — htop-like view, sortable, kill process
- **Log tail viewer** — Color-coded levels, search, filter
- **Cron viewer** — Visual schedule from crontab
- **Multi-server runner** — Parallel exec across servers
- **Network monitor** — Connections, ports, bandwidth
- **Disk usage map** — Treemap visualization, drill-down
- **Nginx viewer** — Virtual hosts with SSL status
- **SSH tunnel manager** — Visual LOCAL/REMOTE/DYNAMIC
- **Broadcast mode** — Type once, run everywhere
- **Connection health** — Uptime, reliability %, history

### Security
- **Encrypted backups** — AES-256-GCM connection backup/restore
- **Team sharing** — Export/import with encrypted passwords
- **SSH key manager** — Generate ed25519/RSA keys
- **SSL cert checker** — Monitor certificate expiry
- **Alert webhooks** — POST to Slack/Discord on alerts

### Collaboration (Teams)
- **Collaborative terminal** — Share session link (preview)
- **Team activity feed** — Who connected where and when
- **Usage analytics** — Connection stats, 7-day chart
- **Referral system** — Invite friends, both get 30 days Pro

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 33 |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 3.4 |
| State | Zustand 5 |
| Terminal | xterm.js 5.5 |
| SSH | ssh2 1.16 |
| Local Shell | node-pty 1.0 |
| Database | better-sqlite3 11 |
| Bundler | Vite 6 |
| Builder | electron-builder 25 |

## Quick Start

```bash
git clone https://github.com/weigibbor/Void-Terminal.git
cd Void-Terminal
npm install
npx @electron/rebuild
npm run dev
```

## Keyboard Shortcuts

All customizable in Settings.

| Shortcut | Action |
|----------|--------|
| `Cmd+T` | New tab |
| `Cmd+W` | Close tab |
| `Cmd+K` | Command palette (29 tools) |
| `Cmd+D` | Split view |
| `Cmd+L` | AI Chat sidebar |
| `Cmd+Shift+F` | SFTP sidebar |
| `Cmd+Shift+N` | Notes sidebar |
| `Cmd+,` | Settings |
| `Cmd+1-9` | Switch tab |

## Pricing

| Tier | Price | Highlights |
|------|-------|-----------|
| Free | $0 forever | 35+ features, terminal, SFTP, themes, backups |
| Pro | $12/mo | AI Chat, Docker, monitoring, tunnels, recording |
| Teams | $8/user/mo | Activity feed, shared snippets, analytics |
| Enterprise | Custom | Self-hosted, white-label, SSO |

## Architecture

```
src/
  main/              # Electron main process
    ssh-manager.ts    # SSH, exec, jump host, agent forwarding
    tunnel-manager.ts # Port forwarding
    memory-store.ts   # SQLite (bookmarks, recordings, health)
    utils/crypto.ts   # AES-256-GCM encryption
  renderer/
    components/       # 40+ React components
    components/pro/   # 29 Pro tools
    hooks/            # useTerminal, useSSH, useKeyboard
```

All data stays local. SQLite at `~/.void/memory/memory.db`. Connections at `~/.void/connections.json`.

## Contributing

PRs welcome. Free-tier features, UI improvements, bug fixes.

## License

MIT — See [LICENSE](LICENSE)

---

**Built in the Philippines. Made for the world.**

*GE Labs · 2026*
