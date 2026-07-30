const reactions = ['❤️', '😂', '😮', '🥹', '🔥', '👍'] as const;

export function ReactionBar({ selected, onReact }: { selected?: string; onReact: (emoji: string) => void }) {
  return (
    <div role="toolbar" aria-label="Message reactions" className="reaction-bar">
      {reactions.map((emoji) => (
        <button
          key={emoji}
          type="button"
          aria-label={`React with ${emoji}`}
          aria-pressed={selected === emoji}
          onClick={() => onReact(emoji)}
          className="reaction-choice"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
