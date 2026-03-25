import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';
import { ProGate } from '../ProGate';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const MAX_MESSAGES = 200;
let persistedMessages: ChatMessage[] = [];

const QUICK_PROMPTS = [
  { label: 'Fix error', prompt: 'Look at my terminal output. There seems to be an error. Explain what happened and how to fix it.' },
  { label: 'Explain', prompt: 'Explain what just happened in my terminal. What did the last command do?' },
  { label: 'Disk usage', prompt: 'What is using the most disk space on this server?' },
  { label: 'Services', prompt: 'Show me the status of all running services on this server.' },
];

const SLASH_COMMANDS: Record<string, string> = {
  '/fix': 'Look at my terminal output. Find the error and give me the exact command to fix it.',
  '/explain': 'Explain what just happened in my terminal output. What did the last command do and what was the result?',
  '/diagnose': 'Run a quick diagnosis of this server. Check disk, memory, CPU, and any obvious issues based on what you see.',
  '/deploy': 'Help me deploy. Look at my current directory and terminal context, then give me step-by-step deployment instructions.',
  '/security': 'Check for common security issues based on what you can see in the terminal. Any exposed env vars, weak permissions, or open ports?',
  '/optimize': 'Suggest performance optimizations for this server based on the terminal output you can see.',
};

function getTerminalContext(): string {
  const store = useAppStore.getState();
  const activeTab = store.tabs.find(t => t.id === store.activeTabId);
  if (!activeTab?.sessionId) return '';
  // Get buffer from the data buffer stored in ssh-manager
  // We'll grab it via IPC synchronously if available, but for now use a cached approach
  return (window as any).__voidTerminalContext || '';
}

function getServerInfo(): string {
  const store = useAppStore.getState();
  const activeTab = store.tabs.find(t => t.id === store.activeTabId);
  if (!activeTab?.connectionConfig) return '';
  const c = activeTab.connectionConfig;
  return `${c.username}@${c.host}:${c.port || 22}`;
}

// Parse code blocks from AI response and render with action buttons
function ChatContent({ content, onInsert, onRun }: { content: string; onInsert: (cmd: string) => void; onRun: (cmd: string) => void }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="text-[12px] text-void-text-muted whitespace-pre-wrap break-words leading-relaxed font-sans select-text cursor-text">
      {parts.map((part, i) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const code = part.slice(3, -3).replace(/^\w*\n?/, '').trim();
          return (
            <div key={i} className="my-2 rounded-[6px] overflow-hidden" style={{ border: '0.5px solid var(--border, #2A2A30)' }}>
              <pre className="px-3 py-2 text-[11px] font-mono text-void-text leading-[1.6] overflow-x-auto select-text cursor-text"
                style={{ background: 'var(--base, #0A0A0D)', scrollbarWidth: 'thin' }}>{code}</pre>
              <div className="flex gap-[1px]" style={{ background: 'var(--border, #2A2A30)' }}>
                <button onClick={() => navigator.clipboard.writeText(code)}
                  className="flex-1 py-[5px] text-[9px] text-void-text-ghost hover:text-void-text font-mono cursor-pointer"
                  style={{ background: 'var(--elevated, #141418)', border: 'none' }}>Copy</button>
                <button onClick={() => onInsert(code)}
                  className="flex-1 py-[5px] text-[9px] text-accent hover:text-accent font-mono cursor-pointer font-semibold"
                  style={{ background: 'var(--elevated, #141418)', border: 'none' }}>Insert</button>
                <button onClick={() => onRun(code)}
                  className="flex-1 py-[5px] text-[9px] text-status-online hover:text-status-online font-mono cursor-pointer font-semibold"
                  style={{ background: 'var(--elevated, #141418)', border: 'none' }}>Run</button>
              </div>
            </div>
          );
        }
        // Inline code
        return <span key={i}>{part.replace(/`([^`]+)`/g, (_, code) => `「${code}」`)}</span>;
      })}
    </div>
  );
}

export function AIChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>(persistedMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    persistedMessages = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Cache terminal context periodically (every 5s when chat is open)
  useEffect(() => {
    const updateContext = async () => {
      const store = useAppStore.getState();
      const tab = store.tabs.find(t => t.id === store.activeTabId);
      if (tab?.sessionId) {
        try {
          const buf = await window.void.ssh.getBuffer(tab.sessionId);
          if (buf) {
            const existing = (window as any).__voidTerminalContext || '';
            (window as any).__voidTerminalContext = (existing + buf).split('\n').slice(-50).join('\n');
          }
        } catch { /* ignore */ }
      }
    };
    updateContext();
    const interval = setInterval(updateContext, 5000);
    return () => clearInterval(interval);
  }, []);

  const insertCommand = (cmd: string) => {
    const store = useAppStore.getState();
    const tab = store.tabs.find(t => t.id === store.activeTabId);
    if (tab?.sessionId) {
      if (tab.type === 'ssh') window.void.ssh.write(tab.sessionId, cmd);
      else window.void.pty.write(tab.sessionId, cmd);
    }
  };

  const runCommand = async (cmd: string) => {
    const store = useAppStore.getState();
    const tab = store.tabs.find(t => t.id === store.activeTabId);
    if (tab?.sessionId && tab.type === 'ssh') {
      const result = await (window as any).void.ssh.exec(tab.sessionId, cmd);
      const output = (result.stdout || '') + (result.stderr ? '\nSTDERR: ' + result.stderr : '');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Ran: \`\`\`${cmd}\`\`\`\n\nOutput:\n\`\`\`\n${output.trim() || '(no output)'}\n\`\`\`\n\nExit code: ${result.code}`,
      }]);
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || loading) return;

    // Handle slash commands
    const slashCmd = SLASH_COMMANDS[msg.split(' ')[0]?.toLowerCase()];
    const actualMessage = slashCmd || msg;

    const userMessage: ChatMessage = { role: 'user', content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setShowSlashMenu(false);
    setLoading(true);

    try {
      const context = getTerminalContext();
      const server = getServerInfo();
      const response = await (window.void.ai.chat as any)(actualMessage, updatedMessages, context, server);
      setMessages([...updatedMessages, { role: 'assistant', content: response }]);
    } catch {
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Failed to get response. Check your AI settings.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const isPro = useAppStore((s) => s.isPro);

  if (!isPro) {
    return (
      <div className="w-full flex-1 flex flex-col overflow-hidden">
        <ProGate feature="AI Chat & Memory" />
      </div>
    );
  }

  const matchingSlash = input.startsWith('/') ? Object.keys(SLASH_COMMANDS).filter(k => k.startsWith(input.toLowerCase())) : [];

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-[13px] text-void-text font-medium font-sans">AI Chat</span>
        <span className="flex-1" />
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); persistedMessages = []; }}
            className="text-[9px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer font-mono">Clear</button>
        )}
        <span className="text-[9px] text-void-text-ghost font-mono">{getServerInfo() || 'no server'}</span>
      </div>

      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
        {messages.length === 0 && (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 rounded-[10px] mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <div className="w-4 h-4 rounded-[4px] bg-accent/60" />
            </div>
            <p className="text-[12px] text-void-text-ghost font-sans">AI sees your terminal. Just ask.</p>
            <div className="flex flex-wrap gap-[6px] justify-center px-2">
              {QUICK_PROMPTS.map((qp, i) => (
                <button key={i} onClick={() => handleSend(qp.prompt)}
                  className="px-[10px] py-[5px] rounded-[6px] text-[10px] text-void-text-dim hover:text-accent font-sans cursor-pointer transition-colors"
                  style={{ background: 'var(--elevated, #141418)', border: '0.5px solid var(--border, #2A2A30)' }}>
                  {qp.label}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-void-text-faint font-mono mt-2">Type / for commands</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}
            className={`group relative ${msg.role === 'user'
              ? 'ml-6 bg-[#1A1A22] rounded-[10px_10px_2px_10px]'
              : 'mr-3 bg-void-elevated rounded-[2px_10px_10px_10px]'
            } p-3`}
            style={msg.role === 'assistant' ? { border: '0.5px solid var(--border)' } : {}}>
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3.5 h-3.5 rounded-[4px] bg-accent/80 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                </span>
                <span className="text-[10px] text-void-text-ghost font-sans">Void AI</span>
                <span className="flex-1" />
                <button onClick={() => navigator.clipboard.writeText(msg.content)}
                  className="text-[9px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                  Copy
                </button>
              </div>
            )}
            {msg.role === 'user' && (
              <button onClick={() => navigator.clipboard.writeText(msg.content)}
                className="absolute top-2 right-2 text-[9px] text-void-text-ghost hover:text-accent bg-transparent border-none cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                Copy
              </button>
            )}
            {msg.role === 'assistant' ? (
              <ChatContent content={msg.content} onInsert={insertCommand} onRun={runCommand} />
            ) : (
              <p className="text-[12px] text-void-text-muted whitespace-pre-wrap break-words leading-relaxed font-sans select-text cursor-text">{msg.content}</p>
            )}
          </div>
        ))}

        {loading && (
          <div className="mr-3 bg-void-elevated rounded-[2px_10px_10px_10px] p-3" style={{ border: '0.5px solid var(--border)' }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3.5 h-3.5 rounded-[4px] bg-accent/80 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
              </span>
              <span className="text-[10px] text-void-text-ghost font-sans">Void AI</span>
            </div>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse" style={{ animationDelay: '200ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-accent/40 animate-pulse" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Slash command autocomplete */}
      {matchingSlash.length > 0 && input.startsWith('/') && (
        <div className="px-2 pb-1">
          <div className="rounded-[6px] overflow-hidden" style={{ border: '0.5px solid var(--border, #2A2A30)' }}>
            {matchingSlash.map(cmd => (
              <button key={cmd} onClick={() => { setInput(cmd); inputRef.current?.focus(); }}
                className="w-full flex items-center gap-2 px-3 py-[6px] text-left bg-transparent border-none cursor-pointer hover:bg-void-elevated transition-colors"
                style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
                <span className="text-[11px] text-accent font-mono">{cmd}</span>
                <span className="text-[9px] text-void-text-ghost font-sans truncate">{SLASH_COMMANDS[cmd].substring(0, 50)}...</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick prompts row (when has messages) */}
      {messages.length > 0 && !loading && (
        <div className="flex gap-[4px] px-2 pb-1 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          {QUICK_PROMPTS.map((qp, i) => (
            <button key={i} onClick={() => handleSend(qp.prompt)}
              className="px-[8px] py-[3px] rounded-[4px] text-[9px] text-void-text-ghost hover:text-accent font-sans cursor-pointer whitespace-nowrap shrink-0 transition-colors"
              style={{ border: '0.5px solid var(--border, #2A2A30)' }}>
              {qp.label}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="p-2 shrink-0" style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)' }}>
        <div className="flex items-center gap-2 bg-void-surface px-3 py-2.5 rounded-[8px]" style={{ border: '0.5px solid var(--border)' }}>
          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask about your terminal... or type /"
            className="flex-1 bg-transparent text-[12px] text-void-text-muted outline-none font-sans"
          />
          <button onClick={() => handleSend()} disabled={loading}
            className="text-void-text-ghost hover:text-accent text-[14px] disabled:opacity-30 transition-colors">
            ↵
          </button>
        </div>
      </div>
    </div>
  );
}
