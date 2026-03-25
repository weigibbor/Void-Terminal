import { useState, useEffect } from 'react';

interface AnalyticsData {
  totalConnections: number;
  totalSessions: number;
  totalDuration: number;
  topServers: { host: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}

function formatDuration(ms: number): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function AnalyticsDashboard({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aggregate from health events
    (window as any).void.health?.events().then((events: any[]) => {
      if (!events || events.length === 0) { setLoading(false); return; }
      const serverCounts = new Map<string, number>();
      let totalDuration = 0;
      const connects = events.filter((e: any) => e.event === 'connected');
      const disconnects = events.filter((e: any) => e.event === 'disconnected');
      connects.forEach((c: any) => serverCounts.set(c.host, (serverCounts.get(c.host) || 0) + 1));
      // Estimate duration from connect/disconnect pairs
      for (let i = 0; i < Math.min(connects.length, disconnects.length); i++) {
        totalDuration += Math.abs(disconnects[i].timestamp - connects[i].timestamp);
      }
      const topServers = Array.from(serverCounts.entries()).map(([host, count]) => ({ host, count })).sort((a, b) => b.count - a.count).slice(0, 5);
      // Recent 7 days activity
      const now = Date.now();
      const recentActivity = [];
      for (let d = 6; d >= 0; d--) {
        const dayStart = now - d * 86400000;
        const dayEnd = dayStart + 86400000;
        const count = events.filter((e: any) => e.timestamp >= dayStart && e.timestamp < dayEnd && e.event === 'connected').length;
        recentActivity.push({ date: new Date(dayStart).toLocaleDateString('en', { weekday: 'short' }), count });
      }
      setData({ totalConnections: connects.length, totalSessions: new Set(connects.map((c: any) => c.connection_id)).size, totalDuration, topServers, recentActivity });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const maxActivity = data ? Math.max(...data.recentActivity.map(a => a.count), 1) : 1;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '520px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Usage Analytics</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="px-5 py-4">
          {loading ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Loading...</div>
          : !data ? <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">No analytics data yet. Connect to servers to start tracking.</div>
          : <>
            {/* Overview cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-[8px] bg-void-surface text-center" style={{ border: '0.5px solid var(--border)' }}>
                <div className="text-[20px] text-void-text font-bold font-mono">{data.totalConnections}</div>
                <div className="text-[9px] text-void-text-ghost">Connections</div>
              </div>
              <div className="p-3 rounded-[8px] bg-void-surface text-center" style={{ border: '0.5px solid var(--border)' }}>
                <div className="text-[20px] text-void-text font-bold font-mono">{data.topServers.length}</div>
                <div className="text-[9px] text-void-text-ghost">Servers</div>
              </div>
              <div className="p-3 rounded-[8px] bg-void-surface text-center" style={{ border: '0.5px solid var(--border)' }}>
                <div className="text-[20px] text-void-text font-bold font-mono">{formatDuration(data.totalDuration)}</div>
                <div className="text-[9px] text-void-text-ghost">Total time</div>
              </div>
            </div>
            {/* Activity chart */}
            <div className="text-[10px] text-void-text-dim uppercase tracking-[0.5px] mb-2">Last 7 days</div>
            <div className="flex items-end gap-[6px] h-[60px] mb-4">
              {data.recentActivity.map((a, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-[2px]" style={{ height: `${Math.max((a.count / maxActivity) * 50, 2)}px`, background: a.count > 0 ? '#F97316' : 'var(--border)' }} />
                  <span className="text-[8px] text-void-text-ghost">{a.date}</span>
                </div>
              ))}
            </div>
            {/* Top servers */}
            <div className="text-[10px] text-void-text-dim uppercase tracking-[0.5px] mb-2">Top servers</div>
            {data.topServers.map((s, i) => (
              <div key={i} className="flex items-center gap-2 py-[4px]">
                <span className="text-[11px] text-void-text font-mono flex-1">{s.host}</span>
                <span className="text-[10px] text-void-text-muted font-mono">{s.count} connects</span>
              </div>
            ))}
          </>}
        </div>
      </div>
    </div>
  );
}
