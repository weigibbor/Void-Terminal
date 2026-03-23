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

export function App() {
  useKeyboard();

  const tabs = useAppStore((s) => s.tabs);
  const notesSidebarOpen = useAppStore((s) => s.notesSidebarOpen);
  const aiChatSidebarOpen = useAppStore((s) => s.aiChatSidebarOpen);
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const settingsOpen = useAppStore((s) => s.settingsOpen);
  const loadSavedConnections = useAppStore((s) => s.loadSavedConnections);
  const loadLicense = useAppStore((s) => s.loadLicense);

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
    </div>
  );
}
