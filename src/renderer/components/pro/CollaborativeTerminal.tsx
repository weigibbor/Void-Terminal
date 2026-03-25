import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';

interface Participant { id: string; name: string; color: string; role: 'owner' | 'editor' | 'viewer'; }

const CURSOR_COLORS = ['#F97316', '#5B9BD5', '#28C840', '#C586C0', '#FEBC2E', '#FF5F57'];

export function CollaborativeTerminal({ onClose }: { onClose: () => void }) {
  const [sharing, setSharing] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const activeTab = useAppStore((s) => s.tabs.find(t => t.id === s.activeTabId));

  const startSharing = () => {
    // Generate a share link (would need WebSocket server in production)
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setShareLink(`https://voidterminal.dev/share/${code}`);
    setSharing(true);
    setParticipants([{ id: '1', name: 'You', color: CURSOR_COLORS[0], role: 'owner' }]);
  };

  const stopSharing = () => { setSharing(false); setShareLink(''); setParticipants([]); };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full" style={{ maxWidth: '440px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Share Terminal</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="px-5 py-4">
          {!sharing ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-[12px] mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.12)' }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none"><path d="M8 1v6m0 0L5 4m3 3l3-3M1 10v2a2 2 0 002 2h10a2 2 0 002-2v-2" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <div className="text-[13px] text-void-text font-semibold mb-1">Share this session</div>
              <div className="text-[11px] text-void-text-dim mb-4">Anyone with the link can view your terminal in real-time.</div>
              <button onClick={startSharing} disabled={!activeTab?.connected}
                className="px-6 py-[10px] rounded-[8px] text-[12px] font-semibold cursor-pointer font-sans border-none"
                style={{ background: activeTab?.connected ? '#F97316' : '#333', color: 'var(--base)' }}>
                {activeTab?.connected ? 'Start sharing' : 'Connect to a server first'}
              </button>
            </div>
          ) : (
            <>
              <div className="text-[10px] text-void-text-dim uppercase tracking-[0.5px] mb-2">Share link</div>
              <div className="flex items-center gap-2 p-[10px] rounded-[6px] mb-4" style={{ background: 'var(--elevated)', border: '0.5px solid var(--border)' }}>
                <code className="text-[11px] text-accent font-mono flex-1 truncate select-text">{shareLink}</code>
                <button onClick={() => navigator.clipboard.writeText(shareLink)}
                  className="text-[9px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer font-mono">Copy</button>
              </div>
              <div className="text-[10px] text-void-text-dim uppercase tracking-[0.5px] mb-2">Participants ({participants.length})</div>
              <div className="flex flex-col gap-[6px] mb-4">
                {participants.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2 rounded-[6px] bg-void-surface" style={{ border: '0.5px solid var(--border)' }}>
                    <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: p.color, color: 'var(--base)' }}>
                      {p.name[0]}
                    </div>
                    <span className="text-[11px] text-void-text font-sans flex-1">{p.name}</span>
                    <span className="text-[9px] font-mono px-[6px] py-[2px] rounded-[3px]" style={{ color: p.role === 'owner' ? '#F97316' : p.role === 'editor' ? '#28C840' : '#888', border: '0.5px solid var(--border)' }}>{p.role}</span>
                  </div>
                ))}
              </div>
              <button onClick={stopSharing}
                className="w-full py-[8px] rounded-[6px] text-[11px] text-status-error font-sans cursor-pointer"
                style={{ border: '0.5px solid rgba(255,95,87,0.2)', background: 'rgba(255,95,87,0.04)' }}>Stop sharing</button>
              <div className="text-[9px] text-void-text-ghost text-center mt-2">Requires WebSocket server for real-time sync (coming soon)</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
