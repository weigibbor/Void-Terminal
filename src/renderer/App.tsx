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

        {/* Right sidebars with AnimatePresence */}
        <AnimatePresence>
          {notesSidebarOpen && (
            <motion.div
              key="notes-sidebar"
              initial={{ x: 220, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 220, opacity: 0 }}
              transition={{ duration: duration.smooth, ease: easing.standard }}
              className="shrink-0"
            >
              <NotesSidebar />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {aiChatSidebarOpen && (
            <motion.div
              key="ai-sidebar"
              initial={{ x: 220, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 220, opacity: 0 }}
              transition={{ duration: duration.smooth, ease: easing.standard }}
              className="shrink-0"
            >
              <AIChatSidebar />
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
