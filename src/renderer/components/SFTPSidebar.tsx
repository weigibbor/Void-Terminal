import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../stores/app-store';
import { easing, duration } from '../utils/motion';

interface SFTPEntry { name: string; type: 'file' | 'directory'; size: number; }

function getFileColor(name: string): string {
  if (['.env', '.pem', '.key'].includes(name)) return '#FEBC2E';
  if (name.endsWith('.log') || name.endsWith('.out')) return '#555';
  if (name.startsWith('.')) return '#444';
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.sh'].includes(ext)) return '#E8E6E0';
  return '#888';
}

function formatSize(b: number): string {
  if (b < 1024) return `${b}b`; if (b < 1048576) return `${(b/1024).toFixed(1)}kb`; return `${(b/1048576).toFixed(1)}mb`;
}

export function SFTPSidebar() {
  const sftpCollapsed = useAppStore((s) => s.sftpCollapsed);
  const collapseSFTP = useAppStore((s) => s.collapseSFTP);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isSSH = activeTab?.type === 'ssh' && activeTab.connected && activeTab.sessionId;
  const sessionId = activeTab?.sessionId;

  const [files, setFiles] = useState<SFTPEntry[]>([]);
  const [currentPath, setCurrentPath] = useState('/home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  const loadDir = useCallback(async (path: string) => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const result = await (window as any).void.sftp.readdir(sessionId, path);
      if (result.success) {
        setFiles(result.entries);
        setCurrentPath(path);
      } else {
        setError(result.error || 'Failed to read directory');
        setFiles([]);
      }
    } catch (e: any) {
      setError(e.message || 'SFTP error');
    }
    setLoading(false);
  }, [sessionId]);

  // Load home dir when SSH connects
  useEffect(() => {
    if (isSSH && sessionId) {
      // Try to detect home dir
      loadDir('/home');
    } else {
      setFiles([]);
      setCurrentPath('/home');
    }
  }, [isSSH, sessionId, loadDir]);

  const pathSegments = currentPath.split('/').filter(Boolean);
  const toggleDir = (name: string) => setExpandedDirs(p => { const s = new Set(p); s.has(name) ? s.delete(name) : s.add(name); return s; });

  const navigateTo = (path: string) => loadDir(path);
  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDir(parent);
  };

  // Collapsed state
  if (sftpCollapsed) {
    return (
      <motion.div initial={{ width: 240 }} animate={{ width: 44 }} transition={{ duration: duration.normal, ease: easing.standard }}
        className="bg-void-input flex flex-col items-center py-2 gap-2 shrink-0" style={{ borderRight: '0.5px solid #2A2A30' }}>
        <span className="text-[6px] text-status-info font-mono font-semibold tracking-[1px]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SFTP</span>
        <div className="w-[1px] h-2 bg-void-border" />
        <button onClick={collapseSFTP} className="w-[26px] h-[26px] rounded-[6px] bg-void-elevated flex items-center justify-center" style={{ border: '0.5px solid #2A2A30' }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
        </button>
      </motion.div>
    );
  }

  // Expanded state
  return (
    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      transition={{ duration: duration.smooth, ease: easing.enter }}
      className="bg-void-input flex flex-col shrink-0 overflow-hidden" style={{ borderRight: '0.5px solid #2A2A30' }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); /* TODO: handle file upload */ }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-[10px]" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <div className="flex items-center gap-[6px]">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
          <span className="text-[10px] text-status-info font-medium font-sans">SFTP</span>
          {isSSH && <span className="text-[8px] text-status-online px-[6px] py-[1px] rounded-[3px]" style={{ background: 'rgba(40,200,64,0.08)', border: '0.5px solid rgba(40,200,64,0.12)' }}>connected</span>}
        </div>
        <div className="flex gap-[6px] items-center">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="cursor-pointer" onClick={() => loadDir(currentPath)}><path d="M3 8a5 5 0 019-2M13 8a5 5 0 01-9 2" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span onClick={collapseSFTP} className="text-[11px] text-void-text-dim cursor-pointer">«</span>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-[3px] px-3 py-[6px] text-[8px] font-mono" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
        <span className="text-status-info cursor-pointer" onClick={() => navigateTo('/')}>/</span>
        {pathSegments.map((seg, i) => (
          <span key={i} className="flex items-center gap-[3px]">
            <span className="text-void-text-faint">/</span>
            <span className={i < pathSegments.length - 1 ? 'text-status-info cursor-pointer' : 'text-void-text'}
              onClick={() => i < pathSegments.length - 1 ? navigateTo('/' + pathSegments.slice(0, i + 1).join('/')) : null}>
              {seg}
            </span>
          </span>
        ))}
        <svg width="8" height="8" viewBox="0 0 16 16" fill="none" className="ml-auto cursor-pointer" onClick={goUp}><path d="M8 3v10M4 7l4-4 4 4" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>

      {/* Content */}
      {!isSSH ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="mb-2"><circle cx="8" cy="8" r="5.5" stroke="#444" strokeWidth="1"/><line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#444" strokeWidth="1" strokeLinecap="round"/></svg>
          <div className="text-[9px] text-void-text-dim font-sans">No SSH connection</div>
          <div className="text-[8px] text-void-text-ghost font-sans mt-[2px]">Connect to browse files</div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col gap-[6px] p-3">
          {[80, 60, 90, 45, 70].map((w, i) => (
            <div key={i} className="h-[10px] bg-void-surface rounded-[4px] void-shimmer" style={{ width: `${w}%` }} />
          ))}
          <div className="text-[7px] text-void-text-ghost font-mono mt-2">Loading {currentPath}...</div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center mb-2" style={{ background: 'rgba(255,95,87,0.06)', border: '0.5px solid rgba(255,95,87,0.12)' }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#FF5F57" strokeWidth="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#FF5F57" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div className="text-[9px] text-status-error font-sans">{error}</div>
          <button onClick={() => loadDir(currentPath)} className="mt-2 text-[8px] text-void-text-dim px-2 py-1 rounded-[4px]" style={{ border: '0.5px solid #2A2A30' }}>Retry</button>
        </div>
      ) : files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="mb-2"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#444" strokeWidth="1"/></svg>
          <div className="text-[9px] text-void-text-dim font-sans">Empty directory</div>
          <div className="text-[8px] text-void-text-ghost font-sans mt-[2px]">Drop files here to upload</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1 text-[9px] font-mono" style={{ opacity: dragOver ? 0.3 : 1, transition: 'opacity 200ms ease' }}>
          {files.map(e => (
            <div key={e.name}
              className="flex items-center gap-[5px] py-[4px] px-3 cursor-pointer group"
              style={{
                color: e.type === 'directory' ? '#5B9BD5' : getFileColor(e.name),
                background: selected === e.name ? 'rgba(91,155,213,0.06)' : undefined,
                borderLeft: selected === e.name ? '2px solid #5B9BD5' : '2px solid transparent',
              }}
              onClick={() => {
                if (e.type === 'directory') {
                  navigateTo(currentPath === '/' ? `/${e.name}` : `${currentPath}/${e.name}`);
                } else {
                  setSelected(e.name);
                }
              }}>
              {e.type === 'directory' ? (
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
              ) : (
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke={['.env','.pem','.key'].includes(e.name) ? '#FEBC2E' : '#555'} strokeWidth="1"/></svg>
              )}
              <span className={e.name.startsWith('.') && e.type !== 'directory' ? 'text-void-text-ghost' : ''}>{e.name}</span>
              {e.type === 'file' && <span className="text-[7px] text-void-text-ghost ml-auto">{formatSize(e.size)}</span>}
              {e.type === 'directory' && <span className="text-[7px] text-void-text-ghost ml-auto">→</span>}
              {['.env','.pem','.key'].includes(e.name) && <span className="text-[6px] text-status-warning px-1 rounded-[2px]" style={{ background: 'rgba(254,188,46,0.08)' }}>sensitive</span>}
              {e.type === 'file' && <div className="hidden group-hover:flex gap-1 ml-1"><span className="text-[7px] text-void-text-dim">↓</span><span className="text-[7px] text-status-error">✕</span></div>}
            </div>
          ))}
        </div>
      )}

      {/* Drop zone — expanded on drag, small hint otherwise */}
      {dragOver ? (
        <div className="mx-[10px] mb-[6px] py-4 text-center rounded-[8px]"
          style={{ border: '1.5px dashed #F97316', background: 'rgba(249,115,22,0.03)' }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mx-auto mb-1">
            <path d="M8 10V3M5 5l3-3 3 3M3 13h10" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-[8px] text-accent font-sans">Drop files to upload</div>
          <div className="text-[7px] text-void-text-dim font-sans mt-[2px]">to {currentPath}</div>
        </div>
      ) : isSSH && files.length > 0 ? (
        <div className="px-3 py-[4px] text-[7px] text-void-text-ghost font-mono text-center" style={{ borderTop: '0.5px solid rgba(42,42,48,0.3)' }}>
          ↑ Drop to upload
        </div>
      ) : null}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-[6px] text-[7px] text-void-text-ghost font-mono" style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)' }}>
        <span>{files.length} items</span>
        {isSSH && <span className="text-status-online">{activeTab?.title}</span>}
      </div>
    </motion.div>
  );
}
