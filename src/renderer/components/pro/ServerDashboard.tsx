import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store';

interface ServerStats {
  cpu: number;
  ramUsed: number;
  ramTotal: number;
  diskUsed: string;
  diskTotal: string;
  diskPercent: number;
  uptime: string;
  loadAvg: string;
  hostname: string;
}

function ProgressRing({ percent, color, label, detail }: { percent: number; color: string; label: string; detail: string }) {
  const r = 28;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--border, #2A2A30)" strokeWidth="4" />
        <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-90 36 36)" style={{ transition: 'stroke-dashoffset 0.5s ease' }} />
        <text x="36" y="34" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="JetBrains Mono, monospace">{Math.round(percent)}%</text>
        <text x="36" y="46" textAnchor="middle" fill="var(--dim, #555)" fontSize="8" fontFamily="JetBrains Mono, monospace">{label}</text>
      </svg>
      <span className="text-[9px] text-void-text-ghost font-mono">{detail}</span>
    </div>
  );
}

function getColor(percent: number): string {
  if (percent < 60) return '#28C840';
  if (percent < 80) return '#FEBC2E';
  return '#FF5F57';
}

export function ServerDashboard({ onClose }: { onClose: () => void }) {
  const [stats, setStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  const fetchStats = useCallback(async () => {
    if (!sessionId) { setError('No active SSH session'); setLoading(false); return; }
    try {
      const [cpuRes, ramRes, diskRes, uptimeRes, hostnameRes] = await Promise.all([
        (window as any).void.ssh.exec(sessionId, "top -bn1 2>/dev/null | grep 'Cpu(s)' | awk '{print $2}' || mpstat 1 1 2>/dev/null | tail -1 | awk '{print 100-$NF}' || echo '0'"),
        (window as any).void.ssh.exec(sessionId, "free -m 2>/dev/null | awk '/Mem:/{printf \"%d %d\", $3, $2}' || echo '0 0'"),
        (window as any).void.ssh.exec(sessionId, "df -h / 2>/dev/null | awk 'NR==2{printf \"%s %s %s\", $3, $2, $5}' || echo '0 0 0%'"),
        (window as any).void.ssh.exec(sessionId, "uptime 2>/dev/null || echo 'unknown'"),
        (window as any).void.ssh.exec(sessionId, "hostname 2>/dev/null || echo 'server'"),
      ]);

      const cpu = parseFloat(cpuRes.stdout.trim()) || 0;
      const ramParts = ramRes.stdout.trim().split(' ');
      const ramUsed = parseInt(ramParts[0]) || 0;
      const ramTotal = parseInt(ramParts[1]) || 1;
      const diskParts = diskRes.stdout.trim().split(' ');
      const diskUsed = diskParts[0] || '0';
      const diskTotal = diskParts[1] || '0';
      const diskPercent = parseInt(diskParts[2]) || 0;

      const uptimeRaw = uptimeRes.stdout.trim();
      const uptimeMatch = uptimeRaw.match(/up\s+(.+?),\s+\d+\s+user/);
      const uptime = uptimeMatch ? uptimeMatch[1].trim() : uptimeRaw.split(',')[0]?.replace(/.*up\s+/, '') || 'unknown';
      const loadMatch = uptimeRaw.match(/load average:\s*(.+)/);
      const loadAvg = loadMatch ? loadMatch[1].trim() : '';
      const hostname = hostnameRes.stdout.trim();

      setStats({ cpu, ramUsed, ramTotal, diskUsed, diskTotal, diskPercent, uptime, loadAvg, hostname });
      setLoading(false);
      setError('');
    } catch {
      setError('Failed to fetch stats');
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const ramPercent = stats ? (stats.ramUsed / stats.ramTotal) * 100 : 0;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '420px', background: 'var(--base)', border: '0.5px solid #2A2A30', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid #2A2A30' }}>
          <div>
            <div className="text-[13px] text-void-text font-semibold font-sans">{stats?.hostname || activeTab?.title || 'Server'}</div>
            {stats && <div className="text-[10px] text-void-text-dim font-mono">up {stats.uptime}</div>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchStats} className="text-[10px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">↻ Refresh</button>
            <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
          </div>
        </div>

        {/* Body */}
        {loading ? (
          <div className="py-12 text-center text-[12px] text-void-text-ghost font-mono">Loading...</div>
        ) : error ? (
          <div className="py-12 text-center text-[12px] text-status-error font-mono">{error}</div>
        ) : stats ? (
          <div className="px-5 py-5">
            {/* Progress rings */}
            <div className="flex justify-around mb-5">
              <ProgressRing percent={stats.cpu} color={getColor(stats.cpu)} label="CPU" detail={`${stats.cpu.toFixed(1)}% used`} />
              <ProgressRing percent={ramPercent} color={getColor(ramPercent)} label="RAM" detail={`${stats.ramUsed}/${stats.ramTotal} MB`} />
              <ProgressRing percent={stats.diskPercent} color={getColor(stats.diskPercent)} label="Disk" detail={`${stats.diskUsed}/${stats.diskTotal}`} />
            </div>

            {/* Details */}
            {stats.loadAvg && (
              <div className="flex items-center justify-between py-2 px-3 bg-void-surface rounded-[6px]" style={{ border: '0.5px solid #2A2A30' }}>
                <span className="text-[10px] text-void-text-dim font-mono">Load average</span>
                <span className="text-[11px] text-void-text-muted font-mono">{stats.loadAvg}</span>
              </div>
            )}
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-5 py-2 text-[9px] text-void-text-ghost font-mono text-center" style={{ borderTop: '0.5px solid #2A2A30' }}>
          Auto-refreshes every 30s
        </div>
      </div>
    </div>
  );
}
