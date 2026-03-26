import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';
import { ProGate } from '../ProGate';
import { executeAction, isDangerous } from '../../utils/agent-executor';

// Official Void AI Chat animations
const VOID_AI_CSS = `
@keyframes dotPulse{0%,80%,100%{opacity:0.15;transform:scale(0.8)}40%{opacity:1;transform:scale(1.15)}}
@keyframes dotGlow{0%,100%{box-shadow:0 0 0 0 rgba(249,115,22,0)}50%{box-shadow:0 0 0 4px rgba(249,115,22,0.15)}}
@keyframes shimmerSlide{0%{transform:translateX(-100%);opacity:0.3}50%{opacity:1}100%{transform:translateX(700%);opacity:0.3}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes msgIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
`;
if (typeof document !== 'undefined' && !document.getElementById('void-ai-css')) {
  const style = document.createElement('style');
  style.id = 'void-ai-css';
  style.textContent = VOID_AI_CSS;
  document.head.appendChild(style);
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
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

const SMART_MODELS: Record<string, Record<string, string>> = {
  anthropic: { light: 'claude-haiku-4-5', medium: 'claude-sonnet-4-6', heavy: 'claude-opus-4-6' },
  openai: { light: 'gpt-4o-mini', medium: 'gpt-4o', heavy: 'gpt-5.4' },
  gemini: { light: 'gemini-2.5-flash-lite', medium: 'gemini-2.5-flash', heavy: 'gemini-2.5-pro' },
  ollama: { light: 'mistral', medium: 'phi4', heavy: 'qwen3.5' },
};

function classifyTask(msg: string): 'light' | 'medium' | 'heavy' {
  const heavyPatterns = /\b(create|build|write|develop|implement|refactor|architect|design|deploy|migrate|setup|gawan|gawa)\b/i;
  const mediumPatterns = /\b(fix|check|run|exec|install|restart|update|show|diagnose|analyze|compare|diff|open|browse|search)\b/i;
  if (msg.startsWith('/deploy') || msg.startsWith('/security')) return 'heavy';
  if (heavyPatterns.test(msg)) return 'heavy';
  if (mediumPatterns.test(msg)) return 'medium';
  return 'light';
}

function getModelShortName(modelId: string): string {
  const names: Record<string, string> = {
    'claude-opus-4-6': 'Opus 4.6', 'claude-sonnet-4-6': 'Sonnet 4.6', 'claude-haiku-4-5': 'Haiku 4.5',
    'claude-opus-4-20250514': 'Opus 4', 'claude-sonnet-4-20250514': 'Sonnet 4',
    'gpt-4o': 'GPT-4o', 'gpt-4o-mini': '4o Mini', 'gpt-4-turbo': '4 Turbo',
    'gemini-2.5-pro': '2.5 Pro', 'gemini-2.5-flash': '2.5 Flash',
    'llama3.1:8b': 'Llama 8B', 'llama3.1:70b': 'Llama 70B',
  };
  return names[modelId] || modelId.split('/').pop()?.split('-').pop() || modelId;
}

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
  const [lastFailedMsg, setLastFailedMsg] = useState('');
  const cancelRef = useRef(false);
  const [currentModel, setCurrentModel] = useState('smart');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    persistedMessages = messages.length > MAX_MESSAGES ? messages.slice(-MAX_MESSAGES) : messages;
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    (window as any).void.ai.getCurrentModel?.().then((m: string) => m && setCurrentModel(m || 'smart'));
    (window as any).void.ai.getModels?.().then((m: any) => m && setAvailableModels(m));
  }, []);

  const changeModel = async (model: string) => {
    if (model !== 'smart') await (window as any).void.ai.setModel(model);
    setCurrentModel(model);
    setShowModelPicker(false);
  };

  // ESC to cancel AI thinking (only when chat panel is focused)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && loading) {
        // Only cancel if focus is inside the chat panel
        const chatPanel = document.querySelector('[data-void-chat]');
        if (chatPanel?.contains(document.activeElement) || chatPanel === document.activeElement) {
          cancelRef.current = true;
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [loading]);

  const cancelThinking = () => {
    cancelRef.current = true;
  };

  // Terminal context is captured by useTerminal.ts directly on window.__voidTerminalContext
  // No polling needed — data flows in real-time from the terminal data handler

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

  // Smart routing: detect if message needs tools (agent) or just chat
  const needsAgent = (msg: string): boolean => {
    const agentKeywords = /\b(run|exec|check|fix|deploy|create|install|build|restart|stop|start|kill|delete|remove|update|upgrade|show me|what'?s running|disk usage|open|browse|search|navigate|go to|youtube|google)\b/i;
    const slashUsed = msg.startsWith('/');
    return slashUsed || agentKeywords.test(msg);
  };

  // Navigate browser pane
  const navigateBrowser = (url: string) => {
    const store = useAppStore.getState();
    // Find or create browser tab
    let browserTab = store.tabs.find(t => t.type === 'browser');
    if (browserTab) {
      store.updateTab(browserTab.id, { browserUrl: url });
      store.setActiveTab(browserTab.id);
    } else {
      store.addTab('browser', { title: 'Browser', browserUrl: url });
    }
  };

  const handleSend = async (overrideMessage?: string) => {
    const msg = overrideMessage || input.trim();
    if (!msg || loading) return;

    // /model command opens picker
    if (msg.toLowerCase() === '/model') {
      setShowModelPicker(true);
      setInput('');
      setLoading(false);
      return;
    }

    const slashCmd = SLASH_COMMANDS[msg.split(' ')[0]?.toLowerCase()];
    const actualMessage = slashCmd || msg;

    const userMessage: ChatMessage = { role: 'user', content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setShowSlashMenu(false);
    setLoading(true);

    const context = getTerminalContext();
    const server = getServerInfo();

    // Smart model selection — uses enabled providers from settings
    const isSmartMode = currentModel === 'smart' || !currentModel;
    let modelToUse: string | undefined;
    if (isSmartMode) {
      const tier = classifyTask(msg);
      try {
        const aiConfig = await (window as any).void.ai.getConfig();
        // Use smartProviders from settings (user-toggled), fallback to active provider
        const enabledProviders: string[] = aiConfig?.smartProviders || [aiConfig?.provider || 'anthropic'];
        // Filter to only providers with keys
        const withKeys = enabledProviders.filter((p: string) => {
          if (p === 'ollama') return true;
          if (p === aiConfig?.provider) return !!aiConfig?.apiKey;
          return !!(aiConfig as any)?.[`${p}Key`];
        });
        const providers = withKeys.length > 0 ? withKeys : [aiConfig?.provider || 'anthropic'];

        // Pick best model across enabled providers for this tier
        if (providers.length === 1) {
          modelToUse = SMART_MODELS[providers[0]]?.[tier];
        } else {
          // Multiple providers: pick cheapest for light, best for heavy
          if (tier === 'light') {
            // Cheapest: haiku > 4o-mini > flash > llama 8b
            const priority = ['anthropic', 'openai', 'gemini', 'ollama'];
            const best = priority.find(p => providers.includes(p));
            modelToUse = SMART_MODELS[best || providers[0]]?.[tier];
          } else if (tier === 'heavy') {
            // Best: opus > 4o > 2.5-pro > llama 70b
            const priority = ['anthropic', 'openai', 'gemini', 'ollama'];
            const best = priority.find(p => providers.includes(p));
            modelToUse = SMART_MODELS[best || providers[0]]?.[tier];
          } else {
            // Medium: use active provider
            const active = providers.includes(aiConfig?.provider) ? aiConfig.provider : providers[0];
            modelToUse = SMART_MODELS[active]?.[tier];
          }
        }
      } catch { /* fallback */ }
    }
    const usedModel = modelToUse || (isSmartMode ? undefined : currentModel) || undefined;

    if (needsAgent(msg) && server) {
      // --- Agent mode (tools available, can run commands + browse) ---
      try {
        let apiMessages: { role: string; content: any }[] = updatedMessages
          .filter(m => m.role !== 'system')
          .map(m => ({ role: m.role, content: m.content }));

        let agentMsgs = [...updatedMessages];
        const MAX_STEPS = 20;

        cancelRef.current = false;
        for (let step = 0; step < MAX_STEPS; step++) {
          if (cancelRef.current) {
            agentMsgs = [...agentMsgs, { role: 'assistant' as const, content: '⏹ Cancelled.' }];
            setMessages(agentMsgs);
            break;
          }
          const result = await (window as any).void.ai.agentStep(apiMessages, context, server, undefined, usedModel);

          if (result.done) {
            const doneMsg = result.thought || '✅ Done.';
            const modelLabel = usedModel ? `\n\n_via ${getModelShortName(usedModel)}_` : '';
            agentMsgs = [...agentMsgs, { role: 'assistant' as const, content: doneMsg + modelLabel }];
            setMessages(agentMsgs);
            break;
          }

          if (result.action) {
            const action = result.action;

            // Show AI's thought immediately
            if (result.thought) {
              agentMsgs = [...agentMsgs, { role: 'assistant' as const, content: result.thought }];
              setMessages(agentMsgs);
            }

            // Handle browse
            if (action.type === 'browse' && action.url) {
              navigateBrowser(action.url);
              agentMsgs = [...agentMsgs, { role: 'assistant' as const, content: `🌐 Opened ${action.url}` }];
              setMessages(agentMsgs);
              break;
            }

            // Safety check
            if ((action.type === 'exec' || action.type === 'live_exec') && action.command && isDangerous(action.command)) {
              agentMsgs = [...agentMsgs, { role: 'assistant' as const, content: `⚠️ Stopped — destructive command: \`${action.command}\`\nApprove manually if intended.` }];
              setMessages(agentMsgs);
              break;
            }

            // Show "running" indicator in chat
            const cmdLabel = action.command || action.path || action.type;
            agentMsgs = [...agentMsgs, { role: 'system' as const, content: `⚡ Running: ${cmdLabel}` }];
            setMessages(agentMsgs);

            // Execute — if live_exec, terminal moves visually
            const execResult = await executeAction(action);

            // Show output in chat
            if (execResult.output.trim()) {
              const outputPreview = execResult.output.substring(0, 1500).trim();
              agentMsgs = [...agentMsgs, { role: 'system' as const, content: `\`\`\`\n${outputPreview}\n\`\`\`` }];
              setMessages(agentMsgs);
            }

            // Feed back to API
            apiMessages = [
              ...apiMessages,
              { role: 'assistant', content: [
                ...(result.thought ? [{ type: 'text', text: result.thought }] : []),
                { type: 'tool_use', id: action.id || `tool_${step}`, name: action.type, input: action },
              ] },
              { role: 'user', content: [
                { type: 'tool_result', tool_use_id: action.id || `tool_${step}`, content: execResult.output.substring(0, 2000) },
              ] },
            ];
          } else {
            const modelLabel = usedModel ? `\n\n_via ${getModelShortName(usedModel)}_` : '';
            agentMsgs = [...agentMsgs, { role: 'assistant' as const, content: (result.thought || 'Done.') + modelLabel }];
            setMessages(agentMsgs);
            break;
          }
        }

        const lastMsg = agentMsgs[agentMsgs.length - 1]?.content || '';
        const isCreditError = lastMsg.includes('credit') || lastMsg.includes('balance') || lastMsg.includes('No credits');
        if (isCreditError) setLastFailedMsg(msg); else setLastFailedMsg('');
      } catch {
        setMessages([...updatedMessages, { role: 'assistant', content: 'Failed to get response. Check your AI settings.' }]);
        setLastFailedMsg(msg);
      }
    } else {
      // --- Fast chat mode (no tools, just answer) ---
      cancelRef.current = false;
      try {
        const response = await (window.void.ai.chat as any)(actualMessage, updatedMessages, context, server, usedModel);
        const isError = response.includes('API error') || response.includes('overloaded') || response.includes('rate limit');
        const isCreditError = response.includes('credit') || response.includes('balance') || response.includes('No credits');
        const modelLabel = !isError && !isCreditError && usedModel ? `\n\n_via ${getModelShortName(usedModel)}_` : '';
        setMessages([...updatedMessages, { role: 'assistant', content: response + modelLabel }]);
        if (isCreditError) setLastFailedMsg(msg); else setLastFailedMsg('');
      } catch {
        setMessages([...updatedMessages, { role: 'assistant', content: 'Failed to get response. Check your AI settings.' }]);
        setLastFailedMsg(msg);
      }
    }

    setLoading(false);
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
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden" data-void-chat tabIndex={-1}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-[13px] text-void-text font-medium font-sans">AI Chat</span>
        <span className="flex-1" />
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); persistedMessages = []; }}
            className="text-[9px] text-void-text-ghost hover:text-status-error bg-transparent border-none cursor-pointer font-mono">Clear</button>
        )}
        <span className="text-[10px] text-void-text-ghost font-mono">{getServerInfo() || 'no server'}</span>
      </div>

      {/* Model bar */}
      <div className="flex items-center px-3 py-[4px] shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.3)' }}>
        <span className="flex-1" />
        <button onClick={() => setShowModelPicker(!showModelPicker)}
          className="text-[10px] text-void-text-ghost hover:text-void-text-muted bg-transparent border-none cursor-pointer font-mono">
          /{currentModel === 'smart' ? 'smart' : currentModel}
        </button>
      </div>

      {/* Model picker */}
      {showModelPicker && (
        <div className="px-3 py-2 shrink-0 overflow-y-auto" style={{ maxHeight: '250px', borderBottom: '0.5px solid rgba(42,42,48,0.3)', scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}>
          <button onClick={() => changeModel('smart')}
            className={`flex items-center gap-2 w-full text-left px-2 py-[6px] rounded-[4px] cursor-pointer transition-colors mb-1 ${currentModel === 'smart' ? 'text-accent' : 'text-void-text-dim hover:text-void-text hover:bg-void-elevated'}`}
            style={{ border: 'none', background: currentModel === 'smart' ? 'rgba(249,115,22,0.05)' : 'transparent' }}>
            <span className="text-[12px] font-mono flex-1">Smart (auto)</span>
            <span className="text-[9px] font-mono px-[5px] py-[2px] rounded-[3px] text-status-online" style={{ background: 'rgba(255,255,255,0.04)' }}>auto-route</span>
          </button>
          <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 6px' }} />
          {availableModels.slice(0, 1).map((group: any) => (
            <div key={group.provider}>
              <div className="flex items-center gap-[6px] mb-[4px]">
                <span className="w-[5px] h-[5px] rounded-full bg-accent" />
                <span className="text-[10px] text-void-text-muted uppercase tracking-[0.5px] font-semibold">{group.provider}</span>
              </div>
              {group.models.map((m: any) => (
                <button key={m.id} onClick={() => changeModel(m.id)}
                  className={`flex items-center gap-2 w-full text-left px-2 py-[6px] rounded-[4px] cursor-pointer transition-colors ${currentModel === m.id ? 'text-accent' : 'text-void-text-dim hover:text-void-text hover:bg-void-elevated'}`}
                  style={{ border: 'none', background: currentModel === m.id ? 'rgba(249,115,22,0.05)' : 'transparent' }}>
                  <span className="text-[12px] font-mono flex-1">{m.name}</span>
                  <span className={`text-[9px] font-mono px-[5px] py-[2px] rounded-[3px] ${
                    m.tier === 'flagship' ? 'text-accent' : m.tier === 'fast' ? 'text-status-online' : m.tier === 'reasoning' ? 'text-[#C586C0]' : m.tier === 'code' ? 'text-[#5B9BD5]' : 'text-void-text-ghost'
                  }`} style={{ background: 'rgba(255,255,255,0.04)' }}>{m.tier}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

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
          <div className="mr-3" style={{ animation: 'msgIn .3s ease' }}>
            <div className="flex items-center gap-[6px] mb-[6px]">
              <span className="w-[7px] h-[7px] rounded-full bg-accent shrink-0" style={{ animation: 'dotGlow 1.5s ease-in-out infinite' }} />
              <span className="text-[11px] text-void-text-ghost font-sans">Void AI</span>
            </div>
            <div className="flex items-center gap-[10px] px-[14px] py-[10px] bg-void-elevated rounded-[8px]" style={{ border: '0.5px solid var(--border)' }}>
              <div className="flex gap-[5px]">
                <span className="w-[5px] h-[5px] rounded-full bg-accent" style={{ animation: 'dotPulse 1.4s ease-in-out infinite' }} />
                <span className="w-[5px] h-[5px] rounded-full bg-accent" style={{ animation: 'dotPulse 1.4s ease-in-out infinite 0.2s' }} />
                <span className="w-[5px] h-[5px] rounded-full bg-accent" style={{ animation: 'dotPulse 1.4s ease-in-out infinite 0.4s' }} />
              </div>
              <span className="text-[10px] text-void-text-dim font-mono flex-1">Thinking...</span>
              <button onClick={cancelThinking}
                className="text-[9px] text-void-text-ghost hover:text-status-error font-mono bg-transparent border-none cursor-pointer px-[6px] py-[2px] rounded-[3px] hover:bg-status-error/5"
                style={{ border: '0.5px solid var(--border)' }}>Cancel</button>
            </div>
            <div className="h-[2px] rounded-[1px] overflow-hidden mt-2" style={{ width: '200px', background: 'var(--border)' }}>
              <div className="h-full rounded-[1px]" style={{ width: '30%', background: 'var(--accent)', animation: 'shimmerSlide 1.8s ease-in-out infinite' }} />
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
        {/* Retry button — only on credit/billing errors */}
        {lastFailedMsg && !loading && (
          <div className="flex items-center gap-2 px-3 mb-1">
            <span className="text-[10px] text-void-text-ghost flex-1">Added credits? Click retry:</span>
            <button onClick={() => {
              const failedMsg = lastFailedMsg;
              setLastFailedMsg('');
              // Remove the last error message
              setMessages(prev => prev.slice(0, -1));
              // Resend
              setTimeout(() => handleSend(failedMsg), 100);
            }}
              className="text-[10px] text-accent bg-transparent border-none cursor-pointer font-mono px-2 py-[3px] rounded-[4px] hover:bg-accent/5"
              style={{ border: '0.5px solid rgba(249,115,22,0.2)' }}>Retry</button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-void-surface px-3 py-2.5 rounded-[8px]" style={{ border: '0.5px solid var(--border)' }}>
          <span className="w-2 h-2 rounded-full bg-accent shrink-0" style={loading ? { animation: 'dotGlow 1.5s ease-in-out infinite' } : {}} />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder={loading ? 'AI is thinking...' : 'Ask anything or give a task...'}
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
