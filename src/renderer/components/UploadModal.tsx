import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface DroppedFile {
  name: string;
  localPath: string;
  size: number;
}

interface SFTPEntry {
  name: string;
  type: 'file' | 'directory';
  size: number;
}

interface UploadModalProps {
  open: boolean;
  files: DroppedFile[];
  sessionId: string;
  serverName: string;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function fileIcon(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke="#5B9BD5" strokeWidth="1.2" /><circle cx="6" cy="6.5" r="1.5" fill="#5B9BD5" /><path d="M2 11l3-3 2 2 3-4 4 5" stroke="#5B9BD5" strokeWidth="1" strokeLinejoin="round" /></svg>;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="1.5" stroke="#F97316" strokeWidth="1.2" /><path d="M7 4h2M7 6h2M7 8h2" stroke="#F97316" strokeWidth="1" strokeLinecap="round" /><rect x="6" y="10" width="4" height="3" rx="0.5" stroke="#F97316" strokeWidth="1" /></svg>;
  }
  return <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 2h5l4 4v8a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="#666" strokeWidth="1.2" /><path d="M9 2v4h4" stroke="#666" strokeWidth="1.2" /></svg>;
}

export function UploadModal({ open, files: initialFiles, sessionId, serverName, onClose }: UploadModalProps) {
  const [files, setFiles] = useState<DroppedFile[]>([]);
  const [currentPath, setCurrentPath] = useState(() => localStorage.getItem('void-last-upload-path') || '/home');
  const [dirs, setDirs] = useState<SFTPEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<string, number>>(new Map());
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);

  // Sync files when modal opens
  useEffect(() => {
    if (open) {
      setFiles(initialFiles);
      setUploading(false);
      setUploadDone(false);
      setUploadProgress(new Map());
      setError('');
      setShowNewFolder(false);
      setNewFolderName('');
    }
  }, [open, initialFiles]);

  const loadDir = useCallback(async (path: string) => {
    if (!sessionId) return;
    setLoading(true);
    setError('');
    try {
      const result = await (window as any).void.sftp.readdir(sessionId, path);
      if (result.success) {
        setDirs(result.entries.filter((e: SFTPEntry) => e.type === 'directory'));
        setCurrentPath(path);
        localStorage.setItem('void-last-upload-path', path);
      } else {
        setError(result.error || 'Failed to read directory');
      }
    } catch (e: any) {
      setError(e.message || 'SFTP error');
    }
    setLoading(false);
  }, [sessionId]);

  // Load last-used dir when modal opens (fall back to /home)
  useEffect(() => {
    if (open && sessionId) {
      const lastPath = localStorage.getItem('void-last-upload-path') || '/home';
      loadDir(lastPath);
    }
  }, [open, sessionId, loadDir]);

  // Listen for upload progress
  useEffect(() => {
    if (!uploading) return;
    const unsub = (window as any).void.sftp.onUploadProgress((data: any) => {
      if (!data?.queue) return;
      const next = new Map<string, number>();
      let allDone = true;
      for (const job of data.queue) {
        const pct = job.totalBytes > 0 ? Math.round((job.uploadedBytes / job.totalBytes) * 100) : 0;
        next.set(job.fileName, job.status === 'completed' ? 100 : pct);
        if (job.status !== 'completed' && job.status !== 'failed') allDone = false;
      }
      setUploadProgress(next);
      if (allDone && data.queue.length > 0) {
        setUploadDone(true);
        setTimeout(onClose, 1500);
      }
    });
    return unsub;
  }, [uploading, onClose]);

  const navigateTo = (path: string) => loadDir(path);

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parent = currentPath.split('/').slice(0, -1).join('/') || '/';
    loadDir(parent);
  };

  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name || !sessionId) return;
    const fullPath = currentPath === '/' ? `/${name}` : `${currentPath}/${name}`;
    try {
      await (window as any).void.sftp.mkdir(sessionId, fullPath);
      setShowNewFolder(false);
      setNewFolderName('');
      loadDir(currentPath);
    } catch {
      setError('Failed to create folder');
    }
  };

  const removeFile = (index: number) => {
    setFiles(f => f.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadProgress(new Map());
    for (const file of files) {
      const remotePath = currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`;
      try {
        await (window as any).void.sftp.upload(sessionId, file.localPath, remotePath);
      } catch {
        // Error handled by progress listener
      }
    }
  };

  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  const breadcrumbs = currentPath === '/' ? ['/'] : currentPath.split('/').filter(Boolean);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 8, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
            style={{ maxWidth: '480px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-0">
              <div className="text-[14px] text-void-text font-semibold font-sans">
                Upload to <span className="text-accent">{serverName}</span>
              </div>
              <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer p-1 leading-none">×</button>
            </div>

            {/* Upload done state */}
            {uploadDone ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <svg width="28" height="28" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="#28C840" strokeWidth="1.3" /><path d="M5 8l2.5 2.5L11.5 5" stroke="#28C840" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <span className="text-[12px] font-sans" style={{ color: '#28C840' }}>
                  {files.length === 1 ? 'File uploaded' : `${files.length} files uploaded`}
                </span>
              </div>
            ) : uploading ? (
              /* Upload progress view */
              <div className="px-5 py-4">
                <div className="text-[10px] text-void-text-dim font-mono mb-2 uppercase tracking-[0.5px]">Uploading to {currentPath}</div>
                <div className="flex flex-col gap-[6px]" style={{ maxHeight: '240px', overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
                  {files.map((file) => {
                    const pct = uploadProgress.get(file.name) ?? 0;
                    const done = pct >= 100;
                    return (
                      <div key={file.localPath} className="flex items-center gap-[8px] py-[4px]">
                        {done ? (
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#28C840" strokeWidth="1.2" /><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        ) : fileIcon(file.name)}
                        <span className="flex-1 text-[11px] font-mono text-void-text-muted truncate">{file.name}</span>
                        <span className="text-[10px] font-mono font-semibold" style={{ color: done ? '#28C840' : '#F97316', minWidth: '32px', textAlign: 'right' }}>
                          {done ? 'Done' : `${pct}%`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* File list + directory browser */
              <>
                {/* Files section */}
                <div className="px-5 pt-3">
                  <div className="text-[10px] text-void-text-dim font-mono mb-[6px] uppercase tracking-[0.5px]">
                    Files ({files.length})
                  </div>
                  <div className="flex flex-col gap-[2px] overflow-y-auto" style={{ maxHeight: '100px', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
                    {files.map((file, i) => (
                      <div key={file.localPath} className="flex items-center gap-[8px] py-[3px] px-[6px] rounded-[4px] hover:bg-void-elevated">
                        {fileIcon(file.name)}
                        <span className="flex-1 text-[11px] font-mono text-void-text-muted truncate">{file.name}</span>
                        <span className="text-[10px] text-void-text-ghost font-mono">{formatSize(file.size)}</span>
                        <button onClick={() => removeFile(i)} className="text-[12px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer leading-none px-1">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Destination section */}
                <div className="px-5 pt-3 pb-2">
                  <div className="text-[10px] text-void-text-dim font-mono mb-[6px] uppercase tracking-[0.5px]">Upload to</div>

                  {/* Breadcrumb */}
                  <div className="flex items-center gap-[2px] mb-[6px] overflow-x-auto text-[11px] font-mono" style={{ scrollbarWidth: 'none' }}>
                    <button onClick={() => navigateTo('/')} className="text-accent hover:underline bg-transparent border-none cursor-pointer p-0 font-mono text-[11px]">/</button>
                    {breadcrumbs.map((seg, i) => (
                      <span key={i} className="flex items-center gap-[2px]">
                        <span className="text-void-text-ghost">/</span>
                        <button
                          onClick={() => navigateTo('/' + breadcrumbs.slice(0, i + 1).join('/'))}
                          className="text-accent hover:underline bg-transparent border-none cursor-pointer p-0 font-mono text-[11px]"
                        >{seg}</button>
                      </span>
                    ))}
                  </div>

                  {/* Directory listing */}
                  <div
                    className="rounded-[6px] overflow-y-auto"
                    style={{ maxHeight: '180px', background: 'var(--elevated)', border: '0.5px solid var(--border)', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}
                  >
                    {loading ? (
                      <div className="px-3 py-4 text-center text-[11px] text-void-text-ghost font-mono">Loading...</div>
                    ) : error ? (
                      <div className="px-3 py-4 text-center text-[11px] text-status-error font-mono">{error}</div>
                    ) : (
                      <>
                        {/* Up directory */}
                        {currentPath !== '/' && (
                          <button
                            onClick={navigateUp}
                            className="flex items-center gap-[8px] w-full px-3 py-[6px] text-left bg-transparent border-none cursor-pointer hover:bg-void-surface"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 12V4M5 7l3-3 3 3" stroke="#666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span className="text-[11px] font-mono text-void-text-ghost">..</span>
                          </button>
                        )}
                        {dirs.map((dir) => (
                          <button
                            key={dir.name}
                            onClick={() => navigateTo(currentPath === '/' ? `/${dir.name}` : `${currentPath}/${dir.name}`)}
                            className="flex items-center gap-[8px] w-full px-3 py-[6px] text-left bg-transparent border-none cursor-pointer hover:bg-void-surface"
                          >
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2" /></svg>
                            <span className="text-[11px] font-mono text-void-text-muted">{dir.name}</span>
                          </button>
                        ))}
                        {dirs.length === 0 && currentPath === '/' && !loading && (
                          <div className="px-3 py-3 text-center text-[11px] text-void-text-ghost font-mono">Empty directory</div>
                        )}
                      </>
                    )}
                  </div>

                  {/* New folder */}
                  {showNewFolder ? (
                    <div className="flex items-center gap-[6px] mt-[6px]">
                      <input
                        autoFocus
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') createFolder(); if (e.key === 'Escape') setShowNewFolder(false); }}
                        placeholder="Folder name"
                        className="flex-1 px-2 py-[4px] rounded-[4px] text-[11px] font-mono bg-void-elevated text-void-text outline-none"
                        style={{ border: '0.5px solid var(--border)' }}
                      />
                      <button onClick={createFolder} className="text-[10px] text-accent bg-transparent border-none cursor-pointer font-mono">Create</button>
                      <button onClick={() => setShowNewFolder(false)} className="text-[10px] text-void-text-ghost bg-transparent border-none cursor-pointer font-mono">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewFolder(true)}
                      className="flex items-center gap-[4px] mt-[6px] text-[10px] text-void-text-dim hover:text-accent bg-transparent border-none cursor-pointer font-mono p-0"
                    >
                      <span>+</span> New folder
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Footer */}
            {!uploadDone && (
              <div className="flex items-center justify-between px-5 py-3" style={{ borderTop: '0.5px solid var(--border)' }}>
                <span className="text-[10px] text-void-text-ghost font-mono">
                  {uploading ? 'Uploading...' : `${files.length} file${files.length !== 1 ? 's' : ''} · ${formatSize(totalSize)}`}
                </span>
                {!uploading && (
                  <div className="flex gap-2">
                    <button onClick={onClose} className="px-[16px] py-[6px] rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans" style={{ background: 'transparent', color: 'var(--dim)', border: '0.5px solid var(--border)' }}>Cancel</button>
                    <button
                      onClick={startUpload}
                      disabled={files.length === 0}
                      className="px-[16px] py-[6px] rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans border-none"
                      style={{ background: files.length > 0 ? '#F97316' : '#333', color: 'var(--base)' }}
                    >Upload</button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
