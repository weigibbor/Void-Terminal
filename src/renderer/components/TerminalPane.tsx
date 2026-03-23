import { useState, useEffect, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { useAppStore } from '../stores/app-store';
import type { Tab } from '../types';

interface TerminalPaneProps {
  tab: Tab;
  paneIndex: number;
  showHeader: boolean;
}

export function TerminalPane({ tab, paneIndex, showHeader }: TerminalPaneProps) {
  const focusedPaneIndex = useAppStore((s) => s.focusedPaneIndex);
  const setFocusedPane = useAppStore((s) => s.setFocusedPane);
  const swapPanes = useAppStore((s) => s.swapPanes);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const [dragOver, setDragOver] = useState(false);
  const isFocused = focusedPaneIndex === paneIndex;
  const [isScrolledUp, setIsScrolledUp] = useState(false);

  const { containerRef, terminalRef } = useTerminal({
    sessionId: tab.sessionId,
    sessionType: tab.type === 'ssh' ? 'ssh' : 'local',
  });

  // Auto-focus terminal when this tab becomes active
  useEffect(() => {
    if (activeTabId === tab.id && terminalRef.current) {
      setTimeout(() => terminalRef.current?.focus(), 50);
    }
  }, [activeTabId, tab.id]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (!terminal) return;
    const onScroll = terminal.onScroll(() => {
      const buf = terminal.buffer.active;
      setIsScrolledUp(buf.baseY > buf.viewportY + 1);
    });
    const onWrite = terminal.onWriteParsed(() => {
      const buf = terminal.buffer.active;
      if (buf.baseY <= buf.viewportY + 1) setIsScrolledUp(false);
    });
    return () => { onScroll.dispose(); onWrite.dispose(); };
  }, [terminalRef.current]);

  const scrollToBottom = useCallback(() => {
    terminalRef.current?.scrollToBottom();
    setIsScrolledUp(false);
  }, []);

  const handleClick = useCallback(() => {
    setFocusedPane(paneIndex);
    // Explicitly focus xterm so it receives keyboard input
    terminalRef.current?.focus();
  }, [paneIndex, setFocusedPane]);

  return (
    <div
      className={`relative flex flex-col h-full w-full bg-void-elevated ${
        dragOver ? 'ring-1 ring-accent/40 ring-inset' : ''
      }`}
      onClick={handleClick}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const from = parseInt(e.dataTransfer.getData('text/pane-index'));
        if (!isNaN(from) && from !== paneIndex) {
          swapPanes(from, paneIndex);
        }
      }}
    >
      {showHeader && (
        <div
          className="flex items-center gap-[6px] px-3 py-[6px] border-b-[0.5px] border-void-border/50 bg-void-surface/50 shrink-0 cursor-grab active:cursor-grabbing"
          style={{ fontSize: '10px' }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/pane-index', String(paneIndex));
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${
            tab.connected ? 'bg-status-online' : 'bg-void-text-dim'
          }`} />
          <span className="text-void-text-muted font-mono flex-1 truncate">{tab.title}</span>
          {tab.connectionConfig && (
            <span className="text-void-text-faint font-mono">
              {tab.connectionConfig.username}@{tab.connectionConfig.host}
            </span>
          )}
          {isFocused && (
            <span className="text-[9px] text-accent border-[0.5px] border-accent-dim px-[5px] py-[1px] rounded-[3px] ml-1 font-mono">
              {paneIndex + 1} · FOCUS
            </span>
          )}
        </div>
      )}

      <div ref={containerRef} className="flex-1 min-h-0" />

      {isScrolledUp && (
        <button
          onClick={(e) => { e.stopPropagation(); scrollToBottom(); }}
          className="absolute bottom-3 right-4 w-7 h-7 flex items-center justify-center
                     bg-void-surface/90 border-[0.5px] border-void-border rounded-full
                     text-void-text-muted hover:text-accent hover:border-accent-dim
                     backdrop-blur-sm transition-all z-10"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2.5V9.5M6 9.5L2.5 6M6 9.5L9.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </div>
  );
}
