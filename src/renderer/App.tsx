import { useEffect } from 'react';
import { useAppStore } from './stores/app-store';
import { useKeyboard } from './hooks/useKeyboard';
import { TitleBar } from './components/TitleBar';
import { TabBar } from './components/TabBar';
import { SplitView } from './components/SplitView';
import { StatusBar } from './components/StatusBar';
import { CommandPalette } from './components/CommandPalette';
import { NotesSidebar } from './components/NotesSidebar';
import { AIChatSidebar } from './components/pro/AIChatSidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { WelcomeScreen } from './components/WelcomeScreen';
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
  const loadSavedConnections = useAppStore((s) => s.loadSavedConnections);
  const loadLicense = useAppStore((s) => s.loadLicense);
  const setActiveModal = useAppStore((s) => s.setActiveModal);

  useEffect(() => {
    loadSavedConnections();
    loadLicense();
  }, [loadSavedConnections, loadLicense]);

  return (
    <div className="h-screen w-screen flex flex-col bg-void-base select-none overflow-hidden">
      <TitleBar />
      <TabBar />

      <div className="flex-1 flex min-h-0">
        {settingsOpen ? (
          <SettingsPanel />
        ) : tabs.length === 0 ? (
          <WelcomeScreen />
        ) : (
          <SplitView />
        )}

        {notesSidebarOpen && <NotesSidebar />}
        {aiChatSidebarOpen && <AIChatSidebar />}
      </div>

      <StatusBar />

      {commandPaletteOpen && <CommandPalette />}

      {/* Pro modals */}
      {activeModal === 'memory-timeline' && (
        <MemoryTimeline onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'audit-log' && (
        <AuditLogPanel onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'workspaces' && (
        <WorkspaceManager onClose={() => setActiveModal(null)} />
      )}
      {activeModal === 'security-scan' && (
        <SecurityReport issues={[]} server="scan" onClose={() => setActiveModal(null)} />
      )}
    </div>
  );
}
