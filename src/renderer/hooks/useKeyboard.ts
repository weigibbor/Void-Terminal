import { useEffect } from 'react';
import { useAppStore } from '../stores/app-store';

export function useKeyboard() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      const shift = e.shiftKey;
      const store = useAppStore.getState();

      // Cmd+T — New tab
      if (meta && !shift && e.key === 't') {
        e.preventDefault();
        store.addTab('new-connection');
        return;
      }

      // Cmd+W — Close tab
      if (meta && !shift && e.key === 'w') {
        e.preventDefault();
        if (store.activeTabId) store.closeTab(store.activeTabId);
        return;
      }

      // Cmd+K — Command palette
      if (meta && !shift && e.key === 'k') {
        e.preventDefault();
        store.toggleCommandPalette();
        return;
      }

      // Cmd+D — Cycle horizontal split
      if (meta && !shift && e.key === 'd') {
        e.preventDefault();
        store.cycleSplitHorizontal();
        return;
      }

      // Cmd+Shift+D — Cycle vertical split
      if (meta && shift && e.key === 'D') {
        e.preventDefault();
        store.cycleSplitVertical();
        return;
      }

      // Cmd+Shift+N — Toggle notes sidebar
      if (meta && shift && e.key === 'N') {
        e.preventDefault();
        store.toggleNotesSidebar();
        return;
      }

      // Cmd+L — Toggle AI chat sidebar
      if (meta && !shift && e.key === 'l') {
        e.preventDefault();
        store.toggleAIChatSidebar();
        return;
      }

      // Cmd+Shift+X — Disconnect/Reconnect focused pane
      if (meta && shift && e.key === 'X') {
        e.preventDefault();
        const tabId = store.paneTabIds[store.focusedPaneIndex];
        if (tabId) {
          const tab = store.tabs.find((t) => t.id === tabId);
          if (tab?.connected) {
            store.disconnectTab(tabId);
          } else if (tab?.disconnectedAt) {
            store.reconnectTab(tabId);
          }
        }
        return;
      }

      // Cmd+Shift+M — Memory timeline
      if (meta && shift && e.key === 'M') {
        e.preventDefault();
        store.setActiveModal(store.activeModal === 'memory-timeline' ? null : 'memory-timeline');
        return;
      }

      // Cmd+Shift+B — Broadcast mode
      if (meta && shift && e.key === 'B') {
        e.preventDefault();
        useAppStore.getState().toggleBroadcast();
        return;
      }

      // Cmd+Shift+F — SFTP sidebar
      if (meta && shift && e.key === 'F') {
        e.preventDefault();
        store.toggleSFTP();
        return;
      }

      // Cmd+Shift+V — AI Clipboard (placeholder)
      if (meta && shift && e.key === 'V') {
        e.preventDefault();
        // TODO: toggle AI clipboard overlay
        return;
      }

      // Cmd+Shift+S — Workspaces
      if (meta && shift && e.key === 'S') {
        e.preventDefault();
        store.setActiveModal(store.activeModal === 'workspaces' ? null : 'workspaces');
        return;
      }

      // Cmd+, — Settings
      if (meta && !shift && e.key === ',') {
        e.preventDefault();
        store.toggleSettings();
        return;
      }

      // Cmd+1-9 — Switch tab by position
      if (meta && !shift && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (idx < store.tabs.length) {
          store.setActiveTab(store.tabs[idx].id);
        }
        return;
      }

      // Cmd+Shift+[ — Previous tab
      if (meta && shift && e.key === '[') {
        e.preventDefault();
        const tabs = store.tabs;
        const idx = tabs.findIndex((t) => t.id === store.activeTabId);
        if (idx > 0) store.setActiveTab(tabs[idx - 1].id);
        else if (tabs.length > 0) store.setActiveTab(tabs[tabs.length - 1].id);
        return;
      }

      // Cmd+Shift+] — Next tab
      if (meta && shift && e.key === ']') {
        e.preventDefault();
        const tabs = store.tabs;
        const idx = tabs.findIndex((t) => t.id === store.activeTabId);
        if (idx < tabs.length - 1) store.setActiveTab(tabs[idx + 1].id);
        else if (tabs.length > 0) store.setActiveTab(tabs[0].id);
        return;
      }

      // Escape — Close overlays
      if (e.key === 'Escape') {
        if (store.commandPaletteOpen) {
          e.preventDefault();
          store.toggleCommandPalette();
        } else if (store.settingsOpen) {
          e.preventDefault();
          store.toggleSettings();
        }
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
}
