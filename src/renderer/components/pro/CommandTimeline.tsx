import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface TimelineEntry {
  command: string;
  server: string;
  timestamp: number;
  exitCode?: number;
}

export function CommandTimeline({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [search, setSearch] = useState('');
  const [serverFilter, setServerFilter] = useState('all');

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  useEffect(() => {
    if (!sessionId) return;
    // Fetch bash history from server
    (window as any).void.ssh.exec(sessionId, 'HISTTIMEFORMAT="%s " history 100 2>/dev/null | tail -100').then((result: any) => {
      if (result.stdout) {
        const parsed = result.stdout.trim().split('\n').map((line: string) => {
          const match = line.trim().match(/^\s*\d+\s+(\d+)\s+(.+)$/);
          if (match) {
            return { command: match[2], server: activeTab?.connectionConfig?.host || 'local', timestamp: parseInt(match[1]) * 1000, exitCode: 0 };
          }
          const simple = line.trim().match(/^\s*\d+\s+(.+)$/);
          if (simple) {
            return { command: simple[1], server: activeTab?.connectionConfig?.host || 'local', timestamp: Date.now(), exitCode: 0 };
          }
          return null;
        }).filter(Boolean) as TimelineEntry[];
        setEntries(parsed.reverse());
      }
    });
  }, [sessionId]);

  const servers = [...new Set(entries.map(e => e.server))];
  const filtered = entries.filter(e => {
    if (serverFilter !== 'all' && e.server !== serverFilter) return false;
    if (search && !e.command.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '560px', maxHeight: '80vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Command History</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="flex items-center gap-2 px-5 py-2 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search commands..."
            className="flex-1 px-2 py-1 bg-void-elevated border border-void-border rounded-[4px] text-[10px] text-void-text font-mono outline-none" />
          <select value={serverFilter} onChange={e => setServerFilter(e.target.value)}
            className="bg-void-elevated border border-void-border rounded-[4px] text-[10px] text-void-text-muted px-2 py-1 font-mono">
            <option value="all">All servers</option>
            {servers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {filtered.length === 0 ? (
            <div className="text-[11px] text-void-text-ghost font-mono text-center py-8">No commands found</div>
          ) : filtered.map((e, i) => (
            <div key={i} className="group flex items-start gap-3 py-[6px]" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.2)' }}>
              <div className="flex flex-col items-center mt-1 shrink-0">
                <span className="w-[6px] h-[6px] rounded-full bg-accent" />
                {i < filtered.length - 1 && <div className="w-[1px] flex-1 mt-1" style={{ background: '#2A2A30', minHeight: '16px' }} />}
              </div>
              <div className="flex-1 min-w-0">
                <code className="text-[11px] text-void-text font-mono block truncate">{e.command}</code>
                <div className="flex gap-2 mt-[2px]">
                  <span className="text-[9px] text-void-text-ghost font-mono">{formatTime(e.timestamp)}</span>
                  <span className="text-[9px] text-void-text-dim font-mono">{e.server}</span>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => navigator.clipboard.writeText(e.command)} className="text-[9px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">copy</button>
                <button onClick={() => {
                  if (sessionId) {
                    const tab = useAppStore.getState().tabs.find(t => t.id === useAppStore.getState().activeTabId);
                    if (tab?.sessionId) {
                      if (tab.type === 'ssh') window.void.ssh.write(tab.sessionId, e.command + '\r');
                      else window.void.pty.write(tab.sessionId, e.command + '\r');
                    }
                  }
                  onClose();
                }} className="text-[9px] text-void-text-ghost hover:text-status-online bg-transparent border-none cursor-pointer font-mono">run</button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-2 text-[9px] text-void-text-ghost font-mono shrink-0" style={{ borderTop: '0.5px solid var(--border)' }}>
          {filtered.length} commands
        </div>
      </div>
    </div>
  );
}
