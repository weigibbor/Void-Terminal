import { useAppStore } from '../stores/app-store';

export function TitleBar() {
  const splitLayout = useAppStore((s) => s.splitLayout);
  const isPro = useAppStore((s) => s.isPro);
  const cycleSplitH = useAppStore((s) => s.cycleSplitHorizontal);
  const cycleSplitV = useAppStore((s) => s.cycleSplitVertical);

  return (
    <div
      className="flex items-center justify-between px-4 pt-3 pb-0 bg-void-base shrink-0"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* macOS traffic light spacer */}
      <div className="w-[60px]" />

      {/* Center title */}
      <div className="flex items-center gap-2 select-none">
        <span className="text-[11px] text-void-text-dim tracking-[0.5px] font-mono">
          VOID TERMINAL
        </span>
        {isPro && (
          <span className="text-[8px] font-mono font-bold text-accent bg-accent-glow border-[0.5px] border-accent-dim px-1.5 py-[1px] rounded-[3px] tracking-wider">
            PRO
          </span>
        )}
      </div>

      {/* Right: split layout controls */}
      <div
        className="flex items-center gap-1.5 w-[60px] justify-end"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={cycleSplitH}
          className={`p-1 rounded transition-colors ${
            splitLayout === '2-col' || splitLayout === '3-col'
              ? 'text-accent'
              : 'text-void-text-ghost hover:text-void-text-muted'
          }`}
          title="Split horizontal"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1" />
            <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          onClick={cycleSplitV}
          className={`p-1 rounded transition-colors ${
            splitLayout === '2+1-grid' || splitLayout === '1+2-grid'
              ? 'text-accent'
              : 'text-void-text-ghost hover:text-void-text-muted'
          }`}
          title="Split grid"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1" />
            <line x1="8" y1="2" x2="8" y2="8" stroke="currentColor" strokeWidth="0.8" />
            <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}
