import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Check, CheckCheck, Pause, Play, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChatMessage } from './chatModel';
import { ReactionBar } from './ReactionBar';

const HOLD_MS = 420;

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Shared voice-note player: play/pause, elapsed/total time, seekable progress
 * bar, buffering spinner, and an error state with retry. Playback is
 * coordinated by the parent via the `playing` prop (one audio at a time).
 */
function VoiceNotePlayer({
  url,
  playing,
  durationMs,
  onToggle,
  onEnded,
}: {
  url: string;
  playing: boolean;
  durationMs?: number;
  onToggle: () => void;
  onEnded: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [metaDuration, setMetaDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);

  // Prefer real audio metadata; MediaRecorder webm often reports Infinity, so
  // fall back to the recorded durationMs from the message row.
  const duration = metaDuration > 0 && Number.isFinite(metaDuration)
    ? metaDuration
    : durationMs && durationMs > 0 ? durationMs / 1000 : 0;
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      setFailed(false);
      const attempt = audio.play();
      if (attempt) {
        attempt.catch(() => {
          setBuffering(false);
          setFailed(true);
          onEnded();
        });
      }
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, url]);

  const handleSeek = (event: ReactMouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || duration <= 0 || failed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    try {
      audio.currentTime = ratio * duration;
      setCurrentTime(ratio * duration);
    } catch { /* stream not seekable yet */ }
  };

  const handleRetryAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setFailed(false);
    setBuffering(true);
    audio.load();
    if (!playing) onToggle();
    else audio.play().catch(() => { setBuffering(false); setFailed(true); });
  };

  return (
    <div className="voice-note flex items-center gap-2 min-w-[180px]" onPointerDown={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const d = (e.target as HTMLAudioElement).duration;
          if (Number.isFinite(d) && d > 0) setMetaDuration(d);
        }}
        onDurationChange={(e) => {
          const d = (e.target as HTMLAudioElement).duration;
          if (Number.isFinite(d) && d > 0) setMetaDuration(d);
        }}
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => setBuffering(false)}
        onError={() => { setBuffering(false); setFailed(true); if (playing) onEnded(); }}
        onEnded={() => { setCurrentTime(0); onEnded(); }}
      />
      {failed ? (
        <button
          type="button"
          onClick={handleRetryAudio}
          className="flex items-center gap-1.5 text-danger"
          aria-label="Voice note failed to load. Retry"
        >
          <AlertCircle size={16} />
          <RefreshCw size={14} />
          <span className="text-xs">Retry</span>
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/10"
            aria-label={playing ? 'Pause voice note' : 'Play voice note'}
          >
            {buffering && playing
              ? <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              : playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <div
              className="relative h-1.5 rounded-full bg-white/20 cursor-pointer"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              aria-label="Voice note progress"
              onClick={handleSeek}
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-current opacity-90"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-[11px] opacity-80 tabular-nums leading-none">
              {formatAudioTime(playing || currentTime > 0 ? currentTime : duration)}
              {duration > 0 ? ` / ${formatAudioTime(duration)}` : ''}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function MessageBubble({
  message,
  onReact,
  onPlay,
  onPlaybackEnd,
  playing = false,
  onApproveMedia,
  onDenyMedia,
  onRetry,
  characterName = 'Character',
  characterId,
  creditBalance = 0,
  characterAvatarUrl,
  userAvatarUrl,
}: {
  message: ChatMessage;
  onReact: (messageId: string, emoji: string) => void;
  onPlay?: (message: ChatMessage) => void;
  onPlaybackEnd?: (message: ChatMessage) => void;
  playing?: boolean;
  onApproveMedia?: (message: ChatMessage) => void;
  onDenyMedia?: (message: ChatMessage) => void;
  onRetry?: (message: ChatMessage) => void;
  characterName?: string;
  characterId?: string;
  creditBalance?: number;
  characterAvatarUrl?: string;
  userAvatarUrl?: string;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();
  const isUser = message.sender === 'user';
  const selected = message.reactions.find((reaction) => reaction.actorType === 'user')?.emoji;
  const cleanText = message.kind === 'thought'
    ? message.text.replace(/^\*\*|\*\*$/g, '')
    : message.kind === 'action' ? message.text.replace(/^\*|\*$/g, '') : message.text;

  const beginHold = () => {
    holdTimer.current = setTimeout(() => setPickerOpen(true), HOLD_MS);
  };
  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  // ── Media generating placeholder ──
  if (message.kind === 'media_generating') {
    const mediaLabel = message.text?.includes('selfie') ? 'a selfie' : message.text?.includes('video') ? 'a video' : 'an image';
    // Try to extract specific description
    const descMatch = message.text?.match(/"(.*?)"/);
    const mediaDesc = descMatch ? descMatch[1] : mediaLabel;
    return (
      <article className="chat-message chat-message-character">
        {characterAvatarUrl && (
          <img src={characterAvatarUrl} alt={characterName} className="message-avatar" />
        )}
        <div className="message-stack">
          <div className="media-generating-card" role="status" aria-live="polite">
            <div className="media-generating-phone">
              <div className="media-generating-screen">
                <div className="media-generating-wave">
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                  <div className="wave-bar" />
                </div>
              </div>
              <div className="media-generating-phone-outline" />
            </div>
            <p className="media-generating-label">
              <strong>{characterName}</strong> is sending you {mediaDesc}...
            </p>
            <div className="media-generating-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        </div>
      </article>
    );
  }

  // ── Media request card ──
  if (message.kind === 'media_request') {
    const isSelfie = message.mediaRequestType === 'selfie';
    const creditsNeeded = message.estimatedCredits ?? 0;
    const hasEnoughCredits = creditBalance >= creditsNeeded;

    const handleGenerate = () => {
      setMediaLoading(true);
      if (dontAsk && characterId) {
        const key = `media_auto_approve_${characterId}`;
        localStorage.setItem(key, 'true');
      }
      onApproveMedia?.(message);
    };

    return (
      <article className="chat-message chat-message-character">
        {characterAvatarUrl && (
          <img src={characterAvatarUrl} alt={characterName} className="message-avatar" />
        )}
        <div className="message-stack">
          <div className="media-request-card" role="alert">
            <div className="media-request-header">
              <span className="media-request-emoji">📸</span>
              <span>
                <strong>{characterName}</strong> wants to send you {isSelfie ? 'a selfie' : `an image: "${message.mediaPrompt ?? ''}"`}
              </span>
            </div>
            {hasEnoughCredits ? (
              <p className="media-request-cost">This will cost <strong>{creditsNeeded} credits</strong></p>
            ) : (
              <p className="media-request-cost media-request-insufficient">
                ⚠️ You need {creditsNeeded} credits but only have {creditBalance}
              </p>
            )}
            <div className="media-request-actions">
              {hasEnoughCredits ? (
                <button
                  type="button"
                  className="media-request-button media-request-generate"
                  disabled={mediaLoading}
                  onClick={handleGenerate}
                >
                  {mediaLoading ? 'Generating...' : `Generate (${creditsNeeded})`}
                </button>
              ) : (
                <button
                  type="button"
                  className="media-request-button media-request-buy"
                  onClick={() => navigate('/billing')}
                >
                  Get More Credits →
                </button>
              )}
              <button
                type="button"
                className="media-request-button media-request-skip"
                disabled={mediaLoading}
                onClick={() => onDenyMedia?.(message)}
              >
                Skip
              </button>
            </div>
            <label className="media-request-dontask">
              <input
                type="checkbox"
                checked={dontAsk}
                onChange={(e) => setDontAsk(e.target.checked)}
              />
              Don't ask me again for {characterName}
            </label>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-character'}`}>
      {!isUser && characterAvatarUrl && (
        <img src={characterAvatarUrl} alt={characterName} className="message-avatar" />
      )}
      <div className="message-stack">
        {pickerOpen && (
          <ReactionBar
            selected={selected}
            onReact={(emoji) => { onReact(message.id, emoji); setPickerOpen(false); }}
          />
        )}
        <div
          className={`message-bubble message-${message.kind}`}
          aria-label={message.kind === 'thought' ? 'Character thought' : undefined}
          tabIndex={0}
          onPointerDown={beginHold}
          onPointerUp={cancelHold}
          onPointerCancel={cancelHold}
          onPointerLeave={cancelHold}
          onContextMenu={(event) => { event.preventDefault(); setPickerOpen(true); }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setPickerOpen((open) => !open);
            }
            if (event.key === 'Escape') setPickerOpen(false);
          }}
        >
          {message.kind === 'image' && message.mediaUrl ? (
            <img src={message.mediaUrl} alt={message.text || 'Photo sent in conversation'} loading="lazy" />
          ) : message.kind === 'video' && message.mediaUrl ? (
            <video src={message.mediaUrl} controls playsInline aria-label={message.text || 'Video sent in conversation'} />
          ) : (message.kind === 'voice_note' || message.kind === 'audio') && message.mediaUrl ? (
            <VoiceNotePlayer
              url={message.mediaUrl}
              playing={playing}
              durationMs={message.durationMs}
              onToggle={() => onPlay?.(message)}
              onEnded={() => onPlaybackEnd?.(message)}
            />
          ) : (
            <p>{cleanText}</p>
          )}
        </div>
        {message.reactions.length > 0 && (
          <div className="message-reactions" aria-label="Reactions">
            {message.reactions.map((reaction) => (
              <span key={`${reaction.actorType}-${reaction.actorId}`} title={reaction.actorType === 'character' ? 'Character reacted' : 'You reacted'}>
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
        {isUser && (
          <span className={`delivery-state delivery-${message.delivery}`} aria-label={message.delivery}>
            {message.delivery === 'failed' ? (
              <button
                onClick={() => onRetry?.(message)}
                className="text-danger hover:text-red-400 transition-colors flex items-center gap-1"
                title="Tap to retry"
              >
                <AlertCircle size={13} />
                <span className="text-[10px]">Retry</span>
              </button>
            ) : message.delivery === 'seen' ? (
              <CheckCheck size={13} className="text-brand-primary" />
            ) : message.delivery === 'delivered' ? (
              <CheckCheck size={13} className="text-text-muted" />
            ) : message.delivery === 'sent' ? (
              <Check size={13} className="text-text-muted" />
            ) : message.delivery === 'sending' ? (
              <span className="w-3 h-3 rounded-full border border-text-muted animate-pulse" />
            ) : (
              <Check size={13} className="text-text-muted" />
            )}
          </span>
        )}
      </div>
      {isUser && userAvatarUrl && (
        <img src={userAvatarUrl} alt="You" className="message-avatar" />
      )}
    </article>
  );
}
