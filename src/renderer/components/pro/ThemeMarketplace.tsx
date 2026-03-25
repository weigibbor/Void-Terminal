import { useState } from 'react';
import { THEMES, AppTheme } from '../../utils/constants';
import { applyTheme } from '../SettingsPanel';

interface CommunityTheme { id: string; name: string; author: string; installs: number; preview: AppTheme; }

const COMMUNITY_THEMES: CommunityTheme[] = [
  { id: 'nord', name: 'Nord', author: 'Arctic Studio', installs: 2400, preview: {
    name: 'Nord', terminal: { ...THEMES.dark.terminal, background: '#2E3440', foreground: '#D8DEE9', cursor: '#88C0D0', cursorAccent: '#2E3440' },
    ui: { base: '#2E3440', surface: '#3B4252', elevated: '#434C5E', input: '#3B4252', border: '#4C566A', text: '#ECEFF4', textMuted: '#D8DEE9', textDim: '#81A1C1', textGhost: '#4C566A', accent: '#88C0D0' },
  }},
  { id: 'dracula', name: 'Dracula', author: 'Zeno Rocha', installs: 3100, preview: {
    name: 'Dracula', terminal: { ...THEMES.dark.terminal, background: '#282A36', foreground: '#F8F8F2', cursor: '#FF79C6', cursorAccent: '#282A36' },
    ui: { base: '#282A36', surface: '#343746', elevated: '#44475A', input: '#343746', border: '#6272A4', text: '#F8F8F2', textMuted: '#BD93F9', textDim: '#6272A4', textGhost: '#44475A', accent: '#FF79C6' },
  }},
  { id: 'solarized', name: 'Solarized Dark', author: 'Ethan Schoonover', installs: 1800, preview: {
    name: 'Solarized', terminal: { ...THEMES.dark.terminal, background: '#002B36', foreground: '#839496', cursor: '#B58900', cursorAccent: '#002B36' },
    ui: { base: '#002B36', surface: '#073642', elevated: '#0A3F4F', input: '#073642', border: '#586E75', text: '#FDF6E3', textMuted: '#93A1A1', textDim: '#657B83', textGhost: '#586E75', accent: '#B58900' },
  }},
  { id: 'monokai', name: 'Monokai Pro', author: 'Wimer Hazenberg', installs: 2700, preview: {
    name: 'Monokai', terminal: { ...THEMES.dark.terminal, background: '#2D2A2E', foreground: '#FCFCFA', cursor: '#FFD866', cursorAccent: '#2D2A2E' },
    ui: { base: '#2D2A2E', surface: '#383539', elevated: '#403E41', input: '#383539', border: '#5B595C', text: '#FCFCFA', textMuted: '#C1C0C0', textDim: '#727072', textGhost: '#5B595C', accent: '#FFD866' },
  }},
];

export function ThemeMarketplace({ onClose }: { onClose: () => void }) {
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem('void-theme') || 'dark');
  const [category, setCategory] = useState<'builtin' | 'community'>('builtin');

  const installTheme = (id: string, theme: AppTheme) => {
    // Save custom theme to localStorage
    const customs = JSON.parse(localStorage.getItem('void-custom-themes') || '{}');
    customs[id] = theme;
    localStorage.setItem('void-custom-themes', JSON.stringify(customs));
    localStorage.setItem('void-theme', id);
    applyTheme(id);
    setActiveTheme(id);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="w-full flex flex-col" style={{ maxWidth: '600px', maxHeight: '75vh', background: 'var(--base)', border: '0.5px solid var(--border)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          <div className="text-[13px] text-void-text font-semibold font-sans">Themes</div>
          <button onClick={onClose} className="text-[18px] text-void-text-ghost hover:text-void-text bg-transparent border-none cursor-pointer leading-none">×</button>
        </div>
        <div className="flex gap-[6px] px-5 py-2 shrink-0" style={{ borderBottom: '0.5px solid var(--border)' }}>
          {(['builtin', 'community'] as const).map(c => (
            <button key={c} onClick={() => setCategory(c)}
              className={`px-[10px] py-[4px] rounded-[5px] text-[10px] font-sans cursor-pointer ${category === c ? 'text-accent' : 'text-void-text-ghost'}`}
              style={{ border: `0.5px solid ${category === c ? 'rgba(249,115,22,0.3)' : 'transparent'}` }}>
              {c === 'builtin' ? 'Built-in' : 'Community'}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          <div className="grid grid-cols-2 gap-3">
            {category === 'builtin' ? (
              Object.entries(THEMES).map(([id, theme]) => (
                <div key={id} className="rounded-[8px] overflow-hidden cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all"
                  style={{ border: `1.5px solid ${activeTheme === id ? '#F97316' : 'var(--border)'}` }}
                  onClick={() => { applyTheme(id); localStorage.setItem('void-theme', id); setActiveTheme(id); }}>
                  <div className="h-[60px] p-2 font-mono text-[8px] leading-[1.4]" style={{ background: theme.terminal.background, color: theme.terminal.foreground }}>
                    <span style={{ color: theme.terminal.green }}>user@server</span>:<span style={{ color: theme.terminal.blue }}>~$</span> ls -la
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between" style={{ background: theme.ui.surface }}>
                    <span className="text-[11px] font-medium" style={{ color: theme.ui.text }}>{theme.name}</span>
                    {activeTheme === id && <span className="text-[8px] text-accent font-mono">ACTIVE</span>}
                  </div>
                </div>
              ))
            ) : (
              COMMUNITY_THEMES.map(ct => (
                <div key={ct.id} className="rounded-[8px] overflow-hidden cursor-pointer hover:ring-1 hover:ring-accent/30 transition-all"
                  style={{ border: `1.5px solid ${activeTheme === ct.id ? '#F97316' : 'var(--border)'}` }}
                  onClick={() => installTheme(ct.id, ct.preview)}>
                  <div className="h-[60px] p-2 font-mono text-[8px] leading-[1.4]" style={{ background: ct.preview.terminal.background, color: ct.preview.terminal.foreground }}>
                    <span style={{ color: ct.preview.terminal.green }}>user@server</span>:<span style={{ color: ct.preview.terminal.blue }}>~$</span> deploy
                  </div>
                  <div className="px-3 py-2" style={{ background: ct.preview.ui.surface }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium" style={{ color: ct.preview.ui.text }}>{ct.name}</span>
                      <span className="text-[8px]" style={{ color: ct.preview.ui.textDim }}>{ct.installs} installs</span>
                    </div>
                    <span className="text-[9px]" style={{ color: ct.preview.ui.textDim }}>by {ct.author}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
