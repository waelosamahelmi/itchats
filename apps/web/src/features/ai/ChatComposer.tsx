import { ImagePlus, Mic, MicOff, Send } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

export function ChatComposer({
  characterName,
  value,
  disabled,
  error,
  recording,
  recordingDuration,
  onChange,
  onSend,
  onVoicePressStart,
  onVoicePressEnd,
  onImage,
}: {
  characterName: string;
  value: string;
  disabled: boolean;
  error?: string;
  recording: boolean;
  recordingDuration: number;
  onChange: (value: string) => void;
  onSend: () => void;
  onVoicePressStart: () => void;
  onVoicePressEnd: () => void;
  onImage: () => void;
}) {
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const [micActive, setMicActive] = useState(false);
  const startXRef = useRef<number>(0);
  const startYRef = useRef<number>(0);
  const cancelledRef = useRef(false);

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    e.preventDefault();
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    cancelledRef.current = false;
    setMicActive(true);
    onVoicePressStart();
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!micActive) return;
    // Cancel if dragged more than 60px away (slide-to-cancel)
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    if (Math.abs(dx) > 60 || Math.abs(dy) > 60) {
      cancelledRef.current = true;
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    setMicActive(false);
    if (cancelledRef.current) {
      onVoicePressEnd(); // cancelled
    } else {
      onVoicePressEnd();
    }
  }

  // Keyboard support: hold Space to record (when input is empty)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && value.trim() === '' && !disabled && !recording && document.activeElement === document.body) {
        e.preventDefault();
        setMicActive(true);
        onVoicePressStart();
      }
    }
    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space' && recording) {
        e.preventDefault();
        setMicActive(false);
        onVoicePressEnd();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [value, disabled, recording, onVoicePressStart, onVoicePressEnd]);

  return (
    <div className="chat-composer-wrap safe-bottom">
      {error && <p className="composer-error" role="alert">{error}</p>}
      <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
        <button
          type="button"
          className="composer-attach"
          aria-label="Attach a photo"
          onClick={onImage}
          tabIndex={0}
        >
          <ImagePlus size={20} />
        </button>
        {recording ? (
          <div className="voice-recording-bar" aria-label="Recording in progress">
            <div className="recording-indicator" />
            <span className="recording-timer">{formatDuration(recordingDuration)}</span>
            <span className="recording-hint">Slide to cancel • Release to send</span>
          </div>
        ) : (
          <textarea
            aria-label={`Message ${characterName}`}
            value={value}
            rows={1}
            disabled={disabled}
            placeholder={disabled ? '' : `Message ${characterName}`}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                onSend();
              }
            }}
          />
        )}
        {value.trim() ? (
          <button type="submit" className="composer-send" aria-label="Send message" disabled={disabled || !value.trim()}>
            <Send size={20} />
          </button>
        ) : (
          <button
            ref={micButtonRef}
            type="button"
            className={`composer-mic ${micActive ? 'active' : ''}`}
            aria-label={recording ? 'Recording — release to send' : 'Hold to record voice note'}
            disabled={disabled}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            {recording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
      </form>
    </div>
  );
}
