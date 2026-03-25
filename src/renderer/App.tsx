import { useEffect, useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './stores/app-store';
import { useKeyboard } from './hooks/useKeyboard';
import { easing, duration } from './utils/motion';
import { applyTheme } from './components/SettingsPanel';
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
import { AIClipboardOverlay } from './components/pro/AIClipboardOverlay';
import { UpdateBar } from './components/UpdateBar';
import { PatchNotesModal } from './components/PatchNotesModal';
import { ServerDashboard } from './components/pro/ServerDashboard';
import { CronViewer } from './components/pro/CronViewer';
import { CommandRunner } from './components/pro/CommandRunner';
import { HealthDashboard } from './components/pro/HealthDashboard';
import { DockerPanel } from './components/pro/DockerPanel';
import { ServiceViewer } from './components/pro/ServiceViewer';
import { GitWidget } from './components/pro/GitWidget';
import { EnvDiffViewer } from './components/pro/EnvDiffViewer';
import { ProcessMonitor } from './components/pro/ProcessMonitor';
import { LogViewer } from './components/pro/LogViewer';
import { NetworkMonitor } from './components/pro/NetworkMonitor';
import { SSLChecker } from './components/pro/SSLChecker';
import { AlertWebhooks } from './components/pro/AlertWebhooks';
import { CommandTimeline } from './components/pro/CommandTimeline';
import { KeyboardOverlay } from './components/KeyboardOverlay';
import { TipOfTheDay } from './components/TipOfTheDay';

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
  const [sftpWidth, setSftpWidth] = useState(() => parseInt(localStorage.getItem('void-sftp-width') || '240'));
  const sftpDragRef = useRef(false);

  const handleSftpDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    sftpDragRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => {
      const newWidth = Math.max(180, Math.min(500, ev.clientX));
      setSftpWidth(newWidth);
      localStorage.setItem('void-sftp-width', String(newWidth));
      window.dispatchEvent(new Event('resize'));
    };
    const onUp = () => {
      sftpDragRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, []);

  useEffect(() => {
    // Apply saved theme
    const savedTheme = localStorage.getItem('void-theme');
    if (savedTheme) applyTheme(savedTheme);

    loadSavedConnections();
    loadLicense().then(() => {
      const flag = localStorage.getItem('void-first-pro-launch');
      if (flag) {
        localStorage.removeItem('void-first-pro-launch');
        setShowProWelcome(true);
      }
    });
  }, [loadSavedConnections, loadLicense]);

  // Receive detached tab from another window
  useEffect(() => {
    return (window.void.app as any).onReceiveTab?.((tabData: any) => {
      if (!tabData?.id) return;
      const store = useAppStore.getState();
      store.receiveDetachedTab(tabData);
      // Replay SSH buffer so terminal shows existing content
      if (tabData.sessionId) {
        window.void.ssh.getBuffer(tabData.sessionId).then((buf: string) => {
          // Buffer will be replayed by useTerminal hook when it mounts
        });
      }
    });
  }, []);

  // Check for updates on launch + every 6 hours
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const currentVersion = '1.0.0';
        const data = await window.void.app.checkForUpdates(currentVersion);
        if (data.update) {
          const lastSeen = localStorage.getItem('last-seen-changelog');
          const dismissedVersion = localStorage.getItem('void-update-dismissed');
          const wasDismissed = dismissedVersion === data.version;
          useAppStore.setState({
            updateStatus: 'available',
            updateVersion: data.version,
            updateChangelog: data.changelog || [],
            updateRequired: data.required || false,
            downloadSize: data.downloadSize || '',
            updateDismissed: wasDismissed,
          });
          if (lastSeen && lastSeen !== data.version) {
            setTimeout(() => {
              useAppStore.setState({ patchNotesOpen: true, patchNotesMode: 'post-update' });
            }, 1500);
          }
        } else {
          // No update — reset state
          useAppStore.setState({ updateStatus: 'idle', updateVersion: null, updateChangelog: [], updateDismissed: false });
        }
      } catch { /* offline, skip */ }
    };
    checkUpdate();
    // No interval — main process auto-updater handles periodic checks
  }, []);

  // Listen for detached tabs from other windows
  useEffect(() => {
    return window.void.app.onReceiveTab?.((tabData: any) => {
      if (tabData) {
        const store = useAppStore.getState();
        const id = store.addTab(tabData.type, {
          title: tabData.title,
          sessionId: tabData.sessionId,
          connectionConfig: tabData.connectionConfig,
          connected: tabData.connected,
          lastActivity: Date.now(),
        });
        store.setActiveTab(id);
      }
    });
  }, []);

  // Listen for electron-updater events
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const app = window.void.app as any;

    unsubs.push(app.onUpdaterAvailable?.((data: any) => {
      // Only set if custom API hasn't already detected this update
      const current = useAppStore.getState();
      if (current.updateStatus === 'available' && current.updateVersion === data.version) return; // already detected
      useAppStore.setState({
        updateStatus: 'available', updateVersion: data.version,
        updateDismissed: localStorage.getItem('void-update-dismissed') === data.version,
      });
    }) || (() => {}));

    unsubs.push(app.onUpdaterProgress?.((data: any) => {
      useAppStore.setState({ updateStatus: 'downloading', downloadProgress: data.percent });
    }) || (() => {}));

    unsubs.push(app.onUpdaterDownloaded?.((data: any) => {
      useAppStore.setState({ updateStatus: 'ready', downloadProgress: 100, updateVersion: data.version });
    }) || (() => {}));

    unsubs.push(app.onUpdaterError?.((data: any) => {
      useAppStore.setState({ updateStatus: 'failed', updateError: data.message });
    }) || (() => {}));

    return () => unsubs.forEach(u => u());
  }, []);

  // Listen for license expiry — immediately lock Pro features
  useEffect(() => {
    return (window.void.license as any).onExpired?.((data: any) => {
      console.log('[License] Expired:', data?.reason);
      useAppStore.setState({ isPro: false, licenseInfo: null });
    });
  }, []);

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
      <UpdateBar />
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
        {/* SFTP sidebar — LEFT (resizable) */}
        <AnimatePresence>
          {sftpOpen && <SFTPSidebar width={sftpWidth} />}
        </AnimatePresence>

        {/* SFTP resize divider */}
        {sftpOpen && (
          <div
            className="shrink-0 cursor-col-resize"
            style={{ width: '6px', zIndex: 20, position: 'relative' }}
            onMouseDown={handleSftpDrag}
          >
            <div style={{
              position: 'absolute', width: '1px', height: '100%',
              left: '50%', transform: 'translateX(-50%)',
              background: sftpDragRef.current ? '#F97316' : '#2A2A30',
              transition: 'background 150ms',
            }} />
          </div>
        )}

        <div className="flex-1 flex min-h-0 overflow-hidden">
          {tabs.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <SplitView />
          )}
        </div>

        {/* Right sidebar — Notes / AI Chat tabbed panel */}
        <AnimatePresence mode="wait">
          {(notesSidebarOpen || aiChatSidebarOpen) && (
            <motion.div
              key="right-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 260, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              onAnimationComplete={() => {
                // Only fit terminal AFTER animation completes — prevents flicker
                window.dispatchEvent(new Event('resize'));
              }}
              className="shrink-0 flex flex-col overflow-hidden"
              style={{ height: '100%', maxHeight: '100%', borderLeft: '0.5px solid #2A2A30', background: 'var(--input)' }}
            >
              {/* Tab switcher */}
              <div className="flex shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
                <button
                  onClick={() => useAppStore.setState({ notesSidebarOpen: true, aiChatSidebarOpen: false })}
                  className={`flex-1 py-[8px] text-[10px] font-sans cursor-pointer transition-colors ${notesSidebarOpen ? 'text-void-text bg-void-elevated' : 'text-void-text-dim hover:text-void-text-muted'}`}
                  style={notesSidebarOpen ? { borderBottom: '1.5px solid #F97316' } : {}}
                >
                  Notes
                </button>
                <button
                  onClick={() => useAppStore.setState({ notesSidebarOpen: false, aiChatSidebarOpen: true })}
                  className={`flex-1 py-[8px] text-[10px] font-sans cursor-pointer transition-colors ${aiChatSidebarOpen ? 'text-void-text bg-void-elevated' : 'text-void-text-dim hover:text-void-text-muted'}`}
                  style={aiChatSidebarOpen ? { borderBottom: '1.5px solid #F97316' } : {}}
                >
                  AI Chat
                </button>
              </div>

              {/* Panel content */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
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
        {activeModal === 'server-dashboard' && (
          <ServerDashboard onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'cron-viewer' && (
          <CronViewer onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'command-runner' && (
          <CommandRunner onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'health-dashboard' && (
          <HealthDashboard onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'docker' && (
          <div className="fixed inset-0 z-40 flex items-end justify-end" style={{ background: 'rgba(0,0,0,0.3)' }} onClick={() => setActiveModal(null)}>
            <div className="h-full" style={{ width: '380px' }} onClick={e => e.stopPropagation()}>
              <DockerPanel onClose={() => setActiveModal(null)} />
            </div>
          </div>
        )}
        {activeModal === 'services' && (
          <ServiceViewer onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'git-status' && (
          <GitWidget onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'env-diff' && (
          <EnvDiffViewer onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'process-monitor' && (
          <ProcessMonitor onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'log-viewer' && (
          <LogViewer onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'network-monitor' && (
          <NetworkMonitor onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'ssl-checker' && (
          <SSLChecker onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'webhooks' && (
          <AlertWebhooks onClose={() => setActiveModal(null)} />
        )}
        {activeModal === 'command-timeline' && (
          <CommandTimeline onClose={() => setActiveModal(null)} />
        )}
      </AnimatePresence>

      {/* Patch notes modal */}
      <PatchNotesModal />
      <KeyboardOverlay />
      <TipOfTheDay />

      {/* AI Clipboard overlay */}
      <AIClipboardOverlay
        visible={activeModal === 'ai-clipboard'}
        onClose={() => setActiveModal(null)}
        onPaste={(text) => {
          const store = useAppStore.getState();
          const tab = store.tabs.find((t) => t.id === store.activeTabId);
          if (tab?.sessionId) {
            if (tab.type === 'ssh') {
              window.void.ssh.write(tab.sessionId, text);
            } else {
              window.void.pty.write(tab.sessionId, text);
            }
          }
        }}
      />
    </div>
  );
}
