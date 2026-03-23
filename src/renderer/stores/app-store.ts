import { create } from 'zustand';
import type { Tab, TabType, SplitLayout, SavedConnection } from '../types';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getPaneCount(layout: SplitLayout): number {
  if (layout === 'single') return 1;
  if (layout === '2-col') return 2;
  return 3;
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
  commandPaletteOpen: boolean;
  settingsOpen: boolean;

  savedConnections: SavedConnection[];
  sessionStartTime: number;
  isPro: boolean;
  licenseInfo: { plan: string; email?: string; activatedAt?: number } | null;
  settingsSection: string;

  addTab: (type: TabType, config?: Partial<Tab>) => string;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTab: (id: string, data: Partial<Tab>) => void;

  cycleSplitHorizontal: () => void;
  cycleSplitVertical: () => void;
  setFocusedPane: (index: number) => void;
  setPaneSizes: (sizes: number[]) => void;

  toggleNotesSidebar: () => void;
  toggleAIChatSidebar: () => void;
  toggleCommandPalette: () => void;
  toggleSettings: () => void;

  setSavedConnections: (connections: SavedConnection[]) => void;
  loadSavedConnections: () => Promise<void>;
  loadLicense: () => Promise<void>;
  openSettings: (section?: string) => void;
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
  commandPaletteOpen: false,
  settingsOpen: false,

  savedConnections: [],
  sessionStartTime: Date.now(),
  isPro: false,
  licenseInfo: null,
  settingsSection: 'general',

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

      return { tabs, activeTabId, paneTabIds };
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

  cycleSplitHorizontal: () => {
    set((state) => {
      const cycle: SplitLayout[] = ['single', '2-col', '3-col'];
      const idx = cycle.indexOf(state.splitLayout);
      const nextLayout = cycle[(idx + 1) % cycle.length];
      const nextCount = getPaneCount(nextLayout);
      const paneTabIds = [...state.paneTabIds];

      // Add panes if needed
      while (paneTabIds.length < nextCount) {
        // Create a new-connection tab for new panes
        const id = generateId();
        const tab: Tab = {
          id,
          type: 'new-connection',
          title: 'New Connection',
          connected: false,
          lastActivity: Date.now(),
        };
        state.tabs.push(tab);
        paneTabIds.push(id);
      }

      // Remove extra panes
      while (paneTabIds.length > nextCount) {
        paneTabIds.pop();
      }

      const paneSizes = Array(nextCount).fill(1 / nextCount);
      return {
        splitLayout: nextLayout,
        paneTabIds,
        paneSizes,
        tabs: [...state.tabs],
      };
    });
  },

  cycleSplitVertical: () => {
    set((state) => {
      const cycle: SplitLayout[] = ['single', '2+1-grid', '1+2-grid'];
      const idx = cycle.indexOf(state.splitLayout);
      const nextLayout = cycle[(idx + 1) % cycle.length];
      const nextCount = getPaneCount(nextLayout);
      const paneTabIds = [...state.paneTabIds];

      while (paneTabIds.length < nextCount) {
        const id = generateId();
        const tab: Tab = {
          id,
          type: 'new-connection',
          title: 'New Connection',
          connected: false,
          lastActivity: Date.now(),
        };
        state.tabs.push(tab);
        paneTabIds.push(id);
      }

      while (paneTabIds.length > nextCount) {
        paneTabIds.pop();
      }

      const paneSizes = Array(nextCount).fill(1 / nextCount);
      return {
        splitLayout: nextLayout,
        paneTabIds,
        paneSizes,
        tabs: [...state.tabs],
      };
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
    set((state) => ({ settingsOpen: !state.settingsOpen }));
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
    set({ settingsOpen: true, settingsSection: section || 'general' });
  },
}));
