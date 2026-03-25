import { useState, useEffect } from 'react';

interface Activity { id: number; user: string; action: string; server: string; detail: string; timestamp: number; }

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

const AVATARS = ['#F97316', '#5B9BD5', '#28C840', '#C586C0', '#FEBC2E', '#FF5F57'];

export function TeamActivityFeed({ onClose }: { onClose: () => void }) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Load from team API (placeholder — needs WebSocket/API in production)
    const stored = JSON.parse(localStorage.getItem('void-team-activity') || '[]');
    setActivities(stored);
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '480px', maxHeight: '70vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Team Activity</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {activities.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[12px] text-void-text-ghost font-sans">No team activity yet</div>
              <div className="text-[10px] text-void-text-faint font-sans mt-1">Activity appears here when team members connect to servers</div>
            </div>
          ) : activities.map((a, i) => (
            <div key={a.id || i} className="flex items-start gap-3 px-5 py-3" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
              <div className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: AVATARS[i % AVATARS.length], color: 'var(--base)' }}>
                {a.user[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-void-text font-sans">
                  <strong>{a.user}</strong> {a.action} <span className="text-accent">{a.server}</span>
                </div>
                {a.detail && <div className="text-[10px] text-void-text-dim font-mono mt-[2px] truncate">{a.detail}</div>}
              </div>
              <span className="text-[9px] text-void-text-ghost font-mono shrink-0">{timeAgo(a.timestamp)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
