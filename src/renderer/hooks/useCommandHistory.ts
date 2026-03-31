import { useRef, useCallback } from 'react';

const MAX_HISTORY = 500;

/**
 * Per-session command history with Up/Down navigation.
 * Persists to localStorage keyed by sessionId.
 */
export function useCommandHistory(sessionId?: string) {
  const storageKey = sessionId ? `void-cmd-history-${sessionId}` : null;
  const historyRef = useRef<string[]>(loadHistory(storageKey));
  const indexRef = useRef(-1); // -1 = not navigating
  const draftRef = useRef(''); // preserves current input when navigating

  const addCommand = useCallback((cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    // Don't duplicate last command
    if (historyRef.current.length > 0 && historyRef.current[0] === trimmed) return;
    historyRef.current.unshift(trimmed);
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current = historyRef.current.slice(0, MAX_HISTORY);
    }
    indexRef.current = -1;
    draftRef.current = '';
    saveHistory(storageKey, historyRef.current);
  }, [storageKey]);

  const navigateUp = useCallback((currentInput: string): string | null => {
    if (historyRef.current.length === 0) return null;
    if (indexRef.current === -1) {
      draftRef.current = currentInput;
    }
    const nextIndex = Math.min(indexRef.current + 1, historyRef.current.length - 1);
    if (nextIndex === indexRef.current && indexRef.current !== -1) return null; // Already at oldest
    indexRef.current = nextIndex;
    return historyRef.current[nextIndex];
  }, []);

  const navigateDown = useCallback((): string | null => {
    if (indexRef.current <= 0) {
      if (indexRef.current === 0) {
        indexRef.current = -1;
        return draftRef.current;
      }
      return null;
    }
    indexRef.current--;
    return historyRef.current[indexRef.current];
  }, []);

  const resetNavigation = useCallback(() => {
    indexRef.current = -1;
    draftRef.current = '';
  }, []);

  return { addCommand, navigateUp, navigateDown, resetNavigation, historyRef };
}

function loadHistory(key: string | null): string[] {
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(key: string | null, history: string[]): void {
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(history));
  } catch {}
}
