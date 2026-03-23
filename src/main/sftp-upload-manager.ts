import { BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';

export interface UploadJob {
  id: string;
  sessionId: string;
  localPath: string;
  remotePath: string;
  fileName: string;
  totalBytes: number;
  uploadedBytes: number;
  status: 'queued' | 'uploading' | 'paused' | 'completed' | 'failed';
  error?: string;
  speed: number;
  startedAt?: number;
}

export class SFTPUploadManager {
  private queue: UploadJob[] = [];
  private activeStream: any = null;
  private activeSftp: any = null;
  private window: BrowserWindow;
  private paused = false;
  private speedTracker = { lastBytes: 0, lastTime: 0 };

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  private send(channel: string, ...args: unknown[]): void {
    try {
      if (!this.window.isDestroyed()) {
        this.window.webContents.send(channel, ...args);
      }
    } catch { /* destroyed */ }
  }

  getQueue(): UploadJob[] {
    return this.queue;
  }

  addToQueue(sessionId: string, localPath: string, remotePath: string): UploadJob {
    const stat = fs.statSync(localPath);
    const job: UploadJob = {
      id: uuid(),
      sessionId,
      localPath,
      remotePath,
      fileName: path.basename(localPath),
      totalBytes: stat.size,
      uploadedBytes: 0,
      status: 'queued',
      speed: 0,
    };
    this.queue.push(job);
    this.sendProgress();

    // Start processing if nothing active
    if (!this.queue.find((j) => j.status === 'uploading')) {
      this.processNext();
    }

    return job;
  }

  pause(): void {
    this.paused = true;
    const active = this.queue.find((j) => j.status === 'uploading');
    if (active) {
      active.status = 'paused';
      if (this.activeStream) {
        this.activeStream.destroy();
        this.activeStream = null;
      }
      if (this.activeSftp) {
        this.activeSftp.end();
        this.activeSftp = null;
      }
    }
    this.sendProgress();
  }

  resume(): void {
    this.paused = false;
    const paused = this.queue.find((j) => j.status === 'paused');
    if (paused) {
      paused.status = 'queued';
    }
    this.processNext();
    this.sendProgress();
  }

  cancel(jobId: string): void {
    const job = this.queue.find((j) => j.id === jobId);
    if (!job) return;

    if (job.status === 'uploading') {
      if (this.activeStream) {
        this.activeStream.destroy();
        this.activeStream = null;
      }
      if (this.activeSftp) {
        this.activeSftp.end();
        this.activeSftp = null;
      }
    }

    this.queue = this.queue.filter((j) => j.id !== jobId);
    this.sendProgress();
    this.processNext();
  }

  pauseAll(): void {
    this.pause();
    this.queue.forEach((j) => {
      if (j.status === 'queued') j.status = 'paused';
    });
    this.sendProgress();
  }

  // Called when SSH disconnects — pause everything, save offsets
  onDisconnect(sessionId: string): void {
    this.queue.forEach((j) => {
      if (j.sessionId === sessionId && (j.status === 'uploading' || j.status === 'queued')) {
        j.status = 'paused';
      }
    });
    if (this.activeStream) {
      this.activeStream.destroy();
      this.activeStream = null;
    }
    if (this.activeSftp) {
      this.activeSftp.end();
      this.activeSftp = null;
    }
    this.paused = true;
    this.sendProgress();
  }

  // Called when SSH reconnects — resume paused uploads
  onReconnect(sessionId: string, newSessionId: string): void {
    this.queue.forEach((j) => {
      if (j.sessionId === sessionId && j.status === 'paused') {
        j.sessionId = newSessionId;
        j.status = 'queued';
      }
    });
    this.paused = false;
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.paused) return;
    if (this.queue.find((j) => j.status === 'uploading')) return;

    const next = this.queue.find((j) => j.status === 'queued');
    if (!next) return;

    next.status = 'uploading';
    next.startedAt = Date.now();
    this.speedTracker = { lastBytes: next.uploadedBytes, lastTime: Date.now() };
    this.sendProgress();

    try {
      const sshManager = (global as any).__sshManager;
      if (!sshManager) {
        console.error('[SFTP Upload] SSH manager not available on global');
        next.status = 'failed';
        next.error = 'SSH manager not available';
        this.sendProgress();
        return;
      }

      const client = sshManager.getClient(next.sessionId);
      if (!client) {
        console.error('[SFTP Upload] No SSH client for session:', next.sessionId);
        next.status = 'failed';
        next.error = 'SSH session not found';
        this.sendProgress();
        this.processNext();
        return;
      }

      console.log('[SFTP Upload] Got SSH client, starting upload...');
      await this.uploadFile(client, next);
    } catch (err: any) {
      console.error('[SFTP Upload] processNext error:', err.message);
      next.status = 'failed';
      next.error = err.message;
      this.sendProgress();
      this.processNext();
    }
  }

  private uploadFile(client: any, job: UploadJob): Promise<void> {
    return new Promise((resolve) => {
      console.log(`[SFTP Upload] Opening SFTP session for: ${job.fileName}`);
      console.log(`[SFTP Upload] Local: ${job.localPath}`);
      console.log(`[SFTP Upload] Remote: ${job.remotePath}`);

      // Check local file exists
      if (!fs.existsSync(job.localPath)) {
        console.error(`[SFTP Upload] Local file not found: ${job.localPath}`);
        job.status = 'failed';
        job.error = 'Local file not found';
        this.sendProgress();
        resolve();
        this.processNext();
        return;
      }

      client.sftp((err: any, sftp: any) => {
        if (err) {
          console.error('[SFTP Upload] SFTP session error:', err.message);
          job.status = 'failed';
          job.error = `SFTP error: ${err.message}`;
          this.sendProgress();
          resolve();
          this.processNext();
          return;
        }

        this.activeSftp = sftp;
        console.log(`[SFTP Upload] SFTP session opened. Uploading ${job.totalBytes} bytes...`);

        sftp.fastPut(job.localPath, job.remotePath, {
          concurrency: 4,
          chunkSize: 32768,
          step: (transferred: number, _chunk: number, _total: number) => {
            job.uploadedBytes = transferred;
            const now = Date.now();
            const elapsed = (now - this.speedTracker.lastTime) / 1000;
            if (elapsed > 0.3) {
              job.speed = Math.round((transferred - this.speedTracker.lastBytes) / elapsed);
              this.speedTracker = { lastBytes: transferred, lastTime: now };
              this.sendProgress();
            }
          },
        }, (uploadErr: any) => {
          this.activeSftp = null;
          this.activeStream = null;
          try { sftp.end(); } catch {}

          if (uploadErr) {
            console.error('[SFTP Upload] Upload failed:', uploadErr.message);
            if (job.status !== 'paused') {
              job.status = 'failed';
              job.error = uploadErr.message;
            }
          } else {
            console.log(`[SFTP Upload] Complete: ${job.fileName} (${job.totalBytes} bytes)`);
            job.status = 'completed';
            job.uploadedBytes = job.totalBytes;
          }

          this.sendProgress();
          resolve();
          this.processNext();
        });
      });
    });
  }

  private sendProgress(): void {
    this.send('sftp:upload-progress', {
      queue: this.queue.map((j) => ({
        id: j.id,
        fileName: j.fileName,
        totalBytes: j.totalBytes,
        uploadedBytes: j.uploadedBytes,
        status: j.status,
        error: j.error,
        speed: j.speed,
      })),
      paused: this.paused,
    });
  }
}
