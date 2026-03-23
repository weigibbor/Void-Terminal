import { ProGate } from '../ProGate';
import { useAppStore } from "../../stores/app-store";
import { useState } from 'react';

interface TunnelEntry {
  id: string;
  type: 'local' | 'remote' | 'dynamic';
  localPort: number;
  remoteHost: string;
  remotePort: number;
  active: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  local: 'text-status-info bg-status-info/10',
  remote: 'text-status-warning bg-status-warning/10',
  dynamic: 'text-status-ai bg-status-ai/10',
};

export function TunnelManager() {
  const [tunnels] = useState<TunnelEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<'local' | 'remote' | 'dynamic'>('local');
  const [newLocalPort, setNewLocalPort] = useState('');
  const [newRemoteHost, setNewRemoteHost] = useState('localhost');
  const [newRemotePort, setNewRemotePort] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-void-text font-medium">SSH Tunnels</h3>
        <button
          onClick={() => setAdding(!adding)}
          className="text-void-text-ghost hover:text-accent text-lg leading-none"
        >
          +
        </button>
      </div>

      {adding && (
        <div className="space-y-2 p-3 bg-void-surface/50 rounded-void-lg border border-void-border/50">
          <div className="flex gap-2">
            {(['local', 'remote', 'dynamic'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setNewType(t)}
                className={`px-2 py-1 text-2xs rounded-void border transition-colors ${
                  newType === t ? 'border-accent-dim text-accent' : 'border-void-border text-void-text-ghost'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              value={newLocalPort}
              onChange={(e) => setNewLocalPort(e.target.value)}
              placeholder="Local port"
              className="w-24 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
            />
            {newType !== 'dynamic' && (
              <>
                <span className="text-void-text-ghost self-center">&#8594;</span>
                <input
                  type="text"
                  value={newRemoteHost}
                  onChange={(e) => setNewRemoteHost(e.target.value)}
                  placeholder="Remote host"
                  className="flex-1 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
                />
                <input
                  type="number"
                  value={newRemotePort}
                  onChange={(e) => setNewRemotePort(e.target.value)}
                  placeholder="Port"
                  className="w-20 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1"
                />
              </>
            )}
          </div>
          <button className="text-2xs bg-accent text-void-base px-3 py-1 rounded-void">
            Create Tunnel
          </button>
        </div>
      )}

      {tunnels.map((tunnel) => (
        <div key={tunnel.id} className="flex items-center gap-2 p-2.5 bg-void-input rounded-void-lg">
          <span className={`text-2xs px-1.5 py-0.5 rounded ${TYPE_COLORS[tunnel.type]}`}>
            {tunnel.type.toUpperCase()}
          </span>
          <span className="text-sm text-void-text-muted font-mono flex-1">
            {tunnel.localPort} &#8594; {tunnel.remoteHost}:{tunnel.remotePort}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${tunnel.active ? 'bg-status-online' : 'bg-void-text-ghost'}`} />
        </div>
      ))}

      {tunnels.length === 0 && !adding && (
        <p className="text-2xs text-void-text-ghost text-center py-4">No tunnels active</p>
      )}
    </div>
  );
}
