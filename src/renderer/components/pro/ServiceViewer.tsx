import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface Service {
  name: string;
  status: 'active' | 'inactive' | 'failed' | 'unknown';
  description: string;
}

export function ServiceViewer({ onClose }: { onClose: () => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState('');
  const [selectedService, setSelectedService] = useState('');

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  useEffect(() => {
    if (!sessionId) return;
    // Try systemctl first, fallback to pm2
    (window as any).void.ssh.exec(sessionId, "systemctl list-units --type=service --state=active,failed --no-pager --no-legend 2>/dev/null | head -30 | awk '{print $1, $3, $5}'").then((result: any) => {
      if (result.stdout?.trim()) {
        const parsed = result.stdout.trim().split('\n').map((line: string) => {
          const [name, status, ...desc] = line.split(/\s+/);
          return { name: name?.replace('.service', '') || '', status: (status as any) || 'unknown', description: desc.join(' ') };
        }).filter((s: Service) => s.name);
        setServices(parsed);
      }
      setLoading(false);
    });
  }, [sessionId]);

  const restartService = async (name: string) => {
    if (!sessionId) return;
    await (window as any).void.ssh.exec(sessionId, `sudo systemctl restart ${name} 2>/dev/null || pm2 restart ${name} 2>/dev/null`);
    // Refresh
    const result = await (window as any).void.ssh.exec(sessionId, `systemctl status ${name} --no-pager 2>/dev/null | head -10`);
    setLogs(result.stdout || result.stderr);
  };

  const viewLogs = async (name: string) => {
    if (!sessionId) return;
    setSelectedService(name);
    const result = await (window as any).void.ssh.exec(sessionId, `journalctl -u ${name} --no-pager -n 50 2>/dev/null || pm2 logs ${name} --lines 50 --nostream 2>/dev/null`);
    setLogs(result.stdout || result.stderr || '(no logs)');
  };

  const statusColor = (s: string) => s === 'active' ? '#28C840' : s === 'failed' ? '#FF5F57' : '#888';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '600px', maxHeight: '80vh', background: 'var(--base)', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Services — {activeTab?.title}</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? (
            <div className="text-[11px] text-void-text-ghost font-mono text-center py-6">Loading services...</div>
          ) : services.length === 0 ? (
            <div className="text-[11px] text-void-text-ghost font-mono text-center py-6">No services found</div>
          ) : (
            <div className="flex flex-col gap-[4px]">
              {services.map(s => (
                <div key={s.name} className="group flex items-center gap-2 p-[10px] rounded-[6px] bg-void-surface" style={{ border: '0.5px solid #2A2A30' }}>
                  <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: statusColor(s.status) }} />
                  <span className="text-[11px] text-void-text font-mono font-medium flex-1 truncate">{s.name}</span>
                  <span className="text-[9px] font-mono" style={{ color: statusColor(s.status) }}>{s.status}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => viewLogs(s.name)} className="text-[9px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">logs</button>
                    <button onClick={() => restartService(s.name)} className="text-[9px] text-void-text-ghost hover:text-status-warning bg-transparent border-none cursor-pointer font-mono">restart</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        {logs && (
          <div className="shrink-0" style={{ maxHeight: '200px', borderTop: '0.5px solid #2A2A30' }}>
            <div className="flex items-center justify-between px-4 py-[6px]" style={{ background: 'var(--input, #0E0E12)' }}>
              <span className="text-[10px] text-accent font-mono font-semibold">LOGS — {selectedService}</span>
              <button onClick={() => setLogs('')} className="text-[12px] text-void-text-ghost bg-transparent border-none cursor-pointer">×</button>
            </div>
            <pre className="overflow-y-auto p-3 text-[9px] font-mono text-void-text-muted leading-[1.5]" style={{ maxHeight: '160px', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>{logs}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
