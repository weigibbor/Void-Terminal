import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const STEPS = [
  { title: 'Welcome to Void Terminal', desc: 'A quick tour of the essential features.', target: null },
  { title: 'Tab Bar', desc: 'Click + to add a new SSH connection, local shell, or browser tab. Drag tabs to reorder. Right-click for options.', target: 'tab-bar' },
  { title: 'Command Palette', desc: 'Press Cmd+K to open the command palette. Quick connect by typing user@host, search commands, open tools.', target: 'cmd-palette' },
  { title: 'SFTP Sidebar', desc: 'Click SFTP to browse remote files. Drag-drop to upload. Double-click to preview. Switch between Remote/Local/Split.', target: 'sftp' },
  { title: 'Notes & AI Chat', desc: 'Click Notes to save server-specific notes. Switch to AI Chat tab — the AI sees your terminal and can fix errors.', target: 'notes' },
  { title: 'Settings', desc: 'Press Cmd+, to open settings as a tab. Choose themes, customize shortcuts, backup connections.', target: 'settings' },
  { title: 'Keyboard Shortcuts', desc: 'Cmd+D to split, Cmd+W to close, Cmd+1-9 to switch tabs. Customize in Settings > Shortcuts.', target: null },
  { title: 'You\'re ready!', desc: 'Connect to your first server and explore. Press Cmd+K anytime to find anything.', target: null },
];

export function InteractiveTutorial({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.7)' }}>
        <motion.div
          key={step}
          initial={{ scale: 0.95, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-full"
          style={{ maxWidth: '400px', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
          {/* Progress */}
          <div className="flex gap-[3px] px-5 pt-4 mb-3">
            {STEPS.map((_, i) => (
              <div key={i} className="flex-1 h-[3px] rounded-full transition-colors" style={{ background: i <= step ? '#F97316' : 'var(--border)' }} />
            ))}
          </div>

          <div className="px-5 pb-5">
            <div className="text-[9px] text-void-text-ghost font-mono mb-2">Step {step + 1} of {STEPS.length}</div>
            <div className="text-[16px] text-void-text font-semibold font-sans mb-2">{current.title}</div>
            <div className="text-[12px] text-void-text-dim font-sans leading-relaxed mb-5">{current.desc}</div>

            <div className="flex items-center justify-between">
              <button onClick={onClose} className="text-[11px] text-void-text-ghost bg-transparent border-none cursor-pointer font-sans">Skip tutorial</button>
              <div className="flex gap-2">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="px-[14px] py-[7px] rounded-[6px] text-[11px] text-void-text-dim cursor-pointer font-sans"
                    style={{ border: '0.5px solid var(--border)' }}>Back</button>
                )}
                <button onClick={() => isLast ? onClose() : setStep(s => s + 1)}
                  className="px-[14px] py-[7px] rounded-[6px] text-[11px] font-semibold cursor-pointer font-sans border-none"
                  style={{ background: '#F97316', color: 'var(--base)' }}>{isLast ? 'Get started' : 'Next'}</button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
