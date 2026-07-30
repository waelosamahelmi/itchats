import { ImagePlus, Mic, Send } from 'lucide-react';

export function ChatComposer({
  characterName,
  value,
  disabled,
  error,
  onChange,
  onSend,
  onVoice,
  onImage,
}: {
  characterName: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoice: () => void;
  onImage: () => void;
}) {
  return (
    <div className="chat-composer-wrap safe-bottom">
      {error && <p className="composer-error" role="alert">{error}</p>}
      <div className="attachment-tray" aria-label="Message attachments">
        <button type="button" aria-label="Attach a photo" onClick={onImage}><ImagePlus size={18} /></button>
        <button type="button" aria-label="Record a voice note" onClick={onVoice}><Mic size={18} /></button>
      </div>
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
        <textarea
          aria-label={`Message ${characterName}`}
          value={value}
          rows={1}
          disabled={disabled}
          placeholder={`Message ${characterName}`}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
        />
        <button type="submit" className="composer-send" aria-label="Send message" disabled={disabled || !value.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
