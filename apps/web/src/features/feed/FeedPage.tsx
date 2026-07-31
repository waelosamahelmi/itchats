import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home, Plus, Smile, Camera, X,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { useAppDispatch } from '@/app/store';
import type { Story } from '@/app/store';
import {
  fetchFeed,
  fetchStoriesThunk,
  createNewPost,
} from '@/app/store';
import { t } from '@/lib/i18n';
import ProfileWizard from '@/features/auth/ProfileWizard';
import PostCard from '@/components/PostCard';
import MentionAutocomplete from '@/components/MentionAutocomplete';
import FeelingPicker from '@/components/FeelingPicker';
import LinkPreviewCard, { LinkPreviewSkeleton, LinkPreviewData } from '@/components/LinkPreviewCard';
import StoryViewer from '@/components/StoryViewer';
import { SkeletonLine } from '@/components/Skeleton';
import PullToRefresh from '@/components/PullToRefresh';
import NotificationBell from '@/components/NotificationBell';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

/** Trigger haptic feedback if available (Section 22) */
function haptic(ms: number = 10) {
  try { navigator?.vibrate?.(ms); } catch {}
}

// ── Story Circle ──
function StoryCircle({ story, isYours, userAvatar, onYourStoryClick, onClick }: { story: Story; isYours?: boolean; userAvatar?: string; onYourStoryClick?: () => void; onClick?: () => void }) {
  if (isYours) {
    return (
      <button onClick={onYourStoryClick} className="flex flex-col items-center gap-1 shrink-0 w-[72px] group">
        <div className="relative w-[64px] h-[64px] rounded-full overflow-hidden border-[3px] border-bg-canvas">
          {userAvatar ? (
            <img src={userAvatar} alt="You" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
          ) : (
            <div className="w-full h-full bg-bg-elevated flex items-center justify-center">
              <Camera size={24} className="text-text-muted" />
            </div>
          )}
        </div>
        <span className="text-[10px] text-text-secondary truncate w-full text-center leading-tight">{t('feed.yourStory')}</span>
      </button>
    );
  }

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1 shrink-0 w-[72px] group">
      <div className={`relative p-[2px] rounded-full ${story.viewed ? '' : 'bg-gradient-to-br from-brand-primary via-social-warm to-brand-secondary'} ${story.isLive ? 'ring-2 ring-danger ring-offset-2 ring-offset-bg-canvas' : ''}`}>
        <div className="w-[60px] h-[60px] rounded-full overflow-hidden border-[3px] border-bg-canvas">
          <img src={story.authorAvatar} alt={story.authorName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
        </div>
        {!story.viewed && (
          <div className="absolute inset-[2px] rounded-full border-[2px] border-transparent bg-gradient-to-br from-brand-primary via-social-warm to-brand-secondary" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude', WebkitMaskComposite: 'xor' }} />
        )}
      </div>
      <span className="text-[10px] text-text-secondary truncate w-full text-center leading-tight">{story.authorName}</span>
    </button>
  );
}

// ── Stories Bar ──
function StoriesBar({ stories, userAvatar, onYourStoryClick, onStoryClick }: { stories: Story[]; userAvatar?: string; onYourStoryClick?: () => void; onStoryClick?: (story: Story) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter: only show characters that have at least one active story
  // Group stories by character and keep only characters with stories
  const characterStories = new Map<string, Story>();
  for (const s of stories) {
    const key = (s as any).authorCharacterId || s.authorId || 'unknown';
    if (!characterStories.has(key)) {
      characterStories.set(key, s);
    }
  }
  const filteredStories = Array.from(characterStories.values());

  return (
    <div className="relative mb-4">
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-5 py-3 scrollbar-none"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {/* Your story */}
        <StoryCircle
          story={{ id: 'you', authorId: 'you', authorName: 'You', authorAvatar: userAvatar ?? '', isAI: false, viewed: false, isLive: false }}
          isYours
          userAvatar={userAvatar}
          onYourStoryClick={onYourStoryClick}
        />
        {filteredStories.map(s => (
          <StoryCircle key={s.id} story={s} onClick={() => onStoryClick?.(s)} />
        ))}
      </div>
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg-canvas to-transparent" />
    </div>
  );
}

// ── URL Regex ──
// ── URL Regex ──
const URL_REGEX = /https?:\/\/[^\s<>"]+/gi;

function extractFirstUrl(text: string): string | null {
  const matches = text.match(URL_REGEX);
  if (!matches || matches.length === 0) return null;
  // Return the longest match (most likely the pasted URL)
  let best = matches[0]!;
  for (const m of matches) if (m.length > best.length) best = m;
  return best;
}

// ── Composer ──
function Composer({ onPost, userAvatar, username, onStoryCreate, openSignal }: {
  onPost: (text: string, mediaUrl?: string, feeling?: string, mediaType?: string, linkPreview?: LinkPreviewData) => void;
  userAvatar?: string;
  username?: string;
  onStoryCreate?: () => void;
  /** Increment to programmatically expand/focus the composer (Create sheet → "New Post") */
  openSignal?: number;
}) {
  const [text, setText] = useState('');
  const [expanded, setExpanded] = useState(false);

  // External open request (e.g. bottom-nav Create sheet)
  useEffect(() => {
    if (openSignal && openSignal > 0) setExpanded(true);
  }, [openSignal]);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showFeelingPicker, setShowFeelingPicker] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Link preview state
  const [linkPreview, setLinkPreview] = useState<LinkPreviewData | null>(null);
  const [linkPreviewLoading, setLinkPreviewLoading] = useState(false);
  const prevUrlRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInsertMention = (before: string, mention: string, after: string) => {
    setText(before + mention + after);
    textareaRef.current?.focus();
    // Set cursor after the inserted mention
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + mention.length;
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  };

  const handleTextChange = (value: string) => {
    setText(value);

    // URL detection with debounce (500ms)
    const url = extractFirstUrl(value);
    if (url !== prevUrlRef.current) {
      prevUrlRef.current = url;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!url) {
        setLinkPreview(null);
        setLinkPreviewLoading(false);
        return;
      }

      setLinkPreviewLoading(true);
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const token = localStorage.getItem('accessToken');
          const res = await fetch('/v1/link-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ url }),
          });
          if (res.ok) {
            const data = await res.json();
            setLinkPreview(data);
          }
        } catch {
          // Silent — link preview is non-critical
        }
        setLinkPreviewLoading(false);
      }, 500);
    }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm'];
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

    if (!allowedTypes.includes(file.type)) {
      setUploadError(`Unsupported file type: ${file.type}. Allowed: JPEG, PNG, WebP, GIF, MP4, WebM.`);
      return;
    }

    // Size validation
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? maxVideoSize : maxImageSize;

    if (file.size > maxSize) {
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      setUploadError(`File too large. Maximum: ${maxMB}MB.`);
      return;
    }

    setUploadError(null);
    setSelectedMedia(file);
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!text.trim() && !selectedMedia) return;
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;
    if (selectedMedia) {
      mediaType = selectedMedia.type.startsWith('video/') ? 'video' : 'image';
      try {
        setUploadProgress(10);
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              setUploadProgress(10 + Math.round((e.loaded / e.total) * 30));
            }
          };
          reader.readAsDataURL(selectedMedia);
        });
        const token = localStorage.getItem('accessToken');
        setUploadProgress(40);
        const uploadRes = await fetch('/v1/media/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fileName: selectedMedia.name,
            contentType: selectedMedia.type,
            fileSize: selectedMedia.size,
            visibility: 'public',
          }),
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const { mediaAssetId, uploadUrl } = uploadData;
          setUploadProgress(60);
          if (uploadUrl) {
            try {
              await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': selectedMedia.type },
                body: selectedMedia,
              });
              setUploadProgress(80);
              await fetch('/v1/media/confirm-upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mediaAssetId }),
              });
            } catch {
              setUploadProgress(70);
              await fetch('/v1/media/upload-local', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ mediaAssetId, base64Content: base64 }),
              });
            }
          }
          setUploadProgress(90);
          const dlRes = await fetch(`/v1/media/${mediaAssetId}/download-url`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dlRes.ok) {
            const { url } = await dlRes.json();
            mediaUrl = url;
          }
          setUploadProgress(100);
        } else {
          throw new Error('Upload URL request failed');
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setUploadError('Upload failed. Retry or post without media.');
        setUploading(false);
        return;
      }
      if (!mediaUrl) {
        mediaUrl = mediaPreview ?? undefined;
      }
    }
    onPost(text.trim(), mediaUrl, selectedFeeling ?? undefined, mediaType, linkPreview ?? undefined);
    setText('');
    setSelectedMedia(null);
    setMediaPreview(null);
    setSelectedFeeling(null);
    setLinkPreview(null);
    setLinkPreviewLoading(false);
    prevUrlRef.current = null;
    setExpanded(false);
    setUploading(false);
    setUploadProgress(0);
    setUploadError(null);
  };

  return (
    <div className={`glass rounded-2xl p-4 mb-4 transition-all duration-300 ${expanded ? 'shadow-lg shadow-brand-glow/10' : ''}`}>
      <div className="flex items-center gap-3">
        <img
          src={userAvatar || `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(username || 'user')}`}
          alt=""
          className="w-10 h-10 rounded-full object-cover shrink-0"
        />
        <button
          onClick={() => setExpanded(true)}
          className={`flex-1 text-left glass rounded-full px-4 py-2.5 text-sm text-text-muted hover:bg-white/8 transition-colors ${expanded ? 'hidden' : ''}`}
        >
          {t('feed.whatsOnYourMind', { name: username || '' })}
        </button>
        {expanded && (
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => handleTextChange(e.target.value)}
              placeholder={t('feed.whatsOnYourMind', { name: username || '' })}
              rows={3}
              autoFocus
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none"
            />
            <MentionAutocomplete
              textareaRef={textareaRef}
              text={text}
              onInsertMention={handleInsertMention}
            />
          </div>
        )}
      </div>

      {/* Media Preview */}
      {mediaPreview && (
        <div className="mt-3 relative rounded-xl overflow-hidden">
          <img src={mediaPreview} alt="Preview" className="w-full max-h-[200px] object-cover rounded-xl" />
          <button
            onClick={() => { setSelectedMedia(null); setMediaPreview(null); setUploadError(null); }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Upload Progress Bar */}
      {uploading && uploadProgress > 0 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-text-muted">Uploading...</span>
            <span className="text-[10px] text-text-muted">{uploadProgress}%</span>
          </div>
          <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-primary rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Error */}
      {uploadError && (
        <div className="mt-3 p-3 rounded-xl bg-danger/10 border border-danger/20">
          <p className="text-xs text-danger">{uploadError}</p>
          <button
            onClick={() => { setSelectedMedia(null); setMediaPreview(null); setUploadError(null); }}
            className="text-[10px] text-text-secondary mt-1 hover:text-text-primary"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Link Preview */}
      {linkPreviewLoading && !linkPreview && (
        <div className="mt-3">
          <LinkPreviewSkeleton compact />
        </div>
      )}
      {linkPreview && (
        <div className="mt-3">
          <LinkPreviewCard
            preview={linkPreview}
            compact
            onRemove={() => { setLinkPreview(null); prevUrlRef.current = null; }}
          />
        </div>
      )}

      {/* Feeling badge */}
      {selectedFeeling && (
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs">
          <span className="text-base">{selectedFeeling.split(' ')[0]}</span>
          <span className="text-text-secondary">{selectedFeeling.split(' ').slice(1).join(' ')}</span>
          <button onClick={() => setSelectedFeeling(null)} className="ml-1 text-text-muted hover:text-text-primary">
            <X size={12} />
          </button>
        </div>
      )}

      {expanded && (
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFilePick}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="p-2 rounded-full glass hover:bg-white/8 text-text-muted hover:text-brand-primary transition-all"
              title={t('feed.addPhoto')}
            >
              <Camera size={18} />
            </button>
            <button
              onClick={() => setShowFeelingPicker(true)}
              className="p-2 rounded-full glass hover:bg-white/8 text-text-muted hover:text-text-primary transition-all"
              title={t('feed.addFeeling')}
            >
              <Smile size={18} />
            </button>
          </div>
          <button
            onClick={handleSubmit}
            disabled={(!text.trim() && !selectedMedia) || uploading}
            className="rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium hover:brightness-110 transition-all disabled:opacity-40"
          >
            {uploading ? t('feed.posting') : t('feed.post')}
          </button>
        </div>
      )}

      {/* Feeling Picker Portal */}
      <FeelingPicker
        show={showFeelingPicker}
        onClose={() => setShowFeelingPicker(false)}
        onSelect={(feeling) => setSelectedFeeling(feeling)}
      />
    </div>
  );
}

// ── Story Creator Modal ──
function StoryCreatorModal({ onClose, onPublish }: { onClose: () => void; onPublish: (caption: string, mediaUrl?: string) => void }) {
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [textOverlay, setTextOverlay] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaFile(file);
    const reader = new FileReader();
    reader.onload = () => setMediaPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePublish = async () => {
    if (!caption.trim() && !mediaFile) return;
    setPublishing(true);
    let mediaUrl: string | undefined;
    if (mediaFile) {
      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
          reader.readAsDataURL(mediaFile);
        });
        const token = localStorage.getItem('accessToken');
        const uploadRes = await fetch('/v1/media/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            fileName: mediaFile.name,
            contentType: mediaFile.type,
            fileSize: mediaFile.size,
            visibility: 'public',
          }),
        });
        if (uploadRes.ok) {
          const { mediaAssetId } = await uploadRes.json();
          await fetch('/v1/media/upload-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ mediaAssetId, base64Content: base64 }),
          });
          const dlRes = await fetch(`/v1/media/${mediaAssetId}/download-url`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (dlRes.ok) {
            const { url } = await dlRes.json();
            mediaUrl = url;
          }
        }
      } catch { mediaUrl = mediaPreview ?? undefined; }
    }
    const finalCaption = textOverlay ? `${caption.trim() || 'My story'} — ${textOverlay}` : (caption.trim() || 'My story 📸');
    onPublish(finalCaption, mediaUrl);
    setPublishing(false);
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[var(--z-modal,1200)] bg-black/70 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/5">
            <X size={20} className="text-text-secondary" />
          </button>
          <h2 className="text-lg font-semibold text-text-primary">{t('feed.createStory')}</h2>
          <button
            onClick={handlePublish}
            disabled={(!caption.trim() && !mediaFile) || publishing}
            className="text-sm font-semibold text-brand-primary disabled:opacity-40"
          >
            {publishing ? 'Sharing...' : 'Share'}
          </button>
        </div>

        {mediaPreview ? (
          <div className="relative rounded-2xl overflow-hidden mb-3">
            <img src={mediaPreview} alt="" className="w-full aspect-[9/16] object-cover" />
            <button
              onClick={() => { setMediaFile(null); setMediaPreview(null); }}
              className="absolute top-2 right-2 p-2 rounded-full bg-black/50 text-white"
            >
              <X size={14} />
            </button>
            {/* Text overlay on image */}
            <input
              value={textOverlay}
              onChange={e => setTextOverlay(e.target.value)}
              placeholder="Add text overlay..."
              className="absolute top-1/2 left-4 right-4 -translate-y-1/2 bg-black/40 text-white text-center text-sm py-2 px-4 rounded-lg outline-none placeholder:text-white/60"
            />
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption..."
              className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-sm p-3 outline-none placeholder:text-white/60"
            />
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full aspect-[9/16] max-h-[300px] rounded-2xl glass border-2 border-dashed border-border-subtle flex flex-col items-center justify-center gap-2 hover:border-brand-primary/50 transition-colors"
            >
              <Camera size={32} className="text-text-muted" />
              <span className="text-sm text-text-muted">Tap to add a photo</span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="What's on your mind?"
              rows={2}
              className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none resize-none"
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ── Main FeedPage ──
export default function FeedPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const { user } = useSelector((s: RootState) => s.auth);
  const { feedPosts, loading, error } = useSelector((s: RootState) => s.posts);
  const { stories } = useSelector((s: RootState) => s.stories);
  const profile = useSelector((s: RootState) => s.profile.profile);

  const [refreshing, setRefreshing] = useState(false);
  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [viewerStory, setViewerStory] = useState<Story | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [composerSignal, setComposerSignal] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const scrollRef = useScrollRestoration('feed', !loading);

  // Create-sheet signaling: /?compose=1 opens the post composer, /?story=1 the story creator
  useEffect(() => {
    const compose = searchParams.get('compose');
    const story = searchParams.get('story');
    if (!compose && !story) return;
    if (compose) setComposerSignal(s => s + 1);
    if (story) setShowStoryCreator(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (user) {
      dispatch(fetchFeed());
      dispatch(fetchStoriesThunk());
    }
  }, [dispatch, user]);

  // Check if wizard should be shown (first login after registration)
  useEffect(() => {
    const wizardCompleted = localStorage.getItem('wizardCompleted');
    if (user?.firstLogin && !wizardCompleted) {
      setShowWizard(true);
    }
  }, [user]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      dispatch(fetchFeed()),
      dispatch(fetchStoriesThunk()),
    ]);
    setRefreshing(false);
  }

  const handleCreatePost = (text: string, mediaUrl?: string, feeling?: string, mediaType?: string, linkPreview?: LinkPreviewData) => {
    const content = feeling ? `${feeling} — ${text}` : text;
    const payload: any = { content, mediaUrl, mediaType };
    if (linkPreview) {
      payload.linkPreview = linkPreview;
    }
    dispatch(createNewPost(payload));
  };

  const handleCreateStory = async (caption: string, mediaUrl?: string) => {
    try {
      const token = localStorage.getItem('accessToken');
      await fetch('/v1/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          storyType: 'selfie',
          caption,
          mediaUrl,
        }),
      });
      // Refresh stories after creating
      dispatch(fetchStoriesThunk());
    } catch (err) {
      console.error('Failed to create story:', err);
    }
  };

  // ── Profile Wizard on first login ──
  if (showWizard) {
    return (
      <ProfileWizard
        onComplete={() => {
          localStorage.setItem('wizardCompleted', 'true');
          setShowWizard(false);
          // Reload user to get updated state
          dispatch({ type: 'auth/me/pending' } as any);
        }}
      />
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-3xl glass flex items-center justify-center">
          <Home size={34} className="text-brand-secondary" />
        </div>
        <p className="text-text-secondary text-sm font-medium">{t('feed.welcome')}</p>
        <p className="text-text-muted text-xs text-center max-w-xs">{t('feed.signInPrompt')}</p>
        <button onClick={() => nav('/auth')} className="rounded-full bg-brand-primary px-6 py-3 text-white text-sm font-medium">{t('feed.signIn')}</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">{t('feed.title')}</h1>
          <NotificationBell />
        </div>
      </header>

      {/* Scrollable Content (pull down at top to refresh) */}
      <PullToRefresh onRefresh={handleRefresh} scrollRef={scrollRef} className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {refreshing && (
          <div className="flex justify-center py-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        )}

        {/* Stories Bar */}
        <StoriesBar
          stories={stories}
          userAvatar={profile?.avatarUrl}
          onYourStoryClick={() => setShowStoryCreator(true)}
          onStoryClick={s => setViewerStory(s)}
        />

        {/* Composer */}
        <div className="px-4">
          <Composer onPost={handleCreatePost} userAvatar={profile?.avatarUrl} username={profile?.username ?? user?.username} onStoryCreate={() => setShowStoryCreator(true)} openSignal={composerSignal} />
        </div>

        {/* Posts Feed */}
        <div className="px-4 pb-24 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card-solid rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="skeleton rounded-full" style={{ width: 40, height: 40 }} />
                  <div className="space-y-1.5 flex-1">
                    <SkeletonLine width={96} height={14} />
                    <SkeletonLine width={64} height={10} />
                  </div>
                </div>
                <div className="space-y-2">
                  <SkeletonLine width="75%" height={14} />
                  <SkeletonLine width="50%" height={14} />
                </div>
                <div className="skeleton rounded-xl" style={{ height: 180 }} />
              </div>
            ))
          ) : error ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Home size={28} />
              </div>
              <p className="empty-state-title">{t('feed.loadFailed')}</p>
              <p className="empty-state-desc">{error}</p>
              <button onClick={handleRefresh} className="mt-4 rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium touch-target">
                {t('feed.retry')}
              </button>
            </div>
          ) : feedPosts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Home size={28} />
              </div>
              <p className="empty-state-title">{t('feed.noPosts')}</p>
              <p className="empty-state-desc">{t('feed.feedWillFill')}</p>
            </div>
          ) : (
            feedPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>
      </PullToRefresh>

      {/* Story Creator */}
      {showStoryCreator && (
        <StoryCreatorModal onClose={() => setShowStoryCreator(false)} onPublish={handleCreateStory} />
      )}

      {/* Full-screen Story Viewer */}
      {viewerStory && (
        <StoryViewer
          story={viewerStory}
          onClose={() => {
            setViewerStory(null);
            // Refresh so viewed rings update
            dispatch(fetchStoriesThunk());
          }}
        />
      )}
    </div>
  );
}
