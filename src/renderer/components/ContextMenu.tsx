import { useEffect, useRef } from 'react';

export interface ContextMenuItem {
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  action?: () => void;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', handler);
    window.addEventListener('keydown', keyHandler);
    return () => {
      window.removeEventListener('mousedown', handler);
      window.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  // Keep menu within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const el = menuRef.current;
    if (rect.right > window.innerWidth) {
      el.style.left = `${window.innerWidth - rect.width - 8}px`;
    }
    if (rect.bottom > window.innerHeight) {
      el.style.top = `${window.innerHeight - rect.height - 8}px`;
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-50"
      style={{
        left: x,
        top: y,
        minWidth: '160px',
        background: 'rgba(22,22,26,0.98)',
        border: '0.5px solid var(--border)',
        borderRadius: '6px',
        padding: '4px 0',
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        animation: 'paletteIn 120ms cubic-bezier(0,0,0.2,1)',
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1" style={{ height: '0.5px', background: '#2A2A30', margin: '4px 8px' }} />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            className={`w-full flex items-center gap-[8px] px-3 py-[5px] text-left text-[11px] font-sans transition-colors ${
              item.disabled
                ? 'text-void-text-ghost cursor-default'
                : item.danger
                  ? 'text-status-error hover:bg-[rgba(255,95,87,0.08)]'
                  : 'text-void-text-muted hover:bg-[rgba(255,255,255,0.04)] hover:text-void-text'
            }`}
          >
            {item.icon && <span className="w-[14px] flex items-center justify-center shrink-0">{item.icon}</span>}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-[9px] text-void-text-ghost ml-3">{item.shortcut}</span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
