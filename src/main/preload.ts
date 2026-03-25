import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('void', {
  ssh: {
    connect: (config: unknown) => ipcRenderer.invoke('ssh:connect', config),
    write: (sessionId: string, data: string) => ipcRenderer.send('ssh:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('ssh:resize', sessionId, cols, rows),
    disconnect: (sessionId: string) => ipcRenderer.invoke('ssh:disconnect', sessionId),
    exec: (sessionId: string, command: string) => ipcRenderer.invoke('ssh:exec', sessionId, command),
    parseConfig: () => ipcRenderer.invoke('ssh:parseConfig'),
    getBuffer: (sessionId: string) => ipcRenderer.invoke('ssh:getBuffer', sessionId),
    onData: (sessionId: string, cb: (data: string) => void) => {
      const handler = (_event: unknown, data: string) => cb(data);
      ipcRenderer.on(`ssh:data:${sessionId}`, handler);
      return () => {
        ipcRenderer.removeListener(`ssh:data:${sessionId}`, handler);
      };
    },
    onClose: (sessionId: string, cb: () => void) => {
      const handler = () => cb();
      ipcRenderer.on(`ssh:close:${sessionId}`, handler);
      return () => {
        ipcRenderer.removeListener(`ssh:close:${sessionId}`, handler);
      };
    },
    onError: (sessionId: string, cb: (err: string) => void) => {
      const handler = (_event: unknown, err: string) => cb(err);
      ipcRenderer.on(`ssh:error:${sessionId}`, handler);
      return () => {
        ipcRenderer.removeListener(`ssh:error:${sessionId}`, handler);
      };
    },
  },

  pty: {
    create: (options?: { shell?: string; cwd?: string }) =>
      ipcRenderer.invoke('pty:create', options),
    write: (sessionId: string, data: string) => ipcRenderer.send('pty:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('pty:resize', sessionId, cols, rows),
    destroy: (sessionId: string) => ipcRenderer.invoke('pty:destroy', sessionId),
    onData: (sessionId: string, cb: (data: string) => void) => {
      const handler = (_event: unknown, data: string) => cb(data);
      ipcRenderer.on(`pty:data:${sessionId}`, handler);
      return () => {
        ipcRenderer.removeListener(`pty:data:${sessionId}`, handler);
      };
    },
    onExit: (sessionId: string, cb: (code: number) => void) => {
      const handler = (_event: unknown, code: number) => cb(code);
      ipcRenderer.on(`pty:exit:${sessionId}`, handler);
      return () => {
        ipcRenderer.removeListener(`pty:exit:${sessionId}`, handler);
      };
    },
  },

  sftp: {
    readdir: (sessionId: string, path: string) => ipcRenderer.invoke("sftp:readdir", sessionId, path),
    readFile: (sessionId: string, path: string) => ipcRenderer.invoke("sftp:readFile", sessionId, path),
    writeFile: (sessionId: string, path: string, content: string) => ipcRenderer.invoke("sftp:writeFile", sessionId, path, content),
    delete: (sessionId: string, path: string) => ipcRenderer.invoke("sftp:delete", sessionId, path),
    mkdir: (sessionId: string, path: string) => ipcRenderer.invoke("sftp:mkdir", sessionId, path),
    rename: (sessionId: string, oldPath: string, newPath: string) => ipcRenderer.invoke("sftp:rename", sessionId, oldPath, newPath),
    download: (sessionId: string, remotePath: string) => ipcRenderer.invoke("sftp:download", sessionId, remotePath),
    upload: (sessionId: string, localPath: string, remotePath: string) => ipcRenderer.invoke("sftp:upload", sessionId, localPath, remotePath),
    uploadPause: () => ipcRenderer.invoke("sftp:upload-pause"),
    uploadResume: () => ipcRenderer.invoke("sftp:upload-resume"),
    uploadPauseAll: () => ipcRenderer.invoke("sftp:upload-pause-all"),
    uploadCancel: (jobId: string) => ipcRenderer.invoke("sftp:upload-cancel", jobId),
    uploadQueue: () => ipcRenderer.invoke("sftp:upload-queue"),
    onUploadProgress: (cb: (data: any) => void) => { const h = (_e: any, d: any) => cb(d); ipcRenderer.on("sftp:upload-progress", h); return () => ipcRenderer.removeListener("sftp:upload-progress", h); },
  },

  connections: {
    list: () => ipcRenderer.invoke('connections:list'),
    save: (conn: unknown) => ipcRenderer.invoke('connections:save', conn),
    update: (id: string, data: unknown) => ipcRenderer.invoke('connections:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('connections:delete', id),
    backup: (passphrase: string) => ipcRenderer.invoke('connections:backup', passphrase),
    restore: (passphrase: string) => ipcRenderer.invoke('connections:restore', passphrase),
    hasBackup: () => ipcRenderer.invoke('connections:hasBackup'),
    exportEncrypted: (ids: string[], passphrase: string) => ipcRenderer.invoke('connections:exportEncrypted', ids, passphrase),
    importEncrypted: (json: string, passphrase: string) => ipcRenderer.invoke('connections:importEncrypted', json, passphrase),
  },

  memory: {
    addEvent: (event: unknown) => ipcRenderer.invoke('memory:addEvent', event),
    query: (text: string) => ipcRenderer.invoke('memory:query', text),
    getTimeline: (filter?: string) => ipcRenderer.invoke('memory:getTimeline', filter),
    getStats: () => ipcRenderer.invoke('memory:getStats'),
    clearAll: () => ipcRenderer.invoke('memory:clearAll'),
  },

  notes: {
    list: (scope: string) => ipcRenderer.invoke('notes:list', scope),
    save: (note: unknown) => ipcRenderer.invoke('notes:save', note),
    update: (id: string, data: unknown) => ipcRenderer.invoke('notes:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
  },

  snippets: {
    list: () => ipcRenderer.invoke('snippets:list'),
    save: (snippet: unknown) => ipcRenderer.invoke('snippets:save', snippet),
    delete: (id: string) => ipcRenderer.invoke('snippets:delete', id),
    incrementRunCount: (id: string) => ipcRenderer.invoke('snippets:incrementRunCount', id),
  },

  fs: {
    readdir: (path: string) => ipcRenderer.invoke('fs:readdir', path),
    homedir: () => ipcRenderer.invoke('fs:homedir'),
  },

  tunnel: {
    create: (sessionId: string, type: string, localPort: number, remoteHost: string, remotePort: number) =>
      ipcRenderer.invoke('tunnel:create', sessionId, type, localPort, remoteHost, remotePort),
    list: () => ipcRenderer.invoke('tunnel:list'),
    close: (id: string) => ipcRenderer.invoke('tunnel:close', id),
  },

  health: {
    log: (connectionId: string, host: string, event: string) => ipcRenderer.invoke('health:log', connectionId, host, event),
    events: (connectionId?: string) => ipcRenderer.invoke('health:events', connectionId),
    summary: () => ipcRenderer.invoke('health:summary'),
  },

  recordings: {
    list: () => ipcRenderer.invoke('recordings:list'),
    save: (recording: unknown) => ipcRenderer.invoke('recordings:save', recording),
    get: (id: string) => ipcRenderer.invoke('recordings:get', id),
    delete: (id: string) => ipcRenderer.invoke('recordings:delete', id),
  },

  bookmarks: {
    list: (server?: string) => ipcRenderer.invoke('bookmarks:list', server),
    save: (bookmark: unknown) => ipcRenderer.invoke('bookmarks:save', bookmark),
    delete: (id: string) => ipcRenderer.invoke('bookmarks:delete', id),
    incrementUsage: (id: string) => ipcRenderer.invoke('bookmarks:incrementUsage', id),
  },

  ai: {
    explain: (error: string, context: string) =>
      ipcRenderer.invoke('ai:explain', error, context),
    checkDanger: (command: string, server: string) =>
      ipcRenderer.invoke('ai:checkDanger', command, server),
    autocomplete: (context: string, history: string[]) =>
      ipcRenderer.invoke('ai:autocomplete', context, history),
    naturalLanguage: (query: string, server: string) =>
      ipcRenderer.invoke('ai:naturalLanguage', query, server),
    chat: (message: string, history: { role: string; content: string }[], terminalContext?: string, serverInfo?: string) =>
      ipcRenderer.invoke('ai:chat', message, history, terminalContext, serverInfo),
    getConfig: () => ipcRenderer.invoke('ai:getConfig'),
    setConfig: (config: unknown) => ipcRenderer.invoke('ai:setConfig', config),
  },

  license: {
    isPro: () => ipcRenderer.invoke('license:isPro'),
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    activate: (key: string, email: string) => ipcRenderer.invoke('license:activate', key, email),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    onExpired: (cb: (data: any) => void) => {
      const handler = (_e: unknown, data: any) => cb(data);
      ipcRenderer.on('license:expired', handler);
      return () => ipcRenderer.removeListener('license:expired', handler);
    },
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
    relaunch: () => ipcRenderer.send("app:relaunch"),
    setZoom: (factor: number) => ipcRenderer.send("app:setZoom", factor),
    restart: () => ipcRenderer.send("app:relaunch"),
    getFilePath: (file: File) => webUtils.getPathForFile(file),
    checkForUpdates: (currentVersion: string) => ipcRenderer.invoke('app:checkUpdates', currentVersion),
    updaterCheck: () => ipcRenderer.invoke('updater:check'),
    updaterDownload: () => ipcRenderer.invoke('updater:download'),
    updaterInstall: () => ipcRenderer.send('updater:install'),
    onUpdaterAvailable: (cb: (data: any) => void) => { const h = (_e: unknown, d: any) => cb(d); ipcRenderer.on('updater:available', h); return () => ipcRenderer.removeListener('updater:available', h); },
    onUpdaterProgress: (cb: (data: any) => void) => { const h = (_e: unknown, d: any) => cb(d); ipcRenderer.on('updater:progress', h); return () => ipcRenderer.removeListener('updater:progress', h); },
    onUpdaterDownloaded: (cb: (data: any) => void) => { const h = (_e: unknown, d: any) => cb(d); ipcRenderer.on('updater:downloaded', h); return () => ipcRenderer.removeListener('updater:downloaded', h); },
    onUpdaterError: (cb: (data: any) => void) => { const h = (_e: unknown, d: any) => cb(d); ipcRenderer.on('updater:error', h); return () => ipcRenderer.removeListener('updater:error', h); },
    detachTab: (tabData: any, screenX: number, screenY: number) => ipcRenderer.invoke('app:detachTab', tabData, screenX, screenY),
    onReceiveTab: (cb: (tabData: any) => void) => {
      const handler = (_e: unknown, data: any) => cb(data);
      ipcRenderer.on('window:receive-tab', handler);
      return () => ipcRenderer.removeListener('window:receive-tab', handler);
    },
  },
});
