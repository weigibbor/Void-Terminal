import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { getKeybindings } from '../hooks/useKeyboard';

export function KeyboardOverlay() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        timer = setTimeout(() => setVisible(true), 800);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Control') {
        clearTimeout(timer);
        setVisible(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); clearTimeout(timer); };
  }, []);

  const bindings = getKeybindings();
  const format = (keys: string) => keys.split('+').map(k => k === 'cmd' ? '⌘' : k === 'shift' ? '⇧' : k.toUpperCase()).join('');

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15 }}
          className="fixed bottom-16 left-1/2 -translate-x-1/2 z-50"
          style={{ background: 'var(--base, #0A0A0D)', border: '0.5px solid var(--border)', borderRadius: '12px', boxShadow: '0 16px 48px rgba(0,0,0,0.5)', padding: '16px 20px', minWidth: '360px' }}
        >
          <div className="text-[10px] text-void-text-dim uppercase tracking-[1px] font-mono mb-2">Keyboard Shortcuts</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-[4px]">
            {bindings.slice(0, 16).map(kb => (
              <div key={kb.id} className="flex items-center justify-between py-[2px]">
                <span className="text-[10px] text-void-text-muted font-sans">{kb.description}</span>
                <kbd className="text-[9px] text-void-text-ghost font-mono px-[6px] py-[1px] rounded-[3px]" style={{ background: 'var(--elevated, #141418)', border: '0.5px solid var(--border)' }}>{format(kb.keys)}</kbd>
              </div>
            ))}
          </div>
          <div className="text-[8px] text-void-text-ghost font-mono text-center mt-2">Hold ⌘ to show · Release to dismiss</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
