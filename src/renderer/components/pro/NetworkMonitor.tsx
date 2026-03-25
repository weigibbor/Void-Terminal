import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store';

interface NetConnection {
  proto: string;
  localAddr: string;
  remoteAddr: string;
  state: string;
  pid: string;
  process: string;
}

export function NetworkMonitor({ onClose }: { onClose: () => void }) {
  const [connections, setConnections] = useState<NetConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const fetchConnections = useCallback(async () => {
    if (!sessionId) return;
    const result = await (window as any).void.ssh.exec(sessionId, "ss -tupn 2>/dev/null | tail -50 || netstat -tupn 2>/dev/null | tail -50");
    if (result.stdout) {
      const lines = result.stdout.trim().split('\n').slice(1);
      const parsed = lines.map((line: string) => {
        const parts = line.split(/\s+/).filter(Boolean);
        if (parts.length < 5) return null;
        return {
          proto: parts[0] || '',
          localAddr: parts[3] || '',
          remoteAddr: parts[4] || '',
          state: parts[1] || '',
          pid: parts[5]?.match(/pid=(\d+)/)?.[1] || parts[6] || '',
          process: parts[5]?.match(/"([^"]+)"/)?.[1] || '',
        };
      }).filter(Boolean) as NetConnection[];
      setConnections(parsed);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchConnections();
    const interval = setInterval(fetchConnections, 10000);
    return () => clearInterval(interval);
  }, [fetchConnections]);

  const stateColor = (s: string) => s === 'ESTAB' || s === 'ESTABLISHED' ? '#28C840' : s === 'LISTEN' ? '#5B9BD5' : s === 'TIME-WAIT' || s === 'TIME_WAIT' ? '#555' : '#888';
  const filtered = filter ? connections.filter(c => c.localAddr.includes(filter) || c.remoteAddr.includes(filter) || c.process.includes(filter)) : connections;
  const listening = connections.filter(c => c.state === 'LISTEN').length;
  const established = connections.filter(c => c.state === 'ESTAB' || c.state === 'ESTABLISHED').length;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '800px', height: '75vh', background: 'var(--base)', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-void-text font-semibold font-sans">Network Monitor</span>
            <span className="text-[10px] text-void-text-dim font-mono">{established} established · {listening} listening</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter..."
              className="px-2 py-1 bg-void-elevated border border-void-border rounded-[4px] text-[10px] text-void-text font-mono outline-none w-36" />
            <button onClick={fetchConnections} className="text-[10px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">↻</button>
            <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
          </div>
        </div>
        <div className="flex px-5 py-2 text-[9px] text-void-text-ghost uppercase tracking-[0.5px] font-mono shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <span className="w-12">Proto</span>
          <span className="w-48">Local Address</span>
          <span className="w-48">Remote Address</span>
          <span className="w-24">State</span>
          <span className="flex-1">Process</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? (
            <div className="p-8 text-center text-[11px] text-void-text-ghost font-mono">Loading...</div>
          ) : filtered.map((c, i) => (
            <div key={i} className="flex items-center px-5 py-[4px] text-[10px] font-mono hover:bg-void-elevated" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.2)' }}>
              <span className="w-12 text-void-text-dim">{c.proto}</span>
              <span className="w-48 text-void-text-muted truncate">{c.localAddr}</span>
              <span className="w-48 text-void-text-muted truncate">{c.remoteAddr}</span>
              <span className="w-24" style={{ color: stateColor(c.state) }}>{c.state}</span>
              <span className="flex-1 text-void-text-ghost truncate">{c.process || c.pid}</span>
            </div>
          ))}
        </div>
        <div className="px-5 py-2 text-[9px] text-void-text-ghost font-mono shrink-0" style={{ borderTop: '0.5px solid #2A2A30' }}>
          {filtered.length} connections · auto-refresh 10s
        </div>
      </div>
    </div>
  );
}
