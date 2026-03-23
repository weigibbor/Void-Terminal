import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { SSHManager } from './ssh-manager';
import { PTYManager } from './pty-manager';
import { ConnectionStore } from './connection-store';
import { MemoryStore } from './memory-store';
import * as pro from './pro-bridge';
import { isMac } from './utils/platform';

let mainWindow: BrowserWindow | null = null;
let sshManager: SSHManager;
let ptyManager: PTYManager;
let connectionStore: ConnectionStore;
let memoryStore: MemoryStore;

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 720,
    height: 480,
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
    },
  });

  win.once('ready-to-show', () => {
    win.show();
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  return win;
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
}

app.whenReady().then(async () => {
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
  pro.initAIWatcher(memoryStore, mainWindow);

  mainWindow.on('close', () => {
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
