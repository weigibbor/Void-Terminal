import { useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import { ProGate } from '../ProGate';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function AIChatSidebar() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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
      <div className="w-[220px] bg-void-input border-l border-void-border flex flex-col animate-slide-in-right shrink-0">
        <ProGate feature="AI Chat & Memory" />
      </div>
    );
  }

  return (
    <div className="w-[220px] bg-void-input border-l border-void-border flex flex-col animate-slide-in-right shrink-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-void-border/50">
        <span className="w-2 h-2 rounded-full bg-accent" />
        <span className="text-sm text-void-text font-medium">AI Chat</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-sm text-void-text-ghost">Ask Void AI anything.</p>
            <p className="text-2xs text-void-text-faint">
              "When was the last deploy?"
              <br />
              "What errors happened today?"
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${
              msg.role === 'user'
                ? 'ml-4 bg-[#1A1A22] rounded-[10px_10px_2px_10px]'
                : 'mr-4 bg-void-elevated border border-void-border rounded-[2px_10px_10px_10px]'
            } p-2.5 text-sm text-void-text-muted`}
          >
            {msg.role === 'assistant' && (
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-3 h-3 rounded-sm bg-accent/80" />
                <span className="text-2xs text-void-text-ghost">Void AI</span>
              </div>
            )}
            <p className="whitespace-pre-wrap break-words">{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="mr-4 bg-void-elevated border border-void-border rounded-[2px_10px_10px_10px] p-2.5">
            <span className="text-sm text-void-text-ghost animate-pulse">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-void-border/50 p-2">
        <div className="flex items-center gap-2 bg-void-surface border border-void-border rounded-void px-2.5 py-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Ask Void AI..."
            className="flex-1 bg-transparent text-sm text-void-text-muted outline-none"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="text-void-text-ghost hover:text-accent text-xs disabled:opacity-50"
          >
            &#9166;
          </button>
        </div>
      </div>
    </div>
  );
}
