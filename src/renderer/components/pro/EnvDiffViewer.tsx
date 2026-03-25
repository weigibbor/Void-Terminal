import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';

export function EnvDiffViewer({ onClose }: { onClose: () => void }) {
  const tabs = useAppStore((s) => s.tabs);
  const connectedTabs = tabs.filter(t => t.connected && t.sessionId && t.type === 'ssh');
  const [serverA, setServerA] = useState(connectedTabs[0]?.id || '');
  const [serverB, setServerB] = useState(connectedTabs[1]?.id || '');
  const [envPath, setEnvPath] = useState('.env');
  const [diffResult, setDiffResult] = useState<{ key: string; a: string; b: string; status: 'same' | 'different' | 'only-a' | 'only-b' }[]>([]);
  const [loading, setLoading] = useState(false);

  const compare = async () => {
    const tabA = tabs.find(t => t.id === serverA);
    const tabB = tabs.find(t => t.id === serverB);
    if (!tabA?.sessionId || !tabB?.sessionId) return;
    setLoading(true);
    const [resultA, resultB] = await Promise.all([
      (window as any).void.ssh.exec(tabA.sessionId, `cat ${envPath} 2>/dev/null || echo ""`),
      (window as any).void.ssh.exec(tabB.sessionId, `cat ${envPath} 2>/dev/null || echo ""`),
    ]);
    const parseEnv = (text: string) => {
      const map = new Map<string, string>();
      text.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eq = trimmed.indexOf('=');
        if (eq > 0) map.set(trimmed.substring(0, eq), trimmed.substring(eq + 1));
      });
      return map;
    };
    const envA = parseEnv(resultA.stdout || '');
    const envB = parseEnv(resultB.stdout || '');
    const allKeys = new Set([...envA.keys(), ...envB.keys()]);
    const diff = Array.from(allKeys).sort().map(key => {
      const a = envA.get(key) || '';
      const b = envB.get(key) || '';
      const status = !envA.has(key) ? 'only-b' : !envB.has(key) ? 'only-a' : a === b ? 'same' : 'different';
      return { key, a, b, status: status as any };
    });
    setDiffResult(diff);
    setLoading(false);
  };

  const statusColor = (s: string) => s === 'same' ? '#28C840' : s === 'different' ? '#FEBC2E' : s === 'only-a' ? '#5B9BD5' : '#C586C0';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '700px', maxHeight: '80vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Environment Diff</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="px-5 py-3 shrink-0 flex gap-2 items-end" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex-1">
            <label className="block text-[9px] text-void-text-dim uppercase tracking-[0.5px] mb-1">Server A</label>
            <select value={serverA} onChange={e => setServerA(e.target.value)} className="w-full bg-void-input border border-void-border rounded-[4px] text-[10px] text-void-text-muted px-2 py-1 font-mono">
              {connectedTabs.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[9px] text-void-text-dim uppercase tracking-[0.5px] mb-1">Server B</label>
            <select value={serverB} onChange={e => setServerB(e.target.value)} className="w-full bg-void-input border border-void-border rounded-[4px] text-[10px] text-void-text-muted px-2 py-1 font-mono">
              {connectedTabs.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-void-text-dim uppercase tracking-[0.5px] mb-1">File</label>
            <input type="text" value={envPath} onChange={e => setEnvPath(e.target.value)} className="bg-void-input border border-void-border rounded-[4px] text-[10px] text-void-text-muted px-2 py-1 font-mono w-24" />
          </div>
          <button onClick={compare} disabled={loading} className="px-3 py-1 rounded-[4px] text-[10px] font-semibold cursor-pointer font-sans border-none"
            style={{ background: '#F97316', color: 'var(--base)' }}>{loading ? '...' : 'Compare'}</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {diffResult.length === 0 ? (
            <div className="text-[11px] text-void-text-ghost font-mono text-center py-8">Select two servers and compare</div>
          ) : diffResult.map(d => (
            <div key={d.key} className="flex items-start gap-2 py-[4px] px-2 rounded-[4px]" style={{ background: d.status === 'same' ? undefined : 'rgba(254,188,46,0.02)' }}>
              <span className="w-[6px] h-[6px] rounded-full shrink-0 mt-[5px]" style={{ background: statusColor(d.status) }} />
              <span className="text-[10px] text-void-text font-mono font-medium w-32 shrink-0 truncate">{d.key}</span>
              <span className="text-[9px] text-void-text-muted font-mono flex-1 truncate">{d.a || '—'}</span>
              {d.status !== 'same' && <span className="text-[9px] font-mono flex-1 truncate" style={{ color: statusColor(d.status) }}>{d.b || '—'}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
