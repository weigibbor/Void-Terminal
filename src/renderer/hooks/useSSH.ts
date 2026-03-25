import { useCallback } from 'react';
import { useAppStore } from '../stores/app-store';
import { fireWebhook, logTeamActivity, logAnalytics } from '../utils/webhooks';
import type { SSHConfig } from '../types';

export function useSSH() {
  const updateTab = useAppStore((s) => s.updateTab);

  const connect = useCallback(
    async (tabId: string, config: SSHConfig, alias?: string, startupCommand?: string) => {
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

        // Log health event + webhook + team activity
        (window as any).void.health?.log(tabId, config.host, 'connected');
        fireWebhook('connect', { host: config.host, user: config.username });
        logTeamActivity('connected', config.host, `${config.username}@${config.host}`);
        logAnalytics('session_start', config.host);

        // Run startup command after short delay (let shell initialize)
        if (startupCommand) {
          setTimeout(() => {
            window.void.ssh.write(result.sessionId!, startupCommand + '\r');
          }, 500);
        }

        const connectTime = Date.now();
        window.void.ssh.onClose(result.sessionId, () => {
          updateTab(tabId, { connected: false });
          (window as any).void.health?.log(tabId, config.host, 'disconnected');
          fireWebhook('disconnect', { host: config.host, duration: Date.now() - connectTime });
          logTeamActivity('disconnected', config.host);
          logAnalytics('session_end', config.host, Date.now() - connectTime);
        });

        window.void.ssh.onError(result.sessionId, (err: string) => {
          updateTab(tabId, { connected: false });
          (window as any).void.health?.log(tabId, config.host, 'error');
          fireWebhook('error', { host: config.host, error: err });
          logTeamActivity('error', config.host, err);
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
