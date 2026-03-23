import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../stores/app-store';
import type { CommandAction } from '../types';

const PRO_ACTIONS = new Set([
  'toggle-notes', 'toggle-ai', 'broadcast', 'workspaces', 'tunnels',
  'watch-rules', 'audit-log', 'memory-timeline', 'scheduled-tasks',
]);

export function CommandPalette() {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleCommandPalette = useAppStore((s) => s.toggleCommandPalette);
  const isPro = useAppStore((s) => s.isPro);

  const store = useAppStore.getState();

  const actions: CommandAction[] = useMemo(() => {
    const items: CommandAction[] = [
      {
        id: 'new-ssh',
        label: 'New SSH connection',
        shortcut: '\u2318N',
        category: 'Connection',
        action: () => store.addTab('new-connection'),
      },
      {
        id: 'new-local',
        label: 'New local shell',
        category: 'Connection',
        action: () => {
          const id = store.addTab('local');
          window.void.pty.create().then((r) => {
            if (r.success && r.sessionId) {
              useAppStore.getState().updateTab(id, {
                sessionId: r.sessionId,
                connected: true,
                lastActivity: Date.now(),
              });
            }
          });
        },
      },
      {
        id: 'split-h',
        label: 'Split pane horizontal',
        shortcut: '\u2318D',
        category: 'Layout',
        action: () => store.cycleSplitHorizontal(),
      },
      {
        id: 'split-v',
        label: 'Split pane grid',
        shortcut: '\u2318\u21e7D',
        category: 'Layout',
        action: () => store.cycleSplitVertical(),
      },
      {
        id: 'toggle-notes',
        label: 'Toggle notes sidebar',
        shortcut: '\u2318\u21e7N',
        category: 'View',
        action: () => store.toggleNotesSidebar(),
      },
      {
        id: 'toggle-ai',
        label: 'Toggle AI chat',
        shortcut: '\u2318L',
        category: 'View',
        action: () => store.toggleAIChatSidebar(),
      },
      {
        id: 'settings',
        label: 'Open settings',
        shortcut: '\u2318,',
        category: 'App',
        action: () => store.toggleSettings(),
      },
      {
        id: 'close-tab',
        label: 'Close current tab',
        shortcut: '\u2318W',
        category: 'Tab',
        action: () => {
          if (store.activeTabId) store.closeTab(store.activeTabId);
        },
      },
    ];

    // Add saved connections as quick-connect actions
    store.savedConnections.forEach((conn) => {
      items.push({
        id: `connect-${conn.id}`,
        label: `Connect: ${conn.alias}`,
        category: 'Saved',
        action: () => {
          const tabId = store.addTab('ssh');
          window.void.ssh
            .connect({
              host: conn.host,
              port: conn.port,
              username: conn.username,
              authMethod: conn.authMethod,
              privateKeyPath: conn.privateKeyPath,
              keepAlive: conn.keepAlive,
              keepAliveInterval: conn.keepAliveInterval,
              autoReconnect: conn.autoReconnect,
            })
            .then((r) => {
              if (r.success && r.sessionId) {
                useAppStore.getState().updateTab(tabId, {
                  sessionId: r.sessionId,
                  connected: true,
                  title: conn.alias,
                  lastActivity: Date.now(),
                });
              }
            });
        },
      });
    });

    // Add open tabs for switching
    store.tabs.forEach((tab) => {
      items.push({
        id: `tab-${tab.id}`,
        label: `Switch to: ${tab.title}`,
        category: 'Tab',
        action: () => store.setActiveTab(tab.id),
      });
    });

    return items;
  }, [store]);

  const filtered = useMemo(() => {
    if (!query) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) => a.label.toLowerCase().includes(q) || a.category.toLowerCase().includes(q),
    );
  }, [query, actions]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        toggleCommandPalette();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      toggleCommandPalette();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) toggleCommandPalette();
      }}
    >
      <div className="w-full max-w-[480px] bg-void-base border border-void-border rounded-void-2xl shadow-2xl animate-palette-in overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-void-border">
          <span className="text-void-text-ghost text-sm">&#128269;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="flex-1 bg-transparent text-base text-void-text placeholder:text-void-text-dim outline-none"
          />
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-1">
          {filtered.map((action, i) => (
            <div
              key={action.id}
              className={`flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors ${
                i === selectedIndex
                  ? 'bg-void-surface text-void-text'
                  : 'text-void-text-muted hover:bg-void-surface/50'
              }`}
              onClick={() => {
                action.action();
                toggleCommandPalette();
              }}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <span className="text-sm flex items-center gap-1.5">
                {action.label}
                {!isPro && PRO_ACTIONS.has(action.id) && (
                  <span className="text-[8px] font-mono font-bold text-accent bg-accent-glow border-[0.5px] border-accent-dim px-1.5 py-[1px] rounded-[3px]">PRO</span>
                )}
              </span>
              {action.shortcut && (
                <span className="text-2xs text-void-text-ghost font-mono">{action.shortcut}</span>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-void-text-ghost">
              No matching commands
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
