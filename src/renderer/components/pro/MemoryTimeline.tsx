import { ProGate } from '../ProGate';
import { useAppStore } from "../stores/app-store";
import { useState, useEffect } from 'react';
import type { MemoryEvent } from '../../types';
import { formatRelativeTime } from '../../utils/formatters';

const EVENT_COLORS: Record<string, string> = {
  connection: 'bg-status-online',
  command: 'bg-void-text-ghost',
  error: 'bg-status-error',
  deploy: 'bg-status-info',
  config: 'bg-status-warning',
  git: 'bg-status-info',
  danger: 'bg-status-error',
};

const EVENT_FILTERS = ['All', 'Deploys', 'Errors', 'Config', 'Git'] as const;
type FilterType = (typeof EVENT_FILTERS)[number];

const FILTER_MAP: Record<FilterType, string | null> = {
  All: null,
  Deploys: 'deploy',
  Errors: 'error',
  Config: 'config',
  Git: 'git',
};

export function MemoryTimeline({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [filter, setFilter] = useState<FilterType>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    const result = await window.void.memory.getTimeline(FILTER_MAP[filter] || undefined);
    setEvents(result as MemoryEvent[]);
  };

  // Group events by day
  const grouped = events.reduce<Record<string, MemoryEvent[]>>((acc, event) => {
    const date = new Date(event.timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] bg-void-base border border-void-border rounded-void-2xl shadow-2xl flex flex-col animate-palette-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-void-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            <h2 className="text-lg text-void-text font-medium">Memory Timeline</h2>
          </div>
          <button onClick={onClose} className="text-void-text-ghost hover:text-void-text-muted">
            x
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-void-border/50">
          {EVENT_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-2xs rounded-full transition-colors ${
                filter === f
                  ? 'bg-accent text-void-base'
                  : 'bg-void-surface text-void-text-muted hover:text-void-text'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date} className="mb-6">
              <h3 className="text-2xs text-void-text-dim uppercase tracking-wider mb-3">{date}</h3>
              <div className="space-y-1 relative ml-3 border-l border-void-border/50 pl-4">
                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="relative cursor-pointer group"
                    onClick={() => setExpandedId(expandedId === event.id ? null : event.id)}
                  >
                    {/* Dot on timeline */}
                    <span
                      className={`absolute -left-[21px] top-2 w-2.5 h-2.5 rounded-full border-2 border-void-base ${
                        EVENT_COLORS[event.type] || 'bg-void-text-ghost'
                      }`}
                    />

                    <div className="py-2 px-3 rounded-void-lg hover:bg-void-surface/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-void-text-muted">{event.detail}</span>
                        <span className="text-2xs text-void-text-ghost shrink-0 ml-2">
                          {formatRelativeTime(event.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-2xs text-void-text-ghost uppercase">{event.type}</span>
                        {event.server && (
                          <span className="text-2xs text-void-text-faint">{event.server}</span>
                        )}
                        {event.aiGenerated && (
                          <span className="text-2xs text-status-ai">AI</span>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {expandedId === event.id && event.output && (
                        <pre className="mt-2 p-2 bg-void-input rounded-void text-2xs text-void-text-ghost overflow-x-auto max-h-32 font-mono">
                          {event.output.substring(0, 500)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {events.length === 0 && (
            <div className="text-center py-12 text-sm text-void-text-ghost">
              No events recorded yet. Start using your terminal and Void AI will remember.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
