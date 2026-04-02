import { useRef, useState, useCallback, useEffect, useImperativeHandle, forwardRef, KeyboardEvent } from 'react';
import { useCommandHistory } from '../hooks/useCommandHistory';

export interface WarpInputBarHandle {
  focus: () => void;
}

interface WarpInputBarProps {
  sessionId?: string;
  promptLabel?: string;
  onSend: (command: string) => void;
  onInterrupt: () => void;
  onClear: () => void;
  visible: boolean;
  modeBadge?: React.ReactNode;
}

export const WarpInputBar = forwardRef<WarpInputBarHandle, WarpInputBarProps>(function WarpInputBar({ sessionId, promptLabel, onSend, onInterrupt, onClear, visible, modeBadge }, ref) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  const { addCommand, navigateUp, navigateDown, resetNavigation } = useCommandHistory(sessionId);

  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }), []);

  // Auto-focus when visible — with retry to handle race conditions
  useEffect(() => {
    if (visible && textareaRef.current) {
      textareaRef.current.focus();
      // Retry focus after a short delay in case xterm steals it
      const t = setTimeout(() => textareaRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'; // max ~6 lines
  }, [value]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter = send command
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const cmd = value;
      if (cmd.length > 0) {
        addCommand(cmd);
        onSend(cmd);
        setValue('');
        resetNavigation();
      } else {
        // Empty enter — send just a newline to the shell
        onSend('');
      }
      return;
    }

    // Ctrl+C = interrupt
    if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      onInterrupt();
      setValue('');
      resetNavigation();
      return;
    }

    // Ctrl+L = clear screen
    if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      onClear();
      return;
    }

    // Up arrow — navigate history (only when cursor is on first line)
    if (e.key === 'ArrowUp') {
      const el = textareaRef.current;
      if (el) {
        const beforeCursor = value.substring(0, el.selectionStart);
        const isFirstLine = !beforeCursor.includes('\n');
        if (isFirstLine) {
          e.preventDefault();
          const prev = navigateUp(value);
          if (prev !== null) setValue(prev);
        }
      }
      return;
    }

    // Down arrow — navigate history (only when cursor is on last line)
    if (e.key === 'ArrowDown') {
      const el = textareaRef.current;
      if (el) {
        const afterCursor = value.substring(el.selectionEnd);
        const isLastLine = !afterCursor.includes('\n');
        if (isLastLine) {
          e.preventDefault();
          const next = navigateDown();
          if (next !== null) setValue(next);
        }
      }
      return;
    }

    // Tab = insert 2 spaces (no AI autocomplete)
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      if (el) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setValue(newValue);
        requestAnimationFrame(() => {
          el.selectionStart = el.selectionEnd = start + 2;
        });
      }
      return;
    }

    // Ctrl+A = select all
    if (e.key === 'a' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const el = textareaRef.current;
      if (el) {
        el.selectionStart = 0;
        el.selectionEnd = value.length;
      }
      return;
    }

    // Escape = clear input
    if (e.key === 'Escape') {
      setValue('');
      resetNavigation();
      return;
    }
  }, [value, addCommand, onSend, onInterrupt, onClear, navigateUp, navigateDown, resetNavigation]);

  if (!visible) return null;

  const isMultiline = value.includes('\n');

  return (
    <div
      className="shrink-0 flex items-start gap-2 px-3 py-2"
      style={{
        background: '#0E0E12',
        borderTop: '0.5px solid #2A2A30',
      }}
    >
      {/* Prompt indicator */}
      <span
        className="shrink-0 select-none mt-[3px]"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11.5px',
          color: '#28C840',
          lineHeight: '1.5',
        }}
      >
        {promptLabel || '❯'}
      </span>

      {/* Input textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        placeholder="Type a command..."
        spellCheck={false}
        autoComplete="off"
        className="flex-1 resize-none outline-none"
        style={{
          background: 'transparent',
          border: 'none',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '11.5px',
          lineHeight: '1.5',
          color: '#E8E6E0',
          padding: '2px 0',
          minHeight: '18px',
          maxHeight: '120px',
          overflow: value.split('\n').length > 6 ? 'auto' : 'hidden',
        }}
      />

      {/* Hints + mode badge */}
      <div className="shrink-0 flex items-center gap-3 mt-[2px]">
        {isMultiline && (
          <span style={{ fontSize: '10px', color: '#555', fontFamily: "'JetBrains Mono', monospace" }}>
            Shift+↵ new line
          </span>
        )}
        <span style={{ fontSize: '10px', color: '#444', fontFamily: "'JetBrains Mono', monospace" }}>
          ↵ run
        </span>
        {modeBadge}
      </div>
    </div>
  );
});
