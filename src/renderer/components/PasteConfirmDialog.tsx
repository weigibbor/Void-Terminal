import { AnimatePresence, motion } from 'framer-motion';

interface PasteConfirmDialogProps {
  open: boolean;
  text: string;
  onPasteAll: () => void;
  onPasteLineByLine: () => void;
  onCancel: () => void;
}

export function PasteConfirmDialog({ open, text, onPasteAll, onPasteLineByLine, onCancel }: PasteConfirmDialogProps) {
  const lines = text.split('\n');
  const lineCount = lines.length;
  const preview = lines.slice(0, 8).join('\n') + (lineCount > 8 ? `\n... (${lineCount - 8} more lines)` : '');
  const dontAsk = localStorage.getItem('void-paste-dont-ask');

  if (dontAsk === 'all') { onPasteAll(); return null; }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, y: 6, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 6, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-full"
            style={{ maxWidth: '400px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-4 pt-3 pb-0">
              <div className="text-[13px] text-void-text font-semibold font-sans">
                Multi-line paste detected
              </div>
              <div className="text-[10px] text-void-text-dim mt-[2px]">{lineCount} lines will be sent to terminal</div>
            </div>

            {/* Preview */}
            <div className="px-4 py-2">
              <pre
                className="text-[10px] font-mono text-void-text-muted p-2 rounded-[6px] overflow-auto whitespace-pre"
                style={{ background: 'var(--elevated)', border: '0.5px solid var(--border)', maxHeight: '120px', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}
              >{preview}</pre>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '0.5px solid var(--border)' }}>
              <label className="flex items-center gap-[5px] cursor-pointer">
                <input type="checkbox" onChange={(e) => {
                  if (e.target.checked) localStorage.setItem('void-paste-dont-ask', 'all');
                  else localStorage.removeItem('void-paste-dont-ask');
                }} className="accent-accent" />
                <span className="text-[9px] text-void-text-ghost">Don't ask again</span>
              </label>
              <div className="flex gap-[6px]">
                <button onClick={onCancel}
                  className="px-[12px] py-[5px] rounded-[5px] text-[10px] text-void-text-dim cursor-pointer font-sans"
                  style={{ background: 'transparent', border: '0.5px solid var(--border)' }}>Cancel</button>
                <button onClick={onPasteLineByLine}
                  className="px-[12px] py-[5px] rounded-[5px] text-[10px] text-void-text-muted cursor-pointer font-sans"
                  style={{ background: 'var(--elevated)', border: '0.5px solid var(--border)' }}>Line by line</button>
                <button onClick={onPasteAll}
                  className="px-[12px] py-[5px] rounded-[5px] text-[10px] font-semibold cursor-pointer font-sans border-none"
                  style={{ background: '#F97316', color: 'var(--base)' }}>Paste all</button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
