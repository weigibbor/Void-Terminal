import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../stores/app-store';
import { useSSH } from '../hooks/useSSH';
import { usePTY } from '../hooks/usePTY';
import { easing, duration } from '../utils/motion';
import { Spinner } from './Spinner';
import type { SSHConfig, SavedConnection } from '../types';
import { parseSSHString } from '../utils/ssh-parser';

type View = 'hub' | 'form';
type ConnectionType = 'ssh' | 'browser' | 'local';

export function ConnectionPanel({ tabId }: { tabId: string }) {
  const [view, setView] = useState<View>('hub');
  const [direction, setDirection] = useState(1);
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
  const [browserUrl, setBrowserUrl] = useState('');
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [quickConnect, setQuickConnect] = useState('');

  const tabs = useAppStore((s) => s.tabs);
  const savedConnections = useAppStore((s) => s.savedConnections);
  const loadSavedConnections = useAppStore((s) => s.loadSavedConnections);
  const updateTab = useAppStore((s) => s.updateTab);
  const isPro = useAppStore((s) => s.isPro);
  const { connect: sshConnect } = useSSH();
  const { create: ptyCreate } = usePTY();

  useEffect(() => { loadSavedConnections(); }, []);

  const hasSaved = savedConnections.length > 0;
  const FREE_LIMIT = 10;
  const atLimit = !isPro && savedConnections.length >= FREE_LIMIT;

  const autoSave = async (config: SSHConfig, aliasName?: string) => {
    const existing = savedConnections.find(c => c.host === config.host && c.port === config.port && c.username === config.username);
    if (!existing && atLimit) return;
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

  const handleConnect = async () => {
    setError('');
    if (connType === 'local') {
      setConnecting(true);
      const r = await ptyCreate(tabId);
      setConnecting(false);
      if (!r.success) setError((r as any).error || 'Failed');
      return;
    }
    if (connType === 'browser') {
      updateTab(tabId, { type: 'browser', title: alias || 'Browser', browserUrl: browserUrl || 'about:blank' });
      return;
    }
    if (!host || !username) { setError('Host and username required.'); return; }
    const config: SSHConfig = { host, port: parseInt(port) || 22, username, authMethod,
      password: authMethod === 'password' ? password : undefined,
      privateKeyPath: authMethod === 'key' ? privateKeyPath : undefined,
      keepAlive, keepAliveInterval: 30, autoReconnect };
    setConnecting(true);
    const result = await sshConnect(tabId, config);
    setConnecting(false);
    if (result.success) { await autoSave(config, alias || undefined); }
    else { setError(result.error || 'Connection failed.'); }
  };

  const handleQuickConnectInput = async (input: string) => {
    const parsed = parseSSHString(input);
    if (!parsed) { setError('Invalid format. Use: user@host:port'); return; }
    const config: SSHConfig = { host: parsed.host, port: parsed.port || 22,
      username: parsed.username || 'root', authMethod: parsed.keyPath ? 'key' : 'password',
      privateKeyPath: parsed.keyPath, keepAlive: true, keepAliveInterval: 30, autoReconnect: true };
    setConnecting(true);
    const result = await sshConnect(tabId, config);
    setConnecting(false);
    if (result.success) { await autoSave(config); }
    else { setError(result.error || 'Connection failed.'); }
  };

  const handleSavedConnect = async (conn: SavedConnection) => {
    const config: SSHConfig = { host: conn.host, port: conn.port, username: conn.username,
      authMethod: conn.authMethod, password: conn.password, privateKeyPath: conn.privateKeyPath,
      keepAlive: conn.keepAlive, keepAliveInterval: conn.keepAliveInterval, autoReconnect: conn.autoReconnect };
    if (conn.authMethod === 'password' && !conn.password) {
      setHost(conn.host); setPort(String(conn.port)); setUsername(conn.username);
      setAuthMethod('password'); setAlias(conn.alias);
      setDirection(1); setView('form');
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

  const goToForm = () => { setDirection(1); setView('form'); };
  const goToHub = () => { setDirection(-1); setView('hub'); setError(''); };
  const isActive = (conn: SavedConnection) => tabs.some(t => t.connected && t.connectionConfig?.host === conn.host && t.connectionConfig?.username === conn.username);

  const inputClass = "w-full px-3 py-[9px] bg-void-input rounded-[6px] text-[11px] text-void-text-muted font-mono outline-none";
  const labelClass = "block text-[8px] text-void-text-dim uppercase tracking-[0.5px] mb-1";

  const viewVariants = {
    initial: (d: number) => ({ x: d > 0 ? 20 : -20, opacity: 0 }),
    animate: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -20 : 20, opacity: 0 }),
  };

  const formProps = { connType, setConnType, host, setHost, port, setPort, username, setUsername, password, setPassword, privateKeyPath, setPrivateKeyPath, authMethod, setAuthMethod, keepAlive, setKeepAlive, autoReconnect, setAutoReconnect, alias, setAlias, browserUrl, setBrowserUrl, error, connecting, handleConnect, inputClass, labelClass };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-void-elevated" style={{ borderTop: '0.5px solid #2A2A30' }}>
      <div className="w-full px-5 py-5" style={{ maxWidth: '100%' }}>
        <AnimatePresence mode="wait" custom={direction}>
          {view === 'hub' ? (
            <motion.div key="hub" custom={direction} variants={viewVariants} initial="initial" animate="animate" exit="exit"
              transition={{ duration: duration.smooth, ease: easing.enter }}>
              <div className="flex items-center gap-[10px] mb-[18px]">
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.06)', border: '0.5px solid rgba(249,115,22,0.1)' }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="2" stroke="#F97316" strokeWidth="1.2"/><path d="M5 8l2 2-2 2" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12h4" stroke="#F97316" strokeWidth="1" strokeLinecap="round"/></svg>
                </div>
                <div><div className="text-[15px] text-void-text font-semibold font-sans">Connect</div><div className="text-[10px] text-void-text-dim">Choose a saved connection or create a new one</div></div>
              </div>
              <div className="flex items-center gap-2 px-[14px] py-[10px] bg-void-input rounded-[8px] mb-[18px]" style={{ border: '0.5px solid #2A2A30' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#555" strokeWidth="1.2"/><line x1="11" y1="11" x2="14" y2="14" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <input type="text" value={quickConnect} onChange={e => setQuickConnect(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && quickConnect) handleQuickConnectInput(quickConnect); }}
                  placeholder="Quick connect — paste user@host:port" className="flex-1 min-w-0 bg-transparent text-[11px] text-void-text outline-none placeholder:text-void-text-ghost truncate" />
                <span className="text-[8px] text-void-text-faint px-[6px] py-[2px] rounded-[3px]" style={{ border: '0.5px solid #2A2A30' }}>Enter</span>
              </div>
              {hasSaved ? (
                <>
                  <div className="flex items-center justify-between mb-[10px]">
                    <span className="text-[10px] text-void-text-muted uppercase tracking-[1px]">Saved connections</span>
                    <span className="text-[9px] text-void-text-ghost">{savedConnections.length} saved</span>
                  </div>
                  <div className="flex flex-col gap-[5px] mb-[18px]">
                    {savedConnections.sort((a, b) => (b.lastConnected || 0) - (a.lastConnected || 0)).map(conn => {
                      const active = isActive(conn);
                      return (
                        <div key={conn.id} onClick={() => handleSavedConnect(conn)} className="flex items-center gap-3 px-[14px] py-3 bg-void-input rounded-[8px] cursor-pointer"
                          style={{ border: `0.5px solid ${active ? 'rgba(40,200,64,0.12)' : 'transparent'}`, transition: 'border-color 0.15s ease' }}
                          onMouseEnter={e => { if (!active) (e.currentTarget.style.borderColor = '#2A2A30'); }}
                          onMouseLeave={e => { if (!active) (e.currentTarget.style.borderColor = 'transparent'); }}>
                          <div className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center shrink-0"
                            style={{ background: active ? 'rgba(40,200,64,0.06)' : 'rgba(91,155,213,0.06)', border: `0.5px solid ${active ? 'rgba(40,200,64,0.1)' : 'rgba(91,155,213,0.1)'}` }}>
                            <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="2" stroke={active ? '#28C840' : '#5B9BD5'} strokeWidth="1"/><path d="M5 8l2 2-2 2" stroke={active ? '#28C840' : '#5B9BD5'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-[6px]">
                              <span className="text-[12px] text-void-text font-medium truncate">{conn.alias}</span>
                              {active && <span className="text-[8px] text-status-online px-[6px] py-[1px] rounded-[3px]" style={{ background: 'rgba(40,200,64,0.08)' }}>active</span>}
                            </div>
                            <div className="text-[9px] text-void-text-dim mt-[2px] truncate">{conn.username}@{conn.host}:{conn.port} · {conn.authMethod === 'key' ? 'SSH key' : 'Password'}</div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={e => { e.stopPropagation(); setHost(conn.host); setPort(String(conn.port)); setUsername(conn.username); setAuthMethod(conn.authMethod); setAlias(conn.alias); goToForm(); }}
                              className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ border: '0.5px solid #2A2A30' }}>
                              <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="#444" strokeWidth="1.2"/></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div onClick={goToForm} className="flex items-center justify-center gap-2 py-[14px] rounded-[8px] cursor-pointer" style={{ border: '0.5px dashed #2A2A30' }}>
                    <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.06)', border: '0.5px solid rgba(249,115,22,0.1)' }}>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    </div>
                    <span className="text-[11px] text-accent font-medium font-sans">Add new connection</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-4 mb-4">
                    <div className="w-10 h-10 rounded-[10px] mx-auto mb-[10px] flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.06)', border: '0.5px solid rgba(249,115,22,0.1)' }}>
                      <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="2" stroke="#F97316" strokeWidth="1.2"/><path d="M5 8l2 2-2 2" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <div className="text-[13px] text-void-text font-semibold font-sans mb-[3px]">No saved connections yet</div>
                    <div className="text-[10px] text-void-text-dim">Add your first SSH connection below.</div>
                  </div>
                  <SSHForm {...formProps} />
                </>
              )}
              {error && <div className="mt-3 text-[10px] text-status-error bg-status-error/5 border-[0.5px] border-status-error/15 rounded-[6px] px-3 py-2">{error}</div>}
            </motion.div>
          ) : (
            <motion.div key="form" custom={direction} variants={viewVariants} initial="initial" animate="animate" exit="exit"
              transition={{ duration: duration.smooth, ease: easing.enter }}>
              {hasSaved && (
                <div onClick={goToHub} className="flex items-center gap-[6px] mb-4 cursor-pointer">
                  <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M10 2L4 8l6 6" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-[10px] text-void-text-dim">Back to saved connections</span>
                </div>
              )}
              <div className="text-[15px] text-void-text font-semibold font-sans mb-[3px]">New SSH connection</div>
              <div className="text-[10px] text-void-text-dim mb-[18px]">Fill in the details. Connection saves automatically.</div>
              <SSHForm {...formProps} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function SSHForm({ connType, setConnType, host, setHost, port, setPort, username, setUsername, password, setPassword, privateKeyPath, setPrivateKeyPath, authMethod, setAuthMethod, keepAlive, setKeepAlive, autoReconnect, setAutoReconnect, alias, setAlias, browserUrl, setBrowserUrl, error, connecting, handleConnect, inputClass, labelClass }: any) {
  return (
    <div style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)', paddingTop: '16px' }}>
      <div className="flex gap-2 mb-4">
        {(['ssh', 'browser', 'local'] as const).map(t => (
          <button key={t} onClick={() => setConnType(t)}
            className={`px-[18px] py-[7px] rounded-[6px] text-[11px] ${connType === t ? 'text-accent' : 'text-void-text-dim'}`}
            style={{ background: connType === t ? 'rgba(249,115,22,0.05)' : 'transparent', border: `0.5px solid ${connType === t ? '#F97316' : '#2A2A30'}` }}>
            {t === 'ssh' ? 'SSH' : t === 'browser' ? 'Browser' : 'Local shell'}
          </button>
        ))}
      </div>
      {connType === 'ssh' && (
        <div className="flex flex-col gap-[10px]">
          <div className="grid gap-[10px]" style={{ gridTemplateColumns: '1fr 80px' }}>
            <div><label className={labelClass}>Host / IP</label><input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="e.g. 192.168.1.50" className={inputClass} style={{ border: '0.5px solid #2A2A30' }} /></div>
            <div><label className={labelClass}>Port</label><input type="text" value={port} onChange={e => setPort(e.target.value)} className={inputClass} style={{ border: '0.5px solid #2A2A30' }} /></div>
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            <div><label className={labelClass}>Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. root" className={inputClass} style={{ border: '0.5px solid #2A2A30' }} /></div>
            <div><label className={labelClass}>Alias (optional)</label><input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="e.g. prod-api" className={inputClass} style={{ border: '0.5px solid #2A2A30' }} /></div>
          </div>
          <div>
            <label className={labelClass}>Authentication</label>
            <div className="flex gap-[6px]">
              <button onClick={() => setAuthMethod('key')} className={`px-3 py-[5px] rounded-[4px] text-[10px] ${authMethod === 'key' ? 'text-accent' : 'text-void-text-dim'}`} style={{ background: authMethod === 'key' ? 'rgba(249,115,22,0.05)' : 'transparent', border: `0.5px solid ${authMethod === 'key' ? '#F97316' : '#2A2A30'}` }}>SSH key</button>
              <button onClick={() => setAuthMethod('password')} className={`px-3 py-[5px] rounded-[4px] text-[10px] ${authMethod === 'password' ? 'text-accent' : 'text-void-text-dim'}`} style={{ background: authMethod === 'password' ? 'rgba(249,115,22,0.05)' : 'transparent', border: `0.5px solid ${authMethod === 'password' ? '#F97316' : '#2A2A30'}` }}>Password</button>
            </div>
          </div>
          <div>
            <label className={labelClass}>{authMethod === 'key' ? 'Key file' : 'Password'}</label>
            <input type={authMethod === 'password' ? 'password' : 'text'} value={authMethod === 'password' ? password : privateKeyPath}
              onChange={e => authMethod === 'password' ? setPassword(e.target.value) : setPrivateKeyPath(e.target.value)}
              placeholder={authMethod === 'key' ? '~/.ssh/id_ed25519' : ''} className={inputClass} style={{ border: '0.5px solid #2A2A30' }} />
          </div>
          <Toggle label="Keep-alive" desc="Prevents timeout disconnections" checked={keepAlive} onChange={setKeepAlive} />
          <Toggle label="Auto-reconnect" desc="Reconnect on unexpected drop" checked={autoReconnect} onChange={setAutoReconnect} />
        </div>
      )}
      {connType === 'browser' && (
        <div className="flex flex-col gap-[10px]">
          <div><label className={labelClass}>URL</label><input type="text" value={browserUrl} onChange={e => setBrowserUrl(e.target.value)} placeholder="https://example.com" className={inputClass} style={{ border: '0.5px solid #2A2A30' }} /></div>
          <div><label className={labelClass}>Alias (optional)</label><input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="e.g. Admin Panel" className={inputClass} style={{ border: '0.5px solid #2A2A30' }} /></div>
        </div>
      )}
      {error && <div className="mt-3 text-[10px] text-status-error bg-status-error/5 border-[0.5px] border-status-error/15 rounded-[6px] px-3 py-2">{error}</div>}
      <div className="flex gap-2 mt-4">
        <button onClick={handleConnect} disabled={connecting}
          className="px-6 py-[10px] bg-accent rounded-[7px] text-[12px] text-void-base font-semibold hover:bg-accent-hover disabled:opacity-50 flex items-center gap-2">
          {connecting && <Spinner size={14} color="var(--base)" trackColor="rgba(10,10,13,0.2)" strokeWidth={2.5} />}
          {connType === 'ssh' ? (connecting ? 'Connecting...' : 'Connect') : connType === 'browser' ? 'Open' : 'Open shell'}
        </button>
        {connType === 'ssh' && !connecting && (
          <button className="px-[18px] py-[10px] rounded-[7px] text-[12px] text-void-text-dim" style={{ border: '0.5px solid #2A2A30' }}>Save only</button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-[10px]" style={{ borderTop: '0.5px solid #1A1A1E' }}>
      <div><div className="text-[11px] text-[#AAA]">{label}</div><div className="text-[9px] text-void-text-dim mt-[1px]">{desc}</div></div>
      <button onClick={() => onChange(!checked)} className={`relative w-[36px] h-[20px] rounded-[10px] shrink-0 ${checked ? 'bg-accent' : 'bg-void-border'}`} style={{ transition: 'background-color 200ms ease' }}>
        <span className={`absolute top-[2px] w-4 h-4 bg-white rounded-full ${checked ? 'right-[2px]' : 'left-[2px]'}`} style={{ transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
      </button>
    </div>
  );
}
