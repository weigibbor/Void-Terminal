import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { easing, duration } from '../utils/motion';

interface MultiLineInputProps {
  visible: boolean;
  onSubmit: (text: string) => void;
  onClose: () => void;
  prompt?: string;
}

export function MultiLineInput({ visible, onSubmit, onClose, prompt }: MultiLineInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      setText('');
    }
  }, [visible]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (text.trim()) {
        onSubmit(text);
        setText('');
        onClose();
      }
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ maxHeight: 0, opacity: 0 }}
          animate={{ maxHeight: 200, opacity: 1 }}
          exit={{ maxHeight: 0, opacity: 0 }}
          transition={{ duration: duration.normal, ease: easing.enter }}
          className="shrink-0 overflow-hidden"
          style={{ borderTop: '0.5px solid #2A2A30' }}
        >
          <div className="bg-void-input rounded-[8px] m-2 overflow-hidden" style={{ border: '0.5px solid #2A2A30' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-[10px] py-[6px]" style={{ borderBottom: '0.5px solid #1A1A1E' }}>
              <div className="flex items-center gap-[6px]">
                {prompt && <span className="text-[10px] text-status-online font-mono">{prompt}</span>}
                <span className="text-[9px] text-void-text-ghost">Multi-line input</span>
              </div>
              <div className="flex gap-2">
                <span className="text-[8px] text-void-text-ghost px-[6px] py-[2px] rounded-[3px]" style={{ border: '0.5px solid #2A2A30' }}>
                  Shift+↵ new line
                </span>
                <span className="text-[8px] text-accent px-[6px] py-[2px] rounded-[3px]" style={{ border: '0.5px solid rgba(249,115,22,0.25)' }}>
                  ↵ Execute
                </span>
              </div>
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full bg-transparent px-3 py-2 text-[11px] text-void-text font-mono leading-[1.6] resize-none outline-none"
              style={{ minHeight: '56px' }}
              placeholder="Type your command..."
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
