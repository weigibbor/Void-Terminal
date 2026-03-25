import { useState, useEffect, useRef } from 'react';

interface CodeEditorProps {
  fileName: string;
  filePath: string;
  content: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

const EXT_COLORS: Record<string, Record<string, string>> = {
  keyword: { default: '#C586C0' },
  string: { default: '#CE9178' },
  comment: { default: '#6A9955' },
  number: { default: '#B5CEA8' },
  function: { default: '#DCDCAA' },
};

function getLanguage(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = { js: 'javascript', ts: 'typescript', py: 'python', rb: 'ruby', sh: 'shell', bash: 'shell', zsh: 'shell', yml: 'yaml', yaml: 'yaml', json: 'json', md: 'markdown', conf: 'config', env: 'env', sql: 'sql', go: 'go', rs: 'rust', java: 'java', css: 'css', html: 'html', xml: 'xml' };
  return map[ext] || ext || 'text';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CodeEditor({ fileName, filePath, content, onSave, onClose }: CodeEditorProps) {
  const [value, setValue] = useState(content);
  const [saved, setSaved] = useState(true);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lang = getLanguage(fileName);
  const lines = value.split('\n');

  const handleSave = () => { onSave(value); setSaved(true); };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const newVal = value.substring(0, start) + '  ' + value.substring(ta.selectionEnd);
      setValue(newVal); setSaved(false);
      setTimeout(() => { ta.selectionStart = ta.selectionEnd = start + 2; }, 0);
    }
  };

  const updateCursor = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const before = value.substring(0, ta.selectionStart);
    const line = before.split('\n').length;
    const col = before.length - before.lastIndexOf('\n');
    setCursorPos({ line, col });
  };

  return (
    <div className="flex flex-col h-full bg-void-elevated">
      {/* File tabs */}
      <div className="flex items-center shrink-0 overflow-x-auto" style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--base)', scrollbarWidth: 'none' }}>
        <div className="flex items-center gap-[6px] px-[14px] py-[7px] text-[10px] text-void-text font-mono" style={{ background: 'var(--elevated)', borderRight: '0.5px solid rgba(42,42,48,0.3)' }}>
          {!saved && <span className="w-[6px] h-[6px] rounded-full bg-accent" />}
          <span>{fileName}</span>
          <button onClick={onClose} className="text-[10px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer ml-1">×</button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-[4px] px-[14px] py-[4px] shrink-0" style={{ borderBottom: '0.5px solid var(--border)', background: 'var(--surface)' }}>
        <button onClick={handleSave} className="text-[9px] text-accent font-sans bg-transparent border-none cursor-pointer px-[8px] py-[3px] rounded-[4px] hover:bg-void-elevated">Save</button>
        <span className="w-[1px] h-[14px] mx-[4px]" style={{ background: 'var(--border)' }} />
        <button onClick={() => { setValue(content); setSaved(true); }} className="text-[9px] text-void-text-dim font-sans bg-transparent border-none cursor-pointer px-[8px] py-[3px] rounded-[4px] hover:bg-void-elevated">Revert</button>
      </div>

      {/* Editor */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Line numbers */}
        <div className="py-[10px] text-right overflow-hidden select-none shrink-0" style={{ width: '48px', background: 'var(--surface)', borderRight: '0.5px solid var(--border)' }}>
          {lines.map((_, i) => (
            <div key={i} className="px-[12px] text-[12px] font-mono leading-[1.65]" style={{ color: cursorPos.line === i + 1 ? 'var(--text)' : 'var(--ghost)' }}>{i + 1}</div>
          ))}
        </div>

        {/* Code area */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setSaved(false); updateCursor(); }}
          onKeyDown={handleKeyDown}
          onClick={updateCursor}
          onKeyUp={updateCursor}
          spellCheck={false}
          className="flex-1 bg-transparent text-[12px] text-void-text font-mono p-[10px] resize-none outline-none leading-[1.65] select-text"
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-[14px] py-[4px] shrink-0 text-[9px] font-mono" style={{ borderTop: '0.5px solid var(--border)', background: 'var(--surface)', color: 'var(--ghost)' }}>
        <div className="flex items-center gap-[12px]">
          <span>{lang}</span>
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        </div>
        <div className="flex items-center gap-[12px]">
          <span>{formatSize(new Blob([value]).size)}</span>
          <span>{lines.length} lines</span>
          <span>{saved ? 'Saved' : 'Modified'}</span>
        </div>
      </div>
    </div>
  );
}
