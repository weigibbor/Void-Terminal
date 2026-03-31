export type TabType = 'ssh' | 'local' | 'browser' | 'new-connection' | 'settings' | 'editor';
export type SplitLayout = 'single' | '2-col' | '3-col' | '2+1-grid' | '1+2-grid';
export type NoteType = 'pinned' | 'note' | 'warning' | 'quickref';
export type PanePosition = 'L' | 'R' | 'C' | 'TL' | 'TR' | 'B' | 'T' | 'BL' | 'BR';

export interface Tab {
  id: string;
  type: TabType;
  title: string;
  sessionId?: string;
  connectionConfig?: SSHConfig;
  browserUrl?: string;
  connected: boolean;
  connecting?: boolean;
  connectionError?: string;
  lastActivity: number;
  disconnectedAt?: number;
  scrollbackPreserved?: boolean;
  color?: string;
  pinned?: boolean;
  // Editor tab fields
  filePath?: string;
  fileContent?: string;
  unsaved?: boolean;
  sftpSessionId?: string;
}

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  authMethod: 'key' | 'password';
  password?: string;
  privateKeyPath?: string;
  keepAlive: boolean;
  keepAliveInterval: number;
  autoReconnect: boolean;
  agentForward?: boolean;
  jumpHost?: {
    host: string;
    port: number;
    username: string;
    authMethod: 'key' | 'password';
    password?: string;
    privateKeyPath?: string;
  };
}

export interface SavedConnection {
  id: string;
  alias: string;
  host: string;
  port: number;
  username: string;
  authMethod: 'key' | 'password';
  password?: string;
  privateKeyPath?: string;
  keepAlive: boolean;
  keepAliveInterval: number;
  autoReconnect: boolean;
  group?: string;
  color?: string;
  lastConnected?: number;
  startupCommand?: string;
  pinned?: boolean;
  createdAt: number;
}

export interface Note {
  id: string;
  scope: string;
  title: string;
  content: string;
  type: NoteType;
  pinned: boolean;
  aiGenerated: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Snippet {
  id: string;
  name: string;
  command: string;
  description?: string;
  tags?: string[];
  runCount: number;
  createdAt: number;
}

export interface MemoryEvent {
  id: string;
  type: string;
  server?: string;
  project?: string;
  detail: string;
  command?: string;
  output?: string;
  exitCode?: number;
  durationMs?: number;
  timestamp: number;
  tags?: string;
  aiGenerated: boolean;
}

export interface AIConfig {
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama';
  apiKey?: string;
  ollamaUrl?: string;
  model?: string;
  features: {
    autoNotes: boolean;
    errorExplainer: boolean;
    dangerDetection: boolean;
    autocomplete: boolean;
    naturalLanguage: boolean;
    chat: boolean;
    securityScanner: boolean;
    anomalyDetection: boolean;
  };
}

export interface CommandAction {
  id: string;
  label: string;
  shortcut?: string;
  category: string;
  action: () => void;
}

export interface VoidAPI {
  ssh: {
    connect: (config: SSHConfig) => Promise<{ success: boolean; sessionId?: string; error?: string }>;
    write: (sessionId: string, data: string) => void;
    resize: (sessionId: string, cols: number, rows: number) => void;
    disconnect: (sessionId: string) => Promise<{ success: boolean }>;
    getBuffer: (sessionId: string) => Promise<string>;
    onData: (sessionId: string, cb: (data: string) => void) => () => void;
    onClose: (sessionId: string, cb: () => void) => () => void;
    onError: (sessionId: string, cb: (err: string) => void) => () => void;
    getLatency: (sessionId: string) => Promise<number | null>;
    onLatency: (sessionId: string, cb: (ms: number) => void) => () => void;
  };
  sftp: {
    readdir: (sessionId: string, path: string) => Promise<{ success: boolean; entries?: any[]; error?: string }>;
    readFile: (sessionId: string, path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    writeFile: (sessionId: string, path: string, content: string) => Promise<{ success: boolean; error?: string }>;
    delete: (sessionId: string, path: string) => Promise<{ success: boolean; error?: string }>;
    mkdir: (sessionId: string, path: string) => Promise<{ success: boolean; error?: string }>;
    rename: (sessionId: string, oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
  };
  pty: {
    create: (options?: { shell?: string; cwd?: string }) => Promise<{ success: boolean; sessionId?: string }>;
    write: (sessionId: string, data: string) => void;
    resize: (sessionId: string, cols: number, rows: number) => void;
    destroy: (sessionId: string) => Promise<{ success: boolean }>;
    onData: (sessionId: string, cb: (data: string) => void) => () => void;
    onExit: (sessionId: string, cb: (code: number) => void) => () => void;
  };
  connections: {
    list: () => Promise<SavedConnection[]>;
    save: (conn: Partial<SavedConnection>) => Promise<SavedConnection>;
    update: (id: string, data: Partial<SavedConnection>) => Promise<SavedConnection>;
    delete: (id: string) => Promise<void>;
  };
  memory: {
    addEvent: (event: Partial<MemoryEvent>) => Promise<string>;
    query: (text: string) => Promise<MemoryEvent[]>;
    getTimeline: (filter?: string) => Promise<MemoryEvent[]>;
    getStats: () => Promise<{ total: number; sessions: number; errors: number; dbSize: number }>;
    clearAll: () => Promise<void>;
  };
  notes: {
    list: (scope: string) => Promise<Note[]>;
    save: (note: Partial<Note>) => Promise<string>;
    update: (id: string, data: Partial<Note>) => Promise<void>;
    delete: (id: string) => Promise<void>;
  };
  snippets: {
    list: () => Promise<Snippet[]>;
    save: (snippet: Partial<Snippet>) => Promise<string>;
    delete: (id: string) => Promise<void>;
    incrementRunCount: (id: string) => Promise<void>;
  };
  ai: {
    explain: (error: string, context: string) => Promise<{ explanation: string; suggestedCommand?: string }>;
    checkDanger: (command: string, server: string) => Promise<{ isDangerous: boolean; reason?: string }>;
    autocomplete: (context: string, history: string[]) => Promise<string | null>;
    naturalLanguage: (query: string, server: string) => Promise<{ command: string; explanation: string }>;
    chat: (message: string, history: { role: string; content: string }[]) => Promise<string>;
    getConfig: () => Promise<AIConfig>;
    setConfig: (config: Partial<AIConfig>) => Promise<void>;
    onErrorExplanation?: (cb: (data: any) => void) => () => void;
    onWatcherEvent?: (cb: (event: any) => void) => () => void;
    onAutoNote?: (cb: (note: any) => void) => () => void;
  };
  license: {
    isPro: () => Promise<boolean>;
    getInfo: () => Promise<{ plan: 'free' | 'pro'; email?: string; activatedAt?: number }>;
    activate: (key: string, email: string) => Promise<{ success: boolean; error?: string }>;
    deactivate: () => Promise<void>;
  };
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  app: {
    getVersion: () => Promise<string>;
    getPlatform: () => Promise<string>;
    relaunch: () => void;
    setZoom: (factor: number) => void;
    restart: () => void;
    getFilePath: (file: File) => string;
    checkForUpdates: (currentVersion: string) => Promise<any>;
    detachTab: (tabData: any, screenX: number, screenY: number) => Promise<any>;
    onReceiveTab?: (cb: (tabData: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    void: VoidAPI;
  }
}
