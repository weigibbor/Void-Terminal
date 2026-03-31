import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';
import type { SplitLayout } from '../../types';

interface SavedWorkspace {
  id: string;
  name: string;
  savedAt: number;
  // Snapshot of app state
  tabs: { type: string; title: string; connectionConfig?: any; browserUrl?: string; filePath?: string }[];
  splitLayout: SplitLayout;
  sftpOpen: boolean;
  notesSidebarOpen: boolean;
  aiChatSidebarOpen: boolean;
}

const STORAGE_KEY = 'void-workspaces';

function loadWorkspaces(): SavedWorkspace[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveWorkspaces(workspaces: SavedWorkspace[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaces));
}

export function WorkspaceManager({ onClose }: { onClose: () => void }) {
  const [workspaces, setWorkspaces] = useState<SavedWorkspace[]>(loadWorkspaces());
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const store = useAppStore.getState();

  const handleSave = () => {
    const name = newName.trim();
    if (!name) return;

    const tabs = store.tabs.map((t) => ({
      type: t.type,
      title: t.title,
      connectionConfig: t.connectionConfig,
      browserUrl: t.browserUrl,
      filePath: t.filePath,
    }));

    const workspace: SavedWorkspace = {
      id: Date.now().toString(36),
      name,
      savedAt: Date.now(),
      tabs,
      splitLayout: store.splitLayout,
      sftpOpen: store.sftpOpen,
      notesSidebarOpen: store.notesSidebarOpen,
      aiChatSidebarOpen: store.aiChatSidebarOpen,
    };

    const updated = [...workspaces, workspace];
    setWorkspaces(updated);
    saveWorkspaces(updated);
    setNewName('');
  };

  const handleLoad = async (ws: SavedWorkspace) => {
    // Close all existing tabs
    const currentTabs = useAppStore.getState().tabs;
    for (const tab of currentTabs) {
      useAppStore.getState().closeTab(tab.id);
    }

    // Set layout
    useAppStore.setState({ splitLayout: ws.splitLayout });

    // Restore sidebars
    if (ws.sftpOpen !== useAppStore.getState().sftpOpen) useAppStore.getState().toggleSFTP();
    useAppStore.setState({
      notesSidebarOpen: ws.notesSidebarOpen,
      aiChatSidebarOpen: ws.aiChatSidebarOpen,
    });

    // Restore tabs and connect SSH
    for (const savedTab of ws.tabs) {
      if (savedTab.type === 'ssh' && savedTab.connectionConfig) {
        const tabId = useAppStore.getState().addTab('new-connection', { title: savedTab.title });
        useAppStore.getState().setActiveTab(tabId);
        // Auto-connect
        const result = await window.void.ssh.connect(savedTab.connectionConfig);
        if (result.success && result.sessionId) {
          useAppStore.getState().updateTab(tabId, {
            type: 'ssh',
            sessionId: result.sessionId,
            connected: true,
            connecting: false,
            connectionConfig: savedTab.connectionConfig,
          });
        }
      } else if (savedTab.type === 'local') {
        const result = await window.void.pty.create();
        if (result.success && result.sessionId) {
          useAppStore.getState().addTab('local', { title: 'Local Shell', sessionId: result.sessionId, connected: true });
        }
      } else if (savedTab.type === 'browser' && savedTab.browserUrl) {
        useAppStore.getState().addTab('browser', { title: savedTab.title, browserUrl: savedTab.browserUrl });
      } else if (savedTab.type !== 'ssh') {
        useAppStore.getState().addTab(savedTab.type as any, { title: savedTab.title });
      }
    }

    onClose();
  };

  const handleDelete = (id: string) => {
    const updated = workspaces.filter((w) => w.id !== id);
    setWorkspaces(updated);
    saveWorkspaces(updated);
    setConfirmDelete(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full"
        style={{ maxWidth: '500px', background: '#0A0A0D', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="#F97316" strokeWidth="1.2" />
              <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="#F97316" strokeWidth="1.2" />
              <rect x="1" y="9" width="14" height="6" rx="1.5" stroke="#F97316" strokeWidth="1.2" />
            </svg>
            <span className="text-[14px] text-void-text font-semibold">Workspaces</span>
          </div>
          <button onClick={onClose} className="text-[16px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer">×</button>
        </div>

        {/* Save current workspace */}
        <div className="flex items-center gap-2 px-5 py-3" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            placeholder="Workspace name..."
            className="flex-1 px-3 py-2 rounded-[6px] text-[12px] font-mono bg-void-input text-void-text outline-none"
            style={{ border: '0.5px solid #2A2A30' }}
          />
          <button
            onClick={handleSave}
            disabled={!newName.trim()}
            className="px-4 py-2 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-all disabled:opacity-40"
            style={{ background: '#F97316', color: '#0A0A0D', border: 'none' }}
          >
            Save Current
          </button>
        </div>

        {/* Workspace list */}
        <div className="max-h-[300px] overflow-y-auto px-5 py-3 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {workspaces.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-[12px] text-void-text-ghost">No saved workspaces</span>
              <br />
              <span className="text-[10px] text-void-text-ghost mt-1 block">Save your current layout to quickly switch between setups</span>
            </div>
          ) : (
            workspaces.map((ws) => (
              <div
                key={ws.id}
                className="flex items-center gap-3 px-3 py-3 rounded-[8px] group cursor-pointer hover:bg-void-elevated transition-colors"
                style={{ border: '0.5px solid #2A2A30' }}
                onClick={() => handleLoad(ws)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-void-text font-medium">{ws.name}</div>
                  <div className="text-[10px] text-void-text-ghost mt-0.5">
                    {ws.tabs.length} tab{ws.tabs.length !== 1 ? 's' : ''} · {ws.splitLayout} · {formatDate(ws.savedAt)}
                  </div>
                  <div className="flex gap-1 mt-1">
                    {ws.tabs.slice(0, 5).map((t, i) => (
                      <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{
                        color: t.type === 'ssh' ? '#28C840' : t.type === 'local' ? '#5B9BD5' : '#555',
                        background: t.type === 'ssh' ? 'rgba(40,200,64,0.06)' : t.type === 'local' ? 'rgba(91,155,213,0.06)' : 'rgba(85,85,85,0.06)',
                      }}>
                        {t.title.length > 15 ? t.title.slice(0, 15) + '...' : t.title}
                      </span>
                    ))}
                    {ws.tabs.length > 5 && <span className="text-[9px] text-void-text-ghost">+{ws.tabs.length - 5}</span>}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleLoad(ws); }}
                    className="px-3 py-1 rounded text-[10px] font-semibold cursor-pointer"
                    style={{ color: '#F97316', background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.15)' }}
                  >
                    Load
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); confirmDelete === ws.id ? handleDelete(ws.id) : setConfirmDelete(ws.id); }}
                    className="px-2 py-1 rounded text-[10px] font-semibold cursor-pointer"
                    style={{ color: '#FF5F57', background: 'rgba(255,95,87,0.08)', border: '0.5px solid rgba(255,95,87,0.15)' }}
                  >
                    {confirmDelete === ws.id ? 'Confirm' : 'Delete'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
