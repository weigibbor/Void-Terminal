import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface VHost { serverName: string; listen: string; root: string; locations: string[]; ssl: boolean; }

function parseNginxConfig(output: string): VHost[] {
  const blocks = output.split(/server\s*\{/g).slice(1);
  return blocks.map(block => {
    const serverName = block.match(/server_name\s+([^;]+)/)?.[1]?.trim() || 'default';
    const listen = block.match(/listen\s+([^;]+)/)?.[1]?.trim() || '80';
    const root = block.match(/root\s+([^;]+)/)?.[1]?.trim() || '';
    const locations = [...block.matchAll(/location\s+([^\{]+)/g)].map(m => m[1].trim());
    const ssl = listen.includes('ssl') || listen.includes('443');
    return { serverName, listen, root, locations, ssl };
  });
}

export function NginxViewer({ onClose }: { onClose: () => void }) {
  const [vhosts, setVhosts] = useState<VHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  useEffect(() => {
    if (!sessionId) { setError('No SSH session'); setLoading(false); return; }
    (window as any).void.ssh.exec(sessionId, 'cat /etc/nginx/sites-enabled/* 2>/dev/null || cat /etc/nginx/conf.d/*.conf 2>/dev/null || echo ""').then((r: any) => {
      if (r.stdout.trim()) setVhosts(parseNginxConfig(r.stdout));
      else setError('No nginx config found');
      setLoading(false);
    });
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '520px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Nginx Virtual Hosts</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: '400px', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Loading...</div>
          : error ? <div className="text-center text-[12px] text-status-error font-mono py-8">{error}</div>
          : vhosts.map((vh, i) => (
            <div key={i} className="p-3 mb-2 rounded-[8px] bg-void-surface" style={{ border: '0.5px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] text-accent font-mono font-medium">{vh.serverName}</span>
                {vh.ssl && <span className="text-[8px] text-status-online px-[5px] py-[1px] rounded-[3px]" style={{ background: 'rgba(40,200,64,0.08)' }}>SSL</span>}
                <span className="text-[9px] text-void-text-ghost font-mono ml-auto">:{vh.listen}</span>
              </div>
              {vh.root && <div className="text-[10px] text-void-text-dim font-mono">root: {vh.root}</div>}
              {vh.locations.length > 0 && <div className="text-[10px] text-void-text-ghost font-mono mt-1">locations: {vh.locations.join(', ')}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
