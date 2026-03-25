import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface CronEntry {
  raw: string;
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
  command: string;
  description: string;
}

function describeCron(min: string, hr: string, day: string, mon: string, dow: string): string {
  if (min === '*' && hr === '*') return 'Every minute';
  if (min === '0' && hr === '*') return 'Every hour';
  if (min === '0' && hr === '0' && day === '*') return 'Daily at midnight';
  if (min !== '*' && hr !== '*' && day === '*' && mon === '*' && dow === '*') return `Daily at ${hr.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (dow === '1-5' || dow === 'MON-FRI') return `Weekdays at ${hr.padStart(2, '0')}:${min.padStart(2, '0')}`;
  if (min.includes('/')) return `Every ${min.split('/')[1]} minutes`;
  if (hr.includes('/')) return `Every ${hr.split('/')[1]} hours`;
  if (dow === '0' || dow === 'SUN') return `Sundays at ${hr}:${min}`;
  return `${min} ${hr} ${day} ${mon} ${dow}`;
}

function parseCrontab(output: string): CronEntry[] {
  const entries: CronEntry[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.includes('=')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 6) continue;
    const [minute, hour, day, month, weekday, ...cmdParts] = parts;
    const command = cmdParts.join(' ');
    entries.push({
      raw: trimmed,
      minute, hour, day, month, weekday, command,
      description: describeCron(minute, hour, day, month, weekday),
    });
  }
  return entries;
}

export function CronViewer({ onClose }: { onClose: () => void }) {
  const [entries, setEntries] = useState<CronEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  useEffect(() => {
    if (!sessionId) { setError('No active SSH session'); setLoading(false); return; }
    (window as any).void.ssh.exec(sessionId, 'crontab -l 2>/dev/null || echo ""').then((result: any) => {
      setLoading(false);
      if (result.stderr && result.stderr.includes('no crontab')) {
        setEntries([]);
      } else if (result.stdout) {
        setEntries(parseCrontab(result.stdout));
      }
    }).catch(() => { setError('Failed to read crontab'); setLoading(false); });
  }, [sessionId]);

  const deleteEntry = async (index: number) => {
    if (!sessionId || !confirm('Delete this cron job?')) return;
    const remaining = entries.filter((_, i) => i !== index).map(e => e.raw).join('\n');
    const cmd = remaining ? `echo "${remaining}" | crontab -` : 'crontab -r';
    await (window as any).void.ssh.exec(sessionId, cmd);
    const result = await (window as any).void.ssh.exec(sessionId, 'crontab -l 2>/dev/null || echo ""');
    setEntries(parseCrontab(result.stdout || ''));
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '580px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Cron Jobs — {activeTab?.title || 'server'}</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: '400px', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          {loading ? (
            <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">Loading crontab...</div>
          ) : error ? (
            <div className="text-center text-[12px] text-status-error font-mono py-8">{error}</div>
          ) : entries.length === 0 ? (
            <div className="text-center text-[12px] text-void-text-ghost font-mono py-8">No cron jobs configured</div>
          ) : (
            <div className="flex flex-col gap-[6px]">
              {entries.map((entry, i) => (
                <div key={i} className="group p-3 rounded-[8px] bg-void-surface" style={{ border: '0.5px solid var(--border)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-accent font-mono font-medium">{entry.description}</span>
                    <button onClick={() => deleteEntry(i)}
                      className="text-void-text-ghost hover:text-status-error text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-transparent border-none cursor-pointer">✕</button>
                  </div>
                  <code className="text-[10px] text-void-text-muted font-mono block truncate">{entry.command}</code>
                  <div className="text-[9px] text-void-text-ghost font-mono mt-1">{entry.minute} {entry.hour} {entry.day} {entry.month} {entry.weekday}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2 text-[9px] text-void-text-ghost font-mono text-center" style={{ borderTop: '0.5px solid var(--border)' }}>
          {entries.length} cron job{entries.length !== 1 ? 's' : ''} configured
        </div>
      </div>
    </div>
  );
}
