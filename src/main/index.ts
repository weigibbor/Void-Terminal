import { app, BrowserWindow, ipcMain, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { SSHManager } from './ssh-manager';
import { PTYManager } from './pty-manager';
import { ConnectionStore } from './connection-store';
import { MemoryStore } from './memory-store';
import * as pro from './pro-bridge';
import { SFTPUploadManager } from './sftp-upload-manager';
import { isMac } from './utils/platform';
import { initAutoUpdater } from './auto-updater';

let mainWindow: BrowserWindow | null = null;
const allWindows = new Set<BrowserWindow>();
let sshManager: SSHManager;
let ptyManager: PTYManager;
let uploadManager: SFTPUploadManager;
let connectionStore: ConnectionStore;
let memoryStore: MemoryStore;

function createWindow(options?: { width?: number; height?: number; x?: number; y?: number; detachedTab?: any }): BrowserWindow {
  const win = new BrowserWindow({
    width: options?.width || 720,
    height: options?.height || 480,
    x: options?.x,
    y: options?.y,
    minWidth: 480,
    minHeight: 320,
    titleBarStyle: isMac() ? 'hiddenInset' : 'hidden',
    ...(isMac() ? { trafficLightPosition: { x: 16, y: 14 } } : {}),
    backgroundColor: '#0A0A0D',
    show: false,
    vibrancy: isMac() ? 'under-window' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      webSecurity: true,
    },
  });

  allWindows.add(win);

  // Allow webview to load any URL (for browser pane)
  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({ cancel: false, requestHeaders: details.requestHeaders });
  });
  // Remove response headers that block content loading in webview
  win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers['x-frame-options'];
    delete headers['X-Frame-Options'];
    delete headers['content-security-policy'];
    delete headers['Content-Security-Policy'];
    callback({ cancel: false, responseHeaders: headers });
  });
  // Allow all permissions in webview
  win.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(true);
  });

  // Allow webview to navigate to any URL
  win.webContents.on('will-attach-webview', (_event, webPreferences, _params) => {
    webPreferences.allowRunningInsecureContent = true;
  });

  win.once('ready-to-show', () => {
    win.show();
    // If this window was created for a detached tab, send the tab data
    if (options?.detachedTab) {
      setTimeout(() => {
        try {
          if (!win.isDestroyed()) {
            win.webContents.send('window:receive-tab', options.detachedTab);
          }
        } catch { /* destroyed */ }
      }, 500);
    }
  });

  win.on('closed', () => {
    allWindows.delete(win);
    if (win === mainWindow) mainWindow = null;
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
}

// Broadcast SSH/PTY data to ALL windows (each window filters by its own tabs)
function broadcastToWindows(channel: string, ...args: unknown[]): void {
  for (const win of allWindows) {
    try {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, ...args);
      }
    } catch { /* destroyed */ }
  }
}

function registerIPCHandlers(): void {
  // --- SSH ---
  ipcMain.handle('ssh:connect', async (_event, config) => {
    if (!sshManager) return { success: false, error: 'SSH manager not ready' };
    return sshManager.connect(config);
  });

  ipcMain.on('ssh:write', (_event, sessionId: string, data: string) => {
    sshManager?.write(sessionId, data);
  });

  ipcMain.on('ssh:resize', (_event, sessionId: string, cols: number, rows: number) => {
    sshManager?.resize(sessionId, cols, rows);
  });

  ipcMain.handle('ssh:disconnect', async (_event, sessionId: string) => {
    if (!sshManager) return { success: false };
    return sshManager.disconnect(sessionId);
  });

  ipcMain.handle('ssh:getBuffer', async (_event, sessionId: string) => {
    if (!sshManager) return '';
    return sshManager.getBuffer(sessionId);
  });

  ipcMain.handle('ssh:getLatency', async (_event, sessionId: string) => {
    if (!sshManager) return null;
    return sshManager.getLatency(sessionId);
  });

  // --- PTY ---
  ipcMain.handle('pty:create', async (_event, options) => {
    if (!ptyManager) return { success: false, error: 'PTY manager not ready' };
    return ptyManager.create(options);
  });

  ipcMain.on('pty:write', (_event, sessionId: string, data: string) => {
    ptyManager?.write(sessionId, data);
  });

  ipcMain.on('pty:resize', (_event, sessionId: string, cols: number, rows: number) => {
    ptyManager?.resize(sessionId, cols, rows);
  });

  ipcMain.handle('pty:destroy', async (_event, sessionId: string) => {
    if (!ptyManager) return { success: false };
    return ptyManager.destroy(sessionId);
  });

  // --- Connections ---
  ipcMain.handle('connections:list', async () => {
    return connectionStore.list();
  });

  ipcMain.handle('connections:save', async (_event, conn) => {
    return connectionStore.save(conn);
  });

  ipcMain.handle('connections:update', async (_event, id: string, data) => {
    return connectionStore.update(id, data);
  });

  ipcMain.handle('connections:delete', async (_event, id: string) => {
    connectionStore.delete(id);
  });

  // --- SFTP (uses SSH client's SFTP subsystem) ---
  ipcMain.handle('sftp:readdir', async (_event, sessionId: string, dirPath: string) => {
    if (!sshManager) return { success: false, error: 'Not ready' };
    const client = sshManager.getClient(sessionId);
    if (!client) return { success: false, error: 'Session not found' };
    return new Promise((resolve) => {
      client.sftp((err: any, sftp: any) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        sftp.readdir(dirPath, (err2: any, list: any[]) => {
          if (err2) { resolve({ success: false, error: err2.message }); sftp.end(); return; }
          const entries = list.map((item: any) => ({
            name: item.filename,
            type: (item.attrs.mode & 0o40000) !== 0 ? 'directory' : 'file',
            size: item.attrs.size || 0,
            modified: (item.attrs.mtime || 0) * 1000,
            permissions: (item.attrs.mode & 0o777).toString(8),
          })).sort((a: any, b: any) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
          });
          sftp.end();
          resolve({ success: true, entries });
        });
      });
    });
  });

  ipcMain.handle('sftp:readFile', async (_event, sessionId: string, filePath: string) => {
    if (!sshManager) return { success: false, error: 'Not ready' };
    const client = sshManager.getClient(sessionId);
    if (!client) return { success: false, error: 'Session not found' };
    return new Promise((resolve) => {
      client.sftp((err: any, sftp: any) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        const chunks: Buffer[] = [];
        const stream = sftp.createReadStream(filePath);
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => { sftp.end(); resolve({ success: true, content: Buffer.concat(chunks).toString('utf-8') }); });
        stream.on('error', (e: any) => { sftp.end(); resolve({ success: false, error: e.message }); });
      });
    });
  });

  ipcMain.handle('sftp:download', async (_event, sessionId: string, remotePath: string) => {
    if (!sshManager || !mainWindow) return { success: false, error: 'Not ready' };
    const client = sshManager.getClient(sessionId);
    if (!client) return { success: false, error: 'Session not found' };
    const fileName = path.basename(remotePath);
    const { canceled, filePath: localPath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: fileName,
      title: `Download ${fileName}`,
    });
    if (canceled || !localPath) return { success: false, error: 'Cancelled' };
    return new Promise((resolve) => {
      client.sftp((err: any, sftp: any) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        const readStream = sftp.createReadStream(remotePath);
        const writeStream = fs.createWriteStream(localPath);
        readStream.pipe(writeStream);
        writeStream.on('finish', () => { sftp.end(); resolve({ success: true, localPath }); });
        readStream.on('error', (e: any) => { sftp.end(); resolve({ success: false, error: e.message }); });
        writeStream.on('error', (e: any) => { sftp.end(); resolve({ success: false, error: e.message }); });
      });
    });
  });

  ipcMain.handle('sftp:writeFile', async (_event, sessionId: string, filePath: string, content: string) => {
    if (!sshManager) return { success: false, error: 'Not ready' };
    const client = sshManager.getClient(sessionId);
    if (!client) return { success: false, error: 'Session not found' };
    return new Promise((resolve) => {
      client.sftp((err: any, sftp: any) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        const stream = sftp.createWriteStream(filePath);
        stream.on('finish', () => { sftp.end(); resolve({ success: true }); });
        stream.on('error', (e: any) => { sftp.end(); resolve({ success: false, error: e.message }); });
        stream.end(Buffer.from(content, 'utf-8'));
      });
    });
  });

  ipcMain.handle('sftp:delete', async (_event, sessionId: string, filePath: string) => {
    if (!sshManager) return { success: false, error: 'Not ready' };
    const client = sshManager.getClient(sessionId);
    if (!client) return { success: false, error: 'Session not found' };
    return new Promise((resolve) => {
      client.sftp((err: any, sftp: any) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        sftp.unlink(filePath, (e: any) => { sftp.end(); resolve(e ? { success: false, error: e.message } : { success: true }); });
      });
    });
  });

  ipcMain.handle('sftp:mkdir', async (_event, sessionId: string, dirPath: string) => {
    if (!sshManager) return { success: false, error: 'Not ready' };
    const client = sshManager.getClient(sessionId);
    if (!client) return { success: false, error: 'Session not found' };
    return new Promise((resolve) => {
      client.sftp((err: any, sftp: any) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        sftp.mkdir(dirPath, (e: any) => { sftp.end(); resolve(e ? { success: false, error: e.message } : { success: true }); });
      });
    });
  });

  ipcMain.handle('sftp:rename', async (_event, sessionId: string, oldPath: string, newPath: string) => {
    if (!sshManager) return { success: false, error: 'Not ready' };
    const client = sshManager.getClient(sessionId);
    if (!client) return { success: false, error: 'Session not found' };
    return new Promise((resolve) => {
      client.sftp((err: any, sftp: any) => {
        if (err) { resolve({ success: false, error: err.message }); return; }
        sftp.rename(oldPath, newPath, (e: any) => { sftp.end(); resolve(e ? { success: false, error: e.message } : { success: true }); });
      });
    });
  });

  // --- SFTP Upload ---
  ipcMain.handle('sftp:upload', async (_event, sessionId: string, localPath: string, remotePath: string) => {
    if (!uploadManager) return { success: false, error: 'Upload manager not ready' };
    try {
      const job = uploadManager.addToQueue(sessionId, localPath, remotePath);
      return { success: true, jobId: job.id };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle('sftp:upload-pause', async () => {
    uploadManager?.pause();
  });

  ipcMain.handle('sftp:upload-resume', async () => {
    uploadManager?.resume();
  });

  ipcMain.handle('sftp:upload-pause-all', async () => {
    uploadManager?.pauseAll();
  });

  ipcMain.handle('sftp:upload-cancel', async (_event, jobId: string) => {
    uploadManager?.cancel(jobId);
  });

  ipcMain.handle('sftp:upload-queue', async () => {
    return uploadManager?.getQueue() || [];
  });

  // --- Memory ---
  ipcMain.handle('memory:addEvent', async (_event, eventData) => {
    return memoryStore.addEvent(eventData);
  });

  ipcMain.handle('memory:query', async (_event, text: string) => {
    return memoryStore.queryEvents(text);
  });

  ipcMain.handle('memory:getTimeline', async (_event, filter?: string) => {
    return memoryStore.getTimeline(filter);
  });

  ipcMain.handle('memory:getStats', async () => {
    return memoryStore.getStats();
  });

  ipcMain.handle('memory:clearAll', async () => {
    memoryStore.clearAllEvents();
  });

  // --- Notes ---
  ipcMain.handle('notes:list', async (_event, scope: string) => {
    return memoryStore.listNotes(scope);
  });

  ipcMain.handle('notes:save', async (_event, note) => {
    return memoryStore.saveNote(note);
  });

  ipcMain.handle('notes:update', async (_event, id: string, data) => {
    memoryStore.updateNote(id, data);
  });

  ipcMain.handle('notes:delete', async (_event, id: string) => {
    memoryStore.deleteNote(id);
  });

  // --- Snippets ---
  ipcMain.handle('snippets:list', async () => {
    return memoryStore.listSnippets();
  });

  ipcMain.handle('snippets:save', async (_event, snippet) => {
    return memoryStore.saveSnippet(snippet);
  });

  ipcMain.handle('snippets:delete', async (_event, id: string) => {
    memoryStore.deleteSnippet(id);
  });

  ipcMain.handle('snippets:incrementRunCount', async (_event, id: string) => {
    memoryStore.incrementSnippetRunCount(id);
  });

  // --- AI (routed through pro-bridge) ---
  ipcMain.handle('ai:explain', async (_event, error: string, context: string) => {
    return pro.aiExplainError(error, context);
  });

  ipcMain.handle('ai:checkDanger', async (_event, command: string, server: string) => {
    // First check local regex patterns (fast, no API call)
    const watcher = pro.getAIWatcher();
    if (watcher?.checkDangerLocal) {
      const localResult = watcher.checkDangerLocal(command, server);
      if (localResult?.isDangerous) return localResult;
    }
    // Then optionally check via AI for complex cases
    return pro.aiCheckDanger(command, server);
  });

  ipcMain.handle('ai:autocomplete', async (_event, context: string, history: string[]) => {
    return pro.aiAutocomplete(context, history);
  });

  ipcMain.handle('ai:naturalLanguage', async (_event, query: string, server: string) => {
    return pro.aiNaturalLanguage(query, server);
  });

  ipcMain.handle('ai:chat', async (_event, message: string, history) => {
    return pro.aiChat(message, history);
  });

  ipcMain.handle('ai:getConfig', async () => {
    return pro.getAIConfig();
  });

  ipcMain.handle('ai:setConfig', async (_event, config) => {
    pro.setAIConfig(config);
  });

  // --- License (routed through pro-bridge) ---
  ipcMain.handle('license:isPro', async () => {
    return pro.isLicenseActive();
  });

  ipcMain.handle('license:getInfo', async () => {
    return pro.getLicenseInfo();
  });

  ipcMain.handle('license:activate', async (_event, key: string, email: string) => {
    return pro.activateLicense(key, email);
  });

  ipcMain.handle('license:deactivate', async () => {
    await pro.deactivateLicense();
    // Flush AI config (API key) for security
    pro.setAIConfig({
      provider: null as any,
      apiKey: undefined,
      features: {
        autoNotes: false, errorExplainer: false, dangerDetection: false,
        autocomplete: false, naturalLanguage: false, securityScanner: false, anomalyDetection: false,
      },
    });
  });

  // --- Window ---
  ipcMain.on('window:minimize', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('window:maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('window:close', () => {
    mainWindow?.close();
  });

  // --- App ---
  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getPlatform', async () => {
    return process.platform;
  });

  ipcMain.on('app:setZoom', (_event, factor: number) => {
    mainWindow?.webContents.setZoomFactor(factor);
  });

  ipcMain.handle('app:detachTab', async (_event, tabData: any, screenX: number, screenY: number) => {
    const win = createWindow({
      width: 720,
      height: 480,
      x: Math.round(screenX),
      y: Math.round(screenY),
      detachedTab: tabData,
    });
    return { success: true, windowId: win.id };
  });

  ipcMain.handle('app:checkUpdates', async (_event, currentVersion: string) => {
    try {
      const os = process.platform === 'darwin' ? 'mac' : 'win';
      const res = await fetch(`https://voidterminal.dev/api/updates?v=${currentVersion}&os=${os}`);
      if (!res.ok) return { update: false, error: 'Server error' };
      return await res.json();
    } catch (err: any) {
      return { update: false, error: err.message || 'Network error' };
    }
  });

  ipcMain.on('app:relaunch', async () => {
    // Re-init pro bridge with new license state
    await pro.initProBridge();
    pro.initAIEngine();
    if (mainWindow && !mainWindow.isDestroyed()) {
      pro.initAIWatcher(memoryStore, mainWindow);
      // Reload the renderer — works in both dev and packaged app
      mainWindow.webContents.reload();
    }
  });
}

app.whenReady().then(async () => {
  // Set up browser webview partition — allow all URLs including IPs
  const browserSession = session.fromPartition('persist:browser');
  browserSession.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders };
    delete headers['x-frame-options'];
    delete headers['X-Frame-Options'];
    delete headers['content-security-policy'];
    delete headers['Content-Security-Policy'];
    callback({ cancel: false, responseHeaders: headers });
  });
  browserSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(true);
  });

  // Initialize stores
  connectionStore = new ConnectionStore();
  memoryStore = new MemoryStore();

  // Load Pro package (dynamic import — safe if not installed)
  await pro.initProBridge();
  pro.initAIEngine();

  // Register IPC handlers BEFORE creating window
  registerIPCHandlers();

  // Create window — managers need window ref
  mainWindow = createWindow();
  sshManager = new SSHManager(mainWindow);
  ptyManager = new PTYManager(mainWindow);
  uploadManager = new SFTPUploadManager(mainWindow);
  (global as any).__sshManager = sshManager;
  sshManager.setAllWindows(allWindows);
  pro.initAIWatcher(memoryStore, mainWindow);

  // Feed SSH output to AI Watcher for event detection
  const watcher = pro.getAIWatcher();
  if (watcher) {
    sshManager.onOutput((sessionId, data, server) => {
      watcher.feed(sessionId, data, server);
    });
  }

  // Auto-updater (checks GitHub Releases for new versions)
  initAutoUpdater(mainWindow);

  // Periodic license enforcement (every 6 hours)
  pro.enforceLicenseExpiry(mainWindow);
  const licenseInterval = setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      pro.enforceLicenseExpiry(mainWindow);
    }
  }, 6 * 60 * 60 * 1000);

  mainWindow.on('close', () => {
    clearInterval(licenseInterval);
    sshManager?.destroyAll();
    ptyManager?.destroyAll();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      sshManager = new SSHManager(mainWindow);
      ptyManager = new PTYManager(mainWindow);
      mainWindow.on('close', () => {
        sshManager?.destroyAll();
        ptyManager?.destroyAll();
      });
    }
  });
});

app.on('window-all-closed', () => {
  memoryStore?.close();
  app.quit();
});
