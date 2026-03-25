import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface HealthSummary {
  host: string;
  connection_id: string;
  connect_count: number;
  disconnect_count: number;
  error_count: number;
  last_connected: number | null;
  first_seen: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function HealthDashboard({ onClose }: { onClose: () => void }) {
  const [summaries, setSummaries] = useState<HealthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const tabs = useAppStore((s) => s.tabs);

  useEffect(() => {
    (window as any).void.health.summary().then((data: HealthSummary[]) => {
      setSummaries(data || []);
      setLoading(false);
    });
  }, []);

  const isActive = (host: string) => tabs.some(t => t.connected && t.connectionConfig?.host === host);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '520px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Connection Health</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: '450px', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? (
            <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Loading...</div>
          ) : summaries.length === 0 ? (
            <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">No connection history yet</div>
          ) : (
            <div className="flex flex-col gap-[8px]">
              {summaries.map((s, i) => {
                const active = isActive(s.host);
                const reliability = s.connect_count > 0 ? Math.round(((s.connect_count - s.error_count) / s.connect_count) * 100) : 0;
                return (
                  <div key={i} className="p-3 rounded-[8px] bg-void-surface" style={{ border: `0.5px solid ${active ? 'rgba(40,200,64,0.15)' : '#2A2A30'}` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-[7px] h-[7px] rounded-full ${active ? 'bg-status-online' : 'bg-void-text-ghost'}`} />
                        <span className="text-[12px] text-void-text font-mono font-medium">{s.host}</span>
                      </div>
                      <span className={`text-[9px] px-[6px] py-[1px] rounded-[3px] font-mono ${active ? 'text-status-online' : 'text-void-text-ghost'}`}
                        style={{ background: active ? 'rgba(40,200,64,0.08)' : undefined }}>
                        {active ? 'online' : 'offline'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <div className="text-[9px] text-void-text-ghost">Connects</div>
                        <div className="text-[12px] text-void-text font-mono">{s.connect_count}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-void-text-ghost">Errors</div>
                        <div className={`text-[12px] font-mono ${s.error_count > 0 ? 'text-status-error' : 'text-void-text'}`}>{s.error_count}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-void-text-ghost">Reliability</div>
                        <div className={`text-[12px] font-mono ${reliability >= 90 ? 'text-status-online' : reliability >= 70 ? 'text-status-warning' : 'text-status-error'}`}>{reliability}%</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-void-text-ghost">Last seen</div>
                        <div className="text-[12px] text-void-text font-mono">{s.last_connected ? timeAgo(s.last_connected) : 'never'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 text-[9px] text-void-text-ghost font-mono text-center" style={{ borderTop: '0.5px solid var(--border)' }}>
          {summaries.length} server{summaries.length !== 1 ? 's' : ''} tracked
        </div>
      </div>
    </div>
  );
}
