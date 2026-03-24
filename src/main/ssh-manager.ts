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
}

interface SSHSession {
  id: string;
  client: Client;
  stream: NodeJS.ReadWriteStream | null;
  config: SSHConfig;
  connected: boolean;
  reconnectAttempts: number;
  reconnectTimer?: ReturnType<typeof setTimeout>;
  latencyTimer?: ReturnType<typeof setInterval>;
  latency: number | null;
  dataBuffer: string[];
}

const MAX_RECONNECT_ATTEMPTS = 10;

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
  private outputCallback?: (sessionId: string, data: string, server: string) => void;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  setAllWindows(windows: Set<BrowserWindow>): void {
    this.allWindows = windows;
  }

  onOutput(cb: (sessionId: string, data: string, server: string) => void): void {
    this.outputCallback = cb;
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
        latency: null,
        dataBuffer: [],
      };

      client.on('ready', () => {
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
            session.dataBuffer.push(str);
            if (session.dataBuffer.length > 5000) session.dataBuffer = session.dataBuffer.slice(-2500);
            this.send(`ssh:data:${sessionId}`, str);
            this.outputCallback?.(sessionId, str, config.host);
          });

          stream.stderr.on('data', (data: Buffer) => {
            const str = data.toString();
            session.dataBuffer.push(str);
            this.send(`ssh:data:${sessionId}`, str);
          });

          stream.on('close', () => {
            console.log(`[SSH] Stream closed for ${config.host}`);
            session.connected = false;
            this.stopLatencyProbe(session);
            this.send(`ssh:close:${sessionId}`);
            if (config.autoReconnect) {
              this.scheduleReconnect(session);
            }
          });

          this.startLatencyProbe(session);
          console.log(`[SSH] Connected to ${config.username}@${config.host}:${config.port}`);
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

      const connectConfig: ConnectConfig = {
        host: config.host,
        port: config.port || 22,
        username: config.username,
        keepaliveInterval: config.keepAlive ? (config.keepAliveInterval || 30) * 1000 : 0,
        keepaliveCountMax: 5,
        readyTimeout: 10000,
      };

      if (config.authMethod === 'password' && config.password) {
        connectConfig.password = config.password;
      } else if (config.authMethod === 'key' && config.privateKeyPath) {
        const keyPath = expandTilde(config.privateKeyPath);
        try {
          connectConfig.privateKey = fs.readFileSync(keyPath);
          console.log(`[SSH] Loaded key from ${keyPath}`);
        } catch (e) {
          console.error(`[SSH] Cannot read key file: ${keyPath}`, (e as Error).message);
          resolve({ success: false, error: `Cannot read key file: ${keyPath}` });
          return;
        }
      }

      try {
        console.log(
          `[SSH] Connecting to ${config.username}@${config.host}:${config.port || 22} (auth: ${config.authMethod})`,
        );
        client.connect(connectConfig);
      } catch (e) {
        console.error(`[SSH] connect() threw:`, (e as Error).message);
        resolve({ success: false, error: (e as Error).message });
      }
    });
  }

  private scheduleReconnect(session: SSHSession): void {
    if (session.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      this.send(
        `ssh:data:${session.id}`,
        '\r\n\x1b[33m[Void] Reconnect failed after maximum attempts. Press Enter to retry.\x1b[0m\r\n',
      );
      return;
    }

    session.reconnectAttempts++;
    const delay = Math.min(Math.pow(2, session.reconnectAttempts - 1) * 1000, 30000);

    this.send(
      `ssh:data:${session.id}`,
      `\r\n\x1b[33m[Void] Reconnecting... (attempt ${session.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})\x1b[0m\r\n`,
    );

    session.reconnectTimer = setTimeout(() => {
      this.attemptReconnect(session);
    }, delay);
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
          this.send(`ssh:data:${session.id}`, data.toString());
        });

        stream.stderr.on('data', (data: Buffer) => {
          this.send(`ssh:data:${session.id}`, data.toString());
        });

        stream.on('close', () => {
          session.connected = false;
          this.send(`ssh:close:${session.id}`);
          if (session.config.autoReconnect) {
            this.scheduleReconnect(session);
          }
        });

        this.startLatencyProbe(session);
        this.send(
          `ssh:data:${session.id}`,
          '\r\n\x1b[32m[Void] Reconnected.\x1b[0m\r\n',
        );
      });
    });

    client.on('error', () => {
      this.scheduleReconnect(session);
    });

    const connectConfig: ConnectConfig = {
      host: session.config.host,
      port: session.config.port || 22,
      username: session.config.username,
      keepaliveInterval: session.config.keepAlive
        ? (session.config.keepAliveInterval || 30) * 1000
        : 0,
      keepaliveCountMax: 5,
      readyTimeout: 10000,
    };

    if (session.config.authMethod === 'password' && session.config.password) {
      connectConfig.password = session.config.password;
    } else if (session.config.authMethod === 'key' && session.config.privateKeyPath) {
      const keyPath = expandTilde(session.config.privateKeyPath);
      try {
        connectConfig.privateKey = fs.readFileSync(keyPath);
      } catch {
        this.scheduleReconnect(session);
        return;
      }
    }

    try {
      client.connect(connectConfig);
    } catch {
      this.scheduleReconnect(session);
    }
  }

  private startLatencyProbe(session: SSHSession): void {
    if (session.latencyTimer) clearInterval(session.latencyTimer);
    const probe = () => {
      if (!session.connected) return;
      const start = Date.now();
      session.client.exec('echo', (err) => {
        if (!err) {
          session.latency = Date.now() - start;
          this.send(`ssh:latency:${session.id}`, session.latency);
        }
      });
    };
    // Initial probe after 1s, then every 15s
    setTimeout(probe, 1000);
    session.latencyTimer = setInterval(probe, 15000);
  }

  private stopLatencyProbe(session: SSHSession): void {
    if (session.latencyTimer) {
      clearInterval(session.latencyTimer);
      session.latencyTimer = undefined;
    }
  }

  getLatency(sessionId: string): number | null {
    return this.sessions.get(sessionId)?.latency ?? null;
  }

  getClient(sessionId: string): any {
    return this.sessions.get(sessionId)?.client || null;
  }

  getBuffer(sessionId: string): string {
    const session = this.sessions.get(sessionId);
    if (!session) return '';
    const buffered = session.dataBuffer.join('');
    session.dataBuffer = [];
    return buffered;
  }

  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.stream) {
      (session.stream as NodeJS.WritableStream).write(data);
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
      this.stopLatencyProbe(session);
      session.client.end();
      this.sessions.delete(sessionId);
      return { success: true };
    }
    return { success: false };
  }

  destroyAll(): void {
    for (const session of this.sessions.values()) {
      if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
      this.stopLatencyProbe(session);
      session.client.destroy();
    }
    this.sessions.clear();
  }
}
