import { spawn, ChildProcess } from 'child_process';
import net from 'net';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { app, BrowserWindow } from 'electron';

interface NotchEvent {
  type: string;
  payload?: Record<string, string>;
}

interface StatusUpdate {
  type: 'status_update';
  connection: 'connected' | 'disconnected' | 'reconnecting';
  ai: 'working' | 'waiting' | 'idle';
  activeHost?: string;
  sessionCount?: number;
}

export class NotchHelper {
  private process: ChildProcess | null = null;
  private socket: net.Socket | null = null;
  private socketPath: string;
  private helperPath: string;
  private connected = false;
  private shuttingDown = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectTimer: ReturnType<typeof setTimeout> | null = null;
  private socketRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private buffer = '';

  private onToggleWindow: (() => void) | null = null;

  constructor(private mainWindow: BrowserWindow) {
    const appSupport = path.join(
      app.getPath('appData'),
      'Void Terminal',
    );
    this.socketPath = path.join(appSupport, 'void-notch.sock');

    // Resolve helper binary path
    if (process.env.VITE_DEV_SERVER_URL) {
      this.helperPath = path.join(app.getAppPath(), 'void-notch', '.build', 'release', 'VoidNotch');
    } else {
      this.helperPath = path.join(process.resourcesPath, 'notch', 'VoidNotch');
    }
  }

  setToggleHandler(handler: () => void) {
    this.onToggleWindow = handler;
  }

  start(): void {
    if (process.platform !== 'darwin') return;

    // Ensure app support directory exists
    const dir = path.dirname(this.socketPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Clean stale socket
    try { fs.unlinkSync(this.socketPath); } catch {}

    this.spawnHelper();
  }

  sendStatus(status: Partial<Omit<StatusUpdate, 'type'>>): void {
    this.send({
      type: 'status_update',
      connection: status.connection ?? 'disconnected',
      ai: status.ai ?? 'idle',
      activeHost: status.activeHost,
      sessionCount: status.sessionCount,
    });
  }

  sendConfig(config: { hotkey?: string; theme?: string }): void {
    this.send({ type: 'config_update', ...config });
  }

  shutdown(): void {
    this.shuttingDown = true;
    this.send({ type: 'shutdown' });

    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.connectTimer) { clearTimeout(this.connectTimer); this.connectTimer = null; }
    if (this.socketRetryTimer) { clearTimeout(this.socketRetryTimer); this.socketRetryTimer = null; }

    this.socket?.destroy();
    this.socket = null;

    if (this.process) {
      this.process.kill();
      this.process = null;
    }

    try { fs.unlinkSync(this.socketPath); } catch {}
  }

  // MARK: - Private

  private spawnHelper(): void {
    if (!fs.existsSync(this.helperPath)) {
      console.log('[NotchHelper] Binary not found:', this.helperPath);
      return;
    }

    console.log('[NotchHelper] Spawning:', this.helperPath);

    this.process = spawn(this.helperPath, [], {
      env: {
        ...process.env,
        VOID_NOTCH_SOCKET: this.socketPath,
      },
      stdio: 'ignore',
      detached: false,
    });

    this.process.on('exit', (code) => {
      console.log('[NotchHelper] Exited with code:', code);
      this.connected = false;
      this.socket = null;

      // Respawn after 2s unless shutting down
      if (!this.shuttingDown) {
        this.reconnectTimer = setTimeout(() => this.spawnHelper(), 2000);
      }
    });

    // Wait briefly for socket to be ready, then connect
    this.connectTimer = setTimeout(() => this.connectSocket(), 500);
  }

  private connectSocket(): void {
    if (this.socket) {
      this.socket.destroy();
    }

    this.socket = net.createConnection({ path: this.socketPath });

    this.socket.on('connect', () => {
      console.log('[NotchHelper] Socket connected');
      this.connected = true;
      this.buffer = '';
    });

    this.socket.on('data', (data: Buffer) => {
      this.buffer += data.toString();

      let newlineIdx: number;
      while ((newlineIdx = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, newlineIdx);
        this.buffer = this.buffer.slice(newlineIdx + 1);

        if (line.length === 0) continue;

        try {
          const event: NotchEvent = JSON.parse(line);
          this.handleEvent(event);
        } catch (err) {
          console.log('[NotchHelper] Parse error:', err);
        }
      }
    });

    this.socket.on('error', (err) => {
      console.log('[NotchHelper] Socket error:', err.message);
      // Will retry via connectSocket after a delay
      this.socketRetryTimer = setTimeout(() => {
        if (!this.connected && this.process) {
          this.connectSocket();
        }
      }, 1000);
    });

    this.socket.on('close', () => {
      this.connected = false;
    });
  }

  private handleEvent(event: NotchEvent): void {
    switch (event.type) {
      case 'ready':
        console.log('[NotchHelper] VoidNotch ready');
        break;

      case 'hotkey_triggered':
      case 'notch_click':
        this.onToggleWindow?.();
        break;

      case 'notch_hover':
        // Show window on hover
        if (this.mainWindow && !this.mainWindow.isVisible()) {
          this.mainWindow.show();
        }
        break;

      case 'pong':
        // Heartbeat response
        break;
    }
  }

  private send(msg: Record<string, unknown>): void {
    if (!this.connected || !this.socket) return;
    try {
      this.socket.write(JSON.stringify(msg) + '\n');
    } catch {}
  }
}
