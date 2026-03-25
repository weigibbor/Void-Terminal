import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import type { Snippet } from '../types';

function detectVars(command: string): string[] {
  const matches = command.match(/\$\{(\w+)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map(m => m.slice(2, -1)))];
}

function resolveVars(): Record<string, string> {
  const tab = useAppStore.getState().tabs.find(t => t.id === useAppStore.getState().activeTabId);
  const config = tab?.connectionConfig;
  return {
    host: config?.host || '',
    user: config?.username || '',
    username: config?.username || '',
    port: String(config?.port || 22),
    server: config?.host || '',
  };
}

export function SnippetsPanel({ onRun }: { onRun: (command: string) => void }) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTags, setNewTags] = useState('');
  const [adding, setAdding] = useState(false);
  const [fillVars, setFillVars] = useState<{ snippet: Snippet; vars: string[]; values: Record<string, string> } | null>(null);

  useEffect(() => { loadSnippets(); }, []);

  const loadSnippets = async () => {
    const result = await window.void.snippets.list();
    setSnippets(result as Snippet[]);
  };

  const handleSave = async () => {
    if (!newName.trim() || !newCommand.trim()) return;
    await window.void.snippets.save({
      name: newName,
      command: newCommand,
      description: newDesc || undefined,
      tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    });
    setNewName(''); setNewCommand(''); setNewDesc(''); setNewTags('');
    setAdding(false);
    loadSnippets();
  };

  const handleRun = async (snippet: Snippet) => {
    const vars = detectVars(snippet.command);
    if (vars.length > 0) {
      const known = resolveVars();
      const values: Record<string, string> = {};
      for (const v of vars) values[v] = known[v] || '';
      setFillVars({ snippet, vars, values });
      return;
    }
    await window.void.snippets.incrementRunCount(snippet.id);
    onRun(snippet.command);
    loadSnippets();
  };

  const executeWithVars = async () => {
    if (!fillVars) return;
    let cmd = fillVars.snippet.command;
    for (const [k, v] of Object.entries(fillVars.values)) {
      cmd = cmd.replaceAll(`\${${k}}`, v);
    }
    await window.void.snippets.incrementRunCount(fillVars.snippet.id);
    onRun(cmd);
    setFillVars(null);
    loadSnippets();
  };

  const handleDelete = async (id: string) => {
    await window.void.snippets.delete(id);
    loadSnippets();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-void-text font-medium">Snippets</h3>
        <button onClick={() => setAdding(!adding)} className="text-void-text-ghost hover:text-accent text-lg leading-none">+</button>
      </div>

      {adding && (
        <div className="space-y-2 p-3 bg-void-surface/50 rounded-void-lg border border-void-border/50">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Snippet name" className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2.5 py-1.5" />
          <textarea value={newCommand} onChange={(e) => setNewCommand(e.target.value)}
            placeholder="Command (use ${host}, ${user}, ${port} for variables)" rows={2}
            className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2.5 py-1.5 resize-none font-mono" />
          <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)" className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-ghost px-2.5 py-1.5" />
          <input type="text" value={newTags} onChange={(e) => setNewTags(e.target.value)}
            placeholder="Tags (comma-separated)" className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-ghost px-2.5 py-1.5" />
          <div className="flex gap-2">
            <button onClick={handleSave} className="text-2xs bg-accent text-void-base px-3 py-1 rounded-void">Save</button>
            <button onClick={() => setAdding(false)} className="text-2xs text-void-text-ghost px-3 py-1">Cancel</button>
          </div>
        </div>
      )}

      {/* Variable fill-in dialog */}
      {fillVars && (
        <div className="p-3 bg-void-surface/50 rounded-void-lg border border-accent/20 space-y-2">
          <div className="text-[10px] text-accent font-mono uppercase tracking-[0.5px]">Fill in variables</div>
          <div className="text-[11px] text-void-text-dim font-mono truncate">{fillVars.snippet.command}</div>
          {fillVars.vars.map(v => (
            <div key={v} className="flex items-center gap-2">
              <span className="text-[10px] text-accent font-mono w-16 shrink-0">${'{' + v + '}'}</span>
              <input type="text" value={fillVars.values[v] || ''}
                onChange={e => setFillVars({ ...fillVars, values: { ...fillVars.values, [v]: e.target.value } })}
                placeholder={v} className="flex-1 bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2 py-1 font-mono" />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={executeWithVars} className="text-2xs bg-accent text-void-base px-3 py-1 rounded-void">Run</button>
            <button onClick={() => setFillVars(null)} className="text-2xs text-void-text-ghost px-3 py-1">Cancel</button>
          </div>
        </div>
      )}

      {snippets.map((snippet) => (
        <div key={snippet.id} className="group flex items-start gap-2 p-2.5 bg-void-input rounded-void-lg hover:border-void-border-hover border border-transparent transition-colors">
          <button onClick={() => handleRun(snippet)} className="text-status-online hover:text-status-online/80 text-xs shrink-0 mt-0.5" title="Run snippet">&#9654;</button>
          <div className="flex-1 min-w-0">
            <code className="text-sm text-void-text-muted font-mono block truncate">{snippet.command}</code>
            <span className="text-2xs text-void-text-ghost">{snippet.name}</span>
            {snippet.description && <div className="text-2xs text-void-text-dim mt-[2px]">{snippet.description}</div>}
            {snippet.tags && snippet.tags.length > 0 && (
              <div className="flex gap-1 mt-1">
                {snippet.tags.map((tag, i) => (
                  <span key={i} className="text-[8px] px-[5px] py-[1px] rounded-[3px] text-void-text-ghost" style={{ background: 'rgba(249,115,22,0.06)', border: '0.5px solid rgba(249,115,22,0.1)' }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => handleDelete(snippet.id)} className="text-void-text-ghost hover:text-status-error text-xs opacity-0 group-hover:opacity-100 transition-opacity">x</button>
        </div>
      ))}

      {snippets.length === 0 && !adding && (
        <p className="text-2xs text-void-text-ghost text-center py-4">No snippets saved. Click + to add one.</p>
      )}
    </div>
  );
}
