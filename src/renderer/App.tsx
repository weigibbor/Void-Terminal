import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './stores/app-store';
import { useKeyboard } from './hooks/useKeyboard';
import { easing, duration } from './utils/motion';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { SplitView } from './components/SplitView';
import { SFTPSidebar } from './components/SFTPSidebar';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { NotesSidebar } from './components/NotesSidebar';
import { AIChatSidebar } from './components/pro/AIChatSidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ProActivationFlow } from './components/ProActivationFlow';
import { MemoryTimeline } from './components/pro/MemoryTimeline';
import { AuditLogPanel } from './components/pro/AuditLogPanel';
import { WorkspaceManager } from './components/pro/WorkspaceManager';
import { SecurityReport } from './components/pro/SecurityReport';

export function App() {
  useKeyboard();

  const tabs = useAppStore((s) => s.tabs);
  const notesSidebarOpen = useAppStore((s) => s.notesSidebarOpen);
  const aiChatSidebarOpen = useAppStore((s) => s.aiChatSidebarOpen);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const activeModal = useAppStore((s) => s.activeModal);
  const sftpOpen = useAppStore((s) => s.sftpOpen);
  const uiScale = useAppStore((s) => s.uiScale);
  const pendingRestart = useAppStore((s) => s.pendingRestart);
  const setPendingRestart = useAppStore((s) => s.setPendingRestart);
  const loadSavedConnections = useAppStore((s) => s.loadSavedConnections);
  const loadLicense = useAppStore((s) => s.loadLicense);
  const setActiveModal = useAppStore((s) => s.setActiveModal);

  const [showProWelcome, setShowProWelcome] = useState(false);

  useEffect(() => {
    loadSavedConnections();
    loadLicense().then(() => {
      const flag = localStorage.getItem('void-first-pro-launch');
      if (flag) {
        localStorage.removeItem('void-first-pro-launch');
        setShowProWelcome(true);
      }
    });
  }, [loadSavedConnections, loadLicense]);

  if (showProWelcome) {
    return (
      <div className="h-screen w-screen flex flex-col bg-void-base select-none overflow-hidden">
        <TitleBar />
        <div className="flex-1 flex items-center justify-center">
          <ProActivationFlow initialScreen="welcome" onComplete={() => setShowProWelcome(false)} />
        </div>
      </div>
    );
  }

  // Apply UI scale via Electron's webContents.setZoomFactor (scales entire window properly)
  useEffect(() => {
    window.void.app.setZoom(uiScale / 100);
  }, [uiScale]);

  return (
    <div className="h-screen w-screen flex flex-col bg-void-base select-none overflow-hidden">
      <TitleBar />
      <TabBar />

      {/* Pending restart banner */}
      {pendingRestart && (
        <div className="flex items-center justify-between px-4 py-[6px] shrink-0"
          style={{ background: 'rgba(249,115,22,0.06)', borderBottom: '0.5px solid rgba(249,115,22,0.15)' }}>
          <div className="flex items-center gap-2">
            <span className="w-[5px] h-[5px] rounded-full bg-accent void-pulse-slow" />
            <span className="text-[10px] text-accent font-sans">Restart required to activate Pro features</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.void.app.restart()}
              className="text-[9px] text-accent font-medium px-3 py-[3px] rounded-[4px]"
              style={{ background: 'rgba(249,115,22,0.1)', border: '0.5px solid rgba(249,115,22,0.2)' }}
            >
              Restart now
            </button>
            <button
              onClick={() => setPendingRestart(false)}
              className="text-[9px] text-void-text-ghost hover:text-void-text-dim"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* SFTP sidebar — LEFT */}
        <AnimatePresence>
          {sftpOpen && <SFTPSidebar />}
        </AnimatePresence>

        <motion.div className="flex-1 flex min-h-0" layout transition={{ duration: duration.smooth, ease: easing.standard }}>
          {settingsOpen ? (
            <SettingsPanel />
          ) : tabs.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <SplitView />
          )}
        </motion.div>

        {/* Right sidebar — Notes / AI Chat tabbed panel */}
        <AnimatePresence>
          {(notesSidebarOpen || aiChatSidebarOpen) && (
            <motion.div
              key="right-sidebar"
              initial={{ x: 220, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 220, opacity: 0 }}
              transition={{ duration: duration.smooth, ease: easing.standard }}
              className="shrink-0 flex flex-col"
              style={{ width: '260px', borderLeft: '0.5px solid #2A2A30', background: 'var(--input)' }}
            >
              {/* Tab switcher */}
              <div className="flex shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
                <button
                  onClick={() => { useAppStore.getState().toggleNotesSidebar(); if (!notesSidebarOpen) { if (aiChatSidebarOpen) useAppStore.getState().toggleAIChatSidebar(); } }}
                  className={`flex-1 py-[8px] text-[10px] font-sans transition-colors ${notesSidebarOpen ? 'text-void-text bg-void-elevated' : 'text-void-text-dim hover:text-void-text-muted'}`}
                  style={notesSidebarOpen ? { borderBottom: '1.5px solid #F97316' } : {}}
                >
                  Notes
                </button>
                <button
                  onClick={() => { useAppStore.getState().toggleAIChatSidebar(); if (!aiChatSidebarOpen) { if (notesSidebarOpen) useAppStore.getState().toggleNotesSidebar(); } }}
                  className={`flex-1 py-[8px] text-[10px] font-sans transition-colors ${aiChatSidebarOpen ? 'text-void-text bg-void-elevated' : 'text-void-text-dim hover:text-void-text-muted'}`}
                  style={aiChatSidebarOpen ? { borderBottom: '1.5px solid #F97316' } : {}}
                >
                  AI Chat
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {notesSidebarOpen && <NotesSidebar />}
                {aiChatSidebarOpen && <AIChatSidebar />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StatusBar />

      {/* Command palette with AnimatePresence */}
      <AnimatePresence>
        {commandPaletteOpen && <CommandPalette />}
      </AnimatePresence>

      {/* Pro modals */}
      <AnimatePresence>
        {activeModal === 'memory-timeline' && (
          <MemoryTimeline onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeModal === 'audit-log' && (
          <AuditLogPanel onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeModal === 'workspaces' && (
          <WorkspaceManager onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeModal === 'security-scan' && (
          <SecurityReport issues={[]} server="scan" onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
