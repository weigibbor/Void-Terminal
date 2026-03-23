import { useAppStore } from '../stores/app-store';
import type { Tab } from '../types';

function TabItem({ tab, isActive }: { tab: Tab; isActive: boolean }) {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const paneTabIds = useAppStore((s) => s.paneTabIds);

  const splitCount = paneTabIds.filter((id) => id !== null).length;
  const inSplit = paneTabIds.includes(tab.id) && splitCount > 1;

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
          : 'hover:bg-void-surface/30'
      }`}
      style={{ whiteSpace: 'nowrap', transition: 'background-color 150ms ease, border-color 150ms ease' }}
      onClick={() => setActiveTab(tab.id)}
      onMouseDown={(e) => {
        if (e.button === 1) { e.preventDefault(); closeTab(tab.id); }
      }}
    >
      {tab.type !== 'new-connection' && (
        <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${
          tab.connected ? 'bg-status-online' : 'bg-void-text-dim'
        }`} />
      )}

      <span className={`text-[12px] font-mono truncate max-w-[140px] ${
        isActive ? 'text-void-text' : 'text-[#666]'
      }`}>
        {tab.title}
      </span>

      {typeBadge && (
        <span className="text-[10px] text-void-text-ghost ml-1">{typeBadge}</span>
      )}

      {inSplit && (
        <span className="text-[9px] text-accent bg-accent-glow px-[5px] py-[1px] rounded-[3px] ml-1">
          x{splitCount}
        </span>
      )}

      <span
        className={`text-[11px] text-void-text-ghost ml-1 transition-opacity ${
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
