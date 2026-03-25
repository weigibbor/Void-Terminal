import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TIPS = [
  { title: 'Quick Connect', tip: 'Press ⌘K and type user@host to connect instantly without the connection form.' },
  { title: 'Tab Colors', tip: 'Assign colors to tabs in the connection form — red for production, green for development.' },
  { title: 'Smart Paste', tip: 'Pasting multi-line text shows a confirmation dialog. Choose "line by line" for safer execution.' },
  { title: 'File Preview', tip: 'Double-click any file in the SFTP sidebar to preview it without downloading.' },
  { title: 'Drag & Drop Upload', tip: 'Drag files from Finder onto the terminal to upload via SFTP. Pick the destination folder.' },
  { title: 'Command Bookmarks', tip: 'Right-click in the terminal and choose "Bookmark last command" to save it for quick access.' },
  { title: 'SSH Config Import', tip: 'Click "Import SSH config" in the connection hub to auto-import from ~/.ssh/config.' },
  { title: 'Tab Tear-Off', tip: 'Drag a tab out of the tab bar to open it in a new window.' },
  { title: 'Dual-Pane SFTP', tip: 'Click "Split" in the SFTP sidebar to see local and remote files side-by-side.' },
  { title: 'Keyboard Shortcuts', tip: 'Hold ⌘ for 1 second to see all available keyboard shortcuts.' },
  { title: 'Connection Groups', tip: 'Add a group name when saving connections to organize them into folders.' },
  { title: 'Snippet Variables', tip: 'Use ${host}, ${user}, ${port} in snippets — they auto-fill when you run them.' },
  { title: 'Server Dashboard', tip: 'Press ⌘K and type "dashboard" to see live CPU, RAM, and disk usage.' },
  { title: 'Encrypted Backup', tip: 'Go to Settings > General to backup all connections with AES-256 encryption.' },
  { title: 'Theme Switching', tip: 'Settings > General > Theme — choose between Dark, Light, and Midnight.' },
];

export function TipOfTheDay() {
  const [visible, setVisible] = useState(false);
  const [tip, setTip] = useState(TIPS[0]);

  useEffect(() => {
    const lastShown = localStorage.getItem('void-tip-date');
    const today = new Date().toDateString();
    if (lastShown === today) return;

    const dayIndex = Math.floor(Date.now() / 86400000) % TIPS.length;
    setTip(TIPS[dayIndex]);
    setVisible(true);
    localStorage.setItem('void-tip-date', today);
  }, []);

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.3, delay: 2 }}
        className="fixed bottom-20 right-4 z-40"
        style={{ maxWidth: '320px', background: 'var(--base, #0A0A0D)', border: '0.5px solid rgba(249,115,22,0.15)', borderRadius: '10px', boxShadow: '0 12px 40px rgba(0,0,0,0.4)', padding: '14px 16px' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[9px] text-accent uppercase tracking-[1px] font-mono mb-1">Tip of the Day</div>
            <div className="text-[12px] text-void-text font-semibold font-sans mb-[4px]">{tip.title}</div>
            <div className="text-[10px] text-void-text-dim leading-[1.5] font-sans">{tip.tip}</div>
          </div>
          <button onClick={() => setVisible(false)} className="text-[14px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none shrink-0">×</button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
