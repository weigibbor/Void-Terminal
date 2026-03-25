import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';

type Step = 'select' | 'scanning' | 'preview' | 'done';
interface ImportEntry { alias: string; host: string; port: number; username: string; source: string; selected: boolean; }

export function MigrationWizard({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>('select');
  const [entries, setEntries] = useState<ImportEntry[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [sources, setSources] = useState({ sshConfig: true, termius: false, iterm: false, putty: false });
  const loadSavedConnections = useAppStore((s) => s.loadSavedConnections);

  const startScan = async () => {
    setStep('scanning');
    const found: ImportEntry[] = [];
    if (sources.sshConfig) {
      try {
        const entries = await (window as any).void.ssh.parseConfig();
        if (entries) {
          entries.forEach((e: any) => found.push({
            alias: e.host, host: e.hostName || e.host, port: e.port || 22,
            username: e.user || 'root', source: 'SSH Config', selected: true,
          }));
        }
      } catch { /* ignore */ }
    }
    // Termius/iTerm/PuTTY would need file parsing for their specific formats
    setEntries(found);
    setStep(found.length > 0 ? 'preview' : 'done');
  };

  const doImport = async () => {
    const selected = entries.filter(e => e.selected);
    for (const e of selected) {
      await (window as any).void.connections.save({
        alias: e.alias, host: e.host, port: e.port, username: e.username,
        authMethod: 'key', privateKeyPath: '~/.ssh/id_ed25519',
        keepAlive: true, keepAliveInterval: 30, autoReconnect: true,
      });
    }
    setImportedCount(selected.length);
    await loadSavedConnections();
    setStep('done');
  };

  const toggleEntry = (i: number) => {
    const next = [...entries];
    next[i].selected = !next[i].selected;
    setEntries(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '460px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        {/* Progress bar */}
        <div className="flex gap-[2px] px-5 pt-4">
          {['select', 'scanning', 'preview', 'done'].map((s, i) => (
            <div key={s} className="flex-1 h-[3px] rounded-full" style={{ background: ['select', 'scanning', 'preview', 'done'].indexOf(step) >= i ? '#F97316' : 'var(--border)' }} />
          ))}
        </div>

        <div className="px-5 py-4">
          {step === 'select' && (
            <>
              <div className="text-[16px] text-void-text font-semibold font-sans mb-1">Import Connections</div>
              <div className="text-[11px] text-void-text-dim mb-4">Import from other apps or SSH config.</div>
              <div className="flex flex-col gap-[6px] mb-4">
                {[
                  { key: 'sshConfig', label: 'SSH Config', desc: '~/.ssh/config' },
                  { key: 'termius', label: 'Termius', desc: 'termius.json (coming soon)' },
                  { key: 'iterm', label: 'iTerm2 Profiles', desc: 'com.googlecode.iterm2.plist (coming soon)' },
                  { key: 'putty', label: 'PuTTY Sessions', desc: 'Windows Registry (coming soon)' },
                ].map(s => (
                  <label key={s.key} className="flex items-center gap-3 p-3 rounded-[8px] bg-void-surface cursor-pointer" style={{ border: '0.5px solid var(--border)' }}>
                    <input type="checkbox" checked={(sources as any)[s.key]} onChange={() => setSources(prev => ({ ...prev, [s.key]: !(prev as any)[s.key] }))}
                      disabled={s.key !== 'sshConfig'} className="accent-accent" />
                    <div>
                      <div className="text-[12px] text-void-text font-medium">{s.label}</div>
                      <div className="text-[10px] text-void-text-dim">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
              <button onClick={startScan} className="w-full py-[10px] rounded-[8px] text-[12px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#F97316', color: 'var(--base)' }}>Scan for connections</button>
            </>
          )}
          {step === 'scanning' && (
            <div className="text-center py-8">
              <div className="text-[14px] text-void-text font-semibold mb-2">Scanning...</div>
              <div className="text-[11px] text-void-text-dim">Looking for saved connections</div>
            </div>
          )}
          {step === 'preview' && (
            <>
              <div className="text-[14px] text-void-text font-semibold mb-1">Found {entries.length} connections</div>
              <div className="text-[11px] text-void-text-dim mb-3">Select which to import.</div>
              <div className="flex flex-col gap-[4px] max-h-[200px] overflow-y-auto mb-4" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
                {entries.map((e, i) => (
                  <label key={i} className="flex items-center gap-2 p-[8px] rounded-[6px] hover:bg-void-elevated cursor-pointer">
                    <input type="checkbox" checked={e.selected} onChange={() => toggleEntry(i)} className="accent-accent" />
                    <span className="text-[11px] text-void-text font-mono">{e.alias}</span>
                    <span className="text-[9px] text-void-text-dim ml-auto">{e.username}@{e.host} · {e.source}</span>
                  </label>
                ))}
              </div>
              <button onClick={doImport} className="w-full py-[10px] rounded-[8px] text-[12px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#F97316', color: 'var(--base)' }}>Import {entries.filter(e => e.selected).length} connections</button>
            </>
          )}
          {step === 'done' && (
            <div className="text-center py-6">
              <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="mx-auto mb-3"><circle cx="8" cy="8" r="7" stroke="#28C840" strokeWidth="1.3" /><path d="M5 8l2.5 2.5L11.5 5" stroke="#28C840" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <div className="text-[14px] text-void-text font-semibold mb-1">{importedCount > 0 ? `Imported ${importedCount} connections` : 'No connections found'}</div>
              <div className="text-[11px] text-void-text-dim mb-4">{importedCount > 0 ? 'Ready to connect!' : 'Add connections manually from the + tab.'}</div>
              <button onClick={onClose} className="px-6 py-[8px] rounded-[8px] text-[12px] font-semibold cursor-pointer font-sans border-none" style={{ background: '#F97316', color: 'var(--base)' }}>Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
