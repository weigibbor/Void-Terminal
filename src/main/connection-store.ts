import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

// Machine-derived key for encrypting passwords at rest
const MACHINE_KEY = crypto.createHash('sha256').update(`void-${os.hostname()}-${os.userInfo().username}`).digest();

function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', MACHINE_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(password, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptPassword(encrypted: string): string {
  try {
    const data = Buffer.from(encrypted, 'base64');
    const iv = data.subarray(0, 16);
    const tag = data.subarray(16, 32);
    const content = data.subarray(32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', MACHINE_KEY, iv);
    decipher.setAuthTag(tag);
    return decipher.update(content) + decipher.final('utf-8');
  } catch {
    return encrypted; // fallback for unencrypted legacy passwords
  }
}

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
  startupCommand?: string;
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
    // Decrypt passwords for use, but they're stored encrypted
    return this.connections.map(c => ({
      ...c,
      password: c.password ? decryptPassword(c.password) : undefined,
    }));
  }

  save(conn: Partial<SavedConnection>): SavedConnection {
    const existing = this.connections.find(
      (c) => c.host === conn.host && c.port === (conn.port || 22) && c.username === conn.username,
    );
    if (existing) {
      Object.assign(existing, {
        ...conn,
        password: conn.password ? encryptPassword(conn.password) : existing.password,
        id: existing.id,
        createdAt: existing.createdAt,
        lastConnected: Date.now(),
      });
      this.persist();
      return { ...existing, password: conn.password || (existing.password ? decryptPassword(existing.password) : undefined) };
    }

    const newConn: SavedConnection = {
      id: uuid(),
      alias: conn.alias || `${conn.username}@${conn.host}`,
      host: conn.host!,
      port: conn.port || 22,
      username: conn.username!,
      authMethod: conn.authMethod || 'password',
      password: conn.password ? encryptPassword(conn.password) : undefined,
      privateKeyPath: conn.privateKeyPath,
      keepAlive: conn.keepAlive ?? true,
      keepAliveInterval: conn.keepAliveInterval || 30,
      autoReconnect: conn.autoReconnect ?? true,
      group: conn.group,
      color: conn.color,
      startupCommand: conn.startupCommand,
      lastConnected: Date.now(),
      createdAt: Date.now(),
    };
    this.connections.push(newConn);
    this.persist();
    return { ...newConn, password: conn.password };
  }

  update(id: string, data: Partial<SavedConnection>): SavedConnection | null {
    const idx = this.connections.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const rawPassword = data.password;
    if (data.password) data.password = encryptPassword(data.password);
    this.connections[idx] = { ...this.connections[idx], ...data };
    this.persist();
    // Return with decrypted password (same as list() and save())
    return { ...this.connections[idx], password: rawPassword || (this.connections[idx].password ? decryptPassword(this.connections[idx].password!) : undefined) };
  }

  delete(id: string): void {
    this.connections = this.connections.filter((c) => c.id !== id);
    this.persist();
  }
}
