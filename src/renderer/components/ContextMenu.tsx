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

/**
 * Shows a native OS context menu via Electron's Menu.popup().
 * Falls back to rendering nothing if the bridge isn't available.
 */
export function ContextMenu({ items, onClose }: ContextMenuProps) {
  // Build action map and native menu descriptors
  const actionMap = new Map<string, () => void>();
  const nativeItems = items.map((item, i) => {
    if (item.separator) return { id: `sep-${i}`, label: '', type: 'separator' as const };
    const id = `item-${i}`;
    if (item.action) actionMap.set(id, item.action);
    return {
      id,
      label: item.label + (item.shortcut ? `   ${item.shortcut}` : ''),
      enabled: !item.disabled,
    };
  });

  // Show native context menu
  (window as any).void.contextMenu.show(nativeItems).then((clickedId: string | null) => {
    if (clickedId) {
      const action = actionMap.get(clickedId);
      action?.();
    }
    onClose();
  });

  // Render nothing — the native menu handles everything
  return null;
}
