import { useRef, useCallback, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { TerminalPane } from './TerminalPane';
import { ConnectionPanel } from './ConnectionPanel';
import { ConnectionProgress } from './ConnectionProgress';
import { BrowserPane } from './BrowserPane';
import { SettingsPanel } from './SettingsPanel';
import { SPLIT_MIN_WIDTH, SPLIT_MIN_HEIGHT } from '../utils/constants';

function PaneContent({ tabId, paneIndex }: { tabId: string | null; paneIndex: number }) {
  const tabs = useAppStore((s) => s.tabs);
  const splitLayout = useAppStore((s) => s.splitLayout);
  const activeTab = tabs.find((t) => t.id === tabId);

  // All terminal-type tabs that have been created (ssh or local)
  const terminalTabs = tabs.filter((t) => t.type === 'ssh' || t.type === 'local');
  const showHeader = splitLayout !== 'single';

  // If no terminal tabs exist yet, render non-terminal content directly (no absolute positioning needed)
  const hasTerminals = terminalTabs.length > 0;

  // Simple case: no terminal tabs, just show the active content directly
  if (!hasTerminals) {
    if (activeTab?.type === 'new-connection') {
      return <ConnectionPanel tabId={activeTab.id} />;
    }
    if (activeTab?.type === 'settings') {
      return <SettingsPanel />;
    }
    if (activeTab?.type === 'browser') {
      return <BrowserPane tab={activeTab} />;
    }
    // Fallback: if tab exists but type is unexpected, or tab not found — show ConnectionPanel
    // This handles the case when a tab ID is in paneTabIds but the tab was removed
    if (tabId) {
      const fallbackTab = tabs.find(t => t.type === 'new-connection') || (tabs.length > 0 ? tabs[0] : null);
      if (fallbackTab?.type === 'new-connection') {
        return <ConnectionPanel tabId={fallbackTab.id} />;
      }
    }
    return <ConnectionPanel tabId={tabId || 'fallback'} />;
  }

  // Complex case: terminal tabs exist — use absolute stacking to preserve instances
  return (
    <div className="relative flex-1 h-full" style={{ minHeight: 0 }}>
      {terminalTabs.map((tab) => (
        <div
          key={tab.id}
          className="absolute inset-0 flex flex-col"
          style={{
            visibility: tab.id === tabId ? 'visible' : 'hidden',
            zIndex: tab.id === tabId ? 1 : 0,
          }}
        >
          <TerminalPane tab={tab} paneIndex={paneIndex} showHeader={showHeader} />
        </div>
      ))}

      {activeTab?.type === 'new-connection' && (
        <div className="absolute inset-0 z-10 flex flex-col">
          <ConnectionPanel tabId={activeTab.id} />
        </div>
      )}

      {activeTab?.type === 'settings' && (
        <div className="absolute inset-0 z-10 flex flex-col">
          <SettingsPanel />
        </div>
      )}

      {/* Connection progress overlay for connecting tabs */}
      {activeTab?.connecting && activeTab.connectionConfig && (
        <div className="absolute inset-0 z-20 flex flex-col">
          <ConnectionProgress
            host={activeTab.connectionConfig.host}
            port={activeTab.connectionConfig.port}
            username={activeTab.connectionConfig.username}
            sessionId={activeTab.sessionId}
            error={activeTab.connectionError}
            onConnected={() => {}}
            onCancel={() => {
              useAppStore.getState().updateTab(activeTab.id, { connecting: false, type: 'new-connection' });
            }}
            onFailed={() => {}}
          />
        </div>
      )}

      {/* Connection error overlay */}
      {activeTab?.connectionError && !activeTab.connecting && (
        <div className="absolute inset-0 z-20 flex flex-col">
          <ConnectionProgress
            host={activeTab.connectionConfig?.host || ''}
            port={activeTab.connectionConfig?.port || 22}
            username={activeTab.connectionConfig?.username || ''}
            error={activeTab.connectionError}
            onConnected={() => {}}
            onCancel={() => {
              useAppStore.getState().updateTab(activeTab.id, { connectionError: undefined, type: 'new-connection' });
            }}
            onFailed={() => {}}
          />
        </div>
      )}

      {activeTab?.type === 'browser' && (
        <div className="absolute inset-0 z-10 flex flex-col">
          <BrowserPane tab={activeTab} />
        </div>
      )}
    </div>
  );
}

function Divider({
  direction,
  onDrag,
}: {
  direction: 'vertical' | 'horizontal';
  onDrag: (delta: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false);
  const onDragRef = useRef(onDrag);
  onDragRef.current = onDrag;

  const isV = direction === 'vertical';
  const active = dragging || hovered;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
    let lastPos = isV ? e.clientX : e.clientY;

    const onMove = (ev: MouseEvent) => {
      const current = isV ? ev.clientX : ev.clientY;
      const delta = current - lastPos;
      lastPos = current;
      if (delta !== 0) onDragRef.current(delta);
    };

    const onUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = isV ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div
      className="shrink-0"
      style={{
        [isV ? 'width' : 'height']: '6px',
        cursor: isV ? 'col-resize' : 'row-resize',
        zIndex: 20,
        position: 'relative',
        background: 'transparent',
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Visible line */}
      <div style={{
        position: 'absolute',
        [isV ? 'width' : 'height']: active ? '3px' : '1px',
        [isV ? 'height' : 'width']: '100%',
        [isV ? 'left' : 'top']: '50%',
        transform: isV ? 'translateX(-50%)' : 'translateY(-50%)',
        background: active ? '#F97316' : '#2A2A30',
        borderRadius: '2px',
        transition: 'all 150ms ease',
        pointerEvents: 'none',
      }} />
    </div>
  );
}

export function SplitView() {
  const splitLayout = useAppStore((s) => s.splitLayout);
  const paneTabIds = useAppStore((s) => s.paneTabIds);
  const paneSizes = useAppStore((s) => s.paneSizes);
  const setPaneSizes = useAppStore((s) => s.setPaneSizes);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDragH = useCallback(
    (index: number, delta: number) => {
      if (!containerRef.current) return;
      const totalWidth = containerRef.current.offsetWidth;
      const sizes = [...paneSizes];
      const deltaFrac = delta / totalWidth;
      const minFrac = SPLIT_MIN_WIDTH / totalWidth;

      sizes[index] = Math.max(minFrac, sizes[index] + deltaFrac);
      sizes[index + 1] = Math.max(minFrac, sizes[index + 1] - deltaFrac);

      // For grid layouts, only normalize the horizontal pair, preserve vertical ratio
      if (splitLayout === '2+1-grid') {
        // paneSizes[0] and [1] are horizontal, [2] is vertical — don't touch [2]
        const hSum = sizes[0] + sizes[1];
        sizes[0] = sizes[0] / hSum;
        sizes[1] = sizes[1] / hSum;
      } else if (splitLayout === '1+2-grid') {
        // paneSizes[1] and [2] are horizontal, [0] is vertical — don't touch [0]
        const hSum = sizes[1] + sizes[2];
        sizes[1] = sizes[1] / hSum;
        sizes[2] = sizes[2] / hSum;
      } else {
        // 2-col, 3-col: normalize all
        const sum = sizes.reduce((a, b) => a + b, 0);
        for (let i = 0; i < sizes.length; i++) sizes[i] = sizes[i] / sum;
      }

      setPaneSizes(sizes);
    },
    [paneSizes, setPaneSizes, splitLayout],
  );

  const handleDragV = useCallback(
    (delta: number) => {
      if (!containerRef.current) return;
      const totalHeight = containerRef.current.offsetHeight;
      const sizes = [...paneSizes];
      const deltaFrac = delta / totalHeight;
      const minFrac = SPLIT_MIN_HEIGHT / totalHeight;

      if (splitLayout === '2+1-grid') {
        // paneSizes[2] controls vertical split (top height ratio)
        sizes[2] = Math.max(minFrac, Math.min(1 - minFrac, sizes[2] + deltaFrac));
      } else {
        // 1+2-grid: paneSizes[0] controls vertical split (top height ratio)
        sizes[0] = Math.max(minFrac, Math.min(1 - minFrac, sizes[0] + deltaFrac));
      }

      setPaneSizes(sizes);
    },
    [paneSizes, setPaneSizes, splitLayout],
  );

  if (splitLayout === 'single') {
    return (
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0 bg-void-elevated">
        <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
      </div>
    );
  }

  if (splitLayout === '2-col') {
    return (
      <div ref={containerRef} className="flex-1 flex min-h-0 bg-void-elevated">
        <div style={{ flex: paneSizes[0] }} className="min-w-0 h-full bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(0, d)} />
        <div style={{ flex: paneSizes[1] }} className="min-w-0 h-full bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
        </div>
      </div>
    );
  }

  if (splitLayout === '3-col') {
    return (
      <div ref={containerRef} className="flex-1 flex min-h-0 bg-void-elevated">
        <div style={{ flex: paneSizes[0] }} className="min-w-0 h-full bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(0, d)} />
        <div style={{ flex: paneSizes[1] }} className="min-w-0 h-full bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(1, d)} />
        <div style={{ flex: paneSizes[2] }} className="min-w-0 h-full bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[2]} paneIndex={2} />
        </div>
      </div>
    );
  }

  if (splitLayout === '2+1-grid') {
    return (
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0 bg-void-elevated">
        <div style={{ flex: `${paneSizes[2] * 100}%` }} className="flex min-h-[80px] bg-void-elevated">
          <div style={{ flex: paneSizes[0] }} className="min-w-0 bg-void-elevated overflow-hidden relative">
            <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
          </div>
          <Divider direction="vertical" onDrag={(d) => handleDragH(0, d)} />
          <div style={{ flex: paneSizes[1] }} className="min-w-0 bg-void-elevated overflow-hidden relative">
            <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
          </div>
        </div>
        <Divider direction="horizontal" onDrag={handleDragV} />
        <div className="flex-1 min-h-[80px] bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[2]} paneIndex={2} />
        </div>
      </div>
    );
  }

  // 1+2-grid
  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 bg-void-elevated">
      <div style={{ flex: `${paneSizes[0] * 100}%` }} className="min-h-[80px] bg-void-elevated overflow-hidden relative">
        <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
      </div>
      <Divider direction="horizontal" onDrag={handleDragV} />
      <div className="flex-1 flex min-h-[80px] bg-void-elevated">
        <div style={{ flex: paneSizes[1] }} className="min-w-0 bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(1, d)} />
        <div style={{ flex: paneSizes[2] }} className="min-w-0 bg-void-elevated overflow-hidden relative">
          <PaneContent tabId={paneTabIds[2]} paneIndex={2} />
        </div>
      </div>
    </div>
  );
}
