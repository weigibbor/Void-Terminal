import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../stores/app-store';
import { ProGate } from '../ProGate';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Persist messages outside component so they survive tab switches
let persistedMessages: ChatMessage[] = [];

export function AIChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>(persistedMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync to persisted store
  useEffect(() => {
    persistedMessages = messages;
  }, [messages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await window.void.ai.chat(input, updatedMessages);
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

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: '0.5px solid rgba(42,42,48,0.5)' }}>
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-[13px] text-void-text font-medium font-sans">AI Chat</span>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#2A2A30 transparent' }}
      >
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <div className="w-10 h-10 rounded-[10px] mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.08)' }}>
              <div className="w-4 h-4 rounded-[4px] bg-accent/60" />
            </div>
            <p className="text-[13px] text-void-text-ghost font-sans">Ask Void AI anything.</p>
            <p className="text-[11px] text-void-text-faint font-sans leading-relaxed">
              "When was the last deploy?"
              <br />
              "What errors happened today?"
              <br />
              "Show me recent git activity"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${
              msg.role === 'user'
                ? 'ml-6 bg-[#1A1A22] rounded-[10px_10px_2px_10px]'
                : 'mr-3 bg-void-elevated rounded-[2px_10px_10px_10px]'
            } p-3`}
            style={msg.role === 'assistant' ? { border: '0.5px solid #2A2A30' } : {}}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3.5 h-3.5 rounded-[4px] bg-accent/80 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
                </span>
                <span className="text-[10px] text-void-text-ghost font-sans">Void AI</span>
              </div>
            )}
            <p className="text-[12px] text-void-text-muted whitespace-pre-wrap break-words leading-relaxed font-sans">{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="mr-3 bg-void-elevated rounded-[2px_10px_10px_10px] p-3" style={{ border: '0.5px solid #2A2A30' }}>
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

      {/* Input */}
      <div className="p-2" style={{ borderTop: '0.5px solid rgba(42,42,48,0.5)' }}>
        <div className="flex items-center gap-2 bg-void-surface px-3 py-2.5 rounded-[8px]" style={{ border: '0.5px solid #2A2A30' }}>
          <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask Void AI..."
            className="flex-1 bg-transparent text-[12px] text-void-text-muted outline-none font-sans"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="text-void-text-ghost hover:text-accent text-[14px] disabled:opacity-30 transition-colors"
          >
            ↵
          </button>
        </div>
      </div>
    </div>
  );
}
