import { useRef, useState } from 'react';
import { Check, CheckCheck, Pause, Play, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ChatMessage } from './chatModel';
import { ReactionBar } from './ReactionBar';

const HOLD_MS = 420;

export function MessageBubble({
  message,
  onReact,
  onPlay,
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
            <button type="button" className="voice-note" onClick={() => onPlay?.(message)}>
              {playing ? <Pause size={17} /> : <Play size={17} />}
              <span className="voice-wave" aria-hidden="true">▂▅▃▇▅▂▆▃▅</span>
              <span className="sr-only">{playing ? 'Pause voice note' : 'Play voice note'}</span>
            </button>
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
