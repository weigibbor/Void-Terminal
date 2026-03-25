import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface DiskEntry { name: string; size: string; bytes: number; isDir: boolean; }

function parseSize(s: string): number {
  const m = s.match(/([\d.]+)([KMGTP]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  const u = (m[2] || '').toUpperCase();
  const mul: Record<string, number> = { '': 1, K: 1024, M: 1048576, G: 1073741824, T: 1099511627776 };
  return n * (mul[u] || 1);
}

function getColor(i: number): string {
  const colors = ['#F97316', '#5B9BD5', '#28C840', '#C586C0', '#FEBC2E', '#FF5F57', '#56B6C2', '#D2A8FF'];
  return colors[i % colors.length];
}

export function DiskUsageMap({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<DiskEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [loading, setLoading] = useState(true);
  const [diskInfo, setDiskInfo] = useState('');
  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const loadDir = async (dir: string) => {
    if (!sessionId) return;
    setLoading(true);
    const [duRes, dfRes] = await Promise.all([
      (window as any).void.ssh.exec(sessionId, `du -sh ${dir}*/ ${dir}* 2>/dev/null | sort -rh | head -20`),
      (window as any).void.ssh.exec(sessionId, `df -h ${dir} 2>/dev/null | tail -1`),
    ]);
    const parsed = duRes.stdout.trim().split('\n').map((line: string) => {
      const [size, ...pathParts] = line.split('\t');
      const fullPath = pathParts.join('\t').trim();
      const name = fullPath.split('/').filter(Boolean).pop() || fullPath;
      return { name, size: size?.trim() || '0', bytes: parseSize(size?.trim() || '0'), isDir: fullPath.endsWith('/') };
    }).filter((e: DiskEntry) => e.name && e.bytes > 0);
    setEntries(parsed);
    setCurrentPath(dir);
    setDiskInfo(dfRes.stdout.trim());
    setLoading(false);
  };

  useEffect(() => { loadDir('/'); }, [sessionId]);

  const totalBytes = entries.reduce((s, e) => s + e.bytes, 0);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '700px', maxHeight: '80vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div>
            <div className="text-[13px] text-void-text font-semibold font-sans">Disk Usage</div>
            {diskInfo && <div className="text-[10px] text-void-text-dim font-mono">{diskInfo}</div>}
          </div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="flex items-center gap-[4px] px-5 py-2 text-[11px] font-mono text-void-text-dim shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <span className="text-accent cursor-pointer hover:underline" onClick={() => loadDir('/')}>/</span>
          {currentPath.split('/').filter(Boolean).map((seg, i, arr) => (
            <span key={i} className="flex items-center gap-[4px]">
              <span className="text-void-text-ghost">/</span>
              <span className="text-accent cursor-pointer hover:underline" onClick={() => loadDir('/' + arr.slice(0, i + 1).join('/') + '/')}>{seg}</span>
            </span>
          ))}
        </div>
        {/* Treemap-style bars */}
        <div className="px-5 py-3 shrink-0">
          <div className="flex h-[24px] rounded-[4px] overflow-hidden" style={{ border: '0.5px solid var(--border)' }}>
            {entries.slice(0, 10).map((e, i) => (
              <div key={i} title={`${e.name}: ${e.size}`} className="h-full cursor-pointer hover:opacity-80 transition-opacity"
                style={{ width: `${Math.max((e.bytes / totalBytes) * 100, 2)}%`, background: getColor(i) }}
                onClick={() => e.isDir && loadDir(currentPath + e.name + '/')} />
            ))}
          </div>
        </div>
        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Scanning...</div>
          : entries.map((e, i) => (
            <div key={i} className="flex items-center gap-3 py-[6px] cursor-pointer hover:bg-void-elevated rounded-[4px] px-2"
              onClick={() => e.isDir && loadDir(currentPath + e.name + '/')}>
              <div className="w-[8px] h-[8px] rounded-[2px] shrink-0" style={{ background: getColor(i) }} />
              <span className="text-[11px] font-mono text-void-text flex-1 truncate">{e.name}{e.isDir ? '/' : ''}</span>
              <span className="text-[11px] font-mono text-void-text-muted">{e.size}</span>
              <div className="w-[80px] h-[4px] rounded-full overflow-hidden shrink-0" style={{ background: 'var(--border)' }}>
                <div className="h-full rounded-full" style={{ width: `${(e.bytes / totalBytes) * 100}%`, background: getColor(i) }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
