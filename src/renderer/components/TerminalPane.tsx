import { useState, useEffect, useCallback } from 'react';
import { useTerminal } from '../hooks/useTerminal';
import { useAppStore, getPaneLabel } from '../stores/app-store';
import { SearchBar } from './SearchBar';
import { MultiLineInput } from './MultiLineInput';
import { ContextMenu } from './ContextMenu';
import { AIInlineSuggestion } from './pro/AIInlineSuggestion';
import { DeployCopilot } from './pro/DeployCopilot';
import type { ContextMenuItem } from './ContextMenu';
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
  const splitLayout = useAppStore((s) => s.splitLayout);
  const disconnectTab = useAppStore((s) => s.disconnectTab);
  const reconnectTab = useAppStore((s) => s.reconnectTab);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const isFocused = focusedPaneIndex === paneIndex;
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [multiLineOpen, setMultiLineOpen] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const [aiExplanation, setAiExplanation] = useState<{ explanation: string; suggestedCommand?: string } | null>(null);
  const [detectedPort, setDetectedPort] = useState<number | null>(null);
  const isPro = useAppStore((s) => s.isPro);

  const updateTab = useAppStore((s) => s.updateTab);
  const isDisconnected = !tab.connected && !!tab.disconnectedAt;
  const position = getPaneLabel(splitLayout, paneIndex);

  const { containerRef, terminalRef, search, searchNext, searchPrev } = useTerminal({
    sessionId: tab.sessionId,
    sessionType: tab.type === 'ssh' ? 'ssh' : 'local',
    onShiftEnter: () => setMultiLineOpen(true),
  });

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

  // Listen for AI error explanations
  useEffect(() => {
    if (!isPro) return;
    return window.void.ai.onErrorExplanation?.((data: any) => {
      setAiExplanation({ explanation: data.explanation, suggestedCommand: data.suggestedCommand });
    });
  }, [isPro]);

  // Listen for port detection from watcher
  useEffect(() => {
    if (!isPro) return;
    return window.void.ai.onWatcherEvent?.((event: any) => {
      if (event.type === 'info' && event.detail?.includes('port')) {
        const portMatch = event.detail.match(/port\s+(\d+)/i);
        if (portMatch) setDetectedPort(parseInt(portMatch[1]));
      }
    });
  }, [isPro]);

  // Listen for SSH latency updates
  useEffect(() => {
    if (tab.type !== 'ssh' || !tab.sessionId || !tab.connected) return;
    return window.void.ssh.onLatency(tab.sessionId, (ms) => {
      updateTab(tab.id, { latency: ms });
    });
  }, [tab.sessionId, tab.connected, tab.type, tab.id, updateTab]);

  const scrollToBottom = useCallback(() => {
    terminalRef.current?.scrollToBottom();
    setIsScrolledUp(false);
  }, []);

  // Cmd+F to open search, Shift+Enter for multi-line (only for focused pane)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'f' && isFocused) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFocused]);

  const sendToSession = useCallback((text: string) => {
    if (!tab.sessionId) return;
    const data = text + '\n';
    if (tab.type === 'ssh') {
      window.void.ssh.write(tab.sessionId, data);
    } else {
      window.void.pty.write(tab.sessionId, data);
    }
    terminalRef.current?.focus();
  }, [tab.sessionId, tab.type]);

  const handleTerminalContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const getTerminalMenuItems = useCallback((): ContextMenuItem[] => {
    const hasSelection = !!terminalRef.current?.getSelection();
    return [
      {
        label: 'Copy',
        shortcut: '⌘C',
        disabled: !hasSelection,
        action: () => {
          const sel = terminalRef.current?.getSelection();
          if (sel) navigator.clipboard.writeText(sel);
        },
      },
      {
        label: 'Paste',
        shortcut: '⌘V',
        action: () => {
          navigator.clipboard.readText().then((text) => {
            if (text && tab.sessionId) {
              if (tab.type === 'ssh') {
                window.void.ssh.write(tab.sessionId, text);
              } else {
                window.void.pty.write(tab.sessionId, text);
              }
            }
          });
        },
      },
      { label: '', separator: true },
      {
        label: 'Find...',
        shortcut: '⌘F',
        action: () => setSearchOpen(true),
      },
      {
        label: 'Multi-line input',
        shortcut: '⇧↵',
        action: () => setMultiLineOpen(true),
      },
      { label: '', separator: true },
      {
        label: 'Clear terminal',
        shortcut: '⌘K',
        action: () => {
          terminalRef.current?.clear();
        },
      },
      {
        label: 'Select all',
        shortcut: '⌘A',
        action: () => terminalRef.current?.selectAll(),
      },
    ];
  }, [tab.sessionId, tab.type]);

  const handleClick = useCallback(() => {
    setFocusedPane(paneIndex);
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
        if (!isNaN(from) && from !== paneIndex) swapPanes(from, paneIndex);
      }}
    >
      {/* Pane header */}
      {showHeader && (
        <div
          className="flex items-center gap-[8px] px-3 shrink-0 cursor-grab active:cursor-grabbing"
          style={{ height: '32px', fontSize: '11px', borderBottom: '0.5px solid rgba(42,42,48,0.5)', background: 'rgba(17,17,21,0.5)' }}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('text/pane-index', String(paneIndex));
            e.dataTransfer.effectAllowed = 'move';
          }}
        >
          {/* Status dot */}
          <span
            className={`w-[7px] h-[7px] rounded-full shrink-0 ${
              tab.connected ? 'bg-status-online' : 'bg-void-text-ghost'
            }`}
            style={{ transition: 'background-color 300ms ease' }}
          />

          {/* Server name */}
          <span className={`font-mono truncate ${tab.connected ? 'text-[#888]' : 'text-[#666]'}`}>
            {tab.title}
          </span>

          {/* Position badge */}
          <span
            className="text-[10px] px-[6px] py-[2px] rounded-[3px] font-mono"
            style={{
              color: isFocused ? '#F97316' : '#5B9BD5',
              border: `0.5px solid ${isFocused ? 'rgba(249,115,22,0.25)' : 'rgba(91,155,213,0.25)'}`,
            }}
          >
            {position}{isFocused ? ' · FOCUS' : ''}
          </span>

          {/* Spacer */}
          <span className="flex-1" />

          {/* Latency or offline status */}
          {tab.connected ? (
            <span className="text-[10px] text-status-online font-mono">
              {tab.latency != null ? `${tab.latency}ms` : 'connected'}
            </span>
          ) : isDisconnected ? (
            <span className="text-[10px] text-status-error font-mono">offline</span>
          ) : null}

          {/* Divider */}
          <span style={{ width: '0.5px', height: '10px', background: '#2A2A30', margin: '0 3px' }} />

          {/* Disconnect / Reconnect button */}
          {tab.connected ? (
            <button
              onClick={(e) => { e.stopPropagation(); disconnectTab(tab.id); }}
              className="flex items-center gap-[3px] px-[7px] py-[2px] rounded-[3px] transition-colors"
              style={{
                background: 'rgba(255,95,87,0.05)',
                border: '0.5px solid rgba(255,95,87,0.15)',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,95,87,0.1)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,95,87,0.05)'; }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="#FF5F57" strokeWidth="1" />
                <path d="M4 4l4 4M8 4l-4 4" stroke="#FF5F57" strokeWidth="1" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] text-status-error">Disconnect</span>
            </button>
          ) : isDisconnected ? (
            <button
              onClick={(e) => { e.stopPropagation(); reconnectTab(tab.id); }}
              className="flex items-center gap-[3px] px-[7px] py-[2px] rounded-[3px] transition-colors"
              style={{
                background: 'rgba(40,200,64,0.05)',
                border: '0.5px solid rgba(40,200,64,0.15)',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(40,200,64,0.1)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'rgba(40,200,64,0.05)'; }}
            >
              <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                <path d="M4 2l5 4-5 4" stroke="#28C840" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[10px] text-status-online">Reconnect</span>
            </button>
          ) : null}
        </div>
      )}

      {/* Search bar (Cmd+F) */}
      <SearchBar
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSearch={(q, opts) => search(q, opts)}
        onNext={() => searchNext()}
        onPrev={() => searchPrev()}
      />

      {/* Terminal container — dims when disconnected */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0"
        onContextMenu={handleTerminalContextMenu}
        style={{
          opacity: isDisconnected ? 0.25 : 1,
          transition: 'opacity 300ms ease',
        }}
      />

      {/* Port forward suggestion */}
      {detectedPort && isPro && tab.type === 'ssh' && (
        <div className="flex items-center gap-2 px-3 py-[6px] shrink-0"
          style={{ background: 'rgba(91,155,213,0.05)', borderBottom: '0.5px solid rgba(91,155,213,0.15)' }}>
          <span className="w-[6px] h-[6px] rounded-full bg-status-info" />
          <span className="text-[11px] text-status-info font-mono flex-1">
            Port {detectedPort} detected — <span className="underline cursor-pointer" onClick={() => {
              window.open(`http://localhost:${detectedPort}`);
              setDetectedPort(null);
            }}>open localhost:{detectedPort}</span>
          </span>
          <button onClick={() => setDetectedPort(null)} className="flex items-center justify-center w-[20px] h-[20px] rounded-[4px] text-[13px] text-void-text-ghost hover:text-void-text-dim hover:bg-void-surface transition-all">✕</button>
        </div>
      )}

      {/* AI error explainer */}
      {aiExplanation && isPro && (
        <AIInlineSuggestion
          explanation={aiExplanation.explanation}
          suggestedCommand={aiExplanation.suggestedCommand}
          onRun={(cmd) => { sendToSession(cmd); setAiExplanation(null); }}
          onDismiss={() => setAiExplanation(null)}
        />
      )}

      {/* Multi-line input (Shift+Enter) */}
      <MultiLineInput
        visible={multiLineOpen && !isDisconnected}
        onSubmit={sendToSession}
        onClose={() => { setMultiLineOpen(false); terminalRef.current?.focus(); }}
      />

      {/* Disconnect overlay */}
      {isDisconnected && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          style={{ top: showHeader ? '28px' : 0 }}
        >
          <div
            className="pointer-events-auto text-center"
            style={{
              background: 'rgba(10,10,13,0.9)',
              border: '0.5px solid #2A2A30',
              borderRadius: '8px',
              padding: '16px 24px',
              maxWidth: '280px',
              width: '80%',
              animation: 'paletteIn 200ms cubic-bezier(0,0,0.2,1)',
            }}
          >
            {/* Icon */}
            <div className="w-7 h-7 rounded-[6px] mx-auto mb-3 flex items-center justify-center"
              style={{ background: 'rgba(255,95,87,0.06)', border: '0.5px solid rgba(255,95,87,0.12)' }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6" stroke="#FF5F57" strokeWidth="1.2" />
                <path d="M5.5 8h5" stroke="#FF5F57" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            <div className="text-[11px] text-void-text font-medium font-sans mb-[2px]">Session paused</div>
            <div className="text-[12px] text-void-text-dim mb-[10px]">{tab.title} disconnected</div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-[6px]">
              <button
                onClick={() => reconnectTab(tab.id)}
                className="flex items-center gap-[4px] px-[14px] py-[6px] rounded-[5px] transition-colors"
                style={{ background: 'rgba(40,200,64,0.06)', border: '0.5px solid rgba(40,200,64,0.2)' }}
              >
                <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                  <path d="M4 2l5 4-5 4" stroke="#28C840" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-[11px] text-status-online font-medium">Reconnect</span>
              </button>
            </div>

            <div className="text-[10px] text-void-text-faint mt-2">Scrollback preserved · Tab still open</div>
          </div>
        </div>
      )}

      {/* Deploy copilot */}
      {isFocused && <DeployCopilot onRunCommand={sendToSession} />}

      {/* Scroll to bottom */}
      {isScrolledUp && !isDisconnected && (
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

      {/* Terminal context menu */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={getTerminalMenuItems()}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
