import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../stores/app-store';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuItem } from './ContextMenu';
import { FileEditor } from './FileEditor';
import { FilePreviewModal } from './FilePreviewModal';
import { easing, duration } from '../utils/motion';

const DOTFILES = ['.bashrc', '.zshrc', '.profile', '.ssh/config', '.ssh/authorized_keys', '.gitconfig', '.env'];

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

export function SFTPSidebar({ width = 240 }: { width?: number }) {
  const sftpCollapsed = useAppStore((s) => s.sftpCollapsed);
  const collapseSFTP = useAppStore((s) => s.collapseSFTP);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  // Use the active SSH tab, or if active tab is editor use its sftpSessionId, or fall back to any connected SSH tab
  const sshTab = activeTab?.type === 'ssh' ? activeTab
    : tabs.find((t) => t.type === 'ssh' && t.connected && t.sessionId);
  const sessionId = (activeTab?.type === 'editor' ? activeTab.sftpSessionId : sshTab?.sessionId) || sshTab?.sessionId;
  const isSSH = !!sessionId && tabs.some((t) => t.type === 'ssh' && t.connected && t.sessionId === sessionId);

  const [files, setFiles] = useState<SFTPEntry[]>([]);
  const currentPath = useAppStore((s) => s.sftpCurrentPath);
  const setCurrentPath = (path: string) => useAppStore.setState({ sftpCurrentPath: path });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; entry: SFTPEntry } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; percent: number } | null>(null);
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [showDotfiles, setShowDotfiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ path: string; name: string } | null>(null);
  const [sftpMode, setSftpMode] = useState<'remote' | 'local' | 'split'>('remote');
  const [localPath, setLocalPath] = useState('');
  const [localFiles, setLocalFiles] = useState<SFTPEntry[]>([]);

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

  const loadLocalDir = useCallback(async (dirPath: string) => {
    try {
      const result = await (window as any).void.fs.readdir(dirPath);
      if (result.success) {
        setLocalFiles(result.entries);
        setLocalPath(dirPath);
      }
    } catch { /* ignore */ }
  }, []);

  // Init local path
  useEffect(() => {
    if (sftpMode !== 'remote' && !localPath) {
      (window as any).void.fs.homedir().then((home: string) => loadLocalDir(home));
    }
  }, [sftpMode, localPath, loadLocalDir]);

  // Load current dir when SSH connects (keep last path if available)
  useEffect(() => {
    if (isSSH && sessionId) {
      loadDir(currentPath);
    } else {
      setFiles([]);
    }
  }, [isSSH, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for upload progress
  useEffect(() => {
    const unsub = (window as any).void.sftp.onUploadProgress?.((data: any) => {
      if (data?.queue) {
        const active = data.queue.find((j: any) => j.status === 'uploading');
        if (active) {
          const percent = active.totalBytes > 0 ? Math.round((active.uploadedBytes / active.totalBytes) * 100) : 0;
          setUploadProgress({ name: active.fileName, percent });
        } else {
          const completed = data.queue.find((j: any) => j.status === 'completed');
          if (completed) setUploadProgress(null);
        }
      }
    });
    return unsub;
  }, []);

  const pathSegments = currentPath.split('/').filter(Boolean);
  const toggleDir = (name: string) => setExpandedDirs(p => { const s = new Set(p); s.has(name) ? s.delete(name) : s.add(name); return s; });

  const navigateTo = (path: string) => loadDir(path);
  const goUp = () => {
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDir(parent);
  };

  const getFileMenuItems = (entry: SFTPEntry): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];
    if (entry.type === 'directory') {
      items.push({ label: 'Open', action: () => navigateTo(currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`) });
    }
    if (entry.type === 'file') {
      items.push({ label: 'Download', action: () => {
        if (!sessionId) return;
        const fp = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
        (window as any).void.sftp.download(sessionId, fp);
      }});
    }
    items.push({ label: 'Rename', action: () => {
      const newName = prompt('Rename to:', entry.name);
      if (!newName || newName === entry.name || !sessionId) return;
      const oldPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      const newPath = currentPath === '/' ? `/${newName}` : `${currentPath}/${newName}`;
      (window as any).void.sftp.rename(sessionId, oldPath, newPath).then(() => loadDir(currentPath));
    }});
    items.push({ label: '', separator: true });
    items.push({ label: 'New folder', action: () => {
      const name = prompt('New folder name:');
      if (!name || !sessionId) return;
      const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
      (window as any).void.sftp.mkdir(sessionId, fullPath).then(() => loadDir(currentPath));
    }});
    items.push({ label: '', separator: true });
    items.push({ label: 'Delete', danger: true, action: () => {
      if (!sessionId) return;
      const fullPath = currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`;
      (window as any).void.sftp.delete(sessionId, fullPath).then(() => loadDir(currentPath));
    }});
    return items;
  };

  // Collapsed state
  if (sftpCollapsed) {
    return (
      <motion.div initial={{ width: 240 }} animate={{ width: 44 }} transition={{ duration: duration.normal, ease: easing.standard }}
        className="bg-void-input flex flex-col items-center py-2 gap-2 shrink-0" style={{ borderRight: '0.5px solid var(--border)' }}>
        <span className="text-[8px] text-status-info font-mono font-semibold tracking-[1px]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SFTP</span>
        <div className="w-[1px] h-3 bg-void-border" />
        <button onClick={collapseSFTP} className="w-[30px] h-[30px] rounded-[6px] bg-void-elevated flex items-center justify-center hover:bg-void-surface transition-colors" style={{ border: '0.5px solid var(--border)' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
        </button>
      </motion.div>
    );
  }

  // Expanded state
  return (
    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      transition={{ duration: duration.smooth, ease: easing.enter }}
      className="bg-void-input flex flex-col shrink-0 overflow-hidden" style={{ borderRight: '0.5px solid var(--border)' }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false); }}
      onDrop={(e) => {
        e.preventDefault(); setDragOver(false);
        if (!sessionId) return;

        // Handle drag from local pane → upload to remote
        const localPath_drag = e.dataTransfer.getData('text/local-path');
        const fileName_drag = e.dataTransfer.getData('text/file-name');
        if (localPath_drag && fileName_drag) {
          const remotePath = currentPath === '/' ? `/${fileName_drag}` : `${currentPath}/${fileName_drag}`;
          setUploadProgress({ name: fileName_drag, percent: 0 });
          (window as any).void.sftp.upload(sessionId, localPath_drag, remotePath).then(() => {
            setUploadProgress(null);
            loadDir(currentPath);
          });
          return;
        }

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        // Process all dropped files
        const uploadNext = async (index: number) => {
          if (index >= files.length) {
            setUploadProgress(null);
            loadDir(currentPath);
            return;
          }
          const file = files[index];
          const filePath = (window as any).void.app.getFilePath?.(file) || (file as any).path;
          if (!filePath) {
            console.error('[SFTP] No file path available for:', file.name);
            uploadNext(index + 1);
            return;
          }
          const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
          setUploadProgress({ name: file.name, percent: 0 });
          try {
            const result = await (window as any).void.sftp.upload(sessionId, filePath, remotePath);
            if (!result.success) console.error('[SFTP] Upload failed:', result.error);
          } catch (err) {
            console.error('[SFTP] Upload error:', err);
          }
          uploadNext(index + 1);
        };
        uploadNext(0);
      }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-[10px]" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <div className="flex items-center gap-[8px]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
          <span className="text-[12px] text-status-info font-medium font-sans">SFTP</span>
          {isSSH && <span className="text-[10px] text-status-online px-[8px] py-[2px] rounded-[3px]" style={{ background: 'rgba(40,200,64,0.08)', border: '0.5px solid rgba(40,200,64,0.12)' }}>connected</span>}
        </div>
        <div className="flex gap-[6px] items-center">
          {(['remote', 'local', 'split'] as const).map(m => (
            <button key={m} onClick={() => setSftpMode(m)}
              className={`text-[9px] px-[6px] py-[2px] rounded-[3px] font-mono cursor-pointer ${sftpMode === m ? 'text-accent' : 'text-void-text-ghost'}`}
              style={{ border: `0.5px solid ${sftpMode === m ? 'rgba(249,115,22,0.25)' : 'transparent'}` }}>
              {m === 'remote' ? 'Remote' : m === 'local' ? 'Local' : 'Split'}
            </button>
          ))}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="cursor-pointer hover:opacity-80" onClick={() => { loadDir(currentPath); if (localPath) loadLocalDir(localPath); }}><path d="M3 8a5 5 0 019-2M13 8a5 5 0 01-9 2" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span onClick={collapseSFTP} className="text-[14px] text-void-text-dim cursor-pointer hover:text-void-text-muted">«</span>
        </div>
      </div>

      {/* File editor overlay */}
      {editingFile && (
        <div className="absolute inset-0 z-10">
          <FileEditor
            fileName={editingFile.name}
            content={editingFile.content}
            onSave={async (content) => {
              await (window as any).void.sftp.writeFile(sessionId, editingFile.path, content);
            }}
            onClose={() => setEditingFile(null)}
          />
        </div>
      )}

      {/* Dotfiles quick access */}
      {isSSH && (
        <details open={showDotfiles} onToggle={(e) => setShowDotfiles((e.target as HTMLDetailsElement).open)}>
          <summary className="flex items-center gap-[6px] px-3 py-[6px] cursor-pointer select-none text-[10px] text-void-text-dim hover:text-void-text-muted" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#666" strokeWidth="1.2"/></svg>
            Dotfiles
          </summary>
          <div className="py-1" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
            {DOTFILES.map(df => (
              <div key={df}
                className="flex items-center gap-[6px] px-3 py-[4px] text-[11px] font-mono text-void-text-dim hover:text-void-text hover:bg-void-elevated cursor-pointer"
                onClick={async () => {
                  const homePath = currentPath.startsWith('/home') ? currentPath.split('/').slice(0, 3).join('/') : '/root';
                  const fullPath = `${homePath}/${df}`;
                  try {
                    const result = await (window as any).void.sftp.readFile(sessionId, fullPath);
                    if (result.success) {
                      setEditingFile({ path: fullPath, name: df, content: result.content });
                    }
                  } catch { /* file may not exist */ }
                }}>
                <span className="text-[#FEBC2E]">.</span>{df.startsWith('.') ? df.slice(1) : df}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Remote file browser (Remote / Split mode) */}
      {sftpMode !== 'local' && (
      <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-[4px] px-3 py-[8px] text-[11px] font-mono" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
        <span className="text-status-info cursor-pointer hover:underline" onClick={() => navigateTo('/')}>/</span>
        {pathSegments.map((seg, i) => (
          <span key={i} className="flex items-center gap-[4px]">
            <span className="text-void-text-faint">/</span>
            <span className={i < pathSegments.length - 1 ? 'text-status-info cursor-pointer hover:underline' : 'text-void-text'}
              onClick={() => i < pathSegments.length - 1 ? navigateTo('/' + pathSegments.slice(0, i + 1).join('/')) : null}>
              {seg}
            </span>
          </span>
        ))}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="ml-auto cursor-pointer hover:opacity-80" onClick={goUp}><path d="M8 3v10M4 7l4-4 4 4" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>

      {/* Content */}
      {!isSSH ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <svg width="24" height="24" viewBox="0 0 16 16" fill="none" className="mb-3"><circle cx="8" cy="8" r="5.5" stroke="#444" strokeWidth="1"/><line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#444" strokeWidth="1" strokeLinecap="round"/></svg>
          <div className="text-[12px] text-void-text-dim font-sans">No SSH connection</div>
          <div className="text-[11px] text-void-text-ghost font-sans mt-1">Connect to browse files</div>
        </div>
      ) : loading ? (
        <div className="flex-1 flex flex-col gap-[8px] p-3">
          {[80, 60, 90, 45, 70].map((w, i) => (
            <div key={i} className="h-[12px] bg-void-surface rounded-[4px] void-shimmer" style={{ width: `${w}%` }} />
          ))}
          <div className="text-[10px] text-void-text-ghost font-mono mt-2">Loading {currentPath}...</div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-9 h-9 rounded-[8px] flex items-center justify-center mb-3" style={{ background: 'rgba(255,95,87,0.06)', border: '0.5px solid rgba(255,95,87,0.12)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="7" width="10" height="7" rx="1.5" stroke="#FF5F57" strokeWidth="1.3"/><path d="M5 7V5a3 3 0 016 0v2" stroke="#FF5F57" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </div>
          <div className="text-[12px] text-status-error font-sans">{error}</div>
          <button onClick={() => loadDir(currentPath)} className="mt-3 text-[11px] text-void-text-dim px-3 py-[6px] rounded-[5px] hover:text-void-text-muted transition-colors" style={{ border: '0.5px solid var(--border)' }}>Retry</button>
        </div>
      ) : files.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <svg width="28" height="28" viewBox="0 0 16 16" fill="none" className="mb-3"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#444" strokeWidth="1"/></svg>
          <div className="text-[12px] text-void-text-dim font-sans">Empty directory</div>
          <div className="text-[11px] text-void-text-ghost font-sans mt-1">Drop files here to upload</div>
        </div>
      ) : (
        <div className={`${sftpMode === 'split' ? '' : 'flex-1'} overflow-y-auto py-1 text-[12px] font-mono`} style={{ opacity: dragOver ? 0.3 : 1, transition: 'opacity 200ms ease', maxHeight: sftpMode === 'split' ? '40vh' : undefined, scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {files.map(e => (
            <div key={e.name}
              className="flex items-center gap-[8px] py-[6px] px-3 cursor-pointer group"
              style={{
                color: e.type === 'directory' ? '#5B9BD5' : getFileColor(e.name),
                background: selected.has(e.name) ? 'rgba(91,155,213,0.06)' : undefined,
                borderLeft: selected.has(e.name) ? '2px solid #5B9BD5' : '2px solid transparent',
              }}
              onContextMenu={(ev) => { ev.preventDefault(); setCtxMenu({ x: ev.clientX, y: ev.clientY, entry: e }); }}
              onClick={(ev) => {
                if (e.type === 'directory') {
                  navigateTo(currentPath === '/' ? `/${e.name}` : `${currentPath}/${e.name}`);
                } else if (ev.metaKey || ev.ctrlKey) {
                  const next = new Set(selected);
                  next.has(e.name) ? next.delete(e.name) : next.add(e.name);
                  setSelected(next);
                } else {
                  setSelected(new Set([e.name]));
                }
              }}
              onDoubleClick={async () => {
                if (e.type === 'file') {
                  const fp = currentPath === '/' ? `/${e.name}` : `${currentPath}/${e.name}`;
                  // Open in CodeMirror editor tab
                  if (!sessionId) return;
                  const result = await window.void.sftp.readFile(sessionId, fp);
                  if (result.success && result.content !== undefined) {
                    const { addTab, setActiveTab } = useAppStore.getState();
                    const tabId = addTab('editor', {
                      title: e.name,
                      filePath: fp,
                      fileContent: result.content,
                      sftpSessionId: sessionId,
                      connected: true,
                    });
                    setActiveTab(tabId);
                  }
                }
              }}>
              {e.type === 'directory' ? (
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke={['.env','.pem','.key'].includes(e.name) ? '#FEBC2E' : '#555'} strokeWidth="1"/></svg>
              )}
              <span className={e.name.startsWith('.') && e.type !== 'directory' ? 'text-void-text-ghost' : ''}>{e.name}</span>
              {e.type === 'file' && <span className="text-[10px] text-void-text-ghost ml-auto">{formatSize(e.size)}</span>}
              {e.type === 'directory' && <span className="text-[11px] text-void-text-ghost ml-auto">→</span>}
              {['.env','.pem','.key'].includes(e.name) && <span className="text-[9px] text-status-warning px-[5px] py-[1px] rounded-[3px]" style={{ background: 'rgba(254,188,46,0.08)' }}>sensitive</span>}
              {e.type === 'file' && (
                <div className="hidden group-hover:flex gap-[6px] ml-1">
                  <span className="text-[13px] text-void-text-dim cursor-pointer hover:text-status-info transition-colors" title="Download"
                    onClick={(ev) => { ev.stopPropagation(); const fp = currentPath === '/' ? `/${e.name}` : `${currentPath}/${e.name}`; (window as any).void.sftp.download(sessionId, fp); }}>↓</span>
                  <span className="text-[13px] text-status-error cursor-pointer hover:text-[#ff8888] transition-colors" title="Delete"
                    onClick={(ev) => { ev.stopPropagation(); const fp = currentPath === '/' ? `/${e.name}` : `${currentPath}/${e.name}`; (window as any).void.sftp.delete(sessionId, fp).then(() => loadDir(currentPath)); }}>✕</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </>
      )}

      {/* Local file browser (Local / Split mode) */}
      {(sftpMode === 'local' || sftpMode === 'split') && (
        <>
          <div className="flex items-center justify-between px-3 py-[6px]" style={{ borderTop: sftpMode === 'split' ? '1px solid #2A2A30' : undefined, borderBottom: '0.5px solid rgba(42,42,48,0.3)', background: 'rgba(249,115,22,0.02)' }}>
            <span className="text-[9px] text-void-text-ghost uppercase tracking-[0.5px] font-mono">Local files</span>
            {sftpMode === 'split' && sessionId && (
              <div className="flex gap-[4px]">
                <button onClick={async () => {
                  if (!confirm(`Sync local → remote?\nUpload files from ${localPath} to ${currentPath}`)) return;
                  for (const f of localFiles) {
                    if (f.type === 'file') {
                      const localFile = `${localPath}/${f.name}`;
                      const remoteFile = currentPath === '/' ? `/${f.name}` : `${currentPath}/${f.name}`;
                      const exists = files.some(rf => rf.name === f.name);
                      if (!exists) await (window as any).void.sftp.upload(sessionId, localFile, remoteFile);
                    }
                  }
                  loadDir(currentPath);
                }} className="text-[8px] text-accent bg-transparent border-none cursor-pointer font-mono" title="Upload new local files to remote">
                  Sync →
                </button>
                <button onClick={async () => {
                  if (!confirm(`Sync remote → local?\nDownload files from ${currentPath} to ${localPath}`)) return;
                  for (const f of files) {
                    if (f.type === 'file') {
                      const remoteFile = currentPath === '/' ? `/${f.name}` : `${currentPath}/${f.name}`;
                      await (window as any).void.sftp.download(sessionId, remoteFile);
                    }
                  }
                }} className="text-[8px] text-[#5B9BD5] bg-transparent border-none cursor-pointer font-mono" title="Download remote files to local">
                  ← Sync
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-[4px] px-3 py-[6px] text-[10px] font-mono text-void-text-dim" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
            {localPath.split('/').filter(Boolean).map((seg, i, arr) => (
              <span key={i} className="flex items-center gap-[2px]">
                {i > 0 && <span className="text-void-text-faint">/</span>}
                <span className="text-accent cursor-pointer hover:underline" onClick={() => loadLocalDir('/' + arr.slice(0, i + 1).join('/'))}>{seg}</span>
              </span>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto py-1 text-[12px] font-mono" style={{ maxHeight: sftpMode === 'split' ? '40%' : undefined, scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
            {localPath !== '/' && (
              <div className="flex items-center gap-[8px] py-[5px] px-3 cursor-pointer hover:bg-void-elevated text-void-text-ghost"
                onClick={() => { const parent = localPath.split('/').slice(0, -1).join('/') || '/'; loadLocalDir(parent); }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 12V4M5 7l3-3 3 3" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                ..
              </div>
            )}
            {localFiles.map(e => (
              <div key={e.name} className="flex items-center gap-[8px] py-[5px] px-3 cursor-pointer group hover:bg-void-elevated"
                style={{ color: e.type === 'directory' ? '#F97316' : '#888' }}
                draggable={e.type === 'file'}
                onDragStart={(ev) => { ev.dataTransfer.setData('text/local-path', `${localPath}/${e.name}`); ev.dataTransfer.setData('text/file-name', e.name); }}
                onClick={() => { if (e.type === 'directory') loadLocalDir(`${localPath}/${e.name}`); }}>
                {e.type === 'directory' ? (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#F97316" strokeWidth="1.2"/></svg>
                ) : (
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#555" strokeWidth="1"/></svg>
                )}
                <span className="truncate">{e.name}</span>
                {e.type === 'file' && <span className="text-[10px] text-void-text-ghost ml-auto">{formatSize(e.size)}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Batch actions bar */}
      {selected.size > 1 && (
        <div className="flex items-center justify-between px-3 py-[6px] shrink-0" style={{ borderTop: '0.5px solid rgba(42,42,48,0.3)', background: 'rgba(91,155,213,0.03)' }}>
          <span className="text-[10px] text-[#5B9BD5] font-mono">{selected.size} selected</span>
          <div className="flex gap-[6px]">
            <button onClick={async () => {
              for (const name of selected) {
                const fp = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                await (window as any).void.sftp.download(sessionId, fp);
              }
            }} className="text-[9px] px-2 py-[3px] rounded-[4px] text-[#5B9BD5] bg-transparent cursor-pointer font-mono" style={{ border: '0.5px solid rgba(91,155,213,0.2)' }}>
              Download ({selected.size})
            </button>
            <button onClick={async () => {
              if (!confirm(`Delete ${selected.size} files?`)) return;
              for (const name of selected) {
                const fp = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
                await (window as any).void.sftp.delete(sessionId, fp);
              }
              setSelected(new Set());
              loadDir(currentPath);
            }} className="text-[9px] px-2 py-[3px] rounded-[4px] text-status-error bg-transparent cursor-pointer font-mono" style={{ border: '0.5px solid rgba(255,95,87,0.2)' }}>
              Delete ({selected.size})
            </button>
            <button onClick={() => setSelected(new Set())} className="text-[9px] text-void-text-ghost bg-transparent border-none cursor-pointer font-mono">Clear</button>
          </div>
        </div>
      )}

      {/* Drop zone — expanded on drag, small hint otherwise */}
      {dragOver ? (
        <div className="mx-[10px] mb-[8px] py-5 text-center rounded-[8px]"
          style={{ border: '1.5px dashed #F97316', background: 'rgba(249,115,22,0.03)' }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="mx-auto mb-2">
            <path d="M8 10V3M5 5l3-3 3 3M3 13h10" stroke="#F97316" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="text-[12px] text-accent font-sans">Drop files to upload</div>
          <div className="text-[11px] text-void-text-dim font-sans mt-1">to {currentPath}</div>
        </div>
      ) : isSSH && files.length > 0 ? (
        <div className="px-3 py-[6px] text-[10px] text-void-text-ghost font-mono text-center" style={{ borderTop: '0.5px solid rgba(42,42,48,0.3)' }}>
          ↑ Drop to upload
        </div>
      ) : null}

      {/* Upload progress */}
      {uploadProgress && (
        <div className="px-3 py-[8px]" style={{ borderTop: '0.5px solid rgba(42,42,48,0.3)' }}>
          <div className="flex items-center justify-between text-[11px] font-mono mb-[4px]">
            <span className="text-accent truncate">{uploadProgress.name}</span>
            <span className="text-void-text-ghost">{uploadProgress.percent}%</span>
          </div>
          <div className="h-[3px] bg-void-surface rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${uploadProgress.percent}%` }} />
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-[8px] text-[11px] text-void-text-ghost font-mono" style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)' }}>
        <span>{files.length} items</span>
        {isSSH && <span className="text-status-online">{activeTab?.title}</span>}
      </div>

      {/* SFTP context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={getFileMenuItems(ctxMenu.entry)}
          onClose={() => setCtxMenu(null)}
        />
      )}

      {/* File preview modal */}
      {previewFile && sessionId && (
        <FilePreviewModal
          open={!!previewFile}
          sessionId={sessionId}
          filePath={previewFile.path}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
          onEdit={(content) => {
            setEditingFile({ path: previewFile.path, name: previewFile.name, content });
            setPreviewFile(null);
          }}
        />
      )}
    </motion.div>
  );
}
