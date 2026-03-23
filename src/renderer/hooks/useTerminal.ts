import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { TERMINAL_THEME, TERMINAL_OPTIONS } from '../utils/constants';
import '@xterm/xterm/css/xterm.css';

interface UseTerminalOptions {
  sessionId?: string;
  sessionType: 'ssh' | 'local';
  onData?: (data: string) => void;
}

export function useTerminal({ sessionId, sessionType, onData }: UseTerminalOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const openedRef = useRef(false);

  const sessionIdRef = useRef(sessionId);
  const sessionTypeRef = useRef(sessionType);
  const onDataRef = useRef(onData);
  sessionIdRef.current = sessionId;
  sessionTypeRef.current = sessionType;
  onDataRef.current = onData;

  useEffect(() => {
    if (!containerRef.current) return;

    const terminal = new Terminal({
      ...TERMINAL_OPTIONS,
      theme: TERMINAL_THEME,
    });

    const fitAddon = new FitAddon();
    const searchAddon = new SearchAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(searchAddon);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon;
    searchAddonRef.current = searchAddon;

    // Handle user input
    terminal.onData((data) => {
      const sid = sessionIdRef.current;
      const stype = sessionTypeRef.current;
      if (sid) {
        if (stype === 'ssh') {
          window.void.ssh.write(sid, data);
        } else {
          window.void.pty.write(sid, data);
        }
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

    // Also observe for size changes (handles hidden → visible transition)
    const resizeObserver = new ResizeObserver(() => {
      if (!openedRef.current) {
        openWhenReady();
        return;
      }
      requestAnimationFrame(() => {
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
        } catch {
          // Ignore resize errors
        }
      });
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
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

    if (sessionType === 'ssh') {
      unsub = window.void.ssh.onData(sessionId, (data) => {
        terminalRef.current?.write(data);
      });
      // Replay buffered data that arrived before listener was ready
      window.void.ssh.getBuffer(sessionId).then((buffered) => {
        if (buffered && terminalRef.current) {
          terminalRef.current.write(buffered);
        }
      });
    } else {
      unsub = window.void.pty.onData(sessionId, (data) => {
        terminalRef.current?.write(data);
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
