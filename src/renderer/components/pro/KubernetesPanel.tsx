import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface Pod { name: string; status: string; restarts: string; age: string; node: string; ready: string; }

const STATUS_COLORS: Record<string, string> = { Running: '#28C840', Pending: '#FEBC2E', CrashLoopBackOff: '#FF5F57', Error: '#FF5F57', Completed: '#5B9BD5', Terminating: '#555' };

export function KubernetesPanel({ onClose }: { onClose: () => void }) {
  const [context, setContext] = useState('');
  const [contexts, setContexts] = useState<string[]>([]);
  const [namespace, setNamespace] = useState('default');
  const [namespaces, setNamespaces] = useState<string[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPod, setSelectedPod] = useState<string | null>(null);
  const [logs, setLogs] = useState('');
  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const exec = async (cmd: string) => sessionId ? (await (window as any).void.ssh.exec(sessionId, cmd)).stdout : '';

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    Promise.all([
      exec('kubectl config get-contexts -o name 2>/dev/null'),
      exec('kubectl config current-context 2>/dev/null'),
      exec('kubectl get namespaces -o name 2>/dev/null'),
    ]).then(([ctxs, current, nss]) => {
      setContexts(ctxs.trim().split('\n').filter(Boolean));
      setContext(current.trim());
      setNamespaces(nss.trim().split('\n').map((n: string) => n.replace('namespace/', '')).filter(Boolean));
      loadPods();
    });
  }, [sessionId]);

  const loadPods = async () => {
    setLoading(true);
    const res = await exec(`kubectl get pods -n ${namespace} --no-headers 2>/dev/null`);
    const parsed = res.trim().split('\n').filter(Boolean).map((line: string) => {
      const p = line.split(/\s+/);
      return { name: p[0] || '', ready: p[1] || '', status: p[2] || '', restarts: p[3] || '', age: p[4] || '', node: p[6] || '' };
    });
    setPods(parsed);
    setLoading(false);
  };

  const viewLogs = async (podName: string) => {
    setSelectedPod(podName);
    const res = await exec(`kubectl logs --tail=100 ${podName} -n ${namespace} 2>&1`);
    setLogs(res);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '800px', maxHeight: '85vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-void-text font-semibold font-sans">Kubernetes</span>
            <select value={context} onChange={e => { setContext(e.target.value); exec(`kubectl config use-context ${e.target.value}`).then(loadPods); }}
              className="text-[10px] font-mono bg-void-input rounded-[4px] px-2 py-1 text-void-text-muted outline-none" style={{ border: '0.5px solid var(--border)' }}>
              {contexts.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={namespace} onChange={e => { setNamespace(e.target.value); setTimeout(loadPods, 100); }}
              className="text-[10px] font-mono bg-void-input rounded-[4px] px-2 py-1 text-void-text-muted outline-none" style={{ border: '0.5px solid var(--border)' }}>
              {namespaces.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadPods} className="text-[10px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">↻</button>
            <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Loading pods...</div>
          : pods.length === 0 ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">No pods found. Is kubectl configured?</div>
          : pods.map(pod => (
            <div key={pod.name} className={`group flex items-center gap-3 px-5 py-[8px] cursor-pointer transition-colors ${selectedPod === pod.name ? 'bg-void-elevated' : 'hover:bg-void-elevated/50'}`}
              style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }} onClick={() => viewLogs(pod.name)}>
              <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: STATUS_COLORS[pod.status] || '#555' }} />
              <span className="text-[11px] text-void-text font-mono font-medium flex-1 truncate">{pod.name}</span>
              <span className="text-[9px] font-mono" style={{ color: STATUS_COLORS[pod.status] || '#555' }}>{pod.status}</span>
              <span className="text-[9px] text-void-text-ghost font-mono">{pod.ready}</span>
              <span className="text-[9px] text-void-text-ghost font-mono">{pod.restarts}↻</span>
              <span className="text-[9px] text-void-text-ghost font-mono">{pod.age}</span>
            </div>
          ))}
        </div>
        {selectedPod && (
          <div className="shrink-0" style={{ height: '220px', borderTop: '0.5px solid var(--border)' }}>
            <div className="flex items-center gap-2 px-5 py-[6px]" style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--input)' }}>
              <span className="text-[10px] text-accent font-mono font-semibold">LOGS</span>
              <span className="text-[10px] text-void-text-dim font-mono">{selectedPod}</span>
              <span className="flex-1" />
              <button onClick={() => setSelectedPod(null)} className="text-[12px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer">×</button>
            </div>
            <pre className="overflow-y-auto p-3 text-[10px] font-mono text-void-text-muted leading-[1.6] h-[180px] select-text"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent', background: 'var(--base)' }}>{logs || 'Loading...'}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
