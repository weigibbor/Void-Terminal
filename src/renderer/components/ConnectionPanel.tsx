import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../stores/app-store';
import { useSSH } from '../hooks/useSSH';
import { usePTY } from '../hooks/usePTY';
import { easing, duration } from '../utils/motion';
import { Spinner } from './Spinner';
import type { SSHConfig, SavedConnection } from '../types';
import { parseSSHString } from '../utils/ssh-parser';
import { ShareConnectionsModal } from './ShareConnectionsModal';

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
  const [agentForward, setAgentForward] = useState(false);
  const [useJumpHost, setUseJumpHost] = useState(false);
  const [jumpHost, setJumpHost] = useState('');
  const [jumpPort, setJumpPort] = useState('22');
  const [jumpUser, setJumpUser] = useState('root');
  const [jumpAuth, setJumpAuth] = useState<'key' | 'password'>('key');
  const [jumpKeyPath, setJumpKeyPath] = useState('~/.ssh/id_ed25519');
  const [alias, setAlias] = useState('');
  const [connGroup, setConnGroup] = useState('');
  const [tabColor, setTabColor] = useState('');
  const [startupCmd, setStartupCmd] = useState('');
  const [browserUrl, setBrowserUrl] = useState('');
  const [importEntries, setImportEntries] = useState<any[]>([]);
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [showShare, setShowShare] = useState(false);
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

  useEffect(() => {
    loadSavedConnections();
    // Check for template pre-fill from command palette
    const tpl = localStorage.getItem('void-template');
    if (tpl) {
      try {
        const t = JSON.parse(tpl);
        if (t.alias) setAlias(t.alias);
        if (t.username) setUsername(t.username);
        if (t.port) setPort(t.port);
        if (t.group) setConnGroup(t.group);
        setView('form');
        setDirection(1);
      } catch {}
      localStorage.removeItem('void-template');
    }
  }, []);

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
      group: connGroup || undefined,
      color: tabColor || undefined,
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
      keepAlive, keepAliveInterval: 30, autoReconnect, agentForward,
      jumpHost: useJumpHost && jumpHost ? { host: jumpHost, port: parseInt(jumpPort) || 22, username: jumpUser, authMethod: jumpAuth, privateKeyPath: jumpAuth === 'key' ? jumpKeyPath : undefined } : undefined };
    setConnecting(true);
    const result = await sshConnect(tabId, config, alias || undefined, startupCmd || undefined);
    setConnecting(false);
    if (result.success) { if (tabColor) updateTab(tabId, { color: tabColor }); await autoSave(config, alias || undefined); }
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
    const result = await sshConnect(tabId, config, conn.alias || undefined, conn.startupCommand);
    setConnecting(false);
    if (result.success) {
      if (conn.color) updateTab(tabId, { color: conn.color });
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

  const formProps = { connType, setConnType, host, setHost, port, setPort, username, setUsername, password, setPassword, privateKeyPath, setPrivateKeyPath, authMethod, setAuthMethod, keepAlive, setKeepAlive, autoReconnect, setAutoReconnect, agentForward, setAgentForward, useJumpHost, setUseJumpHost, jumpHost, setJumpHost, jumpPort, setJumpPort, jumpUser, setJumpUser, jumpAuth, setJumpAuth, jumpKeyPath, setJumpKeyPath, alias, setAlias, connGroup, setConnGroup, tabColor, setTabColor, startupCmd, setStartupCmd, browserUrl, setBrowserUrl, error, connecting, handleConnect, inputClass, labelClass, savedConnections };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-void-elevated" style={{ borderTop: '0.5px solid var(--border)' }}>
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
              <div className="flex items-center gap-2 px-[14px] py-[10px] bg-void-input rounded-[8px] mb-[18px]" style={{ border: '0.5px solid var(--border)' }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="#555" strokeWidth="1.2"/><line x1="11" y1="11" x2="14" y2="14" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
                <input type="text" value={quickConnect} onChange={e => setQuickConnect(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && quickConnect) handleQuickConnectInput(quickConnect); }}
                  placeholder="Quick connect — paste user@host:port" className="flex-1 min-w-0 bg-transparent text-[11px] text-void-text outline-none placeholder:text-void-text-ghost truncate" />
                <span className="text-[8px] text-void-text-faint px-[6px] py-[2px] rounded-[3px]" style={{ border: '0.5px solid var(--border)' }}>Enter</span>
              </div>
              {hasSaved ? (
                <>
                  <div className="flex items-center justify-between mb-[10px]">
                    <span className="text-[10px] text-void-text-muted uppercase tracking-[1px]">Saved connections</span>
                    <span className="text-[9px] text-void-text-ghost">{savedConnections.length} saved</span>
                  </div>
                  <div className="flex flex-col gap-[10px] mb-[18px]">
                    {(() => {
                      const sorted = [...savedConnections].sort((a, b) => (b.lastConnected || 0) - (a.lastConnected || 0));
                      const groups = new Map<string, SavedConnection[]>();
                      const ungrouped: SavedConnection[] = [];
                      for (const conn of sorted) {
                        if (conn.group) {
                          if (!groups.has(conn.group)) groups.set(conn.group, []);
                          groups.get(conn.group)!.push(conn);
                        } else {
                          ungrouped.push(conn);
                        }
                      }
                      const renderConn = (conn: SavedConnection) => {
                        const active = isActive(conn);
                        return (
                          <div key={conn.id} onClick={() => handleSavedConnect(conn)} className="flex items-center gap-3 px-[14px] py-3 bg-void-input rounded-[8px] cursor-pointer"
                            style={{ border: `0.5px solid ${active ? 'rgba(40,200,64,0.12)' : 'transparent'}`, transition: 'border-color 0.15s ease' }}
                            onMouseEnter={e => { if (!active) (e.currentTarget.style.borderColor = '#2A2A30'); }}
                            onMouseLeave={e => { if (!active) (e.currentTarget.style.borderColor = 'transparent'); }}>
                            <div className="w-[30px] h-[30px] rounded-[7px] flex items-center justify-center shrink-0"
                              style={{ background: active ? 'rgba(40,200,64,0.06)' : conn.color ? `${conn.color}0F` : 'rgba(91,155,213,0.06)', border: `0.5px solid ${active ? 'rgba(40,200,64,0.1)' : conn.color ? `${conn.color}20` : 'rgba(91,155,213,0.1)'}` }}>
                              <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="2" stroke={active ? '#28C840' : conn.color || '#5B9BD5'} strokeWidth="1"/><path d="M5 8l2 2-2 2" stroke={active ? '#28C840' : conn.color || '#5B9BD5'} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/></svg>
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
                                className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ border: '0.5px solid var(--border)' }}>
                                <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="#444" strokeWidth="1.2"/></svg>
                              </button>
                            </div>
                          </div>
                        );
                      };
                      return (
                        <>
                          {Array.from(groups.entries()).map(([group, conns]) => (
                            <details key={group} open>
                              <summary className="flex items-center gap-[6px] cursor-pointer mb-[4px] select-none">
                                <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
                                <span className="text-[10px] text-void-text-muted font-medium">{group}</span>
                                <span className="text-[8px] text-void-text-ghost">{conns.length}</span>
                              </summary>
                              <div className="flex flex-col gap-[4px] ml-[14px]">
                                {conns.map(renderConn)}
                              </div>
                            </details>
                          ))}
                          {ungrouped.length > 0 && groups.size > 0 && (
                            <div className="text-[9px] text-void-text-ghost uppercase tracking-[0.5px] mt-1">Ungrouped</div>
                          )}
                          {ungrouped.map(renderConn)}
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2">
                    <div onClick={goToForm} className="flex-1 flex items-center justify-center gap-2 py-[14px] rounded-[8px] cursor-pointer" style={{ border: '0.5px dashed #2A2A30' }}>
                      <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.06)', border: '0.5px solid rgba(249,115,22,0.1)' }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <span className="text-[11px] text-accent font-medium font-sans">Add new</span>
                    </div>
                    <div onClick={async () => {
                      const entries = await (window as any).void.ssh.parseConfig();
                      if (entries.length === 0) { setError('No hosts found in ~/.ssh/config'); return; }
                      const existing = savedConnections.map((c: SavedConnection) => `${c.username}@${c.host}`);
                      const filtered = entries.filter((e: any) => !existing.includes(`${e.user || 'root'}@${e.hostName || e.host}`));
                      if (filtered.length === 0) { setError('All SSH config hosts already saved'); return; }
                      setImportEntries(filtered);
                      setImportSelected(new Set(filtered.map((_: any, i: number) => i)));
                      setShowImport(true);
                    }} className="flex-1 flex items-center justify-center gap-2 py-[14px] rounded-[8px] cursor-pointer" style={{ border: '0.5px dashed #2A2A30' }}>
                      <div className="w-6 h-6 rounded-[6px] flex items-center justify-center" style={{ background: 'rgba(91,155,213,0.06)', border: '0.5px solid rgba(91,155,213,0.1)' }}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="#5B9BD5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 12h10" stroke="#5B9BD5" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                      <span className="text-[11px] text-[#5B9BD5] font-medium font-sans">Import SSH config</span>
                    </div>
                  </div>
                  {showImport && importEntries.length > 0 && (
                    <div className="mt-3 p-3 rounded-[8px] bg-void-input" style={{ border: '0.5px solid var(--border)' }}>
                      <div className="text-[10px] text-void-text-muted uppercase tracking-[0.5px] mb-2">Found in ~/.ssh/config</div>
                      <div className="flex flex-col gap-[4px] max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
                        {importEntries.map((entry: any, i: number) => (
                          <label key={i} className="flex items-center gap-2 py-[4px] px-[6px] rounded-[4px] hover:bg-void-elevated cursor-pointer">
                            <input type="checkbox" checked={importSelected.has(i)}
                              onChange={() => { const next = new Set(importSelected); next.has(i) ? next.delete(i) : next.add(i); setImportSelected(next); }}
                              className="accent-accent" />
                            <span className="text-[11px] text-void-text font-mono">{entry.host}</span>
                            <span className="text-[9px] text-void-text-dim">{entry.user || 'root'}@{entry.hostName || entry.host}:{entry.port || 22}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setShowImport(false)} className="px-3 py-[5px] rounded-[4px] text-[10px] text-void-text-dim" style={{ border: '0.5px solid var(--border)' }}>Cancel</button>
                        <button onClick={async () => {
                          for (const i of importSelected) {
                            const e = importEntries[i];
                            await (window as any).void.connections.save({
                              alias: e.host, host: e.hostName || e.host, port: e.port || 22,
                              username: e.user || 'root', authMethod: e.identityFile ? 'key' : 'password',
                              privateKeyPath: e.identityFile || '~/.ssh/id_ed25519',
                              keepAlive: true, keepAliveInterval: 30, autoReconnect: true,
                            });
                          }
                          await loadSavedConnections();
                          setShowImport(false);
                          setImportEntries([]);
                        }} className="px-3 py-[5px] rounded-[4px] text-[10px] font-semibold text-void-base bg-[#5B9BD5] border-none cursor-pointer">
                          Import {importSelected.size} connection{importSelected.size !== 1 ? 's' : ''}
                        </button>
                      </div>
                    </div>
                  )}
                  <button onClick={() => setShowShare(true)}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-[8px] rounded-[8px] cursor-pointer text-[10px] text-void-text-ghost hover:text-void-text-dim font-sans"
                    style={{ border: '0.5px dashed #2A2A30' }}>
                    Share connections with team
                  </button>
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

      <ShareConnectionsModal open={showShare} onClose={() => setShowShare(false)} />
    </div>
  );
}

const TAB_COLORS = ['#FF5F57', '#F97316', '#FEBC2E', '#28C840', '#5B9BD5', '#C586C0'];

function SSHForm({ connType, setConnType, host, setHost, port, setPort, username, setUsername, password, setPassword, privateKeyPath, setPrivateKeyPath, authMethod, setAuthMethod, keepAlive, setKeepAlive, autoReconnect, setAutoReconnect, agentForward, setAgentForward, useJumpHost, setUseJumpHost, jumpHost, setJumpHost, jumpPort, setJumpPort, jumpUser, setJumpUser, jumpAuth, setJumpAuth, jumpKeyPath, setJumpKeyPath, alias, setAlias, connGroup, setConnGroup, tabColor, setTabColor, startupCmd, setStartupCmd, browserUrl, setBrowserUrl, error, connecting, handleConnect, inputClass, labelClass, savedConnections }: any) {
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
            <div><label className={labelClass}>Host / IP</label><input type="text" value={host} onChange={e => setHost(e.target.value)} placeholder="e.g. 192.168.1.50" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
            <div><label className={labelClass}>Port</label><input type="text" value={port} onChange={e => setPort(e.target.value)} className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
          </div>
          <div className="grid grid-cols-2 gap-[10px]">
            <div><label className={labelClass}>Username</label><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. root" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
            <div><label className={labelClass}>Alias (optional)</label><input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="e.g. prod-api" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
          </div>
          <div>
            <label className={labelClass}>Group (optional)</label>
            <input type="text" value={connGroup} onChange={e => setConnGroup(e.target.value)} placeholder="e.g. Production, Staging, Client-A"
              list="conn-groups" className={inputClass} style={{ border: '0.5px solid var(--border)' }} />
            <datalist id="conn-groups">
              {[...new Set((savedConnections || []).map((c: any) => c.group).filter(Boolean))].map((g: string) => (
                <option key={g} value={g} />
              ))}
            </datalist>
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
              placeholder={authMethod === 'key' ? '~/.ssh/id_ed25519' : ''} className={inputClass} style={{ border: '0.5px solid var(--border)' }} />
          </div>
          <Toggle label="Keep-alive" desc="Prevents timeout disconnections" checked={keepAlive} onChange={setKeepAlive} />
          <Toggle label="Auto-reconnect" desc="Reconnect on unexpected drop" checked={autoReconnect} onChange={setAutoReconnect} />
          {authMethod === 'key' && (
            <Toggle label="Agent forwarding" desc="Forward SSH keys to remote server" checked={agentForward} onChange={setAgentForward} />
          )}
          <Toggle label="Jump host / bastion" desc="Connect through a proxy server" checked={useJumpHost} onChange={setUseJumpHost} />
          {useJumpHost && (
            <div className="ml-3 pl-3 flex flex-col gap-[8px]" style={{ borderLeft: '2px solid rgba(249,115,22,0.15)' }}>
              <div className="grid gap-[8px]" style={{ gridTemplateColumns: '1fr 70px' }}>
                <div><label className={labelClass}>Bastion host</label><input type="text" value={jumpHost} onChange={e => setJumpHost(e.target.value)} placeholder="bastion.example.com" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
                <div><label className={labelClass}>Port</label><input type="text" value={jumpPort} onChange={e => setJumpPort(e.target.value)} className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
              </div>
              <div><label className={labelClass}>Bastion user</label><input type="text" value={jumpUser} onChange={e => setJumpUser(e.target.value)} placeholder="root" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
              <div><label className={labelClass}>Bastion key</label><input type="text" value={jumpKeyPath} onChange={e => setJumpKeyPath(e.target.value)} placeholder="~/.ssh/id_ed25519" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
            </div>
          )}
          <div>
            <label className={labelClass}>Tab color</label>
            <div className="flex items-center gap-[6px] mt-1">
              {TAB_COLORS.map(c => (
                <button key={c} onClick={() => setTabColor(tabColor === c ? '' : c)}
                  className="w-[18px] h-[18px] rounded-full cursor-pointer shrink-0"
                  style={{ background: c, border: tabColor === c ? '2px solid var(--text)' : '2px solid transparent', opacity: tabColor && tabColor !== c ? 0.3 : 1 }} />
              ))}
              {tabColor && <button onClick={() => setTabColor('')} className="text-[9px] text-void-text-ghost bg-transparent border-none cursor-pointer ml-1">Clear</button>}
            </div>
          </div>
          <div>
            <label className={labelClass}>Startup command (optional)</label>
            <input type="text" value={startupCmd} onChange={e => setStartupCmd(e.target.value)}
              placeholder="e.g. cd /app && source .env" className={inputClass} style={{ border: '0.5px solid var(--border)' }} />
          </div>
        </div>
      )}
      {connType === 'browser' && (
        <div className="flex flex-col gap-[10px]">
          <div><label className={labelClass}>URL</label><input type="text" value={browserUrl} onChange={e => setBrowserUrl(e.target.value)} placeholder="https://example.com" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
          <div><label className={labelClass}>Alias (optional)</label><input type="text" value={alias} onChange={e => setAlias(e.target.value)} placeholder="e.g. Admin Panel" className={inputClass} style={{ border: '0.5px solid var(--border)' }} /></div>
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
          <button className="px-[18px] py-[10px] rounded-[7px] text-[12px] text-void-text-dim" style={{ border: '0.5px solid var(--border)' }}>Save only</button>
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
