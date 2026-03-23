import { ProGate } from '../ProGate';
import { useAppStore } from "../../stores/app-store";
import { useState, useEffect } from 'react';
import type { MemoryEvent } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

export function AuditLogPanel({ onClose }: { onClose: () => void }) {
  const isPro = useAppStore((s) => s.isPro);

  if (!isPro) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="w-full max-w-md bg-void-base border border-void-border rounded-void-2xl shadow-2xl animate-palette-in overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <ProGate feature="Audit Log" description="Every command logged with timestamps, servers, and exit codes." />
        </div>
      </div>
    );
  }

  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const result = await window.void.memory.getTimeline('command');
    setEvents(result as MemoryEvent[]);
  };

  const filtered = search
    ? events.filter(
        (e) =>
          e.detail.toLowerCase().includes(search.toLowerCase()) ||
          e.command?.toLowerCase().includes(search.toLowerCase()),
      )
    : events;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl max-h-[80vh] bg-void-base border border-void-border rounded-void-2xl shadow-2xl flex flex-col animate-palette-in">
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-border">
          <h2 className="text-lg text-void-text font-medium">Audit Log</h2>
          <button onClick={onClose} className="text-void-text-ghost hover:text-void-text-muted">x</button>
        </div>

        <div className="px-5 py-3 border-b border-void-border/50">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search commands..."
            className="w-full bg-void-input border border-void-border rounded-void text-sm text-void-text-muted px-3 py-1.5"
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-void-surface">
              <tr className="text-2xs text-void-text-ghost uppercase tracking-wider">
                <th className="text-left px-4 py-2">Time</th>
                <th className="text-left px-4 py-2">Server</th>
                <th className="text-left px-4 py-2">Command</th>
                <th className="text-left px-4 py-2">Exit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id} className="border-b border-void-border/20 hover:bg-void-surface/30">
                  <td className="px-4 py-2 text-void-text-ghost text-2xs whitespace-nowrap">
                    {formatRelativeTime(event.timestamp)}
                  </td>
                  <td className="px-4 py-2 text-void-text-muted">{event.server || '-'}</td>
                  <td className="px-4 py-2 text-void-text font-mono truncate max-w-xs">
                    {event.command || event.detail}
                  </td>
                  <td className="px-4 py-2">
                    {event.exitCode !== undefined && (
                      <span
                        className={`text-2xs ${event.exitCode === 0 ? 'text-status-online' : 'text-status-error'}`}
                      >
                        {event.exitCode}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-sm text-void-text-ghost">No audit entries found</div>
          )}
        </div>
      </div>
    </div>
  );
}
