import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import { AnimatePresence, motion } from 'framer-motion';

interface ServerResult {
  tabId: string;
  title: string;
  host: string;
  stdout: string;
  stderr: string;
  code: number;
  duration: number;
}

export function CommandRunner({ onClose }: { onClose: () => void }) {
  const tabs = useAppStore((s) => s.tabs);
  const connectedTabs = tabs.filter(t => t.connected && t.sessionId && t.type === 'ssh');
  const [command, setCommand] = useState('');
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(new Set(connectedTabs.map(t => t.id)));
  const [results, setResults] = useState<ServerResult[]>([]);
  const [running, setRunning] = useState(false);
  const [expandedResults, setExpandedResults] = useState<Set<string>>(new Set());

  const toggleTab = (id: string) => {
    const next = new Set(selectedTabs);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedTabs(next);
  };

  const runCommand = async () => {
    if (!command.trim() || selectedTabs.size === 0) return;
    setRunning(true);
    setResults([]);
    setExpandedResults(new Set());

    const selected = connectedTabs.filter(t => selectedTabs.has(t.id));
    const promises = selected.map(async (tab) => {
      const start = Date.now();
      const result = await (window as any).void.ssh.exec(tab.sessionId, command);
      return {
        tabId: tab.id,
        title: tab.title,
        host: tab.connectionConfig?.host || 'unknown',
        stdout: result.stdout,
        stderr: result.stderr,
        code: result.code,
        duration: Date.now() - start,
      };
    });

    const all = await Promise.all(promises);
    setResults(all);
    setExpandedResults(new Set(all.map(r => r.tabId)));
    setRunning(false);
  };

  const copyAll = () => {
    const text = results.map(r =>
      `=== ${r.title} (${r.host}) — exit ${r.code} ===\n${r.stdout}${r.stderr ? '\nSTDERR:\n' + r.stderr : ''}`
    ).join('\n\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '600px', maxHeight: '80vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Multi-Server Command Runner</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>

        {/* Command input */}
        <div className="px-5 pt-4 shrink-0">
          <div className="flex gap-2">
            <input type="text" value={command} onChange={e => setCommand(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') runCommand(); }}
              placeholder="Enter command (e.g., uptime, df -h, whoami)"
              className="flex-1 px-3 py-2 bg-void-input rounded-[6px] text-[12px] text-void-text font-mono outline-none"
              style={{ border: '0.5px solid var(--border)' }} autoFocus />
            <button onClick={runCommand} disabled={running || !command.trim() || selectedTabs.size === 0}
              className="px-4 py-2 rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans border-none"
              style={{ background: running ? '#333' : '#F97316', color: 'var(--base)' }}>
              {running ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Server selection */}
        <div className="px-5 pt-3 shrink-0">
          <div className="text-[9px] text-void-text-dim uppercase tracking-[0.5px] mb-[6px]">
            Servers ({selectedTabs.size}/{connectedTabs.length} selected)
          </div>
          <div className="flex flex-wrap gap-[6px]">
            {connectedTabs.map(tab => (
              <button key={tab.id} onClick={() => toggleTab(tab.id)}
                className={`px-[10px] py-[4px] rounded-[5px] text-[10px] font-mono cursor-pointer ${selectedTabs.has(tab.id) ? 'text-accent' : 'text-void-text-ghost'}`}
                style={{ border: `0.5px solid ${selectedTabs.has(tab.id) ? 'rgba(249,115,22,0.3)' : '#2A2A30'}` }}>
                <span className={`inline-block w-[5px] h-[5px] rounded-full mr-[4px] ${selectedTabs.has(tab.id) ? 'bg-status-online' : 'bg-void-text-ghost'}`} />
                {tab.title}
              </button>
            ))}
            {connectedTabs.length === 0 && (
              <span className="text-[10px] text-void-text-ghost">No connected SSH sessions</span>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-5 py-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {results.map(r => (
            <div key={r.tabId} className="mb-2 rounded-[8px] overflow-hidden" style={{ border: `0.5px solid ${r.code === 0 ? 'rgba(40,200,64,0.15)' : 'rgba(255,95,87,0.15)'}` }}>
              <button onClick={() => {
                const next = new Set(expandedResults);
                next.has(r.tabId) ? next.delete(r.tabId) : next.add(r.tabId);
                setExpandedResults(next);
              }} className="w-full flex items-center justify-between px-3 py-2 bg-transparent border-none cursor-pointer text-left"
                style={{ background: r.code === 0 ? 'rgba(40,200,64,0.03)' : 'rgba(255,95,87,0.03)' }}>
                <div className="flex items-center gap-2">
                  <span className={`w-[6px] h-[6px] rounded-full ${r.code === 0 ? 'bg-status-online' : 'bg-status-error'}`} />
                  <span className="text-[11px] text-void-text font-mono font-medium">{r.title}</span>
                  <span className="text-[9px] text-void-text-ghost">{r.host}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-void-text-ghost font-mono">{r.duration}ms</span>
                  <span className={`text-[9px] font-mono ${r.code === 0 ? 'text-status-online' : 'text-status-error'}`}>exit {r.code}</span>
                </div>
              </button>
              {expandedResults.has(r.tabId) && (
                <pre className="px-3 py-2 text-[10px] font-mono text-void-text-muted whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto"
                  style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent', borderTop: '0.5px solid var(--border)' }}>
                  {r.stdout || '(no output)'}
                  {r.stderr && <span className="text-status-error">{'\n' + r.stderr}</span>}
                </pre>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        {results.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2 shrink-0" style={{ borderTop: '0.5px solid var(--border)' }}>
            <span className="text-[9px] text-void-text-ghost font-mono">
              {results.filter(r => r.code === 0).length}/{results.length} succeeded
            </span>
            <button onClick={copyAll} className="text-[10px] text-accent bg-transparent border-none cursor-pointer font-mono">Copy all output</button>
          </div>
        )}
      </div>
    </div>
  );
}
