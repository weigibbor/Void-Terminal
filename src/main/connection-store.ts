import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuid } from 'uuid';

interface SavedConnection {
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
  createdAt: number;
}

export class ConnectionStore {
  private filePath: string;
  private connections: SavedConnection[] = [];

  constructor() {
    const dir = path.join(os.homedir(), '.void');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.filePath = path.join(dir, 'connections.json');
    this.load();
  }

  private load(): void {
    try {
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      this.connections = JSON.parse(raw);
    } catch {
      this.connections = [];
    }
  }

  private persist(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.connections, null, 2));
  }

  list(): SavedConnection[] {
    return this.connections;
  }

  save(conn: Partial<SavedConnection>): SavedConnection {
    // Check if connection already exists (same host+port+username) — update instead of duplicate
    const existing = this.connections.find(
      (c) => c.host === conn.host && c.port === (conn.port || 22) && c.username === conn.username,
    );
    if (existing) {
      Object.assign(existing, {
        ...conn,
        id: existing.id,
        createdAt: existing.createdAt,
        lastConnected: Date.now(),
      });
      this.persist();
      return existing;
    }

    const newConn: SavedConnection = {
      id: uuid(),
      alias: conn.alias || `${conn.username}@${conn.host}`,
      host: conn.host!,
      port: conn.port || 22,
      username: conn.username!,
      authMethod: conn.authMethod || 'password',
      password: conn.password,
      privateKeyPath: conn.privateKeyPath,
      keepAlive: conn.keepAlive ?? true,
      keepAliveInterval: conn.keepAliveInterval || 30,
      autoReconnect: conn.autoReconnect ?? true,
      group: conn.group,
      color: conn.color,
      lastConnected: Date.now(),
      createdAt: Date.now(),
    };
    this.connections.push(newConn);
    this.persist();
    return newConn;
  }

  update(id: string, data: Partial<SavedConnection>): SavedConnection | null {
    const idx = this.connections.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    this.connections[idx] = { ...this.connections[idx], ...data };
    this.persist();
    return this.connections[idx];
  }

  delete(id: string): void {
    this.connections = this.connections.filter((c) => c.id !== id);
    this.persist();
  }
}
