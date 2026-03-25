import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';

interface DiffLine { type: 'same' | 'add' | 'remove' | 'change'; left: string; right: string; leftNum: number; rightNum: number; }

function computeDiff(a: string, b: string): DiffLine[] {
  const linesA = a.split('\n');
  const linesB = b.split('\n');
  const result: DiffLine[] = [];
  const maxLen = Math.max(linesA.length, linesB.length);
  let ln = 1, rn = 1;
  for (let i = 0; i < maxLen; i++) {
    const left = linesA[i] ?? '';
    const right = linesB[i] ?? '';
    if (i >= linesA.length) result.push({ type: 'add', left: '', right, leftNum: 0, rightNum: rn++ });
    else if (i >= linesB.length) result.push({ type: 'remove', left, right: '', leftNum: ln++, rightNum: 0 });
    else if (left === right) result.push({ type: 'same', left, right, leftNum: ln++, rightNum: rn++ });
    else result.push({ type: 'change', left, right, leftNum: ln++, rightNum: rn++ });
  }
  return result;
}

export function FileDiffViewer({ onClose }: { onClose: () => void }) {
  const [fileA, setFileA] = useState('');
  const [fileB, setFileB] = useState('');
  const [pathA, setPathA] = useState('');
  const [pathB, setPathB] = useState('');
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [loading, setLoading] = useState(false);
  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const loadDiff = async () => {
    if (!sessionId || !pathA || !pathB) return;
    setLoading(true);
    const [resA, resB] = await Promise.all([
      (window as any).void.ssh.exec(sessionId, `cat "${pathA}" 2>/dev/null`),
      (window as any).void.ssh.exec(sessionId, `cat "${pathB}" 2>/dev/null`),
    ]);
    setFileA(resA.stdout); setFileB(resB.stdout);
    setDiff(computeDiff(resA.stdout, resB.stdout));
    setLoading(false);
  };

  const stats = { added: diff.filter(d => d.type === 'add').length, removed: diff.filter(d => d.type === 'remove').length, changed: diff.filter(d => d.type === 'change').length };
  const colors = { same: 'transparent', add: 'rgba(40,200,64,0.08)', remove: 'rgba(255,95,87,0.08)', change: 'rgba(254,188,46,0.08)' };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '900px', maxHeight: '80vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">File Diff</div>
          {diff.length > 0 && <span className="text-[10px] font-mono"><span className="text-status-online">+{stats.added}</span> <span className="text-status-error">-{stats.removed}</span> <span className="text-status-warning">~{stats.changed}</span></span>}
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="flex gap-2 px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <input value={pathA} onChange={e => setPathA(e.target.value)} placeholder="File A path (e.g. /etc/nginx/nginx.conf)" className="flex-1 px-3 py-2 bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none" style={{ border: '0.5px solid var(--border)' }} />
          <input value={pathB} onChange={e => setPathB(e.target.value)} placeholder="File B path" className="flex-1 px-3 py-2 bg-void-input rounded-[6px] text-[11px] text-void-text font-mono outline-none" style={{ border: '0.5px solid var(--border)' }} />
          <button onClick={loadDiff} className="px-4 py-2 rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#F97316', color: 'var(--base)' }}>Compare</button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Loading...</div>
          : diff.length === 0 ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Enter two file paths and click Compare</div>
          : <div className="font-mono text-[11px] leading-[1.6]">
              {diff.map((d, i) => (
                <div key={i} className="flex" style={{ background: colors[d.type] }}>
                  <div className="w-[40px] text-right pr-2 shrink-0 select-none" style={{ color: 'var(--ghost)' }}>{d.leftNum || ''}</div>
                  <div className="flex-1 px-2 border-r" style={{ borderColor: 'var(--border)', color: d.type === 'remove' ? '#FF5F57' : d.type === 'change' ? '#FEBC2E' : 'var(--muted)' }}>{d.left}</div>
                  <div className="w-[40px] text-right pr-2 shrink-0 select-none" style={{ color: 'var(--ghost)' }}>{d.rightNum || ''}</div>
                  <div className="flex-1 px-2" style={{ color: d.type === 'add' ? '#28C840' : d.type === 'change' ? '#FEBC2E' : 'var(--muted)' }}>{d.right}</div>
                </div>
              ))}
            </div>}
        </div>
      </div>
    </div>
  );
}
