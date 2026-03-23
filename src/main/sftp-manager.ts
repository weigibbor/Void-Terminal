import { Client, SFTPWrapper } from 'ssh2';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: number;
  permissions: string;
}

export class SFTPManager {
  private sftpSessions = new Map<string, SFTPWrapper>();

  async openSFTP(client: Client, sessionId: string): Promise<boolean> {
    return new Promise((resolve) => {
      client.sftp((err, sftp) => {
        if (err) {
          resolve(false);
          return;
        }
        this.sftpSessions.set(sessionId, sftp);
        resolve(true);
      });
    });
  }

  async listDirectory(sessionId: string, dirPath: string): Promise<FileEntry[]> {
    const sftp = this.sftpSessions.get(sessionId);
    if (!sftp) return [];

    return new Promise((resolve) => {
      sftp.readdir(dirPath, (err, list) => {
        if (err) {
          resolve([]);
          return;
        }
        const entries: FileEntry[] = list.map((item) => ({
          name: item.filename,
          path: `${dirPath}/${item.filename}`.replace(/\/+/g, '/'),
          isDirectory: (item.attrs.mode! & 0o40000) !== 0,
          size: item.attrs.size!,
          modifiedAt: item.attrs.mtime! * 1000,
          permissions: (item.attrs.mode! & 0o777).toString(8),
        }));
        entries.sort((a, b) => {
          if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        resolve(entries);
      });
    });
  }

  async readFile(sessionId: string, filePath: string): Promise<string> {
    const sftp = this.sftpSessions.get(sessionId);
    if (!sftp) return '';

    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      const stream = sftp.createReadStream(filePath);
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      stream.on('error', () => resolve(''));
    });
  }

  async writeFile(sessionId: string, filePath: string, content: string): Promise<boolean> {
    const sftp = this.sftpSessions.get(sessionId);
    if (!sftp) return false;

    return new Promise((resolve) => {
      const stream = sftp.createWriteStream(filePath);
      stream.on('finish', () => resolve(true));
      stream.on('error', () => resolve(false));
      stream.end(Buffer.from(content, 'utf-8'));
    });
  }

  async mkdir(sessionId: string, dirPath: string): Promise<boolean> {
    const sftp = this.sftpSessions.get(sessionId);
    if (!sftp) return false;

    return new Promise((resolve) => {
      sftp.mkdir(dirPath, (err) => resolve(!err));
    });
  }

  async unlink(sessionId: string, filePath: string): Promise<boolean> {
    const sftp = this.sftpSessions.get(sessionId);
    if (!sftp) return false;

    return new Promise((resolve) => {
      sftp.unlink(filePath, (err) => resolve(!err));
    });
  }

  async rename(sessionId: string, oldPath: string, newPath: string): Promise<boolean> {
    const sftp = this.sftpSessions.get(sessionId);
    if (!sftp) return false;

    return new Promise((resolve) => {
      sftp.rename(oldPath, newPath, (err) => resolve(!err));
    });
  }

  closeSFTP(sessionId: string): void {
    const sftp = this.sftpSessions.get(sessionId);
    if (sftp) {
      sftp.end();
      this.sftpSessions.delete(sessionId);
    }
  }

  closeAll(): void {
    for (const sftp of this.sftpSessions.values()) {
      sftp.end();
    }
    this.sftpSessions.clear();
  }
}
