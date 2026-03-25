import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';

export interface Keybinding {
  id: string;
  keys: string; // e.g. "cmd+t", "cmd+shift+d"
  description: string;
  action: (store: ReturnType<typeof useAppStore.getState>) => void;
}

export const DEFAULT_KEYBINDINGS: Keybinding[] = [
  { id: 'new-tab', keys: 'cmd+t', description: 'New tab', action: (s) => s.addTab('new-connection') },
  { id: 'close-tab', keys: 'cmd+w', description: 'Close tab', action: (s) => { if (s.activeTabId) s.closeTab(s.activeTabId); } },
  { id: 'command-palette', keys: 'cmd+k', description: 'Command palette', action: (s) => s.toggleCommandPalette() },
  { id: 'split-horizontal', keys: 'cmd+d', description: 'Split horizontal', action: (s) => s.cycleSplitHorizontal() },
  { id: 'split-vertical', keys: 'cmd+shift+d', description: 'Split vertical', action: (s) => s.cycleSplitVertical() },
  { id: 'notes', keys: 'cmd+shift+n', description: 'Toggle notes', action: (s) => s.toggleNotesSidebar() },
  { id: 'ai-chat', keys: 'cmd+l', description: 'AI chat', action: (s) => s.toggleAIChatSidebar() },
  { id: 'disconnect', keys: 'cmd+shift+x', description: 'Disconnect/Reconnect', action: (s) => {
    const tabId = s.paneTabIds[s.focusedPaneIndex];
    if (tabId) {
      const tab = s.tabs.find(t => t.id === tabId);
      if (tab?.connected) s.disconnectTab(tabId);
      else if (tab?.disconnectedAt) s.reconnectTab(tabId);
    }
  }},
  { id: 'memory', keys: 'cmd+shift+m', description: 'Memory timeline', action: (s) => s.setActiveModal(s.activeModal === 'memory-timeline' ? null : 'memory-timeline') },
  { id: 'broadcast', keys: 'cmd+shift+b', description: 'Broadcast mode', action: (s) => s.toggleBroadcast() },
  { id: 'sftp', keys: 'cmd+shift+f', description: 'SFTP sidebar', action: (s) => s.toggleSFTP() },
  { id: 'clipboard', keys: 'cmd+shift+v', description: 'AI clipboard', action: (s) => s.setActiveModal(s.activeModal === 'ai-clipboard' ? null : 'ai-clipboard') },
  { id: 'workspaces', keys: 'cmd+shift+s', description: 'Workspaces', action: (s) => s.setActiveModal(s.activeModal === 'workspaces' ? null : 'workspaces') },
  { id: 'settings', keys: 'cmd+,', description: 'Settings', action: (s) => s.toggleSettings() },
  { id: 'prev-tab', keys: 'cmd+shift+[', description: 'Previous tab', action: (s) => {
    const tabs = s.tabs;
    const idx = tabs.findIndex(t => t.id === s.activeTabId);
    if (idx > 0) s.setActiveTab(tabs[idx - 1].id);
    else if (tabs.length > 0) s.setActiveTab(tabs[tabs.length - 1].id);
  }},
  { id: 'next-tab', keys: 'cmd+shift+]', description: 'Next tab', action: (s) => {
    const tabs = s.tabs;
    const idx = tabs.findIndex(t => t.id === s.activeTabId);
    if (idx < tabs.length - 1) s.setActiveTab(tabs[idx + 1].id);
    else if (tabs.length > 0) s.setActiveTab(tabs[0].id);
  }},
];

function parseKeys(keys: string): { meta: boolean; shift: boolean; key: string } {
  const parts = keys.toLowerCase().split('+');
  return {
    meta: parts.includes('cmd') || parts.includes('ctrl'),
    shift: parts.includes('shift'),
    key: parts[parts.length - 1],
  };
}

function eventToKeyString(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.metaKey || e.ctrlKey) parts.push('cmd');
  if (e.shiftKey) parts.push('shift');
  parts.push(e.key.toLowerCase());
  return parts.join('+');
}

export function getKeybindings(): Keybinding[] {
  try {
    const overrides = JSON.parse(localStorage.getItem('void-keybindings') || '{}');
    return DEFAULT_KEYBINDINGS.map(kb => ({
      ...kb,
      keys: overrides[kb.id] || kb.keys,
    }));
  } catch {
    return DEFAULT_KEYBINDINGS;
  }
}

export function saveKeybindingOverride(id: string, keys: string): void {
  try {
    const overrides = JSON.parse(localStorage.getItem('void-keybindings') || '{}');
    overrides[id] = keys;
    localStorage.setItem('void-keybindings', JSON.stringify(overrides));
  } catch { /* ignore */ }
}

export function resetKeybinding(id: string): void {
  try {
    const overrides = JSON.parse(localStorage.getItem('void-keybindings') || '{}');
    delete overrides[id];
    localStorage.setItem('void-keybindings', JSON.stringify(overrides));
  } catch { /* ignore */ }
}

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useAppStore.getState();
      const bindings = getKeybindings();

      // Cmd+1-9 — Switch tab by position (special handling)
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < store.tabs.length) store.setActiveTab(store.tabs[idx].id);
        return;
      }

      // Escape — Close overlays
      if (e.key === 'Escape') {
        if (store.commandPaletteOpen) { e.preventDefault(); store.toggleCommandPalette(); }
        else if (store.settingsOpen) { e.preventDefault(); store.toggleSettings(); }
        return;
      }

      // Match against keybindings
      const eventKey = eventToKeyString(e);
      for (const kb of bindings) {
        if (kb.keys === eventKey) {
          e.preventDefault();
          kb.action(store);
          return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
