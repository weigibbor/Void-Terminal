import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { formatDuration } from '../utils/formatters';

export function StatusBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const sessionStartTime = useAppStore((s) => s.sessionStartTime);
  const isPro = useAppStore((s) => s.isPro);
  const [elapsed, setElapsed] = useState(0);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const connectedCount = tabs.filter((t) => t.connected).length;

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - sessionStartTime), 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  return (
    <div
      className="flex items-center justify-between px-[14px] py-[6px] bg-void-input shrink-0 font-mono"
      style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)', fontSize: '10px', color: '#444' }}
    >
      <div className="flex items-center gap-[14px]">
        <span className="flex items-center gap-[6px]">
          <span className={`inline-block w-1 h-1 rounded-full ${
            connectedCount > 0 ? 'bg-status-online' : 'bg-void-text-ghost'
          }`} />
          {connectedCount > 0 ? `${connectedCount} active` : 'No connections'}
        </span>

        {activeTab?.connected && activeTab.connectionConfig?.keepAlive && (
          <span>Keep-alive: 30s</span>
        )}

        {activeTab?.connected && activeTab.connectionConfig && (
          <span>{activeTab.connectionConfig.username}@{activeTab.connectionConfig.host}</span>
        )}

        {isPro && (
          <span className="flex items-center gap-[5px] text-accent">
            <span className="inline-block w-[5px] h-[5px] rounded-full bg-accent animate-ai-pulse" />
            AI watching
          </span>
        )}
      </div>

      <div className="flex items-center gap-[14px]">
        <span>&#8984;K palette</span>
        <span>&#8984;D split</span>
        {isPro && <span className="text-void-text-ghost">&#8984;L chat</span>}
        {isPro && <span className="text-void-text-ghost">&#8984;&#8679;M timeline</span>}
        <span>Session: {formatDuration(elapsed)}</span>
        <button
          onClick={() => useAppStore.getState().openSettings()}
          className="text-void-text-ghost hover:text-void-text-muted transition-colors"
          title="Settings"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
