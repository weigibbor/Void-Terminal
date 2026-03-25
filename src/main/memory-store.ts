import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { v4 as uuid } from 'uuid';

export class MemoryStore {
  private db: Database.Database;

  constructor() {
    const dir = path.join(os.homedir(), '.void', 'memory');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    this.db = new Database(path.join(dir, 'memory.db'));
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        server TEXT,
        project TEXT,
        detail TEXT NOT NULL,
        command TEXT,
        output TEXT,
        exit_code INTEGER,
        duration_ms INTEGER,
        timestamp INTEGER NOT NULL,
        tags TEXT,
        ai_generated INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL DEFAULT 'global',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'note',
        pinned INTEGER NOT NULL DEFAULT 0,
        ai_generated INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS snippets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        command TEXT NOT NULL,
        description TEXT,
        tags TEXT,
        run_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        layout TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        last_opened INTEGER
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        stack TEXT,
        servers TEXT,
        common_commands TEXT,
        recurring_issues TEXT,
        total_sessions INTEGER DEFAULT 0,
        last_activity INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recordings (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        server TEXT,
        title TEXT NOT NULL,
        data TEXT NOT NULL,
        duration_ms INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bookmarks (
        id TEXT PRIMARY KEY,
        server TEXT,
        command TEXT NOT NULL,
        description TEXT,
        used_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS connection_health (
        id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        host TEXT NOT NULL,
        event TEXT NOT NULL,
        timestamp INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_health_connection ON connection_health(connection_id);
      CREATE INDEX IF NOT EXISTS idx_health_timestamp ON connection_health(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_bookmarks_server ON bookmarks(server);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_server ON events(server);
      CREATE INDEX IF NOT EXISTS idx_notes_scope ON notes(scope);
      CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(pinned DESC);
    `);

    // Create FTS5 table if it doesn't exist
    try {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS events_fts
        USING fts5(detail, command, output, content=events, content_rowid=rowid);
      `);
    } catch {
      // FTS table may already exist
    }
  }

  // --- Events ---

  addEvent(event: {
    type: string;
    server?: string;
    project?: string;
    detail: string;
    command?: string;
    output?: string;
    exitCode?: number;
    durationMs?: number;
    tags?: string;
    aiGenerated?: boolean;
  }): string {
    const id = uuid();
    const timestamp = Date.now();
    this.db
      .prepare(
        `INSERT INTO events (id, type, server, project, detail, command, output, exit_code, duration_ms, timestamp, tags, ai_generated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        event.type,
        event.server || null,
        event.project || null,
        event.detail,
        event.command || null,
        event.output ? event.output.substring(0, 5000) : null,
        event.exitCode ?? null,
        event.durationMs ?? null,
        timestamp,
        event.tags || null,
        event.aiGenerated ? 1 : 0,
      );
    return id;
  }

  queryEvents(text: string): unknown[] {
    return this.db
      .prepare(
        `SELECT e.* FROM events e
       JOIN events_fts fts ON e.rowid = fts.rowid
       WHERE events_fts MATCH ?
       ORDER BY e.timestamp DESC LIMIT 50`,
      )
      .all(text);
  }

  getTimeline(filter?: string): unknown[] {
    if (filter) {
      return this.db
        .prepare('SELECT * FROM events WHERE type = ? ORDER BY timestamp DESC LIMIT 200')
        .all(filter);
    }
    return this.db
      .prepare('SELECT * FROM events ORDER BY timestamp DESC LIMIT 200')
      .all();
  }

  getStats(): { total: number; sessions: number; errors: number; dbSize: number } {
    const total = (
      this.db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number }
    ).count;
    const sessions = (
      this.db
        .prepare("SELECT COUNT(*) as count FROM events WHERE type = 'connection'")
        .get() as { count: number }
    ).count;
    const errors = (
      this.db
        .prepare("SELECT COUNT(*) as count FROM events WHERE type = 'error'")
        .get() as { count: number }
    ).count;
    const dbPath = path.join(os.homedir(), '.void', 'memory', 'memory.db');
    let dbSize = 0;
    try {
      dbSize = fs.statSync(dbPath).size;
    } catch {
      // ignore
    }
    return { total, sessions, errors, dbSize };
  }

  clearAllEvents(): void {
    this.db.prepare('DELETE FROM events').run();
  }

  // --- Notes ---

  listNotes(scope: string): unknown[] {
    return this.db
      .prepare('SELECT * FROM notes WHERE scope = ? ORDER BY pinned DESC, created_at DESC')
      .all(scope);
  }

  saveNote(note: {
    scope?: string;
    title: string;
    content: string;
    type?: string;
    pinned?: boolean;
    aiGenerated?: boolean;
  }): string {
    const id = uuid();
    const now = Date.now();
    this.db
      .prepare(
        `INSERT INTO notes (id, scope, title, content, type, pinned, ai_generated, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        note.scope || 'global',
        note.title,
        note.content,
        note.type || 'note',
        note.pinned ? 1 : 0,
        note.aiGenerated ? 1 : 0,
        now,
        now,
      );
    return id;
  }

  updateNote(id: string, data: { title?: string; content?: string; type?: string; pinned?: boolean }): void {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (data.title !== undefined) { sets.push('title = ?'); vals.push(data.title); }
    if (data.content !== undefined) { sets.push('content = ?'); vals.push(data.content); }
    if (data.type !== undefined) { sets.push('type = ?'); vals.push(data.type); }
    if (data.pinned !== undefined) { sets.push('pinned = ?'); vals.push(data.pinned ? 1 : 0); }
    sets.push('updated_at = ?');
    vals.push(Date.now());
    vals.push(id);
    this.db.prepare(`UPDATE notes SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }

  deleteNote(id: string): void {
    this.db.prepare('DELETE FROM notes WHERE id = ?').run(id);
  }

  // --- Snippets ---

  listSnippets(): unknown[] {
    return this.db.prepare('SELECT * FROM snippets ORDER BY run_count DESC, created_at DESC').all();
  }

  saveSnippet(snippet: {
    name: string;
    command: string;
    description?: string;
    tags?: string;
  }): string {
    const id = uuid();
    this.db
      .prepare(
        `INSERT INTO snippets (id, name, command, description, tags, run_count, created_at)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
      )
      .run(id, snippet.name, snippet.command, snippet.description || null, snippet.tags || null, Date.now());
    return id;
  }

  deleteSnippet(id: string): void {
    this.db.prepare('DELETE FROM snippets WHERE id = ?').run(id);
  }

  incrementSnippetRunCount(id: string): void {
    this.db.prepare('UPDATE snippets SET run_count = run_count + 1 WHERE id = ?').run(id);
  }

  // --- Connection Health ---

  logHealthEvent(connectionId: string, host: string, event: string): void {
    const id = require('uuid').v4();
    this.db.prepare('INSERT INTO connection_health (id, connection_id, host, event, timestamp) VALUES (?, ?, ?, ?, ?)')
      .run(id, connectionId, host, event, Date.now());
  }

  getHealthEvents(connectionId?: string, limit = 100): unknown[] {
    if (connectionId) {
      return this.db.prepare('SELECT * FROM connection_health WHERE connection_id = ? ORDER BY timestamp DESC LIMIT ?').all(connectionId, limit);
    }
    return this.db.prepare('SELECT * FROM connection_health ORDER BY timestamp DESC LIMIT ?').all(limit);
  }

  getHealthSummary(): unknown[] {
    return this.db.prepare(`
      SELECT host, connection_id,
        COUNT(CASE WHEN event = 'connected' THEN 1 END) as connect_count,
        COUNT(CASE WHEN event = 'disconnected' THEN 1 END) as disconnect_count,
        COUNT(CASE WHEN event = 'error' THEN 1 END) as error_count,
        MAX(CASE WHEN event = 'connected' THEN timestamp END) as last_connected,
        MIN(timestamp) as first_seen
      FROM connection_health GROUP BY host, connection_id ORDER BY last_connected DESC
    `).all();
  }

  // --- Recordings ---

  listRecordings(): unknown[] {
    return this.db.prepare('SELECT id, session_id, server, title, duration_ms, created_at FROM recordings ORDER BY created_at DESC').all();
  }

  saveRecording(recording: { sessionId?: string; server?: string; title: string; data: string; durationMs?: number }): string {
    const id = require('uuid').v4();
    this.db.prepare('INSERT INTO recordings (id, session_id, server, title, data, duration_ms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, recording.sessionId || null, recording.server || null, recording.title, recording.data, recording.durationMs || 0, Date.now());
    return id;
  }

  getRecording(id: string): unknown {
    return this.db.prepare('SELECT * FROM recordings WHERE id = ?').get(id);
  }

  deleteRecording(id: string): void {
    this.db.prepare('DELETE FROM recordings WHERE id = ?').run(id);
  }

  // --- Bookmarks ---

  listBookmarks(server?: string): unknown[] {
    if (server) {
      return this.db.prepare('SELECT * FROM bookmarks WHERE server = ? ORDER BY used_count DESC, created_at DESC').all(server);
    }
    return this.db.prepare('SELECT * FROM bookmarks ORDER BY used_count DESC, created_at DESC').all();
  }

  saveBookmark(bookmark: { server?: string; command: string; description?: string }): string {
    const id = require('uuid').v4();
    this.db.prepare('INSERT INTO bookmarks (id, server, command, description, used_count, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .run(id, bookmark.server || null, bookmark.command, bookmark.description || null, Date.now());
    return id;
  }

  deleteBookmark(id: string): void {
    this.db.prepare('DELETE FROM bookmarks WHERE id = ?').run(id);
  }

  incrementBookmarkUsage(id: string): void {
    this.db.prepare('UPDATE bookmarks SET used_count = used_count + 1 WHERE id = ?').run(id);
  }

  close(): void {
    this.db.close();
  }
}
