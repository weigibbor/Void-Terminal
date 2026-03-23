interface AIAutocompleteGhostProps {
  suggestion: string;
  onAccept: () => void;
}

export function AIAutocompleteGhost({ suggestion, onAccept }: AIAutocompleteGhostProps) {
  if (!suggestion) return null;

  return (
    <span
      className="text-void-text-ghost/40 cursor-pointer"
      onClick={onAccept}
      title="Tab to accept"
    >
      {suggestion}
    </span>
  );
}
