import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../../stores/app-store';
import { easing, duration } from '../../utils/motion';

interface AIClipboardOverlayProps {
  visible: boolean;
  onClose: () => void;
  onPaste: (text: string) => void;
}

export function AIClipboardOverlay({ visible, onClose, onPaste }: AIClipboardOverlayProps) {
  const [clipText, setClipText] = useState('');
  const [analysis, setAnalysis] = useState<{ explanation: string; safe: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      navigator.clipboard.readText().then((text) => {
        setClipText(text);
        if (text.trim()) analyzeClipboard(text);
      });
    } else {
      setClipText('');
      setAnalysis(null);
    }
  }, [visible]);

  const analyzeClipboard = async (text: string) => {
    setLoading(true);
    try {
      // Use danger check for commands, or explain for output
      const looksLikeCommand = text.split('\n').length <= 3 && !text.includes('  ');
      if (looksLikeCommand) {
        const result = await window.void.ai.checkDanger(text, 'clipboard');
        setAnalysis({
          explanation: result.isDangerous
            ? `⚠ ${result.reason}`
            : 'This command looks safe to paste.',
          safe: !result.isDangerous,
        });
      } else {
        setAnalysis({
          explanation: `${text.split('\n').length} lines, ${text.length} characters. Multi-line content.`,
          safe: true,
        });
      }
    } catch {
      setAnalysis({ explanation: 'Could not analyze clipboard content.', safe: true });
    }
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: duration.fast }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: duration.normal, ease: easing.enter }}
            className="w-full max-w-md"
            style={{
              background: 'rgba(16,16,20,0.98)',
              border: '0.5px solid #2A2A30',
              borderRadius: '10px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: '0.5px solid #2A2A30' }}>
              <div className="w-5 h-5 rounded-[5px] flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.1)' }}>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="2" width="10" height="12" rx="1.5" stroke="#F97316" strokeWidth="1.3" />
                  <path d="M6 2V1h4v1" stroke="#F97316" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[11px] text-void-text font-medium font-sans">AI Clipboard</span>
              <span className="text-[8px] text-void-text-ghost ml-auto font-mono">⌘⇧V</span>
            </div>

            {/* Clipboard preview */}
            <div className="px-4 py-3">
              <div className="text-[8px] text-void-text-ghost mb-1 font-sans">CLIPBOARD CONTENT</div>
              <pre className="text-[10px] text-void-text font-mono p-3 rounded-[6px] max-h-[120px] overflow-auto"
                style={{ background: 'rgba(0,0,0,0.3)', border: '0.5px solid #1A1A1E' }}>
                {clipText || '(empty)'}
              </pre>
            </div>

            {/* AI Analysis */}
            <div className="px-4 pb-3">
              {loading ? (
                <div className="text-[9px] text-void-text-ghost font-sans animate-pulse">Analyzing...</div>
              ) : analysis ? (
                <div className="flex items-start gap-2 p-2 rounded-[5px]"
                  style={{
                    background: analysis.safe ? 'rgba(40,200,64,0.04)' : 'rgba(255,95,87,0.04)',
                    border: `0.5px solid ${analysis.safe ? 'rgba(40,200,64,0.12)' : 'rgba(255,95,87,0.12)'}`,
                  }}>
                  <span className={`w-[5px] h-[5px] rounded-full mt-[3px] shrink-0 ${analysis.safe ? 'bg-status-online' : 'bg-status-error'}`} />
                  <span className={`text-[9px] font-sans ${analysis.safe ? 'text-void-text-muted' : 'text-status-error'}`}>
                    {analysis.explanation}
                  </span>
                </div>
              ) : null}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-4 py-3" style={{ borderTop: '0.5px solid #2A2A30' }}>
              <button onClick={onClose}
                className="px-3 py-[5px] text-[10px] text-void-text-dim font-sans rounded-[5px]"
                style={{ border: '0.5px solid #2A2A30' }}>
                Cancel
              </button>
              <button
                onClick={() => { onPaste(clipText); onClose(); }}
                disabled={!clipText}
                className="px-4 py-[5px] text-[10px] text-void-base font-medium font-sans rounded-[5px] bg-accent hover:bg-accent-hover transition-colors disabled:opacity-30">
                Paste
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
