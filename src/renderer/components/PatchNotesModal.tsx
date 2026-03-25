import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../stores/app-store';

export function PatchNotesModal() {
  const open = useAppStore((s) => s.patchNotesOpen);
  const mode = useAppStore((s) => s.patchNotesMode);
  const version = useAppStore((s) => s.updateVersion);
  const changelog = useAppStore((s) => s.updateChangelog);

  const close = () => {
    useAppStore.setState({ patchNotesOpen: false });
    if (mode === 'post-update') {
      localStorage.setItem('last-seen-changelog', version || '');
    }
  };

  const startDownload = () => {
    close();
    useAppStore.setState({ updateStatus: 'downloading', downloadProgress: 0 });
    // Trigger download (same as UpdateBar)
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) { p = 100; clearInterval(interval); useAppStore.setState({ updateStatus: 'ready', downloadProgress: 100 }); }
      useAppStore.setState({ downloadProgress: Math.min(100, Math.round(p)) });
    }, 500);
  };

  const features = changelog.filter(c => c.type === 'feature');
  const improvements = changelog.filter(c => c.type === 'improvement');
  const fixes = changelog.filter(c => c.type === 'fix');
  const security = changelog.filter(c => c.type === 'security');

  const dotColor = { feature: '#F97316', improvement: '#5B9BD5', fix: '#28C840', security: '#FF5F57' };
  const countBg = { feature: '#F97316', improvement: '#5B9BD5', fix: '#28C840', security: '#FF5F57' };

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
          onClick={close}
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
            <div className="flex items-start justify-between px-6 pt-5 pb-0">
              <div>
                <div className="text-[18px] text-void-text font-bold font-sans" style={{ letterSpacing: '-0.5px' }}>
                  {mode === 'preview' ? `What's coming in v${version}` : `What's new in Void Terminal`}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono font-semibold px-[10px] py-[3px] rounded-[10px]"
                    style={mode === 'post-update'
                      ? { color: 'var(--base)', background: '#F97316' }
                      : { color: '#F97316', background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.15)' }
                    }>
                    v{version}
                  </span>
                  <span className="text-[10px] text-void-text-ghost font-mono">
                    {mode === 'preview' ? 'Not yet installed' : 'March 2026'}
                  </span>
                </div>
              </div>
              <button onClick={close} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer p-1 leading-none">×</button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: mode === 'preview' ? '280px' : '360px', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
              {features.length > 0 && (
                <Section label="New features" count={features.length} color={countBg.feature} dotColor={dotColor.feature} items={features} />
              )}
              {improvements.length > 0 && (
                <Section label="Improvements" count={improvements.length} color={countBg.improvement} dotColor={dotColor.improvement} items={improvements} />
              )}
              {fixes.length > 0 && (
                <Section label="Bug fixes" count={fixes.length} color={countBg.fix} dotColor={dotColor.fix} items={fixes} />
              )}
              {security.length > 0 && (
                <Section label="Security" count={security.length} color={countBg.security} dotColor={dotColor.security} items={security} />
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3" style={{ borderTop: '0.5px solid var(--border)' }}>
              <span className="text-[10px] text-void-text-ghost font-mono">Full changelog at voidterminal.dev/changelog</span>
              {mode === 'preview' ? (
                <div className="flex gap-2">
                  <button onClick={close} className="px-[20px] py-[8px] rounded-[6px] text-[12px] font-semibold cursor-pointer font-sans" style={{ background: 'transparent', color: 'var(--dim)', border: '0.5px solid var(--border)' }}>Not now</button>
                  <button onClick={startDownload} className="px-[20px] py-[8px] rounded-[6px] text-[12px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#F97316', color: 'var(--base)' }}>Download & install</button>
                </div>
              ) : (
                <button onClick={close} className="px-[20px] py-[8px] rounded-[6px] text-[12px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#F97316', color: 'var(--base)' }}>Got it</button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({ label, count, color, dotColor, items }: { label: string; count: number; color: string; dotColor: string; items: { text: string }[] }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-[6px] mb-[6px]">
        <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-mono font-bold" style={{ background: color, color: 'var(--base)' }}>{count}</span>
        <span className="text-[9px] uppercase tracking-[1px] font-mono font-semibold" style={{ color }}>{label}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 py-[5px] text-[12px] text-void-text-muted leading-[1.4] font-sans">
          <div className="w-[5px] h-[5px] rounded-full shrink-0 mt-[6px]" style={{ background: dotColor }} />
          <span dangerouslySetInnerHTML={{ __html: item.text.replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--text);font-weight:500">$1</strong>').replace(/`(.*?)`/g, '<code style="font-family:JetBrains Mono,monospace;font-size:10px;color:#F97316;background:var(--elevated);padding:1px 5px;border-radius:3px">$1</code>') }} />
        </div>
      ))}
    </div>
  );
}
