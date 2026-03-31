import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../stores/app-store';

interface TunnelInfo {
  id: string;
  type: 'local' | 'remote' | 'dynamic';
  localPort: number;
  remoteHost: string;
  remotePort: number;
  active: boolean;
}

export function TunnelPanel() {
  const [tunnels, setTunnels] = useState<TunnelInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [type, setType] = useState<'local' | 'remote'>('local');
  const [localPort, setLocalPort] = useState('');
  const [remoteHost, setRemoteHost] = useState('127.0.0.1');
  const [remotePort, setRemotePort] = useState('');
  const [error, setError] = useState('');

  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const sessionId = activeTab?.type === 'ssh' ? activeTab.sessionId : tabs.find((t) => t.type === 'ssh' && t.connected)?.sessionId;

  const loadTunnels = useCallback(async () => {
    const list = await (window as any).void.tunnel.list();
    setTunnels(list || []);
  }, []);

  useEffect(() => {
    loadTunnels();
    const interval = setInterval(loadTunnels, 3000);
    return () => clearInterval(interval);
  }, [loadTunnels]);

  const createTunnel = async () => {
    if (!sessionId) { setError('No active SSH connection'); return; }
    if (!localPort || !remotePort) { setError('Both ports are required'); return; }
    setError('');
    setLoading(true);
    const result = await (window as any).void.tunnel.create(
      sessionId, type, parseInt(localPort), remoteHost, parseInt(remotePort)
    );
    setLoading(false);
    if (result.success) {
      setShowForm(false);
      setLocalPort('');
      setRemotePort('');
      loadTunnels();
    } else {
      setError(result.error || 'Failed to create tunnel');
    }
  };

  const closeTunnel = async (id: string) => {
    await (window as any).void.tunnel.close(id);
    loadTunnels();
  };

  const inputClass = "w-full px-3 py-2 rounded-[6px] text-[12px] font-mono bg-void-input text-void-text outline-none";

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0A0A0D' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30' }}>
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 8h12M5 5l-3 3 3 3M11 5l3 3-3 3" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[13px] text-void-text font-semibold">SSH Tunnels</span>
          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold" style={{ color: '#28C840', background: 'rgba(40,200,64,0.06)' }}>
            {tunnels.filter(t => t.active).length} active
          </span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-all"
          style={{ color: '#F97316', border: '0.5px solid rgba(249,115,22,0.15)', background: 'rgba(249,115,22,0.08)' }}
        >
          {showForm ? 'Cancel' : '+ New Tunnel'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="px-4 py-3 shrink-0 space-y-3" style={{ borderBottom: '0.5px solid #2A2A30', background: '#111115' }}>
          {/* Type selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setType('local')}
              className="flex-1 py-2 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-all"
              style={{
                color: type === 'local' ? '#F97316' : '#555',
                background: type === 'local' ? 'rgba(249,115,22,0.08)' : 'transparent',
                border: `0.5px solid ${type === 'local' ? 'rgba(249,115,22,0.15)' : '#2A2A30'}`,
              }}
            >
              Local Forward (→)
            </button>
            <button
              onClick={() => setType('remote')}
              className="flex-1 py-2 rounded-[6px] text-[11px] font-semibold cursor-pointer transition-all"
              style={{
                color: type === 'remote' ? '#5B9BD5' : '#555',
                background: type === 'remote' ? 'rgba(91,155,213,0.08)' : 'transparent',
                border: `0.5px solid ${type === 'remote' ? 'rgba(91,155,213,0.15)' : '#2A2A30'}`,
              }}
            >
              Remote Forward (←)
            </button>
          </div>

          {/* Ports */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-void-text-dim font-mono mb-1 block">Local Port</label>
              <input
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value.replace(/\D/g, ''))}
                placeholder="3000"
                className={inputClass}
                style={{ border: '0.5px solid #2A2A30' }}
              />
            </div>
            <div className="mt-4 text-[14px] text-void-text-ghost">
              {type === 'local' ? '→' : '←'}
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-void-text-dim font-mono mb-1 block">Remote Host</label>
              <input
                value={remoteHost}
                onChange={(e) => setRemoteHost(e.target.value)}
                placeholder="127.0.0.1"
                className={inputClass}
                style={{ border: '0.5px solid #2A2A30' }}
              />
            </div>
            <div className="mt-4 text-[14px] text-void-text-ghost">:</div>
            <div className="flex-1">
              <label className="text-[10px] text-void-text-dim font-mono mb-1 block">Remote Port</label>
              <input
                value={remotePort}
                onChange={(e) => setRemotePort(e.target.value.replace(/\D/g, ''))}
                placeholder="3000"
                className={inputClass}
                style={{ border: '0.5px solid #2A2A30' }}
              />
            </div>
          </div>

          {/* Description */}
          <div className="text-[10px] text-void-text-ghost font-mono">
            {type === 'local'
              ? `localhost:${localPort || '...'} will forward to ${remoteHost}:${remotePort || '...'} on the server`
              : `Server port ${remotePort || '...'} will forward to your localhost:${localPort || '...'}`
            }
          </div>

          {error && <div className="text-[11px] text-status-error">{error}</div>}

          <button
            onClick={createTunnel}
            disabled={loading || !localPort || !remotePort}
            className="w-full py-2 rounded-[6px] text-[12px] font-semibold cursor-pointer transition-all disabled:opacity-40"
            style={{ background: '#F97316', color: '#0A0A0D', border: 'none' }}
          >
            {loading ? 'Creating...' : 'Create Tunnel'}
          </button>
        </div>
      )}

      {/* Tunnel list */}
      <div className="flex-1 overflow-y-auto px-4 py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
        {tunnels.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-2">
            <svg width="32" height="32" viewBox="0 0 16 16" fill="none" opacity="0.3">
              <path d="M2 8h12M5 5l-3 3 3 3M11 5l3 3-3 3" stroke="#555" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[12px] text-void-text-ghost">No active tunnels</span>
            <span className="text-[10px] text-void-text-ghost">Click + New Tunnel to create a port forward</span>
          </div>
        ) : (
          <div className="space-y-2">
            {tunnels.map((tunnel) => (
              <div
                key={tunnel.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] group"
                style={{ background: '#111115', border: '0.5px solid #2A2A30' }}
              >
                {/* Status dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: tunnel.active ? '#28C840' : '#FF5F57' }}
                />

                {/* Type badge */}
                <span
                  className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded shrink-0"
                  style={{
                    color: tunnel.type === 'local' ? '#F97316' : '#5B9BD5',
                    background: tunnel.type === 'local' ? 'rgba(249,115,22,0.08)' : 'rgba(91,155,213,0.08)',
                  }}
                >
                  {tunnel.type === 'local' ? 'L' : 'R'}
                </span>

                {/* Port info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-void-text font-mono">
                    localhost:{tunnel.localPort}
                    <span className="text-void-text-ghost mx-2">{tunnel.type === 'local' ? '→' : '←'}</span>
                    {tunnel.remoteHost}:{tunnel.remotePort}
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => closeTunnel(tunnel.id)}
                  className="opacity-0 group-hover:opacity-100 px-2 py-1 rounded text-[10px] font-semibold cursor-pointer transition-all"
                  style={{ color: '#FF5F57', background: 'rgba(255,95,87,0.08)', border: '0.5px solid rgba(255,95,87,0.15)' }}
                >
                  Close
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 shrink-0 text-[10px] font-mono text-void-text-ghost flex justify-between" style={{ borderTop: '0.5px solid #2A2A30' }}>
        <span>{sessionId ? 'Connected' : 'No SSH connection'}</span>
        <span>{tunnels.length} tunnel{tunnels.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}
