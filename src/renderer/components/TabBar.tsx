import { useState, useRef } from 'react';
import { useAppStore, getPaneLabel } from '../stores/app-store';
import { ContextMenu } from './ContextMenu';
import type { ContextMenuItem } from './ContextMenu';
import type { Tab } from '../types';

function TabItem({ tab, isActive, onContextMenu, onReorder }: { tab: Tab; isActive: boolean; onContextMenu: (e: React.MouseEvent, tab: Tab) => void; onReorder: (fromId: string, toId: string) => void }) {
  const setActiveTab = useAppStore((s) => s.setActiveTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const paneTabIds = useAppStore((s) => s.paneTabIds);
  const splitLayout = useAppStore((s) => s.splitLayout);
  const focusedPaneIndex = useAppStore((s) => s.focusedPaneIndex);
  const [dragOver, setDragOver] = useState(false);

  const paneIndex = paneTabIds.indexOf(tab.id);
  const inSplit = paneIndex >= 0 && splitLayout !== 'single';
  const isFocusedPane = paneIndex === focusedPaneIndex;
  const position = inSplit ? getPaneLabel(splitLayout, paneIndex) : null;

  const typeBadge =
    tab.type === 'ssh' ? 'SSH'
    : tab.type === 'local' ? 'PTY'
    : tab.type === 'browser' ? 'WEB'
    : tab.type === 'settings' ? '⚙'
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
      style={{ whiteSpace: 'nowrap', transition: 'background-color 150ms ease, border-color 150ms ease', borderLeft: dragOver ? '2px solid #F97316' : tab.color ? `3px solid ${tab.color}` : undefined }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/tab-id', tab.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        const fromId = e.dataTransfer.types.includes('text/tab-id') ? true : false;
        if (fromId) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const fromId = e.dataTransfer.getData('text/tab-id');
        if (fromId && fromId !== tab.id) {
          onReorder(fromId, tab.id);
        }
      }}
      onDragEnd={(e) => {
        // If dropped outside the tab bar (y > 60px from top), detach to new window
        const tabBar = e.currentTarget.closest('[data-tabbar]');
        if (tabBar) {
          const rect = tabBar.getBoundingClientRect();
          if (e.clientY > rect.bottom + 50 || e.clientY < rect.top - 50 || e.clientX < rect.left - 100 || e.clientX > rect.right + 100) {
            // Detach this tab to a new window
            const tabs = useAppStore.getState().tabs;
            if (tabs.length <= 1) return; // don't detach the last tab
            const tabData = { ...tab };
            useAppStore.getState().closeTab(tab.id);
            window.void.app.detachTab(tabData, e.screenX - 360, e.screenY - 50);
          }
        }
      }}
      onClick={() => setActiveTab(tab.id)}
      onMouseDown={(e) => {
        if (e.button === 1) { e.preventDefault(); closeTab(tab.id); }
      }}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, tab); }}
    >
      {/* Status dot / spinner */}
      {tab.type !== 'new-connection' && (
        tab.connecting ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="shrink-0 animate-spin" style={{ animationDuration: '1s' }}>
            <circle cx="12" cy="12" r="8" stroke="#2A2A30" strokeWidth="2" />
            <path d="M12 4a8 8 0 018 8" stroke="#FEBC2E" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <span
            className={`w-[6px] h-[6px] rounded-full shrink-0 ${
              tab.connected ? 'bg-status-online'
              : tab.connectionError ? 'bg-status-error'
              : tab.disconnectedAt ? 'bg-void-text-ghost'
              : 'bg-void-text-dim'
            }`}
            style={{ transition: 'background-color 300ms ease' }}
          />
        )
      )}

      {/* Title */}
      <span className={`text-[12px] font-mono truncate max-w-[140px] ${
        tab.connecting ? 'text-status-warning'
        : tab.connectionError ? 'text-status-error'
        : isActive ? 'text-void-text' : 'text-[#666]'
      }`} style={{ transition: 'color 200ms ease' }}>
        {tab.title}
      </span>

      {/* Type badge */}
      {typeBadge && (
        <span className="text-[10px] text-void-text-ghost">{typeBadge}</span>
      )}

      {/* Offline badge */}
      {/* Connection state badges */}
      {tab.connectionError && (
        <span className="text-[9px] text-status-error px-[6px] py-[1px] rounded-[3px]"
          style={{ background: 'rgba(255,95,87,0.08)' }}>
          failed
        </span>
      )}
      {!tab.connected && tab.disconnectedAt && !tab.connectionError && (
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
        className={`flex items-center justify-center w-[18px] h-[18px] rounded-[4px] text-[13px] transition-all cursor-pointer hover:bg-void-surface ${
          tab.pinned ? 'text-accent opacity-60' : `text-void-text-ghost ${isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'}`
        }`}
        onClick={(e) => { e.stopPropagation(); if (!tab.pinned) closeTab(tab.id); }}
      >
        {tab.pinned ? '📌' : '✕'}
      </span>
    </div>
  );
}

export function TabBar() {
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const addTab = useAppStore((s) => s.addTab);

  const reorderTabs = (fromId: string, toId: string) => {
    useAppStore.setState((state) => {
      const newTabs = [...state.tabs];
      const fromIdx = newTabs.findIndex(t => t.id === fromId);
      const toIdx = newTabs.findIndex(t => t.id === toId);
      if (fromIdx === -1 || toIdx === -1) return {};
      const [moved] = newTabs.splice(fromIdx, 1);
      newTabs.splice(toIdx, 0, moved);
      return { tabs: newTabs };
    });
  };
  const closeTab = useAppStore((s) => s.closeTab);
  const updateTab = useAppStore((s) => s.updateTab);
  const disconnectTab = useAppStore((s) => s.disconnectTab);
  const reconnectTab = useAppStore((s) => s.reconnectTab);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; tab: Tab } | null>(null);

  const handleContextMenu = (e: React.MouseEvent, tab: Tab) => {
    setCtxMenu({ x: e.clientX, y: e.clientY, tab });
  };

  const getMenuItems = (tab: Tab): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];

    if (tab.connected) {
      items.push({ label: 'Disconnect', action: () => disconnectTab(tab.id) });
    } else if (tab.disconnectedAt) {
      items.push({ label: 'Reconnect', action: () => reconnectTab(tab.id) });
    }

    if (items.length > 0) items.push({ label: '', separator: true });

    items.push({
      label: tab.pinned ? 'Unpin tab' : 'Pin tab',
      action: () => updateTab(tab.id, { pinned: !tab.pinned }),
    });
    items.push({ label: 'Close tab', shortcut: '⌘W', disabled: tab.pinned, action: () => closeTab(tab.id) });
    items.push({
      label: 'Close other tabs',
      disabled: tabs.length <= 1,
      action: () => { tabs.forEach((t) => { if (t.id !== tab.id) closeTab(t.id); }); },
    });
    items.push({ label: '', separator: true });
    items.push({
      label: 'Duplicate tab',
      disabled: tab.type === 'new-connection',
      action: () => {
        if (tab.type === 'ssh' && tab.connectionConfig) {
          addTab('ssh', { title: tab.title, connectionConfig: tab.connectionConfig });
        } else if (tab.type === 'local') {
          addTab('local');
        }
      },
    });

    // Detach to new window
    if (tabs.length > 1) {
      items.push({ label: '', separator: true });
      items.push({
        label: 'Move to new window',
        action: () => {
          const tabData = { ...tab };
          closeTab(tab.id);
          window.void.app.detachTab(tabData, window.screenX + 50, window.screenY + 50);
        },
      });
    }

    return items;
  };

  return (
    <div data-tabbar className="flex items-end bg-void-base overflow-x-auto shrink-0 px-3 pt-[10px]">
      <div className="flex items-end min-w-0">
        {tabs.map((tab) => (
          <TabItem key={tab.id} tab={tab} isActive={tab.id === activeTabId} onContextMenu={handleContextMenu} onReorder={reorderTabs} />
        ))}
      </div>
      <div
        className="flex items-center justify-center w-8 h-8 text-void-text-dim hover:text-void-text-muted cursor-pointer text-[16px] shrink-0"
        onClick={() => addTab('new-connection')}
      >
        +
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={getMenuItems(ctxMenu.tab)}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}
