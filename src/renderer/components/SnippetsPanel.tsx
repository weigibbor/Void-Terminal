import { useState, useEffect } from 'react';
import type { Snippet } from '../types';

export function SnippetsPanel({ onRun }: { onRun: (command: string) => void }) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [newName, setNewName] = useState('');
  const [newCommand, setNewCommand] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadSnippets();
  }, []);

  const loadSnippets = async () => {
    const result = await window.void.snippets.list();
    setSnippets(result as Snippet[]);
  };

  const handleSave = async () => {
    if (!newName.trim() || !newCommand.trim()) return;
    await window.void.snippets.save({ name: newName, command: newCommand });
    setNewName('');
    setNewCommand('');
    setAdding(false);
    loadSnippets();
  };

  const handleRun = async (snippet: Snippet) => {
    await window.void.snippets.incrementRunCount(snippet.id);
    onRun(snippet.command);
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
        <button
          onClick={() => setAdding(!adding)}
          className="text-void-text-ghost hover:text-accent text-lg leading-none"
        >
          +
        </button>
      </div>

      {adding && (
        <div className="space-y-2 p-3 bg-void-surface/50 rounded-void-lg border border-void-border/50">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Snippet name"
            className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2.5 py-1.5"
          />
          <textarea
            value={newCommand}
            onChange={(e) => setNewCommand(e.target.value)}
            placeholder="Command"
            rows={2}
            className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-2.5 py-1.5 resize-none font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="text-2xs bg-accent text-void-base px-3 py-1 rounded-void"
            >
              Save
            </button>
            <button
              onClick={() => setAdding(false)}
              className="text-2xs text-void-text-ghost px-3 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {snippets.map((snippet) => (
        <div
          key={snippet.id}
          className="group flex items-center gap-2 p-2.5 bg-void-input rounded-void-lg hover:border-void-border-hover border border-transparent transition-colors"
        >
          <button
            onClick={() => handleRun(snippet)}
            className="text-status-online hover:text-status-online/80 text-xs shrink-0"
            title="Run snippet"
          >
            &#9654;
          </button>
          <div className="flex-1 min-w-0">
            <code className="text-sm text-void-text-muted font-mono block truncate">
              {snippet.command}
            </code>
            <span className="text-2xs text-void-text-ghost">{snippet.name}</span>
          </div>
          <button
            onClick={() => handleDelete(snippet.id)}
            className="text-void-text-ghost hover:text-status-error text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            x
          </button>
        </div>
      ))}

      {snippets.length === 0 && !adding && (
        <p className="text-2xs text-void-text-ghost text-center py-4">
          No snippets saved. Click + to add one.
        </p>
      )}
    </div>
  );
}
