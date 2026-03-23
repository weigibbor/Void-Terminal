import { BrowserWindow } from 'electron';

export function setupAutoUpdater(_window: BrowserWindow): void {
  // Auto-updater setup for production builds
  // Uses electron-updater with GitHub Releases
  //
  // In production:
  // import { autoUpdater } from 'electron-updater';
  // autoUpdater.checkForUpdatesAndNotify();
  // autoUpdater.on('update-available', () => { ... });
  // autoUpdater.on('update-downloaded', () => { ... });
  //
  // Disabled in development
  if (process.env.VITE_DEV_SERVER_URL) return;

  try {
    // Dynamic import to avoid issues in dev
    import('electron-updater').then(({ autoUpdater }) => {
      autoUpdater.checkForUpdatesAndNotify();
    }).catch(() => {
      // electron-updater not available
    });
  } catch {
    // Ignore in development
  }
}
