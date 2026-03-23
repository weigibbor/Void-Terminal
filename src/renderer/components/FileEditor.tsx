import { useState } from 'react';

interface FileEditorProps {
  fileName: string;
  content: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export function FileEditor({ fileName, content, onSave, onClose }: FileEditorProps) {
  const [value, setValue] = useState(content);
  const [saved, setSaved] = useState(true);

  const handleSave = () => {
    onSave(value);
    setSaved(true);
  };

  return (
    <div className="flex flex-col h-full bg-void-elevated">
      {/* Header */}
      <div className="flex items-center justify-between h-8 px-3 bg-void-surface/50 border-b border-void-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-void-text-muted font-mono">{fileName}</span>
          {!saved && <span className="w-2 h-2 rounded-full bg-accent" title="Unsaved changes" />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className="text-2xs text-accent hover:text-accent-hover px-2 py-0.5"
          >
            Save
          </button>
          <button onClick={onClose} className="text-void-text-ghost hover:text-void-text-muted text-xs">
            x
          </button>
        </div>
      </div>

      {/* Editor */}
      <textarea
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(false);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            handleSave();
          }
        }}
        spellCheck={false}
        className="flex-1 bg-void-elevated text-sm text-void-text font-mono p-4 resize-none outline-none leading-6"
      />
    </div>
  );
}
