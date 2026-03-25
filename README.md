# VOID TERMINAL

**The terminal that thinks.**

An AI-powered SSH terminal client for macOS and Windows. 70+ features. Built with Electron, React, and xterm.js.

![Void Terminal](https://img.shields.io/badge/version-1.0.0-F97316?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-28C840?style=flat-square) ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-5B9BD5?style=flat-square)

**[Download](https://github.com/weigibbor/Void-Terminal/releases/tag/v1.0.0)** · **[Website](https://voidterminal.dev)**

---

## Features

### Core Terminal
- **Multi-tab system** — SSH, local shell, browser panes, settings as tabs
- **Tab colors + tear-off** — Color-code tabs, drag out to new window
- **Flexible split views** — 2-col, 3-col, 2+1 grid with draggable dividers
- **SSH connections** — Password and key auth, keep-alive, auto-reconnect
- **Jump host / bastion** — SSH through proxy servers (2-hop via forwardOut)
- **SSH agent forwarding** — Forward local SSH keys to remote
- **SSH config import** — Auto-detect and import from `~/.ssh/config`
- **Quick connect** — Type `user@host` in command palette to connect instantly
- **Smart paste** — Detects multi-line paste, asks before executing
- **Clickable links** — URLs and IPs in terminal output are clickable
- **Tab pinning** — Pin tabs to prevent accidental close
- **Terminal notifications** — Native OS notifications when long commands finish

### Files & SFTP
- **Dual-pane SFTP** — Local ↔ remote side-by-side (FileZilla-style)
- **Drag-drop upload** — Drop files onto terminal, pick remote destination
- **Batch operations** — Multi-select files with Cmd+Click, bulk download/delete
- **File preview** — Double-click to preview text/images without downloading
- **Folder sync** — One-click sync between local and remote directories
- **Dotfile manager** — Quick-access to .bashrc, .zshrc, .ssh/config for editing
- **Archive manager** — Create/extract .zip/.tar.gz on remote servers

### Productivity
- **Command palette** — `Cmd+K` with fuzzy search, quick connect, bookmarks
- **Command bookmarks** — Star commands per server, access from palette
- **Snippet variables** — Use `${host}`, `${user}`, `${port}` in saved snippets
- **Connection groups** — Organize servers into collapsible folders
- **Session recording** — Record and replay terminal sessions
- **Pinned notes** — Per-server notes with types (pinned, warning, quickref)
- **Output search** — `Cmd+F` with regex support
- **Startup commands** — Auto-run commands on SSH connect

### Customization
- **Themes** — Dark, Light, Midnight presets with CSS variable switching
- **Custom keyboard shortcuts** — Click-to-rebind in settings
- **Connection templates** — Pre-configured setups for common server types

### AI Features (Pro · BYOK)
- **Natural language commands** — Type `?` prefix, get exact terminal command
- **AI chat sidebar** — Ask about your server, commands, errors

### Server Management (Pro)
- **Server dashboard** — Live CPU, RAM, disk with circular progress rings
- **Docker integration** — List containers, start/stop/restart, view logs
- **Process monitor** — htop-like view with sortable process table
- **Log tail viewer** — Color-coded log levels, search, filter
- **Cron job viewer** — Visual schedule from `crontab -l`
- **Multi-server runner** — Run commands across multiple servers in parallel
- **Connection health** — Track uptime, connection history, reliability %
- **Network monitor** — Active connections, listening ports
- **SSH tunnel manager** — Visual LOCAL/REMOTE/DYNAMIC tunnel management
- **Broadcast mode** — Type once, execute across all panes

### Security
- **Encrypted backups** — AES-256-GCM encrypted connection backup/restore
- **Team sharing** — Export/import connections with encrypted passwords
- **SSH key manager** — Generate ed25519/RSA keys
- **SSL cert checker** — Monitor certificate expiry
- **2FA app lock** — Password/biometric to open the app
- **Encrypted storage** — Passwords encrypted at rest

### Collaboration (Teams)
- **Referral system** — Invite friends, both get 30 days free Pro
- **Team activity feed** — See who connected where and when
- **Shared snippets** — Team-wide command library
- **Alert webhooks** — POST to any URL on Watch & Alert triggers

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
# Clone
git clone https://github.com/weigibbor/Void-Terminal.git
cd Void-Terminal

# Install dependencies
npm install

# Rebuild native modules for Electron
npx @electron/rebuild

# Start development
npm run dev
```

## Build

```bash
# macOS DMG + ZIP
npm run dist:mac

# Windows NSIS installer
npm run dist:win

# Both platforms
npm run dist
```

## Keyboard Shortcuts

All shortcuts are customizable in Settings.

| Shortcut | Action |
|----------|--------|
| `Cmd+T` | New tab |
| `Cmd+W` | Close tab |
| `Cmd+K` | Command palette |
| `Cmd+D` | Split horizontal |
| `Cmd+Shift+D` | Split grid |
| `Cmd+Shift+N` | Notes sidebar |
| `Cmd+Shift+F` | SFTP sidebar |
| `Cmd+L` | AI chat sidebar |
| `Cmd+,` | Settings (opens as tab) |
| `Cmd+1-9` | Switch tab by position |
| `Cmd+F` | Search terminal output |

## Architecture

```
src/
  main/              # Electron main process
    index.ts          # App entry, 50+ IPC handlers
    preload.ts        # Context bridge (window.void API)
    ssh-manager.ts    # SSH connections, exec, jump host
    pty-manager.ts    # Local shell PTY
    tunnel-manager.ts # Port forwarding
    memory-store.ts   # SQLite (bookmarks, recordings, health)
    connection-store.ts # Encrypted connection storage
    utils/
      crypto.ts       # AES-256-GCM encryption
      ssh-config-parser.ts # ~/.ssh/config parser
  renderer/           # React frontend
    components/       # 30+ components
    components/pro/   # Pro feature components
    hooks/            # useTerminal, useSSH, useKeyboard
    stores/           # Zustand global state
```

All data stays local. SQLite at `~/.void/memory/memory.db`. Connections at `~/.void/connections.json` (encrypted passwords).

## Pricing

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 35+ features, 10 connections, 20 snippets |
| Pro | $12/mo | AI, Docker, monitoring, tunnels, recording |
| Teams | $8/user/mo | Activity feed, shared snippets, analytics |
| Enterprise | Custom | Self-hosted, white-label, SSO |

## Contributing

PRs welcome for free-tier features, UI improvements, and bug fixes.

## License

MIT - See [LICENSE](LICENSE) for details.

---

**Built in the Philippines. Made for the world.**

*GE Labs - 2026*
