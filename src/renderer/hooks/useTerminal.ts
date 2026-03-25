import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { TERMINAL_THEME, TERMINAL_OPTIONS } from '../utils/constants';
import { useAppStore } from '../stores/app-store';
import '@xterm/xterm/css/xterm.css';

interface UseTerminalOptions {
  sessionId?: string;
  sessionType: 'ssh' | 'local';
  onData?: (data: string) => void;
  onShiftEnter?: () => void;
  onMultiLinePaste?: (text: string, send: (data: string) => void) => boolean;
}

export function useTerminal({ sessionId, sessionType, onData, onShiftEnter, onMultiLinePaste }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const openedRef = useRef(false);

  const sessionIdRef = useRef(sessionId);
  const sessionTypeRef = useRef(sessionType);
  const onDataRef = useRef(onData);
  const commandBufferRef = useRef('');
  const commandHistoryRef = useRef<string[]>([]);
  const commandStartRef = useRef(0);
  const lastCommandRef = useRef('');
  const onShiftEnterRef = useRef(onShiftEnter);
  const onMultiLinePasteRef = useRef(onMultiLinePaste);
  sessionIdRef.current = sessionId;
  sessionTypeRef.current = sessionType;
  onDataRef.current = onData;
  onShiftEnterRef.current = onShiftEnter;
  onMultiLinePasteRef.current = onMultiLinePaste;

  useEffect(() => {
    if (!containerRef.current) return;

    const fontSize = useAppStore.getState().terminalFontSize;
    const terminal = new Terminal({
      ...TERMINAL_OPTIONS,
      fontSize,
      theme: TERMINAL_THEME,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);
    terminal.loadAddon(new WebLinksAddon((_event, uri) => window.open(uri, '_blank')));

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    const sendData = (data: string) => {
      const sid = sessionIdRef.current;
      const stype = sessionTypeRef.current;
      const { broadcastMode, tabs, paneTabIds } = useAppStore.getState();

      if (broadcastMode && paneTabIds.length > 1) {
        for (const paneTabId of paneTabIds) {
          if (!paneTabId) continue;
          const tab = tabs.find((t) => t.id === paneTabId);
          if (!tab?.connected || !tab.sessionId) continue;
          if (tab.type === 'ssh') {
            window.void.ssh.write(tab.sessionId, data);
          } else {
            window.void.pty.write(tab.sessionId, data);
          }
        }
      } else if (sid) {
        if (stype === 'ssh') {
          window.void.ssh.write(sid, data);
        } else {
          window.void.pty.write(sid, data);
        }
      }
    };

    // Handle user input — zero overhead, send immediately like native terminal
    terminal.onData((data) => {
      // Detect multi-line paste (has newlines and more than 1 char)
      if (data.length > 1 && (data.includes('\n') || data.includes('\r\n'))) {
        const dontAsk = localStorage.getItem('void-paste-dont-ask');
        if (dontAsk !== 'all' && onMultiLinePasteRef.current) {
          const handled = onMultiLinePasteRef.current(data, sendData);
          if (handled) return;
        }
      }

      // Send to SSH/PTY immediately — no processing before this
      sendData(data);

      // Local echo disabled — needs proper terminal mode detection to work with TUI apps
      // (vim, Claude Code, htop, etc. manage their own cursor, local echo writes to wrong position)

      // Lightweight buffer tracking (no API calls, no timers)
      if (data === '\r') {
        const command = commandBufferRef.current.trim();
        if (command) {
          commandHistoryRef.current.push(command);
          commandStartRef.current = Date.now();
          lastCommandRef.current = command;
        }
        commandBufferRef.current = '';

        // NLP ? prefix — only feature that runs on Enter
        const { isPro } = useAppStore.getState();
        if (isPro && command.startsWith('?') && command.length > 1) {
          const query = command.substring(1).trim();
          window.void.ai.naturalLanguage(query, sessionIdRef.current || 'local').then((result: any) => {
            if (result?.command) {
              terminal.write(`\r\n\x1b[36m  → ${result.command}\x1b[0m`);
              terminal.write(`\r\n\x1b[90m    ${result.explanation}\x1b[0m\r\n`);
            }
          });
        }
      } else if (data === '\x7f') {
        commandBufferRef.current = commandBufferRef.current.slice(0, -1);
      } else if (data === '\x03') {
        commandBufferRef.current = '';
      } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
        commandBufferRef.current += data;
      }

      onDataRef.current?.(data);
    });

    // Only open terminal when container has actual dimensions
    // This prevents xterm crash when container is in a hidden/unsized absolute div
    const container = containerRef.current;

    const openWhenReady = () => {
      if (openedRef.current || !container) return;
      const { offsetWidth, offsetHeight } = container;
      if (offsetWidth > 0 && offsetHeight > 0) {
        terminal.open(container);
        openedRef.current = true;
        try { fitAddon.fit(); } catch { /* ignore initial fit error */ }
      }
    };

    // Try immediately
    openWhenReady();

    // Debounced fit — prevents multiple rapid fits
    let fitTimer: ReturnType<typeof setTimeout> | null = null;
    const debouncedFit = () => {
      if (fitTimer) clearTimeout(fitTimer);
      fitTimer = setTimeout(() => {
        if (!openedRef.current) return;
        try {
          fitAddon.fit();
          const sid = sessionIdRef.current;
          const stype = sessionTypeRef.current;
          if (sid && terminal) {
            const { cols, rows } = terminal;
            if (stype === 'ssh') {
              window.void.ssh.resize(sid, cols, rows);
            } else {
              window.void.pty.resize(sid, cols, rows);
            }
          }
        } catch { /* ignore */ }
      }, 50);
    };

    // Observe container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (!openedRef.current) {
        openWhenReady();
        return;
      }
      debouncedFit();
    });
    resizeObserver.observe(container);

    // Also fit on window resize
    window.addEventListener('resize', debouncedFit);

    // Fit again after a short delay (catches layout shifts after mount)
    const fitT1 = setTimeout(debouncedFit, 100);
    const fitT2 = setTimeout(debouncedFit, 300);
    const fitT3 = setTimeout(debouncedFit, 600);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedFit);
      if (fitTimer) clearTimeout(fitTimer);
      clearTimeout(fitT1);
      clearTimeout(fitT2);
      clearTimeout(fitT3);
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
      searchAddonRef.current = null;
      openedRef.current = false;
    };
  }, []);

  // Listen for session data
  useEffect(() => {
    if (!sessionId || !terminalRef.current) return;

    let unsub: (() => void) | undefined;

    // Watch & Alert — match terminal output against saved rules
    let lastNotification = 0;
    let lastMatchedPattern = '';
    let suppressWatch = true; // suppress during initial buffer replay
    // Unsuppress after 2s (buffer replay should be done by then)
    setTimeout(() => { suppressWatch = false; }, 2000);

    // Suppress watch during resize events
    const handleResizeSuppress = () => {
      suppressWatch = true;
      setTimeout(() => { suppressWatch = false; }, 1000);
    };
    window.addEventListener('resize', handleResizeSuppress);

    // Cache parsed rules + compiled regexes (Pro only — don't parse localStorage on every SSH packet)
    let cachedRules: { pattern: string; regex: RegExp; enabled: boolean }[] = [];
    if (useAppStore.getState().isPro) {
      try {
        const saved = localStorage.getItem('void-watch-rules');
        if (saved) {
          cachedRules = JSON.parse(saved)
            .filter((r: any) => r.enabled)
            .map((r: any) => { try { return { pattern: r.pattern, regex: new RegExp(r.pattern, 'i'), enabled: true }; } catch { return null; } })
            .filter(Boolean);
        }
      } catch { /* no rules */ }
    }

    const checkWatchRules = (data: string) => {
      if (suppressWatch || cachedRules.length === 0) return;
      const now = Date.now();
      if (now - lastNotification < 30000) return;
      for (const rule of cachedRules) {
        if (rule.pattern === lastMatchedPattern && now - lastNotification < 120000) continue;
        if (rule.regex.test(data)) {
          lastNotification = now;
          lastMatchedPattern = rule.pattern;
          new Notification('Void Terminal — Watch Alert', { body: `Pattern matched: ${rule.pattern}`, silent: false });
          break;
        }
      }
    };

    // Batch writes with requestAnimationFrame to prevent scroll flicker
    let writeBuffer = '';
    let rafPending = false;
    const flushWrite = () => {
      if (writeBuffer && terminalRef.current) {
        const buf = terminalRef.current.buffer.active;
        const wasAtBottom = buf.baseY <= buf.viewportY + 1;
        terminalRef.current.write(writeBuffer);
        if (wasAtBottom) terminalRef.current.scrollToBottom();
        writeBuffer = '';
      }
      rafPending = false;
    };
    const batchWrite = (data: string) => {
      writeBuffer += data;
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(flushWrite);
      }
    };

    // Notify when long-running command finishes (>10s, app in background)
    const checkCommandDone = (data: string) => {
      if (commandStartRef.current > 0 && localStorage.getItem('void-cmd-notify') !== 'false') {
        const elapsed = Date.now() - commandStartRef.current;
        if (elapsed > 10000 && /[\$#>]\s*$/.test(data)) {
          const cmd = lastCommandRef.current;
          commandStartRef.current = 0;
          if (document.hidden && cmd) {
            new Notification('Void Terminal', { body: `Done: ${cmd.substring(0, 80)}`, silent: false });
          }
        }
      }
    };

    if (sessionType === 'ssh') {
      unsub = window.void.ssh.onData(sessionId, (data) => {
        batchWrite(data);
        checkWatchRules(data);
        checkCommandDone(data);
      });
      // Replay buffered data — watch rules suppressed during replay
      window.void.ssh.getBuffer(sessionId).then((buffered) => {
        if (buffered && terminalRef.current) {
          terminalRef.current.write(buffered);
        }
      });
    } else {
      unsub = window.void.pty.onData(sessionId, (data) => {
        batchWrite(data);
        checkWatchRules(data);
        checkCommandDone(data);
      });
    }

    // Focus + resize
    if (terminalRef.current && fitAddonRef.current && openedRef.current) {
      terminalRef.current.focus();
      try {
        fitAddonRef.current.fit();
        const { cols, rows } = terminalRef.current;
        if (sessionType === 'ssh') {
          window.void.ssh.resize(sessionId, cols, rows);
        } else {
          window.void.pty.resize(sessionId, cols, rows);
        }
      } catch { /* ignore */ }
    }

    return () => {
      unsub?.();
      window.removeEventListener('resize', handleResizeSuppress);
    };
  }, [sessionId, sessionType]);

  const search = (query: string, options?: { regex?: boolean; caseSensitive?: boolean }) => {
    if (!searchAddonRef.current) return;
    searchAddonRef.current.findNext(query, {
      regex: options?.regex,
      caseSensitive: options?.caseSensitive,
    });
  };

  const searchNext = () => searchAddonRef.current?.findNext('');
  const searchPrev = () => searchAddonRef.current?.findPrevious('');
  const fit = () => { try { fitAddonRef.current?.fit(); } catch {} };

  const getLastCommand = () => {
    const history = commandHistoryRef.current;
    return history.length > 0 ? history[history.length - 1] : '';
  };

  return { containerRef, terminalRef, search, searchNext, searchPrev, fit, getLastCommand };
}
