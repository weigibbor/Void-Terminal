import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../stores/app-store';
import { easing, duration } from '../utils/motion';

interface SFTPEntry { name: string; type: 'file' | 'directory'; size: number; children?: SFTPEntry[]; }

function getFileColor(name: string): string {
  if (['.env', '.pem', '.key'].includes(name)) return '#FEBC2E';
  if (['.log', '.out', '.err'].includes(name)) return '#555';
  if (name.startsWith('.')) return '#444';
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'].includes(ext)) return '#E8E6E0';
  return '#888';
}

function formatSize(b: number): string {
  if (b < 1024) return `${b}b`; if (b < 1048576) return `${(b/1024).toFixed(1)}kb`; return `${(b/1048576).toFixed(1)}mb`;
}

const MOCK_FILES: SFTPEntry[] = [
  { name: 'routes', type: 'directory', size: 0, children: [
    { name: 'referral.ts', type: 'file', size: 2450 }, { name: 'auth.ts', type: 'file', size: 1120 }, { name: 'slots.ts', type: 'file', size: 3840 }
  ]},
  { name: 'config', type: 'directory', size: 0, children: [] },
  { name: 'migrations', type: 'directory', size: 0, children: [] },
  { name: 'node_modules', type: 'directory', size: 0, children: [] },
  { name: '.env', type: 'file', size: 312 },
  { name: 'package.json', type: 'file', size: 1230 },
  { name: 'docker-compose.yml', type: 'file', size: 890 },
  { name: 'tsconfig.json', type: 'file', size: 445 },
  { name: '.gitignore', type: 'file', size: 120 },
];

export function SFTPSidebar() {
  const sftpCollapsed = useAppStore((s) => s.sftpCollapsed);
  const collapseSFTP = useAppStore((s) => s.collapseSFTP);
  const tabs = useAppStore((s) => s.tabs);
  const activeTabId = useAppStore((s) => s.activeTabId);
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isSSH = activeTab?.type === 'ssh' && activeTab.connected;
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['routes']));
  const [selected, setSelected] = useState<string | null>('referral.ts');
  const path = ['~', 'casino-api', 'src'];

  const toggleDir = (n: string) => setExpandedDirs(p => { const s = new Set(p); s.has(n) ? s.delete(n) : s.add(n); return s; });

  if (sftpCollapsed) {
    return (
      <motion.div initial={{ width: 240 }} animate={{ width: 44 }} transition={{ duration: duration.normal, ease: easing.standard }}
        className="bg-void-input flex flex-col items-center py-2 gap-2 shrink-0" style={{ borderRight: '0.5px solid #2A2A30' }}>
        <span className="text-[6px] text-status-info font-mono font-semibold tracking-[1px]" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>SFTP</span>
        <div className="w-[1px] h-2 bg-void-border" />
        <button onClick={collapseSFTP} className="w-[26px] h-[26px] rounded-[6px] bg-void-elevated flex items-center justify-center" style={{ border: '0.5px solid #2A2A30' }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
        </button>
        <button className="w-[26px] h-[26px] rounded-[6px] bg-void-elevated flex items-center justify-center" style={{ border: '0.5px solid #2A2A30' }}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M8 10V3M5 5l3-3 3 3M3 13h10" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
      transition={{ duration: duration.smooth, ease: easing.enter }}
      className="bg-void-input flex flex-col shrink-0 overflow-hidden" style={{ borderRight: '0.5px solid #2A2A30' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-[10px]" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <div className="flex items-center gap-[6px]">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke="#5B9BD5" strokeWidth="1.2"/></svg>
          <span className="text-[10px] text-status-info font-medium font-sans">SFTP</span>
          {isSSH && <span className="text-[8px] text-status-online px-[6px] py-[1px] rounded-[3px]" style={{ background: 'rgba(40,200,64,0.08)', border: '0.5px solid rgba(40,200,64,0.12)' }}>connected</span>}
        </div>
        <div className="flex gap-[6px] items-center">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="cursor-pointer"><path d="M8 10V3M5 5l3-3 3 3M3 13h10" stroke="#555" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" className="cursor-pointer"><path d="M3 8a5 5 0 019-2M13 8a5 5 0 01-9 2" stroke="#555" strokeWidth="1.2" strokeLinecap="round"/></svg>
          <span onClick={collapseSFTP} className="text-[11px] text-void-text-dim cursor-pointer">«</span>
        </div>
      </div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-[3px] px-3 py-[6px] text-[8px] font-mono" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
        {path.map((s, i) => (<span key={i} className="flex items-center gap-[3px]">{i > 0 && <span className="text-void-text-faint">/</span>}<span className={i < path.length - 1 ? 'text-status-info cursor-pointer' : 'text-void-text'}>{s}</span></span>))}
      </div>
      {/* File tree or not connected */}
      {!isSSH ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <svg width="20" height="20" viewBox="0 0 16 16" fill="none" className="mb-2"><circle cx="8" cy="8" r="5.5" stroke="#444" strokeWidth="1"/><line x1="5.5" y1="5.5" x2="10.5" y2="10.5" stroke="#444" strokeWidth="1" strokeLinecap="round"/></svg>
          <div className="text-[9px] text-void-text-dim font-sans">No SSH connection</div>
          <div className="text-[8px] text-void-text-ghost font-sans mt-[2px]">Connect to browse files</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-1 text-[9px] font-mono">
          {MOCK_FILES.map(e => <FileRow key={e.name} entry={e} depth={0} expanded={expandedDirs} toggle={toggleDir} selected={selected} select={setSelected} />)}
        </div>
      )}
      {/* Drop zone */}
      <div className="mx-[10px] mb-[6px] py-3 text-center rounded-[8px]" style={{ border: '1.5px dashed #2A2A30' }}>
        <div className="text-[8px] text-void-text-dim font-sans">Drop files to upload</div>
      </div>
      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-[6px] text-[7px] text-void-text-ghost font-mono" style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)' }}>
        <span>{MOCK_FILES.length} items</span>
        {isSSH && <span className="text-status-online">{activeTab?.title}</span>}
      </div>
    </motion.div>
  );
}

function FileRow({ entry: e, depth, expanded, toggle, selected, select }: { entry: SFTPEntry; depth: number; expanded: Set<string>; toggle: (n: string) => void; selected: string | null; select: (n: string | null) => void }) {
  const isDir = e.type === 'directory';
  const isExp = expanded.has(e.name);
  const isSel = selected === e.name;
  const isNM = e.name === 'node_modules';
  const color = isDir ? '#5B9BD5' : getFileColor(e.name);
  const isSens = ['.env', '.pem', '.key'].includes(e.name);
  return (<>
    <div className="flex items-center gap-[5px] py-[4px] cursor-pointer group"
      style={{ paddingLeft: `${12 + depth * 20}px`, paddingRight: '12px', background: isSel ? 'rgba(91,155,213,0.06)' : undefined, borderLeft: isSel ? '2px solid #5B9BD5' : '2px solid transparent', color: isNM ? '#444' : color }}
      onClick={() => isDir ? toggle(e.name) : select(e.name)}>
      {isDir ? <span className="text-[7px] text-void-text-ghost w-2 text-center">{isExp ? '▼' : '▶'}</span> : <span className="w-2" />}
      {isDir ? <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M2 4h5l2 2h5v7H2V4z" stroke={color} strokeWidth="1.2" fill={isExp ? color + '12' : 'none'}/></svg>
        : <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="2" stroke={isSens ? '#FEBC2E' : '#555'} strokeWidth={isSel ? '1.2' : '1'}/></svg>}
      <span className={isNM ? 'text-void-text-ghost' : ''}>{e.name}</span>
      {isSens && <span className="text-[6px] text-status-warning px-1 rounded-[2px] ml-auto" style={{ background: 'rgba(254,188,46,0.08)' }}>sensitive</span>}
      {isNM && <span className="text-[6px] text-void-text-faint ml-auto">hidden</span>}
      {!isDir && !isSens && !isNM && <span className="text-[7px] text-void-text-ghost ml-auto">{formatSize(e.size)}</span>}
      {isDir && e.children && <span className="text-[7px] text-void-text-ghost ml-auto">{e.children.length} items</span>}
      {!isDir && <div className="hidden group-hover:flex gap-1 ml-1"><span className="text-[7px] text-void-text-dim" title="Download">↓</span><span className="text-[7px] text-status-error" title="Delete">✕</span></div>}
    </div>
    {isDir && isExp && e.children?.map(c => <FileRow key={c.name} entry={c} depth={depth+1} expanded={expanded} toggle={toggle} selected={selected} select={select} />)}
  </>);
}
