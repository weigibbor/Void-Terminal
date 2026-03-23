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
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-void-border/50">
        <div className="flex items-center gap-2">
          <span className="text-void-text-ghost text-xs">&#128278;</span>
          <span className="text-sm text-void-text font-medium">Notes</span>
        </div>
        <button
          onClick={() => setComposing(true)}
          className="text-void-text-ghost hover:text-void-text-muted text-lg leading-none"
        >
          +
        </button>
      </div>

      {/* Scope tabs */}
      <div className="flex border-b border-void-border/50">
        <button
          onClick={() => setScope(serverScope !== 'global' ? 'server' : 'global')}
          className={`flex-1 py-1.5 text-2xs transition-colors ${
            scope === 'server' ? 'text-accent border-b border-accent' : 'text-void-text-ghost'
          }`}
        >
          This server
        </button>
        <button
          onClick={() => setScope('global')}
          className={`flex-1 py-1.5 text-2xs transition-colors ${
            scope === 'global' ? 'text-accent border-b border-accent' : 'text-void-text-ghost'
          }`}
        >
          Global
        </button>
      </div>

      {/* Notes list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {notes.length === 0 && (
          <p className="text-2xs text-void-text-ghost text-center py-4">
            No notes yet. Click + to start.
          </p>
        )}
        {notes.map((note) => (
          <div
            key={note.id}
            className={`bg-void-surface/50 rounded-void-lg p-2.5 border-l-2 ${NOTE_BORDER_COLORS[note.type]} group`}
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-2xs text-void-text-ghost uppercase">{note.type}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleTogglePin(note)}
                  className="text-2xs text-void-text-ghost hover:text-accent"
                  title={note.pinned ? 'Unpin' : 'Pin'}
                >
                  &#128204;
                </button>
                <button
                  onClick={() => handleDelete(note.id)}
                  className="text-2xs text-void-text-ghost hover:text-status-error"
                >
                  x
                </button>
              </div>
            </div>
            <p className="text-sm text-void-text-muted whitespace-pre-wrap break-words">
              {note.content}
            </p>
            {note.aiGenerated && (
              <span className="inline-block mt-1 text-2xs text-status-ai">AI</span>
            )}
          </div>
        ))}
      </div>

      {/* Quick add */}
      <div className="border-t border-void-border/50 p-2">
        {composing ? (
          <div className="space-y-1.5">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSaveNote();
                }
              }}
              placeholder="Type a note..."
              rows={3}
              autoFocus
              className="w-full bg-void-surface border border-void-border rounded-void text-sm text-void-text-muted p-2 resize-none focus:border-accent/50 transition-colors"
            />
            <div className="flex items-center justify-between text-2xs text-void-text-ghost">
              <span>Shift+Enter new line</span>
              <button
                onClick={handleSaveNote}
                className="text-accent hover:text-accent-hover"
              >
                Save Enter
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setComposing(true)}
            className="w-full text-left text-sm text-void-text-ghost bg-void-surface border border-void-border rounded-void px-3 py-2 hover:border-void-border-hover transition-colors"
          >
            Type a note...
          </button>
        )}
      </div>
    </div>
  );
}
