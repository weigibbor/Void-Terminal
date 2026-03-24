import { useCallback } from 'react';
import { useAppStore } from '../stores/app-store';
import type { SSHConfig } from '../types';

export function useSSH() {
  const updateTab = useAppStore((s) => s.updateTab);

  const connect = useCallback(
    async (tabId: string, config: SSHConfig, alias?: string) => {
      updateTab(tabId, {
        type: 'ssh',
        title: alias || `${config.username}@${config.host}`,
        connectionConfig: config,
        connecting: true,
        connectionError: undefined,
      });

      const result = await window.void.ssh.connect(config);

      if (result.success && result.sessionId) {
        updateTab(tabId, {
          sessionId: result.sessionId,
          connected: true,
          connecting: false,
          connectionError: undefined,
          lastActivity: Date.now(),
        });

        window.void.ssh.onClose(result.sessionId, () => {
          updateTab(tabId, { connected: false });
        });

        window.void.ssh.onError(result.sessionId, () => {
          updateTab(tabId, { connected: false });
        });

        if (config.host) {
          const saved = useAppStore.getState().savedConnections;
          const match = saved.find(
            (c) => c.host === config.host && c.username === config.username,
          );
          if (match) {
            window.void.connections.update(match.id, { lastConnected: Date.now() });
          }
        }
      } else {
        updateTab(tabId, {
          connecting: false,
          connectionError: result.error || 'Connection failed',
        });
      }

      return result;
    },
    [updateTab],
  );

  const disconnect = useCallback(
    async (tabId: string) => {
      const tab = useAppStore.getState().tabs.find((t) => t.id === tabId);
      if (tab?.sessionId) {
        await window.void.ssh.disconnect(tab.sessionId);
        updateTab(tabId, { connected: false, sessionId: undefined });
      }
    },
    [updateTab],
  );

  return { connect, disconnect };
}
