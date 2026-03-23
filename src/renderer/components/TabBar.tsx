import { useAppStore, getPaneLabel } from '../stores/app-store';
import type { Tab } from '../types';

function TabItem({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const paneTabIds = useAppStore((s) => s.paneTabIds);
  const splitLayout = useAppStore((s) => s.splitLayout);
  const focusedPaneIndex = useAppStore((s) => s.focusedPaneIndex);

  const paneIndex = paneTabIds.indexOf(tab.id);
  const inSplit = paneIndex >= 0 && splitLayout !== 'single';
  const isFocusedPane = paneIndex === focusedPaneIndex;
  const position = inSplit ? getPaneLabel(splitLayout, paneIndex) : null;

  const typeBadge =
    tab.type === 'ssh' ? 'SSH'
    : tab.type === 'local' ? 'PTY'
    : tab.type === 'browser' ? 'WEB'
    : '';

  return (
    <div
      className={`group flex items-center gap-2 px-4 py-2 cursor-pointer shrink-0 rounded-t-[8px] ${
        isActive
          ? 'bg-void-elevated border-[0.5px] border-void-border border-b-transparent'
          : inSplit
            ? 'bg-void-surface border-[0.5px] border-void-border border-b-transparent'
            : 'hover:bg-void-surface/30'
      }`}
      style={{ whiteSpace: 'nowrap', transition: 'background-color 150ms ease, border-color 150ms ease' }}
      onClick={() => setActiveTab(tab.id)}
      onMouseDown={(e) => {
        if (e.button === 1) { e.preventDefault(); closeTab(tab.id); }
      }}
    >
      {/* Status dot */}
      {tab.type !== 'new-connection' && (
        <span
          className={`w-[6px] h-[6px] rounded-full shrink-0 ${
            tab.connected ? 'bg-status-online'
            : tab.disconnectedAt ? 'bg-void-text-ghost'
            : 'bg-void-text-dim'
          }`}
          style={{ transition: 'background-color 300ms ease' }}
        />
      )}

      {/* Title */}
      <span className={`text-[12px] font-mono truncate max-w-[140px] ${
        isActive ? 'text-void-text' : 'text-[#666]'
      }`}>
        {tab.title}
      </span>

      {/* Type badge */}
      {typeBadge && (
        <span className="text-[10px] text-void-text-ghost">{typeBadge}</span>
      )}

      {/* Offline badge */}
      {!tab.connected && tab.disconnectedAt && (
        <span className="text-[9px] text-status-error px-[6px] py-[1px] rounded-[3px]"
          style={{ background: 'rgba(255,95,87,0.08)' }}>
          offline
        </span>
      )}

      {/* Pane position badge */}
      {position && (
        <span
          className="text-[8px] px-[5px] py-[1px] rounded-[3px] font-mono"
          style={{
            color: isFocusedPane ? '#F97316' : '#5B9BD5',
            background: isFocusedPane ? 'rgba(249,115,22,0.08)' : 'rgba(91,155,213,0.08)',
          }}
        >
          {position}
        </span>
      )}

      {/* Close button */}
      <span
        className={`text-[11px] text-void-text-ghost transition-opacity ${
          isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
        }`}
        onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
      >
        x
      </span>
    </div>
  );
}

export function TabBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const addTab = useAppStore((s) => s.addTab);

  return (
    <div className="flex items-end bg-void-base overflow-x-auto shrink-0 px-3 pt-[10px]">
      <div className="flex items-end min-w-0">
        {tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} />
        ))}
      </div>
      <div
        className="flex items-center justify-center w-8 h-8 text-void-text-dim hover:text-void-text-muted cursor-pointer text-[16px] shrink-0"
        onClick={() => addTab('new-connection')}
      >
        +
      </div>
    </div>
  );
}
