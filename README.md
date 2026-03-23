# VOID TERMINAL

**The terminal that thinks.**

An AI-powered SSH terminal client for macOS and Windows. Built with Electron, React, and xterm.js.

![Void Terminal](https://img.shields.io/badge/version-1.0.0-F97316?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-28C840?style=flat-square) ![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-5B9BD5?style=flat-square)

---

## Features

### Core Terminal
- **Multi-tab system** — SSH, local shell, and browser panes in tabs
- **Flexible split views** — 2-col, 3-col, 2+1 grid, 1+2 grid with draggable dividers
- **SSH connections** — Password and key auth, keep-alive heartbeat, auto-reconnect with exponential backoff
- **Local shell** — Auto-detects zsh (macOS) or PowerShell (Windows)
- **Auto-save connections** — Connect once, one-click reconnect forever
- **Command palette** — `Cmd+K` with fuzzy search across all actions
- **Browser pane** — Chromium webview in any tab or split pane

### Productivity
- **Pinned notes** — Per-server and global scope with note types (pinned, warning, quickref)
- **Command snippets** — Save and run frequently used commands
- **Output search** — `Cmd+F` with regex and case-sensitive search
- **SFTP sidebar** — Visual file browser for connected servers
- **Session recording** — Record and replay terminal sessions

### AI Features (Pro)
- **AI error explainer** — Auto-explains errors and suggests fix commands
- **AI danger detection** — Intercepts destructive commands before execution
- **AI autocomplete** — Ghost text command prediction based on context
- **Natural language commands** — Type in English, get the exact terminal command
- **AI chat sidebar** — Query your terminal history in natural language
- **Memory timeline** — Visual timeline of all events, filterable by type
- **Security scanner** — Scan configs for vulnerabilities

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
# Package (no distribute)
npm run pack

# macOS DMG + ZIP
npm run dist:mac

# Windows NSIS installer
npm run dist:win

# Both platforms
npm run dist
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+T` | New tab |
| `Cmd+W` | Close tab |
| `Cmd+K` | Command palette |
| `Cmd+D` | Split horizontal (cycle) |
| `Cmd+Shift+D` | Split grid (cycle) |
| `Cmd+Shift+N` | Toggle notes sidebar |
| `Cmd+L` | AI chat sidebar |
| `Cmd+,` | Settings |
| `Cmd+1-9` | Switch tab by position |
| `Cmd+F` | Search terminal output |
| `Escape` | Close overlay |

## Architecture

```
src/
  main/           # Electron main process
    index.ts       # App entry, IPC handlers
    preload.ts     # Context bridge (window.void API)
    ssh-manager.ts # SSH connections
    pty-manager.ts # Local shell PTY
    pro-bridge.ts  # Dynamic import bridge to @void/pro
    memory-store.ts # SQLite database
  renderer/        # React frontend
    components/    # Free feature components
    components/pro/ # Pro-gated feature shells
    hooks/         # React hooks (useTerminal, useSSH, etc.)
    stores/        # Zustand global state
```

All data stays local. SQLite at `~/.void/memory/memory.db`. Connections at `~/.void/connections.json`.

## Pro Features

Void Terminal works as a complete free terminal. Pro features (AI, tunnels, broadcast, workspaces, etc.) unlock when the `@void/pro` package is installed and a license key is activated.

Free tier limits: 10 saved connections, 20 command snippets.

## Contributing

PRs welcome for free-tier features, UI improvements, and bug fixes. See the component structure in `src/renderer/components/`.

## License

MIT - See [LICENSE](LICENSE) for details.

---

**Built in the Philippines. Made for the world.**

*GE Tech - 2026*
