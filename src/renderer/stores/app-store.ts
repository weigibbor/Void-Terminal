import { create } from 'zustand';
import type { Tab, TabType, SplitLayout, SavedConnection, PanePosition } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getPaneCount(layout: SplitLayout): number {
  if (layout === 'single') return 1;
  if (layout === '2-col') return 2;
  return 3;
}

function reorderTabsByPanes(tabs: Tab[], paneTabIds: (string | null)[]): Tab[] {
  const paneOrder = paneTabIds.filter(Boolean) as string[];
  const inPanes = new Set(paneOrder);
  return [
    ...paneOrder.map((id) => tabs.find((t) => t.id === id)!).filter(Boolean),
    ...tabs.filter((t) => !inPanes.has(t.id)),
  ];
}

const PANE_POSITIONS: Record<SplitLayout, PanePosition[]> = {
  'single': ['L'],
  '2-col': ['L', 'R'],
  '3-col': ['L', 'C', 'R'],
  '2+1-grid': ['TL', 'TR', 'B'],
  '1+2-grid': ['T', 'BL', 'BR'],
};

const PANE_LABELS: Record<PanePosition, string> = {
  'L': 'LEFT', 'R': 'RIGHT', 'C': 'MID',
  'TL': 'TL', 'TR': 'TR', 'B': 'BTM',
  'T': 'TOP', 'BL': 'BL', 'BR': 'BR',
};

export function getPaneLabel(layout: SplitLayout, paneIndex: number): string {
  const pos = PANE_POSITIONS[layout]?.[paneIndex] || 'L';
  return PANE_LABELS[pos] || pos;
}

export function getPanePosition(layout: SplitLayout, paneIndex: number): PanePosition {
  return PANE_POSITIONS[layout]?.[paneIndex] || 'L';
}

interface AppState {
  tabs: Tab[];
  activeTabId: string | null;
  splitLayout: SplitLayout;
  focusedPaneIndex: number;
  paneTabIds: (string | null)[];
  paneSizes: number[];

  notesSidebarOpen: boolean;
  aiChatSidebarOpen: boolean;
  sftpOpen: boolean;
  sftpCollapsed: boolean;
  commandPaletteOpen: boolean;
  settingsOpen: boolean;

  savedConnections: SavedConnection[];
  sessionStartTime: number;
  isPro: boolean;
  licenseInfo: { plan: string; email?: string; activatedAt?: number } | null;
  settingsSection: string;
  terminalFontSize: number;
  uiScale: number;
  activeModal: string | null;

  addTab: (type: TabType, config?: Partial<Tab>) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, data: Partial<Tab>) => void;
  disconnectTab: (id: string) => void;
  reconnectTab: (id: string) => void;

  cycleSplitHorizontal: () => void;
  cycleSplitVertical: () => void;
  setFocusedPane: (index: number) => void;
  setPaneSizes: (sizes: number[]) => void;

  setTerminalFontSize: (size: number) => void;
  setUIScale: (scale: number) => void;
  toggleSFTP: () => void;
  collapseSFTP: () => void;
  toggleNotesSidebar: () => void;
  toggleAIChatSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleSettings: () => void;

  swapPanes: (fromIndex: number, toIndex: number) => void;
  setSavedConnections: (connections: SavedConnection[]) => void;
  loadSavedConnections: () => Promise<void>;
  loadLicense: () => Promise<void>;
  openSettings: (section?: string) => void;
  setActiveModal: (modal: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  splitLayout: 'single',
  focusedPaneIndex: 0,
  paneTabIds: [null],
  paneSizes: [1],

  notesSidebarOpen: false,
  aiChatSidebarOpen: false,
  sftpOpen: false,
  sftpCollapsed: false,
  commandPaletteOpen: false,
  settingsOpen: false,

  savedConnections: [],
  sessionStartTime: Date.now(),
  isPro: false,
  licenseInfo: null,
  settingsSection: 'general',
  terminalFontSize: parseInt(localStorage.getItem('void-terminal-font-size') || '13'),
  uiScale: parseInt(localStorage.getItem('void-ui-scale') || '100'),
  activeModal: null,

  addTab: (type, config) => {
    const id = generateId();
    const tab: Tab = {
      id,
      type,
      title:
        type === 'new-connection'
          ? 'New Connection'
          : type === 'local'
            ? 'Local Shell'
            : type === 'browser'
              ? 'Browser'
              : 'SSH',
      connected: false,
      lastActivity: Date.now(),
      ...config,
    };
    set((state) => {
      const tabs = [...state.tabs, tab];
      const paneTabIds = [...state.paneTabIds];
      // Always show the new tab in the focused pane
      paneTabIds[state.focusedPaneIndex] = id;
      return { tabs, activeTabId: id, paneTabIds };
    });
    return id;
  },

  closeTab: (id) => {
    set((state) => {
      const tabs = state.tabs.filter((t) => t.id !== id);
      let { activeTabId, paneTabIds } = state;

      // Clean up pane assignments
      paneTabIds = paneTabIds.map((pId) => (pId === id ? null : pId));

      // If closing active tab, activate the nearest remaining tab
      if (activeTabId === id) {
        const remaining = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
        activeTabId = remaining;
        // Assign to the first empty pane
        if (remaining && paneTabIds.every((p) => p !== remaining)) {
          const emptyIdx = paneTabIds.indexOf(null);
          if (emptyIdx >= 0) paneTabIds[emptyIdx] = remaining;
          else paneTabIds[0] = remaining;
        }
      }

      // Auto-collapse split if not enough tabs to fill panes
      const filledPanes = paneTabIds.filter(Boolean).length;
      let splitLayout = state.splitLayout;
      let paneSizes = state.paneSizes;

      if (filledPanes <= 1 && splitLayout !== 'single') {
        // Collapse to single
        splitLayout = 'single';
        const firstFilled = paneTabIds.find(Boolean) || null;
        paneTabIds = [firstFilled];
        paneSizes = [1];
      } else if (filledPanes === 2 && (splitLayout === '3-col' || splitLayout === '2+1-grid' || splitLayout === '1+2-grid')) {
        // Collapse to 2-col
        splitLayout = '2-col';
        paneTabIds = paneTabIds.filter(Boolean).slice(0, 2) as (string | null)[];
        paneSizes = [0.5, 0.5];
      }

      return { tabs, activeTabId, paneTabIds, splitLayout, paneSizes };
    });
  },

  setActiveTab: (id) => {
    set((state) => {
      const paneTabIds = [...state.paneTabIds];
      // If tab is already in a pane, focus that pane
      const paneIdx = paneTabIds.indexOf(id);
      if (paneIdx >= 0) {
        return { activeTabId: id, focusedPaneIndex: paneIdx };
      }
      // Otherwise assign to focused pane
      paneTabIds[state.focusedPaneIndex] = id;
      return { activeTabId: id, paneTabIds };
    });
  },

  updateTab: (id, data) => {
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
  },

  disconnectTab: (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab?.sessionId || !tab.connected) return;
    // Disconnect SSH/PTY
    if (tab.type === 'ssh') {
      window.void.ssh.disconnect(tab.sessionId);
    } else if (tab.type === 'local') {
      window.void.pty.destroy(tab.sessionId);
    }
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, connected: false, disconnectedAt: Date.now(), scrollbackPreserved: true } : t,
      ),
    }));
  },

  reconnectTab: async (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab?.connectionConfig) return;
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === id ? { ...t, disconnectedAt: undefined, scrollbackPreserved: false } : t)),
    }));
    // Re-connect using saved config
    const result = await window.void.ssh.connect(tab.connectionConfig);
    if (result.success && result.sessionId) {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === id ? { ...t, sessionId: result.sessionId, connected: true } : t,
        ),
      }));
    }
  },

  cycleSplitHorizontal: () => {
    set((state) => {
      const cycle: SplitLayout[] = ['single', '2-col', '3-col'];
      const idx = cycle.indexOf(state.splitLayout);
      const nextLayout = cycle[(idx + 1) % cycle.length];
      const nextCount = getPaneCount(nextLayout);
      const paneTabIds = [...state.paneTabIds];
      let tabs = [...state.tabs];

      // Find tabs not already assigned to a pane
      const assignedSet = new Set(paneTabIds.filter(Boolean));
      const unassigned = tabs.filter((t) => !assignedSet.has(t.id));

      // Fill any existing null pane slots first
      for (let i = 0; i < paneTabIds.length; i++) {
        if (paneTabIds[i] === null) {
          const next = unassigned.shift();
          if (next) {
            paneTabIds[i] = next.id;
          } else {
            const id = generateId();
            tabs.push({ id, type: 'new-connection', title: 'New Connection', connected: false, lastActivity: Date.now() });
            paneTabIds[i] = id;
          }
        }
      }

      // Add new pane slots — fill with unassigned tabs, then new-connection tabs
      while (paneTabIds.length < nextCount) {
        const next = unassigned.shift();
        if (next) {
          paneTabIds.push(next.id);
        } else {
          const id = generateId();
          tabs.push({ id, type: 'new-connection', title: 'New Connection', connected: false, lastActivity: Date.now() });
          paneTabIds.push(id);
        }
      }

      // Remove extra panes — clean up unused new-connection ghost tabs
      while (paneTabIds.length > nextCount) {
        const removedTabId = paneTabIds.pop();
        if (removedTabId) {
          const tab = tabs.find((t) => t.id === removedTabId);
          if (tab && tab.type === 'new-connection') {
            tabs = tabs.filter((t) => t.id !== removedTabId);
          }
        }
      }

      const paneSizes = Array(nextCount).fill(1 / nextCount);
      return { splitLayout: nextLayout, paneTabIds, paneSizes, tabs: reorderTabsByPanes(tabs, paneTabIds) };
    });
  },

  cycleSplitVertical: () => {
    set((state) => {
      const cycle: SplitLayout[] = ['single', '2+1-grid', '1+2-grid'];
      const idx = cycle.indexOf(state.splitLayout);
      const nextLayout = cycle[(idx + 1) % cycle.length];
      const nextCount = getPaneCount(nextLayout);
      const paneTabIds = [...state.paneTabIds];
      let tabs = [...state.tabs];

      const assignedSet = new Set(paneTabIds.filter(Boolean));
      const unassigned = tabs.filter((t) => !assignedSet.has(t.id));

      // Fill existing null pane slots first
      for (let i = 0; i < paneTabIds.length; i++) {
        if (paneTabIds[i] === null) {
          const next = unassigned.shift();
          if (next) {
            paneTabIds[i] = next.id;
          } else {
            const id = generateId();
            tabs.push({ id, type: 'new-connection', title: 'New Connection', connected: false, lastActivity: Date.now() });
            paneTabIds[i] = id;
          }
        }
      }

      while (paneTabIds.length < nextCount) {
        const next = unassigned.shift();
        if (next) {
          paneTabIds.push(next.id);
        } else {
          const id = generateId();
          tabs.push({ id, type: 'new-connection', title: 'New Connection', connected: false, lastActivity: Date.now() });
          paneTabIds.push(id);
        }
      }

      while (paneTabIds.length > nextCount) {
        const removedTabId = paneTabIds.pop();
        if (removedTabId) {
          const tab = tabs.find((t) => t.id === removedTabId);
          if (tab && tab.type === 'new-connection') {
            tabs = tabs.filter((t) => t.id !== removedTabId);
          }
        }
      }

      const paneSizes = Array(nextCount).fill(1 / nextCount);
      return { splitLayout: nextLayout, paneTabIds, paneSizes, tabs: reorderTabsByPanes(tabs, paneTabIds) };
    });
  },

  setFocusedPane: (index) => {
    set((state) => {
      const tabId = state.paneTabIds[index];
      return {
        focusedPaneIndex: index,
        activeTabId: tabId ?? state.activeTabId,
      };
    });
  },

  setPaneSizes: (sizes) => {
    set({ paneSizes: sizes });
  },

  setTerminalFontSize: (size) => {
    const clamped = Math.max(8, Math.min(24, size));
    set({ terminalFontSize: clamped });
    try { localStorage.setItem('void-terminal-font-size', String(clamped)); } catch {}
  },
  setUIScale: (scale) => {
    const clamped = Math.max(75, Math.min(150, scale));
    set({ uiScale: clamped });
    try { localStorage.setItem('void-ui-scale', String(clamped)); } catch {}
  },

  toggleSFTP: () => {
    set((state) => ({ sftpOpen: !state.sftpOpen, sftpCollapsed: false }));
  },

  collapseSFTP: () => {
    set((state) => ({ sftpCollapsed: !state.sftpCollapsed }));
  },

  toggleNotesSidebar: () => {
    set((state) => ({
      notesSidebarOpen: !state.notesSidebarOpen,
      aiChatSidebarOpen: state.notesSidebarOpen ? state.aiChatSidebarOpen : false,
    }));
  },

  toggleAIChatSidebar: () => {
    set((state) => ({
      aiChatSidebarOpen: !state.aiChatSidebarOpen,
      notesSidebarOpen: state.aiChatSidebarOpen ? state.notesSidebarOpen : false,
    }));
  },

  toggleCommandPalette: () => {
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen }));
  },

  toggleSettings: () => {
    set((state) => ({ settingsOpen: !state.settingsOpen, settingsSection: 'general' }));
  },

  swapPanes: (fromIndex, toIndex) => {
    set((state) => {
      const paneTabIds = [...state.paneTabIds];
      const tmp = paneTabIds[fromIndex];
      paneTabIds[fromIndex] = paneTabIds[toIndex];
      paneTabIds[toIndex] = tmp;
      return { paneTabIds, tabs: reorderTabsByPanes([...state.tabs], paneTabIds) };
    });
  },

  setSavedConnections: (connections) => {
    set({ savedConnections: connections });
  },

  loadSavedConnections: async () => {
    const connections = await window.void.connections.list();
    set({ savedConnections: connections });
  },

  loadLicense: async () => {
    const pro = await window.void.license.isPro();
    const info = await window.void.license.getInfo();
    set({ isPro: pro, licenseInfo: info });
  },

  openSettings: (section) => {
    set((state) => ({
      settingsOpen: section ? true : !state.settingsOpen,
      settingsSection: section || 'general',
    }));
  },

  setActiveModal: (modal) => {
    set({ activeModal: modal });
  },
}));
