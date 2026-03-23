import { MemoryStore } from './memory-store';

interface WorkspaceData {
  id: string;
  name: string;
  layout: string;
  created_at: number;
  last_opened: number | null;
}

export class WorkspaceStore {
  private memoryStore: MemoryStore;

  constructor(memoryStore: MemoryStore) {
    this.memoryStore = memoryStore;
  }

  list(): WorkspaceData[] {
    return (this.memoryStore as any).db
      .prepare('SELECT * FROM workspaces ORDER BY last_opened DESC')
      .all() as WorkspaceData[];
  }

  save(name: string, layout: object): string {
    const id = Math.random().toString(36).substring(2, 10);
    const now = Date.now();
    (this.memoryStore as any).db
      .prepare('INSERT INTO workspaces (id, name, layout, created_at, last_opened) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, JSON.stringify(layout), now, now);
    return id;
  }

  load(id: string): WorkspaceData | null {
    const ws = (this.memoryStore as any).db
      .prepare('SELECT * FROM workspaces WHERE id = ?')
      .get(id) as WorkspaceData | undefined;
    if (ws) {
      (this.memoryStore as any).db
        .prepare('UPDATE workspaces SET last_opened = ? WHERE id = ?')
        .run(Date.now(), id);
    }
    return ws || null;
  }

  delete(id: string): void {
    (this.memoryStore as any).db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  }
}
