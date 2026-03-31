import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/app-store';
import type { Note, NoteType } from '../types';

const NOTE_BORDER_COLORS: Record<NoteType, string> = {
  pinned: 'border-l-accent',
  warning: 'border-l-status-error',
  quickref: 'border-l-status-warning',
  note: 'border-l-transparent',
};

export function NotesSidebar() {
  const [scope, setScope] = useState<'global' | 'server'>('global');
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [composing, setComposing] = useState(false);

  const activeTabId = useAppStore((s) => s.activeTabId);
  const tabs = useAppStore((s) => s.tabs);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const serverScope = activeTab?.connectionConfig
    ? `${activeTab.connectionConfig.username}@${activeTab.connectionConfig.host}`
    : 'global';

  const currentScope = scope === 'server' && serverScope !== 'global' ? serverScope : 'global';

  useEffect(() => {
    loadNotes();
  }, [currentScope]);

  const loadNotes = async () => {
    const result = await window.void.notes.list(currentScope);
    setNotes(result as Note[]);
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;
    await window.void.notes.save({
      scope: currentScope,
      title: newNote.split('\n')[0].substring(0, 50),
      content: newNote,
      type: 'note',
    });
    setNewNote('');
    setComposing(false);
    loadNotes();
  };

  const handleDelete = async (id: string) => {
    await window.void.notes.delete(id);
    loadNotes();
  };

  const handleTogglePin = async (note: Note) => {
    await window.void.notes.update(note.id, {
      pinned: !note.pinned,
      type: note.pinned ? 'note' : 'pinned',
    });
    loadNotes();
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <div className="flex items-center gap-2">
          <span className="text-void-text-ghost text-[13px]">📌</span>
          <span className="text-[13px] text-void-text font-medium font-sans">Notes</span>
        </div>
        <div className="flex items-center gap-[4px]">
          <button
            onClick={() => {
              const content = notes.map(n => `[${n.type.toUpperCase()}] ${n.content}`).join('\n\n---\n\n');
              const header = `# Void Terminal Notes\n# Scope: ${currentScope}\n# Exported: ${new Date().toLocaleString()}\n# Total: ${notes.length} notes\n\n`;
              const blob = new Blob([header + content], { type: 'text/plain' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `void-notes-${currentScope.replace(/[@:]/g, '-')}-${new Date().toISOString().split('T')[0]}.txt`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[14px] text-void-text-ghost hover:text-void-text-muted hover:bg-void-surface cursor-pointer bg-transparent border-none transition-all"
            title="Export notes"
          >
            ↓
          </button>
          <button
            onClick={() => setComposing(true)}
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-[18px] text-void-text-ghost hover:text-void-text-muted hover:bg-void-surface cursor-pointer bg-transparent border-none transition-all leading-none"
            title="Add note"
          >
            +
          </button>
        </div>
      </div>

      {/* Scope tabs */}
      <div className="flex shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <button
          onClick={() => setScope(serverScope !== 'global' ? 'server' : 'global')}
          className={`flex-1 py-[8px] text-[11px] font-sans cursor-pointer transition-colors ${
            scope === 'server' ? 'text-accent' : 'text-void-text-ghost hover:text-void-text-muted'
          }`}
          style={scope === 'server' ? { borderBottom: '1.5px solid #F97316' } : {}}
        >
          This server
        </button>
        <button
          onClick={() => setScope('global')}
          className={`flex-1 py-[8px] text-[11px] font-sans cursor-pointer transition-colors ${
            scope === 'global' ? 'text-accent' : 'text-void-text-ghost hover:text-void-text-muted'
          }`}
          style={scope === 'global' ? { borderBottom: '1.5px solid #F97316' } : {}}
        >
          Global
        </button>
      </div>

      {/* Quick add — at the top so new notes appear below */}
      <div className="p-2 shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        {composing ? (
          <div className="space-y-[6px]">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNote();
                }
                if (e.key === 'Escape') { setComposing(false); setNewNote(''); }
              }}
              placeholder="Type a note..."
              rows={3}
              autoFocus
              className="w-full bg-void-surface rounded-[6px] text-[12px] text-void-text-muted p-2.5 resize-none outline-none font-sans"
              style={{ border: '0.5px solid rgba(249,115,22,0.15)' }}
            />
            <div className="flex items-center justify-between text-[10px] text-void-text-ghost font-sans">
              <span>Shift+Enter new line</span>
              <button onClick={handleSaveNote} className="text-accent hover:text-accent-hover bg-transparent border-none cursor-pointer font-sans font-semibold">
                Save ↵
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setComposing(true)}
            className="w-full text-left text-[12px] text-void-text-ghost bg-void-surface rounded-[6px] px-3 py-2.5 hover:text-void-text-muted transition-colors font-sans cursor-pointer"
            style={{ border: '0.5px solid var(--border)' }}
          >
            Type a note...
          </button>
        )}
      </div>

      {/* Notes list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
        {notes.length === 0 && (
          <p className="text-[11px] text-void-text-ghost text-center py-6 font-sans">
            No notes yet. Type above to start.
          </p>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`bg-void-surface/50 rounded-[6px] p-3 border-l-2 ${NOTE_BORDER_COLORS[note.type]} group`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-[9px] text-void-text-ghost uppercase tracking-wider font-mono">{note.type}</span>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => navigator.clipboard.writeText(note.content)}
                  className="text-[11px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer"
                  title="Copy note"
                >
                  📋
                </button>
                <button
                  onClick={() => handleTogglePin(note)}
                  className="text-[11px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer"
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  📌
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-[13px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>
            <p className="text-[12px] text-void-text-muted whitespace-pre-wrap break-words leading-relaxed font-sans select-text cursor-text">
              {note.content}
            </p>
            {note.aiGenerated && (
              <span className="inline-block mt-1 text-[9px] text-[#C586C0] font-mono">AI generated</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
