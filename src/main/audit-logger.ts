import { MemoryStore } from './memory-store';

export class AuditLogger {
  private memoryStore: MemoryStore;

  constructor(memoryStore: MemoryStore) {
    this.memoryStore = memoryStore;
  }

  logCommand(entry: {
    server: string;
    username: string;
    command: string;
    output?: string;
    exitCode?: number;
    duration?: number;
    flagged?: boolean;
  }): string {
    return this.memoryStore.addEvent({
      type: 'command',
      server: entry.server,
      detail: `${entry.username}@${entry.server}: ${entry.command}`,
      command: entry.command,
      output: entry.output?.substring(0, 5000),
      exitCode: entry.exitCode,
      durationMs: entry.duration,
      tags: entry.flagged ? 'flagged' : undefined,
    });
  }
}
