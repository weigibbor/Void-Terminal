import { Client, ConnectConfig } from 'ssh2';
import { BrowserWindow } from 'electron';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import os from 'os';
import path from 'path';

interface SSHConfig {
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

interface SSHSession {
  id: string;
  client: Client;
  stream: NodeJS.ReadWriteStream | null;
  config: SSHConfig;
  connected: boolean;
  reconnectAttempts: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
  bastionClient?: Client;
  dataBuffer: string;
}

const MAX_RECONNECT_ATTEMPTS = 10;
const MAX_BUFFER_SIZE = 500_000; // ~500KB rolling buffer

function expandTilde(filePath: string): string {
  if (filePath.startsWith('~/') || filePath === '~') {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

export class SSHManager {
  private sessions = new Map<string, SSHSession>();
  private window: BrowserWindow;
  private allWindows?: Set<BrowserWindow>;
  onStatusChange?: (status: { connection: string; activeHost?: string; sessionCount: number }) => void;
  onAIStatusChange?: (status: 'working' | 'waiting' | 'idle') => void;
  onFileEdited?: (sessionId: string, filePath: string) => void;
  private aiDetectTimer?: ReturnType<typeof setTimeout>;
  private lastAIStatus: string = 'idle';
  private waitingStickyUntil: number = 0;
  private fileEditDebounce = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  setAllWindows(windows: Set<BrowserWindow>): void {
    this.allWindows = windows;
  }

  getConnectionSummary(): 'connected' | 'disconnected' | 'reconnecting' {
    const sessions = Array.from(this.sessions.values());
    const connected = sessions.some((s) => s.connected);
    const reconnecting = sessions.some((s) => s.reconnectAttempts > 0 && !s.connected);
    return connected ? 'connected' : reconnecting ? 'reconnecting' : 'disconnected';
  }

  /// Detect file edits from Claude Code output
  /// Looks for patterns: "Wrote to /path", "Edited /path", "Created /path"
  private detectFileEdit(session: SSHSession, data: string): void {
    if (!this.onFileEdited) return;

    // Strip ANSI from recent buffer — Claude Code output has color codes everywhere
    const clean = SSHManager.stripAnsi(session.dataBuffer.slice(-3000));

    // Only match Claude Code's exact confirmed output patterns
    // These always start with ✓ or ✔ followed by the action
    const patterns = [
      /[✓✔]\s+Wrote to\s+([^\s\n\x1b]+)/,
      /[✓✔]\s+Edited\s+([^\s\n\x1b]+)/,
      /[✓✔]\s+Created\s+([^\s\n\x1b]+)/,
    ];

    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match && match[1]) {
        let filePath = match[1].trim().replace(/['"]/g, '');
        // Must be an absolute path to avoid false positives
        if (!filePath.startsWith('/')) continue;
        // Must have a file extension
        if (!filePath.includes('.')) continue;

        const key = `${session.id}:${filePath}`;
        // Debounce: don't fire for same file within 1s (Claude may output multiple times)
        if (this.fileEditDebounce.has(key)) {
          clearTimeout(this.fileEditDebounce.get(key)!);
        }
        this.fileEditDebounce.set(key, setTimeout(() => {
          this.fileEditDebounce.delete(key);
          console.log(`[AI FileEdit] Detected: ${filePath}`);
          this.onFileEdited?.(session.id, filePath);
        }, 500));
        break;
      }
    }
  }

  /// Strip all ANSI/terminal escape sequences from a string
  private static stripAnsi(str: string): string {
    return str
      .replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')  // CSI sequences
      .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')  // OSC sequences
      .replace(/\x1b[()][A-Z0-9]/g, '')  // Character set
      .replace(/\x1b[#=<>]/g, '')  // Other escapes
      .replace(/[\x00-\x08\x0e-\x1f]/g, '');  // Control chars (keep \n \r \t)
  }

  /// Detect Claude Code activity in terminal output
  private detectAIActivity(session: SSHSession): void {
    // Only check recent buffer — old content causes false positives
    const recentRaw = session.dataBuffer.slice(-3000);
    const clean = SSHManager.stripAnsi(recentRaw);
    // Very recent for spinner (last few renders)
    const veryRecent = SSHManager.stripAnsi(session.dataBuffer.slice(-500));

    // Waiting: must have Claude Code's unique prompt footer
    // "Esc to cancel" + "Tab to amend" only appear together in Claude permission prompts
    const hasPromptFooter = clean.includes('Esc to cancel') && clean.includes('Tab to amend');
    const hasDoYouWant = clean.includes('Do you want to proceed');
    const hasAllowPrompt = clean.includes('allow reading') || clean.includes('allow writing') || clean.includes('allow executing');
    const isWaiting = hasPromptFooter || (hasDoYouWant && clean.includes('Yes'));

    // Working: spinner in very recent output only
    const spinnerChars = ['✢', '✳', '✶', '✻', '✽'];
    const hasRecentSpinner = spinnerChars.some((c) => veryRecent.includes(c));
    const hasEscInterrupt = veryRecent.includes('esc to interrupt');
    const isWorking = !isWaiting && (hasEscInterrupt || hasRecentSpinner);

    let status: 'working' | 'waiting' | 'idle' = 'idle';
    if (isWaiting) {
      status = 'waiting';
      this.waitingStickyUntil = Date.now() + 30000;
    } else if (Date.now() < this.waitingStickyUntil) {
      // Sticky: keep "waiting" — only clear when sticky expires or user input triggers new working
      // "working" from old spinner chars should NOT override waiting
      if (isWorking && !hasEscInterrupt) {
        // Old spinner chars in buffer — ignore, keep waiting
        status = 'waiting';
      } else if (hasEscInterrupt) {
        // "esc to interrupt" = Claude actually started working again
        status = 'working';
        this.waitingStickyUntil = 0;
      } else {
        status = 'waiting';
      }
    } else if (isWorking) {
      status = 'working';
    }

    // Debug: always log when we transition from working to idle (prompt moment)
    if (this.lastAIStatus === 'working' && status === 'idle') {
      console.log(`[AI DUMP] last 400 clean: ${JSON.stringify(clean.slice(-400))}`);
    }

    if (status !== this.lastAIStatus) {
      console.log(`[AI Detect] ${this.lastAIStatus} -> ${status}`);
      this.lastAIStatus = status;
      if (this.aiDetectTimer) clearTimeout(this.aiDetectTimer);
      this.aiDetectTimer = setTimeout(() => {
        this.onAIStatusChange?.(status);
      }, 150);
    }
  }

  private emitStatusChange(): void {
    if (!this.onStatusChange) return;
    const sessions = Array.from(this.sessions.values());
    const connectedSessions = sessions.filter((s) => s.connected);
    const reconnecting = sessions.some((s) => s.reconnectAttempts > 0 && !s.connected);
    const connection = connectedSessions.length > 0 ? 'connected' : reconnecting ? 'reconnecting' : 'disconnected';
    const activeHost = connectedSessions[0]?.config.host;
    this.onStatusChange({ connection, activeHost, sessionCount: connectedSessions.length });
  }

  private buildConnectConfig(config: SSHConfig): ConnectConfig | null {
    const cc: ConnectConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      keepaliveInterval: config.keepAlive ? (config.keepAliveInterval || 30) * 1000 : 0,
      keepaliveCountMax: 5,
      readyTimeout: 10000,
    };
    if (config.authMethod === 'password' && config.password) {
      cc.password = config.password;
    } else if (config.authMethod === 'key' && config.privateKeyPath) {
      const keyPath = expandTilde(config.privateKeyPath);
      try {
        cc.privateKey = fs.readFileSync(keyPath);
      } catch {
        return null;
      }
    }
    if (config.agentForward && process.env.SSH_AUTH_SOCK) {
      cc.agent = process.env.SSH_AUTH_SOCK;
      cc.agentForward = true;
    }
    return cc;
  }

  private send(channel: string, ...args: unknown[]): void {
    // Broadcast to all windows so detached tabs receive data
    const targets = this.allWindows || new Set([this.window]);
    for (const win of targets) {
      try {
        if (!win.isDestroyed()) {
          win.webContents.send(channel, ...args);
        }
      } catch { /* destroyed */ }
    }
  }

  async connect(
    config: SSHConfig,
  ): Promise<{ success: boolean; sessionId?: string; error?: string }> {
    const sessionId = uuid();

    return new Promise((resolve) => {
      const client = new Client();

      const session: SSHSession = {
        id: sessionId,
        client,
        stream: null,
        config,
        connected: false,
        reconnectAttempts: 0,
        dataBuffer: '',
      };

      // TCP_NODELAY — disable Nagle's algorithm for lowest latency
      client.on('tcp connection', (details, accept) => {
        const stream = accept();
        if (stream?.socket) stream.socket.setNoDelay(true);
      });

      client.on('ready', () => {
        // Set TCP_NODELAY on the underlying socket
        const sock = (client as any)._sock || (client as any)._sshstream?._sock;
        if (sock?.setNoDelay) sock.setNoDelay(true);

        client.shell({ term: 'xterm-256color' }, (err, stream) => {
          if (err) {
            console.error(`[SSH] Shell error for ${config.host}:`, err.message);
            resolve({ success: false, error: err.message });
            return;
          }

          session.stream = stream;
          session.connected = true;
          session.reconnectAttempts = 0;
          this.sessions.set(sessionId, session);

          stream.on('data', (data: Buffer) => {
            const str = data.toString();
            session.dataBuffer += str;
            if (session.dataBuffer.length > MAX_BUFFER_SIZE) {
              session.dataBuffer = session.dataBuffer.slice(-MAX_BUFFER_SIZE / 2);
            }
            this.send(`ssh:data:${sessionId}`, str);
            this.detectAIActivity(session);
            this.detectFileEdit(session, str);
          });

          stream.stderr.on('data', (data: Buffer) => {
            const str = data.toString();
            session.dataBuffer += str;
            this.send(`ssh:data:${sessionId}`, str);
          });

          stream.on('close', () => {
            console.log(`[SSH] Stream closed for ${config.host}`);
            session.connected = false;
            this.send(`ssh:close:${sessionId}`);
            this.emitStatusChange();
            if (config.autoReconnect) {
              this.scheduleReconnect(session);
            }
          });

          console.log(`[SSH] Connected to ${config.username}@${config.host}:${config.port}`);
          this.emitStatusChange();
          resolve({ success: true, sessionId });
        });
      });

      client.on('error', (err) => {
        console.error(`[SSH] Connection error for ${config.host}:`, err.message);
        if (!session.connected && session.reconnectAttempts === 0) {
          resolve({ success: false, error: err.message });
        } else {
          this.send(`ssh:error:${sessionId}`, err.message);
          if (config.autoReconnect && session.connected) {
            session.connected = false;
            this.scheduleReconnect(session);
          }
        }
      });

      client.on('close', () => {
        console.log(`[SSH] Client closed for ${config.host}`);
      });

      const connectConfig = this.buildConnectConfig(config);
      if (!connectConfig) {
        resolve({ success: false, error: `Cannot read key file: ${config.privateKeyPath}` });
        return;
      }

      // Jump host / bastion support
      if (config.jumpHost) {
        const bastionConfig = this.buildConnectConfig({
          ...config.jumpHost,
          keepAlive: true,
          keepAliveInterval: 30,
          autoReconnect: false,
        } as SSHConfig);
        if (!bastionConfig) {
          resolve({ success: false, error: `Cannot read bastion key file` });
          return;
        }
        const bastion = new Client();
        bastion.on('ready', () => {
          console.log(`[SSH] Bastion connected: ${config.jumpHost!.username}@${config.jumpHost!.host}`);
          session.bastionClient = bastion;
          bastion.forwardOut('127.0.0.1', 0, config.host, config.port || 22, (err, stream) => {
            if (err) {
              resolve({ success: false, error: `Bastion forward failed: ${err.message}` });
              bastion.end();
              return;
            }
            connectConfig.sock = stream;
            console.log(`[SSH] Connecting to ${config.username}@${config.host} via bastion`);
            client.connect(connectConfig);
          });
        });
        bastion.on('error', (err) => {
          resolve({ success: false, error: `Bastion error: ${err.message}` });
        });
        try {
          bastion.connect(bastionConfig);
        } catch (e) {
          resolve({ success: false, error: `Bastion connect failed: ${(e as Error).message}` });
        }
      } else {
        try {
          console.log(
            `[SSH] Connecting to ${config.username}@${config.host}:${config.port || 22} (auth: ${config.authMethod})`,
          );
          client.connect(connectConfig);
        } catch (e) {
          console.error(`[SSH] connect() threw:`, (e as Error).message);
          resolve({ success: false, error: (e as Error).message });
        }
      }
    });
  }

  private async scheduleReconnect(session: SSHSession): Promise<void> {
    if (session.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.send(`ssh:data:${session.id}`, '\r\n\x1b[33m[Void] Reconnect failed after maximum attempts. Press Enter to retry.\x1b[0m\r\n');
      this.send(`ssh:reconnect-failed:${session.id}`);
      return;
    }

    session.reconnectAttempts++;
    const delay = Math.min(Math.pow(2, session.reconnectAttempts - 1) * 1000, 30000);

    // Check internet first
    this.send(`ssh:data:${session.id}`, `\r\n\x1b[33m[Void] Checking connection...\x1b[0m\r\n`);
    this.send(`ssh:status:${session.id}`, 'checking');

    try {
      await new Promise<void>((resolve, reject) => {
        const net = require('net');
        const socket = net.createConnection({ host: session.config.host, port: session.config.port || 22, timeout: 5000 });
        socket.on('connect', () => { socket.destroy(); resolve(); });
        socket.on('error', () => { socket.destroy(); reject(); });
        socket.on('timeout', () => { socket.destroy(); reject(); });
      });
    } catch {
      this.send(`ssh:data:${session.id}`, `\x1b[31m[Void] No internet or server unreachable. Retrying in ${Math.round(delay / 1000)}s...\x1b[0m\r\n`);
      this.send(`ssh:status:${session.id}`, 'no-internet');
      session.reconnectTimer = setTimeout(() => { this.scheduleReconnect(session); }, delay);
      return;
    }

    this.send(`ssh:data:${session.id}`, `\x1b[33m[Void] Reconnecting... (attempt ${session.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})\x1b[0m\r\n`);
    this.send(`ssh:status:${session.id}`, 'reconnecting');

    session.reconnectTimer = setTimeout(() => {
      this.attemptReconnect(session);
    }, 1000); // Short delay since we already verified connectivity
  }

  private attemptReconnect(session: SSHSession): void {
    const client = new Client();

    client.on('ready', () => {
      client.shell({ term: 'xterm-256color' }, (err, stream) => {
        if (err) {
          this.scheduleReconnect(session);
          return;
        }

        session.client.destroy();
        session.client = client;
        session.stream = stream;
        session.connected = true;
        session.reconnectAttempts = 0;

        stream.on('data', (data: Buffer) => {
          const str = data.toString();
          session.dataBuffer += str;
          if (session.dataBuffer.length > MAX_BUFFER_SIZE) {
            session.dataBuffer = session.dataBuffer.slice(-MAX_BUFFER_SIZE / 2);
          }
          this.send(`ssh:data:${session.id}`, str);
        });

        stream.stderr.on('data', (data: Buffer) => {
          const str = data.toString();
          session.dataBuffer += str;
          this.send(`ssh:data:${session.id}`, str);
        });

        stream.on('close', () => {
          session.connected = false;
          this.send(`ssh:close:${session.id}`);
          if (session.config.autoReconnect) {
            this.scheduleReconnect(session);
          }
        });

        this.send(`ssh:data:${session.id}`, '\r\n\x1b[32m[Void] Reconnected successfully.\x1b[0m\r\n');
        // Notify renderer — this is critical so the tab state updates
        this.send(`ssh:reconnected:${session.id}`);
        this.send(`ssh:status:${session.id}`, 'connected');
        this.emitStatusChange();
      });
    });

    client.on('error', () => {
      this.scheduleReconnect(session);
    });

    const connectConfig = this.buildConnectConfig(session.config);
    if (!connectConfig) {
      this.scheduleReconnect(session);
      return;
    }

    try {
      client.connect(connectConfig);
    } catch {
      this.scheduleReconnect(session);
    }
  }


  getClient(sessionId: string): any {
    return this.sessions.get(sessionId)?.client || null;
  }

  async exec(sessionId: string, command: string): Promise<{ stdout: string; stderr: string; code: number }> {
    const session = this.sessions.get(sessionId);
    if (!session?.connected) return { stdout: '', stderr: '', code: -1 };

    return new Promise((resolve) => {
      session.client.exec(command, (err, stream) => {
        if (err) {
          resolve({ stdout: '', stderr: err.message, code: -1 });
          return;
        }
        let stdout = '';
        let stderr = '';
        stream.on('data', (data: Buffer) => { stdout += data.toString(); });
        stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
        stream.on('close', (code: number) => {
          resolve({ stdout, stderr, code: code || 0 });
        });
      });
    });
  }

  getBuffer(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';
    const buffered = session.dataBuffer;
    session.dataBuffer = '';
    return buffered;
  }

  // Write coalescing — batch rapid keystrokes within 3ms into a single write
  private writeBuffers = new Map<string, { data: string; timer: ReturnType<typeof setTimeout> }>();

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session?.stream) return;

    // For single characters (normal typing), coalesce
    if (data.length === 1) {
      const existing = this.writeBuffers.get(sessionId);
      if (existing) {
        existing.data += data;
        return; // Timer already set, will flush soon
      }
      this.writeBuffers.set(sessionId, {
        data,
        timer: setTimeout(() => {
          const buf = this.writeBuffers.get(sessionId);
          if (buf && session.stream) {
            (session.stream as NodeJS.WritableStream).write(buf.data);
          }
          this.writeBuffers.delete(sessionId);
        }, 3),
      });
    } else {
      // Multi-char data (paste, control sequences) — flush any pending buffer + send immediately
      const pending = this.writeBuffers.get(sessionId);
      if (pending) {
        clearTimeout(pending.timer);
        (session.stream as NodeJS.WritableStream).write(pending.data + data);
        this.writeBuffers.delete(sessionId);
      } else {
        (session.stream as NodeJS.WritableStream).write(data);
      }
    }
  }

  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (session?.stream && 'setWindow' in session.stream) {
      (session.stream as any).setWindow(rows, cols, 0, 0);
    }
  }

  async disconnect(sessionId: string): Promise<{ success: boolean }> {
    const session = this.sessions.get(sessionId);
    if (session) {
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      // Clean up write buffer for this session
      const wb = this.writeBuffers.get(sessionId);
      if (wb) { clearTimeout(wb.timer); this.writeBuffers.delete(sessionId); }
      // Clean up file edit debounce timers for this session
      for (const [key, timer] of this.fileEditDebounce) {
        if (key.startsWith(sessionId + ':')) {
          clearTimeout(timer);
          this.fileEditDebounce.delete(key);
        }
      }
      session.client.end();
      session.bastionClient?.end();
      this.sessions.delete(sessionId);
      return { success: true };
    }
    return { success: false };
  }

  destroyAll(): void {
    // Clean up all timers
    if (this.aiDetectTimer) clearTimeout(this.aiDetectTimer);
    for (const timer of this.fileEditDebounce.values()) clearTimeout(timer);
    this.fileEditDebounce.clear();
    for (const wb of this.writeBuffers.values()) clearTimeout(wb.timer);
    this.writeBuffers.clear();
    for (const session of this.sessions.values()) {
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      session.client.destroy();
      session.bastionClient?.destroy();
    }
    this.sessions.clear();
  }
}
