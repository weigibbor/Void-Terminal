interface AIDangerDialogProps {
  command: string;
  reason: string;
  onCancel: () => void;
  onProceed: () => void;
}

export function AIDangerDialog({ command, reason, onCancel, onProceed }: AIDangerDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-void-base border border-status-error/30 rounded-void-2xl shadow-2xl animate-palette-in animate-danger-shake overflow-hidden">
        {/* Header */}
        <div className="bg-status-error/10 px-5 py-4 border-b border-status-error/20">
          <div className="flex items-center gap-2">
            <span className="text-status-error text-lg">&#9888;</span>
            <h2 className="text-lg text-status-error font-semibold">DANGER DETECTED</h2>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <code className="block bg-void-input border border-void-border rounded-void p-3 text-sm text-void-text font-mono">
            {command}
          </code>
          <p className="text-sm text-void-text-muted">{reason}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-void-border">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-void-surface border border-void-border text-void-text text-sm rounded-void-lg hover:border-void-border-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-status-error/20 border border-status-error/30 text-status-error text-sm rounded-void-lg hover:bg-status-error/30 transition-colors"
          >
            Proceed anyway
          </button>
        </div>
      </div>
    </div>
  );
}
