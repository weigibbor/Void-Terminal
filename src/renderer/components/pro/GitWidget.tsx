import { useState, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';

interface GitInfo {
  branch: string;
  status: string[];
  lastCommit: string;
  remoteUrl: string;
}

export function GitWidget({ onClose }: { onClose: () => void }) {
  const [info, setInfo] = useState<GitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [commitMsg, setCommitMsg] = useState('');

  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));
  const sessionId = activeTab?.sessionId;

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([
      (window as any).void.ssh.exec(sessionId, 'git rev-parse --abbrev-ref HEAD 2>/dev/null'),
      (window as any).void.ssh.exec(sessionId, 'git status --porcelain 2>/dev/null'),
      (window as any).void.ssh.exec(sessionId, 'git log --oneline -1 2>/dev/null'),
      (window as any).void.ssh.exec(sessionId, 'git remote get-url origin 2>/dev/null'),
    ]).then(([branch, status, commit, remote]) => {
      setInfo({
        branch: branch.stdout?.trim() || 'not a git repo',
        status: status.stdout?.trim().split('\n').filter(Boolean) || [],
        lastCommit: commit.stdout?.trim() || '',
        remoteUrl: remote.stdout?.trim() || '',
      });
      setLoading(false);
    });
  }, [sessionId]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '480px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Git Status</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="px-5 py-4">
          {loading ? (
            <div className="text-[11px] text-void-text-ghost font-mono text-center py-6">Loading...</div>
          ) : info ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-void-text-dim uppercase tracking-[0.5px] w-16">Branch</span>
                <span className="text-[12px] text-accent font-mono font-medium">{info.branch}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-void-text-dim uppercase tracking-[0.5px] w-16">Commit</span>
                <span className="text-[11px] text-void-text-muted font-mono truncate">{info.lastCommit || 'none'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-void-text-dim uppercase tracking-[0.5px] w-16">Remote</span>
                <span className="text-[10px] text-void-text-ghost font-mono truncate">{info.remoteUrl || 'none'}</span>
              </div>
              <div>
                <span className="text-[10px] text-void-text-dim uppercase tracking-[0.5px]">Changes ({info.status.length})</span>
                {info.status.length > 0 ? (
                  <div className="mt-1 max-h-[150px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
                    {info.status.map((s, i) => {
                      const code = s.substring(0, 2);
                      const file = s.substring(3);
                      const color = code.includes('M') ? '#FEBC2E' : code.includes('A') || code.includes('?') ? '#28C840' : code.includes('D') ? '#FF5F57' : '#888';
                      return (
                        <div key={i} className="flex items-center gap-2 py-[2px]">
                          <span className="text-[10px] font-mono font-bold w-4" style={{ color }}>{code.trim()}</span>
                          <span className="text-[10px] text-void-text-muted font-mono truncate">{file}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-[10px] text-void-text-ghost font-mono mt-1">Working tree clean</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
