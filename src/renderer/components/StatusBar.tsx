import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { formatDuration } from '../utils/formatters';

export function StatusBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const sessionStartTime = useAppStore((s) => s.sessionStartTime);
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
      </div>

      <div className="flex items-center gap-[14px]">
        <span>&#8984;K palette</span>
        <span>&#8984;D split</span>
        <span>Session: {formatDuration(elapsed)}</span>
      </div>
    </div>
  );
}
