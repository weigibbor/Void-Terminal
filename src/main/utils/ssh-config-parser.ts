import fs from 'fs';
import os from 'os';
import path from 'path';

export interface SSHConfigEntry {
  host: string;
  hostName?: string;
  user?: string;
  port?: number;
  identityFile?: string;
}

export function parseSSHConfig(): SSHConfigEntry[] {
  const configPath = path.join(os.homedir(), '.ssh', 'config');
  let content: string;
  try {
    content = fs.readFileSync(configPath, 'utf-8');
  } catch {
    return [];
  }

  const entries: SSHConfigEntry[] = [];
  let current: SSHConfigEntry | null = null;

  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^(\S+)\s+(.+)$/);
    if (!match) continue;

    const [, key, value] = match;
    const k = key.toLowerCase();

    if (k === 'host') {
      // Skip wildcard hosts
      if (value.includes('*') || value.includes('?')) {
        current = null;
        continue;
      }
      current = { host: value };
      entries.push(current);
    } else if (current) {
      if (k === 'hostname') current.hostName = value;
      else if (k === 'user') current.user = value;
      else if (k === 'port') current.port = parseInt(value) || 22;
      else if (k === 'identityfile') {
        current.identityFile = value.startsWith('~/')
          ? path.join(os.homedir(), value.slice(2))
          : value;
      }
    }
  }

  return entries;
}
