interface AIInlineSuggestionProps {
  explanation: string;
  suggestedCommand?: string;
  onRun: (command: string) => void;
  onDismiss: () => void;
}

export function AIInlineSuggestion({
  explanation,
  suggestedCommand,
  onRun,
  onDismiss,
}: AIInlineSuggestionProps) {
  if (!explanation) return null;

  return (
    <div className="mx-3 my-2 p-3 rounded-[8px]" style={{ background: 'rgba(249,115,22,0.05)', border: '0.5px solid rgba(249,115,22,0.15)' }}>
      <div className="flex items-center gap-[6px] mb-[6px]">
        <div className="w-[14px] h-[14px] rounded-[4px] flex items-center justify-center" style={{ background: 'rgba(249,115,22,0.12)' }}>
          <div className="w-[6px] h-[6px] rounded-full bg-accent" />
        </div>
        <span className="text-[9px] text-accent font-semibold font-sans uppercase tracking-wider">Void AI</span>
      </div>

      <p className="text-[11px] text-void-text-muted leading-relaxed mb-[8px] font-sans">{explanation}</p>

      <div className="flex items-center gap-[8px]">
        {suggestedCommand && (
          <button
            onClick={() => onRun(suggestedCommand)}
            className="flex items-center gap-[6px] px-[10px] py-[5px] rounded-[5px] text-[10px] font-mono transition-colors"
            style={{ background: 'rgba(249,115,22,0.08)', border: '0.5px solid rgba(249,115,22,0.2)' }}
          >
            <span className="text-accent">▶</span>
            <span className="text-accent">{suggestedCommand}</span>
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-[9px] text-void-text-ghost hover:text-void-text-dim px-[6px] py-[4px] font-sans"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
