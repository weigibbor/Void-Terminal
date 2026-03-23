import crypto from 'crypto';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export function generateSSHKeyPair(
  type: 'ed25519' | 'rsa' = 'ed25519',
  comment?: string,
): { publicKey: string; privateKeyPath: string } {
  const sshDir = path.join(os.homedir(), '.ssh');
  if (!fs.existsSync(sshDir)) {
    fs.mkdirSync(sshDir, { mode: 0o700 });
  }

  const keyName = `void_${type}_${Date.now()}`;
  const keyPath = path.join(sshDir, keyName);
  const commentArg = comment || 'void-terminal';

  const algorithm = type === 'ed25519' ? '-t ed25519' : '-t rsa -b 4096';
  execSync(`ssh-keygen ${algorithm} -f "${keyPath}" -N "" -C "${commentArg}"`, {
    stdio: 'ignore',
  });

  const publicKey = fs.readFileSync(`${keyPath}.pub`, 'utf-8').trim();
  return { publicKey, privateKeyPath: keyPath };
}

export function getKeyFingerprint(keyPath: string): string {
  try {
    const result = execSync(`ssh-keygen -lf "${keyPath}"`, { encoding: 'utf-8' });
    return result.trim();
  } catch {
    return 'Unable to read fingerprint';
  }
}

export function listSSHKeys(): { name: string; path: string; type: string; fingerprint: string }[] {
  const sshDir = path.join(os.homedir(), '.ssh');
  if (!fs.existsSync(sshDir)) return [];

  const files = fs.readdirSync(sshDir);
  const keys: { name: string; path: string; type: string; fingerprint: string }[] = [];

  for (const file of files) {
    if (file.endsWith('.pub') || file === 'known_hosts' || file === 'config' || file === 'authorized_keys') {
      continue;
    }

    const fullPath = path.join(sshDir, file);
    const pubPath = `${fullPath}.pub`;

    if (fs.existsSync(pubPath)) {
      const pubContent = fs.readFileSync(pubPath, 'utf-8');
      let type = 'unknown';
      if (pubContent.startsWith('ssh-ed25519')) type = 'ed25519';
      else if (pubContent.startsWith('ssh-rsa')) type = 'rsa';
      else if (pubContent.startsWith('ecdsa')) type = 'ecdsa';

      keys.push({
        name: file,
        path: fullPath,
        type,
        fingerprint: getKeyFingerprint(fullPath),
      });
    }
  }

  return keys;
}

export function encryptString(text: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(key, 'void-terminal', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', derivedKey, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptString(encrypted: string, key: string): string {
  const data = Buffer.from(encrypted, 'base64');
  const iv = data.subarray(0, 16);
  const tag = data.subarray(16, 32);
  const content = data.subarray(32);
  const derivedKey = crypto.scryptSync(key, 'void-terminal', 32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', derivedKey, iv);
  decipher.setAuthTag(tag);
  return decipher.update(content) + decipher.final('utf-8');
}
