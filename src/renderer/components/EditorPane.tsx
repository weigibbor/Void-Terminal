import { useRef, useEffect, useState, useCallback } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection, rectangularSelection, crosshairCursor, dropCursor } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { indentOnInput, bracketMatching, foldGutter, foldKeymap, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { useAppStore } from '../stores/app-store';
import type { Tab } from '../types';

// Language detection from file extension
function getLangExtension(filePath: string) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'ts': case 'tsx': return javascript({ jsx: true, typescript: true });
    case 'js': case 'jsx': case 'mjs': case 'cjs': return javascript({ jsx: true });
    case 'py': return python();
    case 'html': case 'htm': case 'vue': case 'svelte': return html();
    case 'css': case 'scss': case 'less': return css();
    case 'json': case 'jsonc': return json();
    case 'md': case 'mdx': return markdown();
    default: return javascript(); // Fallback
  }
}

function getLangLabel(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TypeScript JSX', js: 'JavaScript', jsx: 'JavaScript JSX',
    py: 'Python', html: 'HTML', css: 'CSS', scss: 'SCSS', json: 'JSON',
    md: 'Markdown', yml: 'YAML', yaml: 'YAML', sh: 'Shell', bash: 'Shell',
    sql: 'SQL', rs: 'Rust', go: 'Go', vue: 'Vue', svelte: 'Svelte',
    env: 'Environment', toml: 'TOML', xml: 'XML', dockerfile: 'Dockerfile',
  };
  return map[ext] || ext.toUpperCase() || 'Plain Text';
}

// Void Terminal dark theme (extends oneDark)
const voidTheme = EditorView.theme({
  '&': { backgroundColor: '#0E0E12', color: '#E8E6E0', height: '100%' },
  '.cm-content': { fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', lineHeight: '1.65', padding: '8px 0' },
  '.cm-gutters': { backgroundColor: '#111115', color: '#555', borderRight: '0.5px solid #2A2A30', fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
  '.cm-activeLineGutter': { backgroundColor: 'rgba(249,115,22,0.04)', color: '#888' },
  '.cm-activeLine': { backgroundColor: 'rgba(249,115,22,0.02)' },
  '.cm-cursor': { borderLeftColor: '#F97316' },
  '.cm-selectionBackground': { backgroundColor: 'rgba(249,115,22,0.12) !important' },
  '&.cm-focused .cm-selectionBackground': { backgroundColor: 'rgba(249,115,22,0.15) !important' },
  '.cm-matchingBracket': { backgroundColor: 'rgba(249,115,22,0.1)', outline: '1px solid rgba(249,115,22,0.3)' },
  '.cm-searchMatch': { backgroundColor: 'rgba(249,115,22,0.15)', outline: '1px solid rgba(249,115,22,0.3)' },
  '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: 'rgba(249,115,22,0.25)' },
  '.cm-foldGutter': { width: '12px' },
  '.cm-scroller': { overflow: 'auto' },
  '.cm-scroller::-webkit-scrollbar': { width: '4px', height: '4px' },
  '.cm-scroller::-webkit-scrollbar-thumb': { background: '#2A2A30', borderRadius: '2px' },
}, { dark: true });

interface EditorPaneProps {
  tab: Tab;
}

export default function EditorPane({ tab }: EditorPaneProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const updateTab = useAppStore((s) => s.updateTab);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [locked, setLocked] = useState(true); // Read-only by default
  const readOnlyCompartment = useRef(new Compartment());
  const contentRef = useRef(tab.fileContent || '');

  const filePath = tab.filePath || 'untitled';
  const fileName = filePath.split('/').pop() || 'untitled';

  // Save file via SFTP
  const saveFile = useCallback(async () => {
    if (!tab.sftpSessionId || !tab.filePath) return;
    setSaveStatus('saving');
    try {
      const result = await window.void.sftp.writeFile(tab.sftpSessionId, tab.filePath, contentRef.current);
      if (result.success) {
        setSaveStatus('saved');
        updateTab(tab.id, { unsaved: false });
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => setSaveStatus('saved'), 1500);
      } else {
        setSaveStatus('error');
      }
    } catch {
      setSaveStatus('error');
    }
  }, [tab.sftpSessionId, tab.filePath, tab.id, updateTab]);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const lang = getLangExtension(filePath);

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        contentRef.current = update.state.doc.toString();
        if (saveStatus !== 'unsaved') {
          setSaveStatus('unsaved');
          updateTab(tab.id, { unsaved: true });
        }
      }
      if (update.selectionSet) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        setCursorPos({ line: line.number, col: pos - line.from + 1 });
      }
    });

    const saveKeymap = keymap.of([{
      key: 'Mod-s',
      run: () => { saveFile(); return true; },
    }]);

    const state = EditorState.create({
      doc: tab.fileContent || '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        rectangularSelection(),
        crosshairCursor(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        EditorState.tabSize.of(2),
        readOnlyCompartment.current.of(EditorState.readOnly.of(true)),
        lang,
        oneDark,
        voidTheme,
        updateListener,
        saveKeymap,
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...searchKeymap,
          ...closeBracketsKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),
      ],
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle readOnly when locked state changes
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.dispatch({
      effects: readOnlyCompartment.current.reconfigure(
        EditorState.readOnly.of(locked)
      ),
    });
  }, [locked]);

  // Update content when tab.fileContent changes externally (e.g., AI edit detected)
  useEffect(() => {
    if (!viewRef.current || !tab.fileContent) return;
    const currentDoc = viewRef.current.state.doc.toString();
    if (tab.fileContent !== currentDoc && tab.fileContent !== contentRef.current) {
      viewRef.current.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: tab.fileContent },
      });
      contentRef.current = tab.fileContent;
    }
  }, [tab.fileContent]);

  const lineCount = viewRef.current?.state.doc.lines ?? (tab.fileContent || '').split('\n').length;
  const fileSize = new Blob([contentRef.current]).size;
  const sizeLabel = fileSize > 1024 ? `${(fileSize / 1024).toFixed(1)}KB` : `${fileSize}B`;

  // Path segments for breadcrumb
  const pathParts = filePath.split('/').filter(Boolean);
  const dirParts = pathParts.slice(0, -1);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0E0E12' }}>
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0" style={{ background: '#0A0A0D', borderBottom: '0.5px solid #2A2A30' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => useAppStore.getState().closeTab(tab.id)}
            className="flex items-center gap-1 px-3 py-1 rounded text-[11px] cursor-pointer transition-all font-medium"
            style={{ color: '#F97316', border: '0.5px solid rgba(249,115,22,0.15)', background: 'rgba(249,115,22,0.08)' }}
          >
            ← Files
          </button>
          <span className="text-[11px] font-mono" style={{ color: '#555' }}>
            {dirParts.map((p, i) => (
              <span key={i}>
                <span style={{ color: '#5B9BD5' }}>{p}</span>
                <span style={{ color: '#333' }}> › </span>
              </span>
            ))}
            <span style={{ color: '#E8E6E0' }}>{fileName}</span>
          </span>
          {tab.unsaved && <span className="w-2 h-2 rounded-full" style={{ background: '#F97316' }} />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold" style={{ color: '#28C840', background: 'rgba(40,200,64,0.06)' }}>SFTP</span>
          <span
            className="text-[14px] cursor-pointer transition-colors"
            style={{ color: '#555' }}
            onClick={() => useAppStore.getState().closeTab(tab.id)}
          >×</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center px-3 py-1.5 gap-2 shrink-0" style={{ borderBottom: '0.5px solid #2A2A30', background: '#111115' }}>
        {/* Lock/Unlock toggle */}
        <button
          onClick={() => setLocked(!locked)}
          className="px-3 py-1 rounded text-[11px] cursor-pointer border-none transition-all hover:bg-void-elevated font-medium"
          style={{
            background: locked ? 'rgba(255,95,87,0.06)' : 'rgba(40,200,64,0.06)',
            color: locked ? '#FF5F57' : '#28C840',
            fontFamily: 'DM Sans, sans-serif',
            border: `0.5px solid ${locked ? 'rgba(255,95,87,0.15)' : 'rgba(40,200,64,0.15)'}`,
          }}
          title={locked ? 'Click to unlock editing' : 'Click to lock (read-only)'}
        >
          {locked ? '🔒 Read Only' : '🔓 Editing'}
        </button>
        <div className="mx-1" style={{ width: 1, height: 16, background: '#2A2A30' }} />
        <button onClick={saveFile} disabled={locked} className="px-3 py-1 rounded text-[11px] cursor-pointer border-none transition-all hover:bg-void-elevated disabled:opacity-30 font-medium" style={{ background: 'transparent', color: '#F97316', fontFamily: 'DM Sans, sans-serif' }}>
          ⌘S Save
        </button>
        <button onClick={() => viewRef.current?.dispatch({ effects: [] })} className="px-2 py-1 rounded text-[11px] cursor-pointer border-none transition-all hover:bg-void-elevated" style={{ background: 'transparent', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>↩</button>
        <button className="px-2 py-1 rounded text-[11px] cursor-pointer border-none transition-all hover:bg-void-elevated" style={{ background: 'transparent', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>↪</button>
        <div className="mx-1" style={{ width: 1, height: 16, background: '#2A2A30' }} />
        <button className="px-2 py-1 rounded text-[11px] cursor-pointer border-none transition-all hover:bg-void-elevated" style={{ background: 'transparent', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>⌘F</button>
        <button className="px-2 py-1 rounded text-[11px] cursor-pointer border-none transition-all hover:bg-void-elevated" style={{ background: 'transparent', color: '#666', fontFamily: 'DM Sans, sans-serif' }}>⌘H</button>
        <div className="ml-auto flex gap-2">
          {tab.unsaved && (
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold" style={{ color: '#F97316', background: 'rgba(249,115,22,0.08)' }}>Unsaved</span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold" style={{ color: '#5B9BD5', background: 'rgba(91,155,213,0.06)' }}>Saving...</span>
          )}
          {saveStatus === 'error' && (
            <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold" style={{ color: '#FF5F57', background: 'rgba(255,95,87,0.06)' }}>Error</span>
          )}
          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold" style={{ color: '#5B9BD5', background: 'rgba(91,155,213,0.06)' }}>{getLangLabel(filePath)}</span>
        </div>
      </div>

      {/* CodeMirror editor */}
      <div ref={editorRef} className="flex-1 overflow-hidden" />

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 shrink-0 text-[10px] font-mono" style={{ background: '#0A0A0D', borderTop: '0.5px solid rgba(42,42,48,0.3)', color: '#555' }}>
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        <span>UTF-8 · Spaces: 2 · {lineCount} lines · {sizeLabel}</span>
      </div>
    </div>
  );
}
