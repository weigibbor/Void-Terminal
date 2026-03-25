import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../stores/app-store';

export function LogViewer({ onClose }: { onClose: () => void }) {
  const [logPath, setLogPath] = useState('/var/log/syslog');
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [search, setSearch] = useState('');
  const [levels, setLevels] = useState({ error: true, warn: true, info: true, debug: true });
  const scrollRef = useRef<HTMLPreElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const fetchLogs = async () => {
    if (!sessionId || paused) return;
    const result = await (window as any).void.ssh.exec(sessionId, `tail -100 ${logPath} 2>/dev/null || echo "(file not found)"`);
    if (result.stdout) {
      setLines(result.stdout.split('\n').filter(Boolean));
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchLogs();
    intervalRef.current = setInterval(fetchLogs, 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [sessionId, logPath, paused]);

  const toggleLevel = (level: string) => setLevels(prev => ({ ...prev, [level]: !prev[level as keyof typeof prev] }));

  const getLevel = (line: string) => {
    const l = line.toLowerCase();
    if (l.includes('error') || l.includes('fatal') || l.includes('crit')) return 'error';
    if (l.includes('warn')) return 'warn';
    if (l.includes('debug') || l.includes('trace')) return 'debug';
    return 'info';
  };

  const levelColor = (l: string) => l === 'error' ? '#FF5F57' : l === 'warn' ? '#FEBC2E' : l === 'debug' ? '#555' : '#5B9BD5';

  const filtered = lines.filter(line => {
    const level = getLevel(line);
    if (!levels[level as keyof typeof levels]) return false;
    if (search && !line.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '800px', height: '80vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Log Viewer</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="flex items-center gap-2 px-5 py-2 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <input type="text" value={logPath} onChange={e => setLogPath(e.target.value)}
            className="flex-1 px-2 py-1 bg-void-elevated border border-void-border rounded-[4px] text-[10px] text-void-text font-mono outline-none" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="px-2 py-1 bg-void-elevated border border-void-border rounded-[4px] text-[10px] text-void-text font-mono outline-none w-32" />
          <button onClick={() => setPaused(!paused)} className={`px-2 py-1 rounded-[4px] text-[9px] font-mono cursor-pointer ${paused ? 'text-accent' : 'text-void-text-ghost'}`}
            style={{ border: '0.5px solid var(--border)' }}>{paused ? '▶ Resume' : '⏸ Pause'}</button>
        </div>
        <div className="flex gap-2 px-5 py-[6px] shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          {(['error', 'warn', 'info', 'debug'] as const).map(l => (
            <button key={l} onClick={() => toggleLevel(l)}
              className={`px-2 py-[2px] rounded-[3px] text-[9px] font-mono cursor-pointer ${levels[l] ? '' : 'opacity-30'}`}
              style={{ color: levelColor(l), border: `0.5px solid ${levels[l] ? levelColor(l) + '40' : '#2A2A30'}` }}>
              {l.toUpperCase()}
            </button>
          ))}
          <span className="text-[9px] text-void-text-ghost font-mono ml-auto">{filtered.length} lines</span>
        </div>
        <pre ref={scrollRef} className="flex-1 overflow-y-auto p-4 text-[10px] font-mono leading-[1.6]"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? 'Loading...' : filtered.map((line, i) => {
            const level = getLevel(line);
            const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const highlighted = safeSearch ? line.replace(new RegExp(`(${safeSearch})`, 'gi'), '█$1█') : line;
            return <div key={i} style={{ color: levelColor(level) }}>{highlighted}</div>;
          })}
        </pre>
      </div>
    </div>
  );
}
