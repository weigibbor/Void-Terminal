import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../stores/app-store';
import type { SavedConnection } from '../types';

type Mode = 'choose' | 'export' | 'import';

export function ShareConnectionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<Mode>('choose');
  const [passphrase, setPassphrase] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exportJson, setExportJson] = useState('');
  const [importJson, setImportJson] = useState('');
  const [status, setStatus] = useState('');
  const savedConnections = useAppStore((s) => s.savedConnections);
  const loadSavedConnections = useAppStore((s) => s.loadSavedConnections);

  useEffect(() => {
    if (open) { setMode('choose'); setPassphrase(''); setExportJson(''); setImportJson(''); setStatus(''); setSelectedIds(new Set()); }
  }, [open]);

  const doExport = async () => {
    if (!passphrase) { setStatus('Enter a team passphrase'); return; }
    if (selectedIds.size === 0) { setStatus('Select connections to export'); return; }
    const result = await (window as any).void.connections.exportEncrypted(Array.from(selectedIds), passphrase);
    if (result.success) {
      setExportJson(result.data);
      navigator.clipboard.writeText(result.data);
      setStatus(`Exported ${selectedIds.size} connections — copied to clipboard`);
    } else setStatus(result.error);
  };

  const doImport = async () => {
    if (!passphrase || !importJson.trim()) { setStatus('Enter passphrase and paste JSON'); return; }
    const result = await (window as any).void.connections.importEncrypted(importJson.trim(), passphrase);
    if (result.success) {
      setStatus(`Imported ${result.count} connections`);
      await loadSavedConnections();
      setTimeout(onClose, 1500);
    } else setStatus(result.error);
  };

  const toggleId = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
          <motion.div initial={{ scale: 0.95, y: 8, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="w-full"
            style={{ maxWidth: '460px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
              <div className="text-[13px] text-void-text font-semibold font-sans">
                {mode === 'choose' ? 'Share Connections' : mode === 'export' ? 'Export Connections' : 'Import Connections'}
              </div>
              <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
            </div>

            <div className="px-5 py-4">
              {mode === 'choose' ? (
                <div className="flex flex-col gap-3">
                  <div className="text-[11px] text-void-text-dim">Share connections with your team using encrypted export/import.</div>
                  <button onClick={() => setMode('export')}
                    className="flex items-center gap-3 p-3 bg-void-surface rounded-[8px] text-left cursor-pointer hover:bg-void-elevated transition-colors"
                    style={{ border: '0.5px solid var(--border)' }}>
                    <span className="text-[20px]">↑</span>
                    <div>
                      <div className="text-[12px] text-void-text font-medium">Export</div>
                      <div className="text-[10px] text-void-text-dim">Encrypt and share selected connections</div>
                    </div>
                  </button>
                  <button onClick={() => setMode('import')}
                    className="flex items-center gap-3 p-3 bg-void-surface rounded-[8px] text-left cursor-pointer hover:bg-void-elevated transition-colors"
                    style={{ border: '0.5px solid var(--border)' }}>
                    <span className="text-[20px]">↓</span>
                    <div>
                      <div className="text-[12px] text-void-text font-medium">Import</div>
                      <div className="text-[10px] text-void-text-dim">Paste shared JSON and decrypt</div>
                    </div>
                  </button>
                </div>
              ) : mode === 'export' ? (
                <div className="flex flex-col gap-3">
                  <button onClick={() => setMode('choose')} className="text-[10px] text-void-text-dim bg-transparent border-none cursor-pointer text-left p-0">← Back</button>
                  <div className="text-[10px] text-void-text-dim uppercase tracking-[0.5px]">Select connections</div>
                  <div className="flex flex-col gap-[4px] max-h-[160px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
                    {savedConnections.map((conn: SavedConnection) => (
                      <label key={conn.id} className="flex items-center gap-2 py-[4px] px-[6px] rounded-[4px] hover:bg-void-elevated cursor-pointer">
                        <input type="checkbox" checked={selectedIds.has(conn.id)} onChange={() => toggleId(conn.id)} className="accent-accent" />
                        <span className="text-[11px] text-void-text font-mono">{conn.alias}</span>
                        <span className="text-[9px] text-void-text-dim ml-auto">{conn.username}@{conn.host}</span>
                      </label>
                    ))}
                  </div>
                  <input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)}
                    placeholder="Team passphrase (for encryption)" className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2.5 py-1.5" />
                  <button onClick={doExport} className="text-[11px] bg-accent text-void-base px-4 py-2 rounded-[6px] font-semibold cursor-pointer border-none">
                    Export & copy to clipboard
                  </button>
                  {exportJson && (
                    <textarea value={exportJson} readOnly rows={4}
                      className="w-full bg-void-input border border-void-border rounded-void text-[9px] text-void-text-ghost px-2.5 py-1.5 font-mono resize-none" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button onClick={() => setMode('choose')} className="text-[10px] text-void-text-dim bg-transparent border-none cursor-pointer text-left p-0">← Back</button>
                  <textarea value={importJson} onChange={e => setImportJson(e.target.value)}
                    placeholder="Paste shared connection JSON here..." rows={6}
                    className="w-full bg-void-input border border-void-border rounded-void text-[10px] text-void-text-muted px-2.5 py-1.5 font-mono resize-none" />
                  <input type="password" value={passphrase} onChange={e => setPassphrase(e.target.value)}
                    placeholder="Team passphrase (to decrypt)" className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2.5 py-1.5" />
                  <button onClick={doImport} className="text-[11px] bg-accent text-void-base px-4 py-2 rounded-[6px] font-semibold cursor-pointer border-none">
                    Decrypt & import
                  </button>
                </div>
              )}
              {status && <div className="text-[10px] text-void-text-dim mt-2">{status}</div>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
