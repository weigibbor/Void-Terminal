import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store';

interface Container {
  id: string;
  name: string;
  image: string;
  status: string;
  state: 'running' | 'exited' | 'paused' | 'created';
  ports: string;
  uptime: string;
  compose?: string;
}

function parseDockerPs(output: string): Container[] {
  const lines = output.trim().split('\n').slice(1); // skip header
  return lines.map(line => {
    const parts = line.split(/\s{2,}/);
    if (parts.length < 5) return null;
    const [id, image, , , status, ports, name] = parts;
    const state = status?.toLowerCase().includes('up') ? 'running' : status?.toLowerCase().includes('paused') ? 'paused' : 'exited';
    const uptimeMatch = status?.match(/Up\s+(.*)/);
    return {
      id: id?.substring(0, 12) || '',
      name: (name || parts[parts.length - 1] || '').trim(),
      image: image || '',
      status: status || '',
      state,
      ports: ports || '',
      uptime: uptimeMatch ? uptimeMatch[1] : status || '',
      compose: undefined,
    };
  }).filter(Boolean) as Container[];
}

export function DockerPanel({ onClose }: { onClose: () => void }) {
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const [logsLoading, setLogsLoading] = useState(false);

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const fetchContainers = useCallback(async () => {
    if (!sessionId) { setError('No active SSH session'); setLoading(false); return; }
    try {
      const result = await (window as any).void.ssh.exec(sessionId, 'docker ps -a --format "table {{.ID}}\t{{.Image}}\t{{.Command}}\t{{.CreatedAt}}\t{{.Status}}\t{{.Ports}}\t{{.Names}}" 2>/dev/null');
      if (result.code !== 0) { setError(result.stderr || 'Docker not available'); setLoading(false); return; }
      setContainers(parseDockerPs(result.stdout));
      setLoading(false);
      setError('');
    } catch { setError('Failed to fetch containers'); setLoading(false); }
  }, [sessionId]);

  useEffect(() => { fetchContainers(); }, [fetchContainers]);

  const fetchLogs = async (containerId: string) => {
    if (!sessionId) return;
    setSelectedId(containerId);
    setLogsLoading(true);
    const result = await (window as any).void.ssh.exec(sessionId, `docker logs --tail 100 ${containerId} 2>&1`);
    setLogs(result.stdout || result.stderr || '(no logs)');
    setLogsLoading(false);
  };

  const containerAction = async (containerId: string, action: 'start' | 'stop' | 'restart') => {
    if (!sessionId) return;
    await (window as any).void.ssh.exec(sessionId, `docker ${action} ${containerId}`);
    fetchContainers();
  };

  const running = containers.filter(c => c.state === 'running').length;
  const stopped = containers.length - running;

  const stateColor = (state: string) => state === 'running' ? '#28C840' : state === 'paused' ? '#FEBC2E' : '#FF5F57';

  return (
    <div className="flex flex-col h-full bg-void-surface">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-void-text font-semibold font-sans">Docker</span>
          <span className="text-[10px] text-void-text-dim font-mono">{running} running, {stopped} stopped</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchContainers} className="text-[10px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">↻</button>
          <button onClick={onClose} className="text-[16px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
      </div>

      {/* Container list */}
      <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
        {loading ? (
          <div className="p-4 text-[11px] text-void-text-ghost font-mono text-center">Loading containers...</div>
        ) : error ? (
          <div className="p-4 text-[11px] text-status-error font-mono text-center">{error}</div>
        ) : containers.length === 0 ? (
          <div className="p-4 text-[11px] text-void-text-ghost font-mono text-center">No containers found</div>
        ) : (
          containers.map(c => (
            <div key={c.id}
              className={`group flex items-center gap-[10px] px-4 py-[8px] cursor-pointer transition-colors ${selectedId === c.id ? 'bg-void-elevated' : 'hover:bg-void-elevated/50'}`}
              style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)', borderLeft: selectedId === c.id ? '2px solid #F97316' : '2px solid transparent' }}
              onClick={() => fetchLogs(c.id)}>
              <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: stateColor(c.state) }} />
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-void-text font-mono font-medium truncate">{c.name}</div>
                <div className="flex gap-2 text-[9px] text-void-text-dim font-mono mt-[1px]">
                  <span>{c.image}</span>
                  {c.ports && <span>· {c.ports}</span>}
                </div>
              </div>
              <span className="text-[9px] font-mono" style={{ color: stateColor(c.state) }}>{c.state}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {c.state !== 'running' && (
                  <button onClick={(e) => { e.stopPropagation(); containerAction(c.id, 'start'); }}
                    className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[10px] text-void-text-dim hover:text-status-online cursor-pointer" style={{ border: '0.5px solid #2A2A30' }}>▶</button>
                )}
                {c.state === 'running' && (
                  <button onClick={(e) => { e.stopPropagation(); containerAction(c.id, 'stop'); }}
                    className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[10px] text-void-text-dim hover:text-status-error cursor-pointer" style={{ border: '0.5px solid #2A2A30' }}>■</button>
                )}
                <button onClick={(e) => { e.stopPropagation(); containerAction(c.id, 'restart'); }}
                  className="w-[22px] h-[22px] rounded-[4px] flex items-center justify-center text-[10px] text-void-text-dim hover:text-accent cursor-pointer" style={{ border: '0.5px solid #2A2A30' }}>↻</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Logs panel */}
      {selectedId && (
        <div className="shrink-0" style={{ height: '240px', borderTop: '0.5px solid #2A2A30' }}>
          <div className="flex items-center gap-2 px-4 py-[6px]" style={{ borderBottom: '0.5px solid #2A2A30', background: 'var(--input, #0E0E12)' }}>
            <span className="text-[10px] text-accent font-mono font-semibold">LOGS</span>
            <span className="text-[10px] text-void-text-dim font-mono">{containers.find(c => c.id === selectedId)?.name}</span>
            <span className="flex-1" />
            <button onClick={() => { setSelectedId(null); setLogs(''); }}
              className="text-[12px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer">×</button>
          </div>
          <pre className="overflow-y-auto p-3 text-[10px] font-mono text-void-text-muted leading-[1.6] h-[200px]"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent', background: 'var(--base, #0A0A0D)' }}>
            {logsLoading ? 'Loading logs...' : logs}
          </pre>
        </div>
      )}
    </div>
  );
}
