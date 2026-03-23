import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import { useSSH } from '../hooks/useSSH';
import { usePTY } from '../hooks/usePTY';
import type { SSHConfig, SavedConnection } from '../types';

type ConnectionType = 'ssh' | 'local' | 'browser';

export function ConnectionPanel({ tabId }: { tabId: string }) {
  const [connType, setConnType] = useState<ConnectionType>('ssh');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('22');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [privateKeyPath, setPrivateKeyPath] = useState('~/.ssh/id_ed25519');
  const [authMethod, setAuthMethod] = useState<'key' | 'password'>('key');
  const [keepAlive, setKeepAlive] = useState(true);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [alias, setAlias] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const tabs = useAppStore((s) => s.tabs);
  const savedConnections = useAppStore((s) => s.savedConnections);
  const loadSavedConnections = useAppStore((s) => s.loadSavedConnections);
  const updateTab = useAppStore((s) => s.updateTab);
  const { connect: sshConnect } = useSSH();
  const { create: ptyCreate } = usePTY();

  // Load saved connections immediately when panel opens
  useEffect(() => {
    loadSavedConnections();
  }, []);

  const autoSave = async (config: SSHConfig, aliasName?: string) => {
    await window.void.connections.save({
      alias: aliasName || `${config.username}@${config.host}`,
      host: config.host, port: config.port, username: config.username,
      authMethod: config.authMethod,
      password: config.authMethod === 'password' ? config.password : undefined,
      privateKeyPath: config.authMethod === 'key' ? config.privateKeyPath : undefined,
      keepAlive: config.keepAlive, keepAliveInterval: config.keepAliveInterval,
      autoReconnect: config.autoReconnect,
    });
    await loadSavedConnections();
  };

  const autoSaveIfAllowed = async (config: SSHConfig, aliasName?: string) => {
    // Check if already saved (dedup won't count against limit)
    const existing = savedConnections.find(
      (c) => c.host === config.host && c.port === config.port && c.username === config.username,
    );
    if (!existing && atLimit) return; // At limit, don't save new
    await autoSave(config, aliasName);
  };

  const handleConnect = async () => {
    setError('');
    if (connType === 'local') {
      setConnecting(true);
      const result = await ptyCreate(tabId);
      setConnecting(false);
      if (!result.success) setError(result.error || 'Failed to create local shell');
      return;
    }
    if (connType === 'browser') {
      updateTab(tabId, { type: 'browser', title: 'Browser', browserUrl: host || 'about:blank' });
      return;
    }
    if (!host || !username) { setError('Host and username required.'); return; }
    const config: SSHConfig = {
      host, port: parseInt(port) || 22, username, authMethod,
      password: authMethod === 'password' ? password : undefined,
      privateKeyPath: authMethod === 'key' ? privateKeyPath : undefined,
      keepAlive, keepAliveInterval: 30, autoReconnect,
    };
    setConnecting(true);
    const result = await sshConnect(tabId, config);
    setConnecting(false);
    if (result.success) { await autoSaveIfAllowed(config, alias || undefined); }
    else { setError(result.error || 'Connection failed.'); }
  };

  const handleQuickConnect = async (conn: SavedConnection) => {
    setError('');
    const config: SSHConfig = {
      host: conn.host, port: conn.port, username: conn.username,
      authMethod: conn.authMethod, password: conn.password,
      privateKeyPath: conn.privateKeyPath, keepAlive: conn.keepAlive,
      keepAliveInterval: conn.keepAliveInterval, autoReconnect: conn.autoReconnect,
    };
    if (conn.authMethod === 'password' && !conn.password) {
      setHost(conn.host); setPort(String(conn.port)); setUsername(conn.username);
      setAuthMethod('password'); setAlias(conn.alias); setShowForm(true);
      setError('Enter password for ' + conn.alias);
      return;
    }
    setConnecting(true);
    const result = await sshConnect(tabId, config);
    setConnecting(false);
    if (result.success) {
      await window.void.connections.update(conn.id, { lastConnected: Date.now() });
      await loadSavedConnections();
    } else { setError(result.error || 'Connection failed.'); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await window.void.connections.delete(id);
    await loadSavedConnections();
  };

  const isPro = useAppStore((s) => s.isPro);
  const hasSaved = savedConnections.length > 0;
  const FREE_CONNECTION_LIMIT = 10;
  const atLimit = !isPro && savedConnections.length >= FREE_CONNECTION_LIMIT;

  const inputStyle = "w-full px-[14px] py-[10px] bg-void-input border-[0.5px] border-void-border rounded-[6px] text-[13px] text-void-text-muted font-mono focus:border-accent/50 outline-none transition-colors";
  const labelStyle = "block text-[10px] text-void-text-dim uppercase tracking-[0.8px] mb-[6px]";

  return (
    <div className="flex-1 overflow-y-auto bg-void-elevated" style={{ borderTop: '0.5px solid var(--border, #2A2A30)' }}>
      <div className="max-w-[420px] mx-auto p-7">

        {/* Saved connections — show first */}
        {hasSaved && !showForm && (
          <>
            {/* Type selector row */}
            <div className="flex gap-2 mb-6">
              <button onClick={() => setShowForm(true)}
                className="px-5 py-2 bg-accent-glow border-[0.5px] border-accent rounded-[6px] text-[12px] text-accent">
                SSH
              </button>
              <button onClick={() => { updateTab(tabId, { type: 'browser', title: 'Browser', browserUrl: 'about:blank' }); }}
                className="px-5 py-2 border-[0.5px] border-void-border rounded-[6px] text-[12px] text-void-text-dim">
                Browser
              </button>
              <button onClick={async () => { const r = await ptyCreate(tabId); if (!r.success) setError(r.error || 'Failed'); }}
                className="px-5 py-2 border-[0.5px] border-void-border rounded-[6px] text-[12px] text-void-text-dim">
                Local shell
              </button>
            </div>

            {/* Saved list */}
            <div style={{ borderTop: '0.5px solid #1A1A1E', paddingTop: '18px' }}>
              <div className="text-[10px] text-void-text-dim uppercase tracking-[0.8px] mb-[10px]">
                Saved connections {!isPro && <span className="text-void-text-faint normal-case">({savedConnections.length}/{FREE_CONNECTION_LIMIT})</span>}
              </div>
              {atLimit && (
                <div className="text-[10px] text-accent bg-accent-glow border-[0.5px] border-accent-dim rounded-[6px] px-3 py-2 mb-2">
                  Free limit reached. Upgrade to Pro for unlimited connections.
                </div>
              )}
              <div className="flex flex-col gap-[6px]">
                {savedConnections
                  .sort((a, b) => (b.lastConnected || 0) - (a.lastConnected || 0))
                  .map((conn) => (
                    <div
                      key={conn.id}
                      onClick={() => handleQuickConnect(conn)}
                      className="flex items-center gap-3 px-[14px] py-[10px] bg-void-input rounded-[8px] border-[0.5px] border-transparent hover:border-void-border cursor-pointer group transition-colors"
                    >
                      <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${
                        tabs.some(t => t.connected && t.connectionConfig?.host === conn.host)
                          ? 'bg-status-online' : 'bg-void-text-dim'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-[#CCC] font-mono truncate">{conn.alias}</div>
                        <div className="text-[10px] text-void-text-dim font-mono">
                          {conn.username}@{conn.host}:{conn.port}
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, conn.id)}
                        className="text-void-text-ghost opacity-0 group-hover:opacity-100 hover:text-status-error text-[11px] transition-opacity px-1"
                      >
                        x
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {error && (
              <div className="mt-3 text-[11px] text-status-error bg-status-error/5 border-[0.5px] border-status-error/15 rounded-[6px] px-3 py-2">
                {error}
              </div>
            )}
            {connecting && (
              <div className="mt-3 text-center text-[11px] text-void-text-ghost animate-pulse">Connecting...</div>
            )}
          </>
        )}

        {/* New connection form */}
        {(!hasSaved || showForm) && (
          <>
            {/* Type selector */}
            <div className="flex gap-2 mb-6">
              {(['ssh', 'browser', 'local'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setConnType(t === 'local' ? 'local' : t === 'browser' ? 'browser' : 'ssh')}
                  className={`px-5 py-2 rounded-[6px] text-[12px] border-[0.5px] transition-colors ${
                    (t === 'ssh' && connType === 'ssh') || (t === 'browser' && connType === 'browser') || (t === 'local' && connType === 'local')
                      ? 'bg-accent-glow border-accent text-accent'
                      : 'border-void-border text-void-text-dim'
                  }`}
                >
                  {t === 'ssh' ? 'SSH' : t === 'browser' ? 'Browser' : 'Local shell'}
                </button>
              ))}
            </div>

            {connType === 'ssh' && (
              <div className="flex flex-col gap-[14px]">
                <div>
                  <label className={labelStyle}>Alias</label>
                  <input type="text" value={alias} onChange={(e) => setAlias(e.target.value)}
                    placeholder="production-api" className={inputStyle} />
                </div>

                <div className="grid gap-3" style={{ gridTemplateColumns: '1fr 80px' }}>
                  <div>
                    <label className={labelStyle}>Host</label>
                    <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
                      placeholder="192.168.1.50" className={inputStyle} />
                  </div>
                  <div>
                    <label className={labelStyle}>Port</label>
                    <input type="text" value={port} onChange={(e) => setPort(e.target.value)}
                      className={inputStyle} />
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>Username</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                    placeholder="weigi" className={inputStyle} />
                </div>

                <div>
                  <label className={labelStyle}>Auth method</label>
                  <div className="flex gap-2">
                    <button onClick={() => setAuthMethod('key')}
                      className={`px-[14px] py-[6px] rounded-[4px] text-[11px] border-[0.5px] transition-colors ${
                        authMethod === 'key' ? 'bg-accent-glow border-accent text-accent' : 'border-void-border text-void-text-dim'
                      }`}>SSH key</button>
                    <button onClick={() => setAuthMethod('password')}
                      className={`px-[14px] py-[6px] rounded-[4px] text-[11px] border-[0.5px] transition-colors ${
                        authMethod === 'password' ? 'bg-accent-glow border-accent text-accent' : 'border-void-border text-void-text-dim'
                      }`}>Password</button>
                  </div>
                </div>

                <div>
                  <label className={labelStyle}>{authMethod === 'key' ? 'Key file' : 'Password'}</label>
                  <input
                    type={authMethod === 'password' ? 'password' : 'text'}
                    value={authMethod === 'password' ? password : privateKeyPath}
                    onChange={(e) => authMethod === 'password' ? setPassword(e.target.value) : setPrivateKeyPath(e.target.value)}
                    placeholder={authMethod === 'key' ? '~/.ssh/id_ed25519' : ''}
                    className={inputStyle}
                  />
                </div>

                {/* Toggles */}
                <div className="flex items-center justify-between py-[10px]" style={{ borderTop: '0.5px solid #1A1A1E', marginTop: '4px' }}>
                  <div>
                    <div className="text-[12px] text-[#AAA]">Keep-alive</div>
                    <div className="text-[10px] text-void-text-dim mt-[2px]">Prevent SSH timeout disconnections</div>
                  </div>
                  <Toggle checked={keepAlive} onChange={setKeepAlive} />
                </div>

                <div className="flex items-center justify-between py-[10px]" style={{ borderTop: '0.5px solid #1A1A1E' }}>
                  <div>
                    <div className="text-[12px] text-[#AAA]">Auto-reconnect</div>
                    <div className="text-[10px] text-void-text-dim mt-[2px]">Reconnect on connection drop</div>
                  </div>
                  <Toggle checked={autoReconnect} onChange={setAutoReconnect} />
                </div>

                {error && (
                  <div className="text-[11px] text-status-error bg-status-error/5 border-[0.5px] border-status-error/15 rounded-[6px] px-3 py-2">
                    {error}
                  </div>
                )}

                <div className="flex gap-[10px] mt-[6px]">
                  <button onClick={handleConnect} disabled={connecting}
                    className="px-7 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors font-mono">
                    {connecting ? 'Connecting...' : 'Connect'}
                  </button>
                  {hasSaved ? (
                    <button onClick={() => { setShowForm(false); setError(''); }}
                      className="px-5 py-[10px] border-[0.5px] border-void-border rounded-[8px] text-[12px] text-void-text-dim font-mono">
                      Back
                    </button>
                  ) : (
                    <button onClick={handleConnect}
                      className="px-5 py-[10px] border-[0.5px] border-void-border rounded-[8px] text-[12px] text-void-text-dim font-mono"
                      style={{ display: 'none' }}>
                      Save only
                    </button>
                  )}
                </div>
              </div>
            )}

            {connType !== 'ssh' && (
              <div className="flex gap-[10px]">
                <button onClick={handleConnect} disabled={connecting}
                  className="px-7 py-[10px] bg-accent rounded-[8px] text-[12px] text-void-base font-semibold hover:bg-accent-hover disabled:opacity-50 transition-colors font-mono">
                  {connType === 'local' ? 'Open Shell' : 'Open Browser'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-[36px] h-[20px] rounded-[10px] shrink-0 ${checked ? 'bg-accent' : 'bg-void-border'}`}
      style={{ transition: 'background-color 200ms ease' }}
    >
      <span
        className={`absolute top-[2px] w-[16px] h-[16px] bg-white rounded-full ${checked ? 'right-[2px]' : 'left-[2px]'}`}
        style={{ transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      />
    </button>
  );
}
