import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('void', {
  ssh: {
    connect: (config: unknown) => ipcRenderer.invoke('ssh:connect', config),
    write: (sessionId: string, data: string) => ipcRenderer.send('ssh:write', sessionId, data),
    resize: (sessionId: string, cols: number, rows: number) =>
      ipcRenderer.send('ssh:resize', sessionId, cols, rows),
    disconnect: (sessionId: string) => ipcRenderer.invoke('ssh:disconnect', sessionId),
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

  connections: {
    list: () => ipcRenderer.invoke('connections:list'),
    save: (conn: unknown) => ipcRenderer.invoke('connections:save', conn),
    update: (id: string, data: unknown) => ipcRenderer.invoke('connections:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('connections:delete', id),
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

  ai: {
    explain: (error: string, context: string) =>
      ipcRenderer.invoke('ai:explain', error, context),
    checkDanger: (command: string, server: string) =>
      ipcRenderer.invoke('ai:checkDanger', command, server),
    autocomplete: (context: string, history: string[]) =>
      ipcRenderer.invoke('ai:autocomplete', context, history),
    naturalLanguage: (query: string, server: string) =>
      ipcRenderer.invoke('ai:naturalLanguage', query, server),
    chat: (message: string, history: { role: string; content: string }[]) =>
      ipcRenderer.invoke('ai:chat', message, history),
    getConfig: () => ipcRenderer.invoke('ai:getConfig'),
    setConfig: (config: unknown) => ipcRenderer.invoke('ai:setConfig', config),
  },

  license: {
    isPro: () => ipcRenderer.invoke('license:isPro'),
    getInfo: () => ipcRenderer.invoke('license:getInfo'),
    activate: (key: string, email: string) => ipcRenderer.invoke('license:activate', key, email),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
  },

  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
    getPlatform: () => ipcRenderer.invoke('app:getPlatform'),
  },
});
