import { useEffect, useRef, useCallback } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { TERMINAL_THEME, TERMINAL_OPTIONS } from '../utils/constants';
import { useAppStore } from '../stores/app-store';
import '@xterm/xterm/css/xterm.css';

interface UseTerminalOptions {
  sessionId?: string;
  sessionType: 'ssh' | 'local';
  onData?: (data: string) => void;
  onShiftEnter?: () => void;
}

export function useTerminal({ sessionId, sessionType, onData, onShiftEnter }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const openedRef = useRef(false);

  const sessionIdRef = useRef(sessionId);
  const sessionTypeRef = useRef(sessionType);
  const onDataRef = useRef(onData);
  const commandBufferRef = useRef('');
  const pendingDangerRef = useRef<{ command: string; resolve: (send: boolean) => void } | null>(null);
  const ghostTextRef = useRef('');
  const ghostDecorRef = useRef<any>(null);
  const autocompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commandHistoryRef = useRef<string[]>([]);
  const onShiftEnterRef = useRef(onShiftEnter);
  sessionIdRef.current = sessionId;
  sessionTypeRef.current = sessionType;
  onDataRef.current = onData;
  onShiftEnterRef.current = onShiftEnter;

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

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Ghost text helpers
    const clearGhostText = () => {
      if (ghostTextRef.current) {
        // Erase the ghost text by writing backspaces + spaces
        const len = ghostTextRef.current.length;
        terminal.write('\x1b[0m' + '\b \b'.repeat(len));
        ghostTextRef.current = '';
      }
    };

    const showGhostText = (suggestion: string) => {
      if (!suggestion || suggestion === 'null') return;
      clearGhostText();
      ghostTextRef.current = suggestion;
      // Write in very dim color (gray)
      terminal.write(`\x1b[90m${suggestion}\x1b[0m`);
      // Move cursor back to where it was
      terminal.write(`\x1b[${suggestion.length}D`);
    };

    const requestAutocomplete = () => {
      if (autocompleteTimerRef.current) clearTimeout(autocompleteTimerRef.current);
      autocompleteTimerRef.current = setTimeout(async () => {
        const { isPro } = useAppStore.getState();
        if (!isPro) return;
        const cmd = commandBufferRef.current;
        if (cmd.length < 2) return;
        try {
          const suggestion = await window.void.ai.autocomplete(cmd, commandHistoryRef.current);
          if (suggestion && suggestion !== 'null' && suggestion.startsWith(cmd)) {
            // Only show the part after what's already typed
            const remaining = suggestion.substring(cmd.length);
            if (remaining && commandBufferRef.current === cmd) {
              showGhostText(remaining);
            }
          }
        } catch { /* ignore */ }
      }, 600);
    };

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

    // Handle user input — send immediately, process async
    terminal.onData((data) => {
      // Tab — accept ghost text
      if (data === '\t' && ghostTextRef.current) {
        const ghost = ghostTextRef.current;
        clearGhostText();
        commandBufferRef.current += ghost;
        sendData(ghost);
        onDataRef.current?.(data);
        return;
      }

      if (ghostTextRef.current) clearGhostText();

      // SEND IMMEDIATELY — zero delay, no processing before this
      sendData(data);

      // All processing below is async — never blocks the keystroke
      queueMicrotask(() => {
        if (data === '\r') {
          const command = commandBufferRef.current.trim();
          if (command) commandHistoryRef.current.push(command);
          commandBufferRef.current = '';

          const { isPro } = useAppStore.getState();

          // NLP ? prefix
          if (isPro && command.startsWith('?') && command.length > 1) {
            const query = command.substring(1).trim();
            window.void.ai.naturalLanguage(query, sessionIdRef.current || 'local').then((result: any) => {
              if (result?.command) {
                terminal.write(`\r\n\x1b[36m  → ${result.command}\x1b[0m`);
                terminal.write(`\r\n\x1b[90m    ${result.explanation}\x1b[0m\r\n`);
              }
            });
          }

          // Danger check
          if (isPro && command.length > 2) {
            window.void.ai.checkDanger(command, sessionIdRef.current || 'local').then((result: any) => {
              if (result?.isDangerous) {
                terminal.write(`\r\n\x1b[31m  ⚠ DANGER: ${result.reason}\x1b[0m\r\n`);
              }
            });
          }
        } else if (data === '\x7f') {
          commandBufferRef.current = commandBufferRef.current.slice(0, -1);
        } else if (data === '\x03') {
          commandBufferRef.current = '';
        } else if (data.length === 1 && data.charCodeAt(0) >= 32) {
          commandBufferRef.current += data;
          const { isPro } = useAppStore.getState();
          if (isPro) requestAutocomplete();
        }
      });

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
    setTimeout(debouncedFit, 100);
    setTimeout(debouncedFit, 300);
    setTimeout(debouncedFit, 600);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedFit);
      if (fitTimer) clearTimeout(fitTimer);
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
    const checkWatchRules = (data: string) => {
      const now = Date.now();
      if (now - lastNotification < 5000) return; // throttle: max 1 notification per 5s
      try {
        const saved = localStorage.getItem('void-watch-rules');
        if (!saved) return;
        const rules = JSON.parse(saved);
        for (const rule of rules) {
          if (!rule.enabled) continue;
          try {
            const regex = new RegExp(rule.pattern, 'i');
            if (regex.test(data)) {
              lastNotification = now;
              new Notification('Void Terminal — Watch Alert', { body: `Pattern matched: ${rule.pattern}`, silent: false });
              break;
            }
          } catch { /* invalid regex */ }
        }
      } catch { /* no rules */ }
    };

    if (sessionType === 'ssh') {
      unsub = window.void.ssh.onData(sessionId, (data) => {
        terminalRef.current?.write(data);
        checkWatchRules(data);
      });
      window.void.ssh.getBuffer(sessionId).then((buffered) => {
        if (buffered && terminalRef.current) {
          terminalRef.current.write(buffered);
        }
      });
    } else {
      unsub = window.void.pty.onData(sessionId, (data) => {
        terminalRef.current?.write(data);
        checkWatchRules(data);
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

    return unsub;
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

  return { containerRef, terminalRef, search, searchNext, searchPrev, fit };
}
