import { useAppStore } from '../stores/app-store';
import { motion, AnimatePresence } from 'framer-motion';

export function UpdateBar() {
  const status = useAppStore((s) => s.updateStatus);
  const version = useAppStore((s) => s.updateVersion);
  const required = useAppStore((s) => s.updateRequired);
  const progress = useAppStore((s) => s.downloadProgress);
  const size = useAppStore((s) => s.downloadSize);
  const error = useAppStore((s) => s.updateError);
  const dismissed = useAppStore((s) => s.updateDismissed);
  const changelog = useAppStore((s) => s.updateChangelog);

  if (status === 'idle' || dismissed) return null;

  const features = changelog.filter(c => c.type === 'feature').length;
  const improvements = changelog.filter(c => c.type === 'improvement').length;
  const fixes = changelog.filter(c => c.type === 'fix').length;
  const summary = [features && `${features} features`, improvements && `${improvements} improvements`, fixes && `${fixes} fixes`].filter(Boolean).join(', ');

  const openPatchNotes = (mode: 'preview' | 'post-update') => {
    useAppStore.setState({ patchNotesOpen: true, patchNotesMode: mode });
  };

  const startDownload = async () => {
    const platform = await window.void.app.getPlatform();
    if (platform === 'darwin') {
      // macOS: open GitHub Releases for manual DMG download (zip auto-install breaks code signing)
      window.open(`https://github.com/weigibbor/Void-Terminal/releases/tag/v${version}`, '_blank');
      dismiss();
    } else {
      // Windows: auto-download via electron-updater
      useAppStore.setState({ updateStatus: 'downloading', downloadProgress: 0 });
      const result = await (window.void.app as any).updaterDownload?.();
      if (result && !result.success) {
        useAppStore.setState({ updateStatus: 'failed', updateError: result.error || 'Download failed' });
      }
    }
  };

  const installUpdate = async () => {
    // Windows only — macOS users download DMG manually and never reach this state
    (window.void.app as any).updaterInstall?.();
  };

  const dismiss = () => {
    localStorage.setItem('void-update-dismissed', version || '');
    useAppStore.setState({ updateDismissed: true });
  };

  const retry = async () => {
    useAppStore.setState({ updateStatus: 'idle', updateError: null });
    try {
      const data = await window.void.app.checkForUpdates('1.3.1');
      if (data.error) throw new Error(data.error);
      if (data.update) {
        useAppStore.setState({
          updateStatus: 'available', updateVersion: data.version, updateChangelog: data.changelog || [],
          updateRequired: data.required || false, downloadSize: data.downloadSize || '', updateDismissed: false,
        });
      } else {
        useAppStore.setState({ updateStatus: 'idle' });
      }
    } catch {
      useAppStore.setState({ updateStatus: 'failed', updateError: 'Unable to reach update server.' });
    }
  };

  // State 1: Available
  if (status === 'available') {
    return (
      <motion.div
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -40, opacity: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex items-center gap-[10px] px-4 py-[8px] text-[11px] shrink-0"
        style={{ background: required ? 'rgba(254,188,46,0.04)' : 'rgba(249,115,22,0.03)', borderBottom: `0.5px solid ${required ? 'rgba(254,188,46,0.1)' : 'rgba(249,115,22,0.08)'}` }}
      >
        {/* Icon */}
        <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0"
          style={{ background: required ? 'rgba(254,188,46,0.12)' : 'rgba(249,115,22,0.1)' }}>
          {required ? (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2l6 11H2L8 2z" stroke="#FEBC2E" strokeWidth="1.3" strokeLinejoin="round" /><line x1="8" y1="6.5" x2="8" y2="9" stroke="#FEBC2E" strokeWidth="1.3" strokeLinecap="round" /><circle cx="8" cy="11" r="0.7" fill="#FEBC2E" /></svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><path d="M3 12h10" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" /></svg>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 flex items-center gap-[6px] font-sans">
          <span style={{ color: required ? '#FEBC2E' : 'var(--text)', fontWeight: required ? 600 : 400 }}>
            {required ? 'Security update required' : 'Update available'}
          </span>
          <span className="font-mono text-[10px] font-semibold" style={{ color: required ? '#FEBC2E' : '#F97316' }}>v{version}</span>
          <span className="text-[10px] text-void-text-ghost">·</span>
          <span className="text-[10px] text-void-text-dim">{summary}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-[6px]">
          <button onClick={() => openPatchNotes('preview')} className="text-[10px] text-void-text-dim hover:text-void-text-muted bg-transparent border-none cursor-pointer font-sans">What's new?</button>
          <button onClick={startDownload}
            className="px-[14px] py-[4px] rounded-[5px] text-[10px] font-semibold cursor-pointer font-sans border-none"
            style={{ background: required ? '#FEBC2E' : '#F97316', color: 'var(--base)' }}>
            Download
          </button>
          {!required && <button onClick={dismiss} className="text-[14px] text-void-text-ghost hover:text-void-text-muted bg-transparent border-none cursor-pointer leading-none px-1">×</button>}
        </div>
      </motion.div>
    );
  }

  // State 2: Downloading
  if (status === 'downloading') {
    return (
      <div className="flex items-center gap-[10px] px-4 py-[8px] text-[11px] shrink-0"
        style={{ background: 'rgba(249,115,22,0.03)', borderBottom: '0.5px solid rgba(249,115,22,0.08)' }}>
        <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: 'rgba(249,115,22,0.1)' }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="animate-spin" style={{ animationDuration: '1.2s' }}>
            <circle cx="8" cy="8" r="5.5" stroke="#2A2A30" strokeWidth="1.5" />
            <path d="M8 2.5a5.5 5.5 0 014.5 2.5" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div className="flex-1 flex items-center gap-[6px] font-sans">
          <span style={{ color: 'var(--text)' }}>Downloading</span>
          <span className="font-mono text-[10px] font-semibold text-accent">v{version}</span>
          <span className="text-[10px] text-void-text-ghost">·</span>
          <span className="text-[10px] text-void-text-dim">{size}</span>
        </div>
        <div className="flex-shrink-0" style={{ width: '200px', height: '4px', background: '#2A2A30', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#F97316', borderRadius: '2px', transition: 'width 300ms ease' }} />
        </div>
        <span className="font-mono text-[10px] font-semibold text-accent" style={{ minWidth: '32px', textAlign: 'right' }}>{progress}%</span>
      </div>
    );
  }

  // State 3: Ready to install (Windows only — macOS goes straight to GitHub Releases)
  if (status === 'ready') {
    return (
      <div className="flex items-center gap-[10px] px-4 py-[8px] text-[11px] shrink-0"
        style={{ background: 'rgba(40,200,64,0.03)', borderBottom: '0.5px solid rgba(40,200,64,0.08)' }}>
        <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: 'rgba(40,200,64,0.1)' }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#28C840" strokeWidth="1.3" /><path d="M5.5 8l2 2 3.5-4" stroke="#28C840" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </div>
        <div className="flex-1 flex items-center gap-[6px] font-sans">
          <span style={{ color: '#28C840' }}>Ready to install</span>
          <span className="font-mono text-[10px] font-semibold" style={{ color: '#28C840' }}>v{version}</span>
          <span className="text-[10px] text-void-text-ghost">·</span>
          <span className="text-[10px] text-void-text-dim">Restart to apply update</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <button onClick={dismiss} className="text-[10px] text-void-text-dim hover:text-void-text-muted bg-transparent border-none cursor-pointer font-sans">Later</button>
          <button onClick={installUpdate} className="px-[14px] py-[4px] rounded-[5px] text-[10px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#28C840', color: 'var(--base)' }}>Restart & update</button>
        </div>
      </div>
    );
  }

  // State 4: Failed
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-[10px] px-4 py-[8px] text-[11px] shrink-0"
        style={{ background: 'rgba(255,95,87,0.03)', borderBottom: '0.5px solid rgba(255,95,87,0.08)' }}>
        <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: 'rgba(255,95,87,0.1)' }}>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#FF5F57" strokeWidth="1.3" /><path d="M6 6l4 4M10 6l-4 4" stroke="#FF5F57" strokeWidth="1.3" strokeLinecap="round" /></svg>
        </div>
        <div className="flex-1 flex items-center gap-[6px] font-sans">
          <span style={{ color: '#FF5F57' }}>Download failed</span>
          <span className="text-[10px] text-void-text-ghost">·</span>
          <span className="text-[10px] text-void-text-dim">{error || 'Network error. Check your connection.'}</span>
        </div>
        <div className="flex items-center gap-[6px]">
          <button onClick={retry} className="px-[14px] py-[4px] rounded-[5px] text-[10px] font-semibold cursor-pointer font-sans" style={{ background: 'var(--elevated)', color: 'var(--muted)', border: '0.5px solid var(--border)' }}>Retry</button>
          <button onClick={dismiss} className="text-[14px] text-void-text-ghost hover:text-void-text-muted bg-transparent border-none cursor-pointer leading-none px-1">×</button>
        </div>
      </div>
    );
  }

  return null;
}
