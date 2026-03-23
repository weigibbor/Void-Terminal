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
  return (
    <div className="mx-3 my-2 bg-accent-glow border border-accent-dim rounded-void-lg p-3 animate-ai-suggest-in">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-3 h-3 rounded-sm bg-accent/80" />
        <span className="text-2xs text-void-text-ghost font-medium uppercase tracking-wider">
          Void AI
        </span>
      </div>

      <p className="text-sm text-void-text-muted mb-3">{explanation}</p>

      <div className="flex items-center gap-2">
        {suggestedCommand && (
          <button
            onClick={() => onRun(suggestedCommand)}
            className="flex items-center gap-1.5 bg-void-surface border border-void-border rounded-void px-3 py-1.5 text-sm text-void-text hover:border-accent-dim transition-colors"
          >
            <span className="text-accent">&#9654;</span>
            <code className="font-mono">{suggestedCommand}</code>
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-2xs text-void-text-ghost hover:text-void-text-muted px-2 py-1"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
