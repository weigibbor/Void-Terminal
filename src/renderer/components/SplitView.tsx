import { useRef, useCallback, useState } from 'react';
import { useAppStore } from '../stores/app-store';
import { TerminalPane } from './TerminalPane';
import { ConnectionPanel } from './ConnectionPanel';
import { BrowserPane } from './BrowserPane';
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
    if (activeTab?.type === 'browser') {
      return <BrowserPane tab={activeTab} />;
    }
    return (
      <div className="flex-1 flex items-center justify-center bg-void-elevated text-void-text-ghost text-2xs">
        No session
      </div>
    );
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
  const startRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      startRef.current = direction === 'vertical' ? e.clientX : e.clientY;

      const handleMouseMove = (ev: MouseEvent) => {
        const current = direction === 'vertical' ? ev.clientX : ev.clientY;
        const delta = current - startRef.current;
        startRef.current = current;
        onDrag(delta);
      };

      const handleMouseUp = () => {
        setDragging(false);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [direction, onDrag],
  );

  return (
    <div
      className={`shrink-0 transition-colors ${
        direction === 'vertical'
          ? `w-px hover:w-0.5 cursor-col-resize ${dragging ? 'bg-accent w-0.5' : 'bg-void-border hover:bg-accent'}`
          : `h-px hover:h-0.5 cursor-row-resize ${dragging ? 'bg-accent h-0.5' : 'bg-void-border hover:bg-accent'}`
      }`}
      onMouseDown={handleMouseDown}
    />
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

      sizes[index] = Math.max(SPLIT_MIN_WIDTH / totalWidth, sizes[index] + deltaFrac);
      sizes[index + 1] = Math.max(SPLIT_MIN_WIDTH / totalWidth, sizes[index + 1] - deltaFrac);

      // Normalize
      const sum = sizes.reduce((a, b) => a + b, 0);
      setPaneSizes(sizes.map((s) => s / sum));
    },
    [paneSizes, setPaneSizes],
  );

  const handleDragV = useCallback(
    (delta: number) => {
      if (!containerRef.current) return;
      const totalHeight = containerRef.current.offsetHeight;
      const sizes = [...paneSizes];
      const deltaFrac = delta / totalHeight;

      // For grid layouts, first group and second group
      if (splitLayout === '2+1-grid') {
        // Top row takes first 2 sizes, bottom row is third
        const topSize = (sizes[0] + sizes[1]) / 2;
        const newTop = Math.max(SPLIT_MIN_HEIGHT / totalHeight, topSize + deltaFrac / 2);
        const newBottom = Math.max(SPLIT_MIN_HEIGHT / totalHeight, sizes[2] - deltaFrac);
        const total = newTop * 2 + newBottom;
        sizes[0] = newTop / total;
        sizes[1] = newTop / total;
        sizes[2] = newBottom / total;
      } else {
        const topSize = sizes[0];
        const newTop = Math.max(SPLIT_MIN_HEIGHT / totalHeight, topSize + deltaFrac);
        const bottomSize = (sizes[1] + sizes[2]) / 2;
        const newBottom = Math.max(SPLIT_MIN_HEIGHT / totalHeight, bottomSize - deltaFrac / 2);
        const total = newTop + newBottom * 2;
        sizes[0] = newTop / total;
        sizes[1] = newBottom / total;
        sizes[2] = newBottom / total;
      }

      setPaneSizes(sizes);
    },
    [paneSizes, setPaneSizes, splitLayout],
  );

  if (splitLayout === 'single') {
    return (
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
        <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
      </div>
    );
  }

  if (splitLayout === '2-col') {
    return (
      <div ref={containerRef} className="flex-1 flex min-h-0">
        <div style={{ flex: paneSizes[0] }} className="min-w-0">
          <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(0, d)} />
        <div style={{ flex: paneSizes[1] }} className="min-w-0">
          <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
        </div>
      </div>
    );
  }

  if (splitLayout === '3-col') {
    return (
      <div ref={containerRef} className="flex-1 flex min-h-0">
        <div style={{ flex: paneSizes[0] }} className="min-w-0">
          <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(0, d)} />
        <div style={{ flex: paneSizes[1] }} className="min-w-0">
          <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(1, d)} />
        <div style={{ flex: paneSizes[2] }} className="min-w-0">
          <PaneContent tabId={paneTabIds[2]} paneIndex={2} />
        </div>
      </div>
    );
  }

  if (splitLayout === '2+1-grid') {
    const topSize = paneSizes[0] + paneSizes[1];
    const bottomSize = paneSizes[2];
    return (
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
        <div style={{ flex: topSize }} className="flex min-h-0">
          <div style={{ flex: paneSizes[0] }} className="min-w-0">
            <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
          </div>
          <Divider direction="vertical" onDrag={(d) => handleDragH(0, d)} />
          <div style={{ flex: paneSizes[1] }} className="min-w-0">
            <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
          </div>
        </div>
        <Divider direction="horizontal" onDrag={handleDragV} />
        <div style={{ flex: bottomSize }} className="min-w-0">
          <PaneContent tabId={paneTabIds[2]} paneIndex={2} />
        </div>
      </div>
    );
  }

  // 1+2-grid
  const topSize = paneSizes[0];
  const bottomSize = paneSizes[1] + paneSizes[2];
  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0">
      <div style={{ flex: topSize }} className="min-w-0">
        <PaneContent tabId={paneTabIds[0]} paneIndex={0} />
      </div>
      <Divider direction="horizontal" onDrag={handleDragV} />
      <div style={{ flex: bottomSize }} className="flex min-h-0">
        <div style={{ flex: paneSizes[1] }} className="min-w-0">
          <PaneContent tabId={paneTabIds[1]} paneIndex={1} />
        </div>
        <Divider direction="vertical" onDrag={(d) => handleDragH(1, d)} />
        <div style={{ flex: paneSizes[2] }} className="min-w-0">
          <PaneContent tabId={paneTabIds[2]} paneIndex={2} />
        </div>
      </div>
    </div>
  );
}
