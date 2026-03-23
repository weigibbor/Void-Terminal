import * as pty from 'node-pty';
import { BrowserWindow } from 'electron';
import { v4 as uuid } from 'uuid';
import { getDefaultShell } from './utils/platform';
import os from 'os';

export class PTYManager {
  private sessions = new Map<string, pty.IPty>();
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  private send(channel: string, ...args: unknown[]): void {
    try {
      if (!this.window.isDestroyed()) {
        this.window.webContents.send(channel, ...args);
      }
    } catch {
      // Window already destroyed
    }
  }

  create(options?: { shell?: string; cwd?: string }): {
    success: boolean;
    sessionId?: string;
    error?: string;
  } {
    try {
      const sessionId = uuid();
      const shell = options?.shell || getDefaultShell();
      const cwd = options?.cwd || os.homedir();

      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as Record<string, string>,
      });

      ptyProcess.onData((data) => {
        this.send(`pty:data:${sessionId}`, data);
      });

      ptyProcess.onExit(({ exitCode }) => {
        this.send(`pty:exit:${sessionId}`, exitCode);
        this.sessions.delete(sessionId);
      });

      this.sessions.set(sessionId, ptyProcess);
      return { success: true, sessionId };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  }

  write(sessionId: string, data: string): void {
    this.sessions.get(sessionId)?.write(data);
  }

  resize(sessionId: string, cols: number, rows: number): void {
    try {
      this.sessions.get(sessionId)?.resize(cols, rows);
    } catch {
      // Ignore resize errors on destroyed PTY
    }
  }

  destroy(sessionId: string): { success: boolean } {
    const proc = this.sessions.get(sessionId);
    if (proc) {
      proc.kill();
      this.sessions.delete(sessionId);
      return { success: true };
    }
    return { success: false };
  }

  destroyAll(): void {
    for (const proc of this.sessions.values()) {
      proc.kill();
    }
    this.sessions.clear();
  }
}
