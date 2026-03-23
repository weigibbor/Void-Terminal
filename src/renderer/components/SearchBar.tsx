import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { easing, duration } from '../utils/motion';

interface SearchBarProps {
  visible: boolean;
  onClose: () => void;
  onSearch: (query: string, options?: { regex?: boolean; caseSensitive?: boolean }) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function SearchBar({ visible, onClose, onSearch, onNext, onPrev }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [regex, setRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [matchCount, setMatchCount] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setMatchCount('');
    }
  }, [visible]);

  useEffect(() => {
    if (query) {
      onSearch(query, { regex, caseSensitive });
    }
  }, [query, regex, caseSensitive]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -36, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -36, opacity: 0 }}
          transition={{ duration: duration.normal, ease: easing.enter }}
          className="flex items-center gap-2 px-3 shrink-0"
          style={{ height: '36px', background: 'var(--surface)', borderBottom: '0.5px solid var(--border)' }}
        >
          {/* Search icon */}
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="#555" strokeWidth="1.2" />
            <line x1="11" y1="11" x2="14" y2="14" stroke="#555" strokeWidth="1.2" strokeLinecap="round" />
          </svg>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.shiftKey ? onPrev() : onNext(); }
              if (e.key === 'Escape') { onClose(); }
            }}
            placeholder="Search terminal output..."
            className="flex-1 bg-void-input px-2 py-1 rounded-[6px] text-[11px] text-void-text font-mono outline-none"
            style={{ border: '0.5px solid var(--border)' }}
          />

          {/* Prev/Next */}
          <button onClick={onPrev} className="w-6 h-6 flex items-center justify-center rounded-[4px] text-void-text-ghost hover:text-void-text-muted" style={{ border: '0.5px solid var(--border)' }} title="Previous (Shift+Enter)">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 12L8 4M4 8l4-4 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={onNext} className="w-6 h-6 flex items-center justify-center rounded-[4px] text-void-text-ghost hover:text-void-text-muted" style={{ border: '0.5px solid var(--border)' }} title="Next (Enter)">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M8 4l0 8M4 8l4 4 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          {/* Regex toggle */}
          <button
            onClick={() => setRegex(!regex)}
            className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[9px] font-mono ${regex ? 'text-accent bg-accent-glow' : 'text-void-text-ghost'}`}
            style={{ border: `0.5px solid ${regex ? 'rgba(249,115,22,0.25)' : 'var(--border)'}` }}
            title="Regex"
          >
            .*
          </button>

          {/* Case sensitive toggle */}
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            className={`w-6 h-6 flex items-center justify-center rounded-[4px] text-[9px] font-mono ${caseSensitive ? 'text-accent bg-accent-glow' : 'text-void-text-ghost'}`}
            style={{ border: `0.5px solid ${caseSensitive ? 'rgba(249,115,22,0.25)' : 'var(--border)'}` }}
            title="Case sensitive"
          >
            Aa
          </button>

          {/* Match count */}
          {query && (
            <span className="text-[9px] text-void-text-dim font-mono min-w-[40px] text-center">
              {matchCount || '0'}
            </span>
          )}

          {/* Close */}
          <button onClick={onClose} className="flex items-center justify-center w-[22px] h-[22px] rounded-[4px] text-void-text-ghost hover:text-void-text-muted hover:bg-void-surface text-[14px] transition-all" title="Close (Escape)">
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
