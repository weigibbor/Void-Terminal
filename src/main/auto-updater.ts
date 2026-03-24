import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain, app } from 'electron';

export function initAutoUpdater(window: BrowserWindow): void {
  // Don't check in dev mode
  if (process.env.VITE_DEV_SERVER_URL) return;

  try {
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'weigibbor',
      repo: 'Void-Terminal',
    });
  } catch (err) {
    console.error('[Updater] Failed to set feed URL:', err);
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowDowngrade = false;

  // Forward events to renderer
  const send = (channel: string, ...args: unknown[]) => {
    try {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, ...args);
      }
    } catch { /* destroyed */ }
  };

  autoUpdater.on('checking-for-update', () => {
    console.log('[Updater] Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('[Updater] Update available:', info.version);
    send('updater:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Updater] No update available.');
    send('updater:not-available');
  });

  autoUpdater.on('download-progress', (progress) => {
    send('updater:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('[Updater] Update downloaded:', info.version);
    send('updater:downloaded', { version: info.version });
  });

  autoUpdater.on('error', (err) => {
    console.error('[Updater] Error:', err.message);
    send('updater:error', { message: err.message });
  });

  // IPC handlers
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return result?.updateInfo || null;
    } catch (err: any) {
      return { error: err.message };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.on('updater:install', () => {
    // Quit and install the downloaded update
    autoUpdater.quitAndInstall(false, true);
  });

  // Check for updates on launch (after 5 seconds)
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 5000);

  // Check every 6 hours
  const checkInterval = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 6 * 60 * 60 * 1000);

  app.on('before-quit', () => clearInterval(checkInterval));
}
