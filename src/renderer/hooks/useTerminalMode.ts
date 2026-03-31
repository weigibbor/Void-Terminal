import { useRef, useState, useCallback, useEffect } from 'react';

export type TerminalMode = 'block' | 'raw';

/**
 * Detects terminal mode by parsing escape sequences in SSH/PTY data.
 * - Alternate screen buffer (\x1b[?1049h) = raw mode (vim, htop, nano, etc.)
 * - Leave alternate screen (\x1b[?1049l) = block mode (normal shell)
 * - Application cursor keys (\x1b[?1h) as secondary signal
 */
export function useTerminalMode() {
  const [mode, setMode] = useState<TerminalMode>('block');
  const modeRef = useRef<TerminalMode>('block');
  const manualOverride = useRef(false);
  const overrideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up timer on unmount
  useEffect(() => () => { if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current); }, []);

  // Small buffer for handling escape sequences split across data chunks
  const tailRef = useRef('');

  const processData = useCallback((data: string) => {
    if (manualOverride.current) return;

    // Prepend any leftover tail from previous chunk
    const combined = tailRef.current + data;
    // Keep last 20 chars for cross-chunk escape sequences
    tailRef.current = combined.length > 20 ? combined.slice(-20) : combined;

    let newMode: TerminalMode | null = null;

    // Primary: alternate screen buffer
    if (combined.includes('\x1b[?1049h') || combined.includes('\x1b[?47h') || combined.includes('\x1b[?1047h')) {
      newMode = 'raw';
    }
    if (combined.includes('\x1b[?1049l') || combined.includes('\x1b[?47l') || combined.includes('\x1b[?1047l')) {
      newMode = 'block';
    }

    if (newMode && newMode !== modeRef.current) {
      modeRef.current = newMode;
      setMode(newMode);
    }
  }, []);

  const toggleMode = useCallback(() => {
    const next: TerminalMode = modeRef.current === 'block' ? 'raw' : 'block';
    modeRef.current = next;
    manualOverride.current = true;
    setMode(next);
    if (overrideTimerRef.current) clearTimeout(overrideTimerRef.current);
    overrideTimerRef.current = setTimeout(() => { manualOverride.current = false; }, 2000);
  }, []);

  const resetMode = useCallback(() => {
    modeRef.current = 'block';
    manualOverride.current = false;
    setMode('block');
  }, []);

  return { mode, modeRef, processData, toggleMode, resetMode };
}
