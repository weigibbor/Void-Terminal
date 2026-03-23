import { useCallback } from 'react';
import { useAppStore } from '../stores/app-store';

export function usePTY() {
  const updateTab = useAppStore((s) => s.updateTab);

  const create = useCallback(
    async (tabId: string, options?: { shell?: string; cwd?: string }) => {
      updateTab(tabId, { type: 'local', title: 'Local Shell' });

      const result = await window.void.pty.create(options);

      if (result.success && result.sessionId) {
        updateTab(tabId, {
          sessionId: result.sessionId,
          connected: true,
          lastActivity: Date.now(),
        });

        window.void.pty.onExit(result.sessionId, () => {
          updateTab(tabId, { connected: false });
        });
      }

      return result;
    },
    [updateTab],
  );

  const destroy = useCallback(
    async (tabId: string) => {
      const tab = useAppStore.getState().tabs.find((t) => t.id === tabId);
      if (tab?.sessionId) {
        await window.void.pty.destroy(tab.sessionId);
        updateTab(tabId, { connected: false, sessionId: undefined });
      }
    },
    [updateTab],
  );

  return { create, destroy };
}
