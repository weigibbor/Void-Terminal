import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { formatDuration } from '../utils/formatters';

export function StatusBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const sessionStartTime = useAppStore((s) => s.sessionStartTime);
  const isPro = useAppStore((s) => s.isPro);
  const splitLayout = useAppStore((s) => s.splitLayout);
  const broadcastMode = useAppStore((s) => s.broadcastMode);
  const [elapsed, setElapsed] = useState(0);
  const [aiConfigured, setAiConfigured] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const connectedCount = tabs.filter((t) => t.connected).length;
  const pausedTabs = tabs.filter((t) => !t.connected && t.disconnectedAt);
  const pausedCount = pausedTabs.length;

  useEffect(() => {
    const interval = setInterval(() => setElapsed(Date.now() - sessionStartTime), 1000);
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  useEffect(() => {
    if (isPro) {
      window.void.ai.getConfig().then((config: any) => {
        setAiConfigured(!!config?.apiKey || config?.provider === 'ollama');
      });
    }
  }, [isPro]);

  const splitLabel = splitLayout === '2-col' ? '2-col'
    : splitLayout === '3-col' ? '3-col'
    : splitLayout === '2+1-grid' ? '2+1 grid'
    : splitLayout === '1+2-grid' ? '1+2 grid'
    : null;

  return (
    <div
      className="flex items-center justify-between px-[14px] py-[6px] bg-void-input shrink-0 font-mono"
      style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)', fontSize: '10px', color: '#444' }}
    >
      <div className="flex items-center gap-[14px]">
        {/* Connected count */}
        <span className="flex items-center gap-[6px]">
          <span className={`inline-block w-1 h-1 rounded-full ${
            connectedCount > 0 ? 'bg-status-online' : 'bg-void-text-ghost'
          }`} />
          {connectedCount > 0 ? `${connectedCount} connected` : 'No connections'}
        </span>

        {/* Paused count */}
        {pausedCount > 0 && (
          <span className="flex items-center gap-[6px]">
            <span className="inline-block w-1 h-1 rounded-full bg-void-text-ghost" />
            {pausedCount === 1 ? `1 paused (${pausedTabs[0].title})` : `${pausedCount} paused`}
          </span>
        )}

        {/* Active connection + latency */}
        {activeTab?.connected && activeTab.connectionConfig && (
          <span>
            {activeTab.connectionConfig.username}@{activeTab.connectionConfig.host}
            {activeTab.latency != null && (
              <span className={activeTab.latency < 100 ? 'text-status-online' : activeTab.latency < 300 ? 'text-yellow-500' : 'text-status-error'}>
                {' · '}{activeTab.latency}ms
              </span>
            )}
          </span>
        )}

        {/* AI status (Pro) */}
        {isPro && (
          aiConfigured ? (
            <span className="flex items-center gap-[5px] text-accent">
              <span className="inline-block w-[5px] h-[5px] rounded-full bg-accent void-pulse-slow" />
              AI watching
            </span>
          ) : (
            <span
              className="flex items-center gap-[5px] text-void-text-dim cursor-pointer hover:text-void-text-muted"
              onClick={() => useAppStore.getState().openSettings('ai')}
            >
              <span className="inline-block w-[5px] h-[5px] rounded-full bg-void-text-dim" />
              AI not configured
            </span>
          )
        )}
      </div>

      <div className="flex items-center gap-[14px]">
        {/* Broadcast indicator */}
        {broadcastMode && (
          <span
            className="flex items-center gap-[4px] text-[#C586C0] cursor-pointer"
            onClick={() => useAppStore.getState().toggleBroadcast()}
          >
            <span className="inline-block w-[5px] h-[5px] rounded-full bg-[#C586C0] void-pulse-slow" />
            BROADCAST
          </span>
        )}

        {/* Split layout indicator */}
        {splitLabel && <span>Split: {splitLabel}</span>}

        <span>&#8984;K palette</span>
        <span>&#8984;D split</span>
        {isPro && <span>&#8984;L chat</span>}
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
