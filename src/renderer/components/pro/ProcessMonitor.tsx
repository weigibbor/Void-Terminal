import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store';

interface Process {
  pid: string;
  user: string;
  cpu: number;
  mem: number;
  time: string;
  command: string;
}

export function ProcessMonitor({ onClose }: { onClose: () => void }) {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [cpuUsage, setCpuUsage] = useState(0);
  const [memUsage, setMemUsage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'cpu' | 'mem' | 'pid'>('cpu');
  const [search, setSearch] = useState('');

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const fetchProcesses = useCallback(async () => {
    if (!sessionId) return;
    const result = await (window as any).void.ssh.exec(sessionId, "ps aux --sort=-%cpu 2>/dev/null | head -50 | awk 'NR>1{printf \"%s|%s|%s|%s|%s|\",$2,$1,$3,$4,$10; for(i=11;i<=NF;i++) printf \"%s \",$i; print \"\"}'");
    if (result.stdout) {
      const parsed = result.stdout.trim().split('\n').map((line: string) => {
        const [pid, user, cpu, mem, time, ...cmd] = line.split('|');
        return { pid, user, cpu: parseFloat(cpu) || 0, mem: parseFloat(mem) || 0, time, command: cmd.join('').trim() };
      }).filter((p: Process) => p.pid);
      setProcesses(parsed);
    }
    const cpuResult = await (window as any).void.ssh.exec(sessionId, "top -bn1 2>/dev/null | grep 'Cpu(s)' | awk '{print $2}' || echo '0'");
    setCpuUsage(parseFloat(cpuResult.stdout) || 0);
    const memResult = await (window as any).void.ssh.exec(sessionId, "free 2>/dev/null | awk '/Mem:/{printf \"%.1f\", $3/$2*100}' || echo '0'");
    setMemUsage(parseFloat(memResult.stdout) || 0);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchProcesses();
    const interval = setInterval(fetchProcesses, 5000);
    return () => clearInterval(interval);
  }, [fetchProcesses]);

  const killProcess = async (pid: string) => {
    if (!sessionId || !confirm(`Kill process ${pid}?`)) return;
    await (window as any).void.ssh.exec(sessionId, `kill -9 ${pid}`);
    fetchProcesses();
  };

  const sorted = [...processes].sort((a, b) => sortBy === 'cpu' ? b.cpu - a.cpu : sortBy === 'mem' ? b.mem - a.mem : parseInt(a.pid) - parseInt(b.pid));
  const filtered = search ? sorted.filter(p => p.command.toLowerCase().includes(search.toLowerCase()) || p.user.includes(search)) : sorted;
  const barColor = (v: number) => v < 30 ? '#28C840' : v < 70 ? '#FEBC2E' : '#FF5F57';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '900px', height: '85vh', background: 'var(--base)', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div className="flex items-center gap-3">
            <span className="text-[14px] text-void-text font-semibold font-sans">Process Monitor</span>
            <span className="text-[10px] text-void-text-dim font-mono">{activeTab?.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter..." className="px-2 py-1 bg-void-elevated border border-void-border rounded-[4px] text-[10px] text-void-text font-mono outline-none w-40" />
            <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
          </div>
        </div>
        {/* System bars */}
        <div className="flex gap-4 px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-mono mb-1"><span className="text-void-text-dim">CPU</span><span style={{ color: barColor(cpuUsage) }}>{cpuUsage.toFixed(1)}%</span></div>
            <div className="h-[6px] rounded-full bg-void-elevated overflow-hidden"><div style={{ width: `${cpuUsage}%`, height: '100%', background: barColor(cpuUsage), borderRadius: '3px', transition: 'width 0.5s' }} /></div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-[9px] font-mono mb-1"><span className="text-void-text-dim">MEM</span><span style={{ color: barColor(memUsage) }}>{memUsage.toFixed(1)}%</span></div>
            <div className="h-[6px] rounded-full bg-void-elevated overflow-hidden"><div style={{ width: `${memUsage}%`, height: '100%', background: barColor(memUsage), borderRadius: '3px', transition: 'width 0.5s' }} /></div>
          </div>
        </div>
        {/* Process table */}
        <div className="flex px-5 py-2 text-[9px] text-void-text-ghost uppercase tracking-[0.5px] font-mono shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <span className="w-16 cursor-pointer hover:text-void-text" onClick={() => setSortBy('pid')}>PID</span>
          <span className="w-20">User</span>
          <span className="w-16 cursor-pointer hover:text-void-text" onClick={() => setSortBy('cpu')}>CPU%{sortBy === 'cpu' ? ' ↓' : ''}</span>
          <span className="w-16 cursor-pointer hover:text-void-text" onClick={() => setSortBy('mem')}>MEM%{sortBy === 'mem' ? ' ↓' : ''}</span>
          <span className="flex-1">Command</span>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? (
            <div className="p-8 text-center text-[11px] text-void-text-ghost font-mono">Loading processes...</div>
          ) : filtered.map(p => (
            <div key={p.pid} className="group flex items-center px-5 py-[5px] text-[10px] font-mono hover:bg-void-elevated transition-colors" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.2)' }}>
              <span className="w-16 text-void-text-dim">{p.pid}</span>
              <span className="w-20 text-void-text-ghost truncate">{p.user}</span>
              <span className="w-16" style={{ color: barColor(p.cpu) }}>{p.cpu.toFixed(1)}</span>
              <span className="w-16" style={{ color: barColor(p.mem) }}>{p.mem.toFixed(1)}</span>
              <span className="flex-1 text-void-text-muted truncate">{p.command}</span>
              <button onClick={() => killProcess(p.pid)} className="text-[9px] text-void-text-ghost hover:text-status-error opacity-0 group-hover:opacity-100 bg-transparent border-none cursor-pointer font-mono ml-2">kill</button>
            </div>
          ))}
        </div>
        <div className="px-5 py-2 text-[9px] text-void-text-ghost font-mono shrink-0" style={{ borderTop: '0.5px solid #2A2A30' }}>
          {filtered.length} processes · auto-refresh 5s
        </div>
      </div>
    </div>
  );
}
