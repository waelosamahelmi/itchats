import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Hash } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { Post } from '@/app/store';
import PostCard from '@/components/PostCard';
import { SkeletonLine } from '@/components/Skeleton';
import { t } from '@/lib/i18n';

interface HashtagApiPost {
  id: string;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  likeCount: number | null;
  commentCount: number | null;
  shareCount: number | null;
  createdAt: string;
  authorUserId: string | null;
  authorCharacterId: string | null;
  authorName: string;
  authorAvatar: string | null;
  isAI: boolean;
}

interface HashtagResponse {
  posts: HashtagApiPost[];
  hashtag: string;
  page: number;
  hasMore: boolean;
}

function mapToPost(r: HashtagApiPost): Post {
  return {
    id: r.id,
    authorId: r.authorCharacterId || r.authorUserId || '',
    authorName: r.authorName || 'Unknown',
    authorAvatar: r.authorAvatar || '',
    authorIsAI: !!r.isAI,
    content: r.content || '',
    mediaUrl: r.mediaUrl || undefined,
    mediaType: (r.mediaType as 'image' | 'video') || undefined,
    createdAt: r.createdAt,
    privacy: 'public',
    likes: r.likeCount ?? 0,
    likeCount: r.likeCount ?? 0,
    liked: false,
    viewerReaction: null,
    topReactions: [],
    comments: [],
    commentCount: r.commentCount ?? 0,
    shares: r.shareCount ?? 0,
    authorCharacterId: r.authorCharacterId ?? undefined,
    authorUserId: r.authorUserId ?? undefined,
  };
}

export default function HashtagPage() {
  const { name } = useParams<{ name: string }>();
  const nav = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    if (!name) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<HashtagResponse>(
        `/hashtags/${encodeURIComponent(name)}/posts?page=1&limit=20`,
      );
      setPosts((data?.posts ?? []).map(mapToPost));
      setHasMore(!!data?.hasMore);
    } catch (err: any) {
      setError(err?.message || 'Failed to load hashtag posts');
    }
    setLoading(false);
  }, [name]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => nav(-1)}
            className="w-9 h-9 rounded-full bg-bg-glass-strong backdrop-blur-xl border border-border-subtle flex items-center justify-center hover:bg-white/10 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft size={16} className="text-text-secondary" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold text-text-primary tracking-tight truncate overflow-guard">
              #{name}
            </h1>
            {!loading && !error && (
              <p className="text-[11px] text-text-muted">
                {posts.length}{hasMore ? '+' : ''} {posts.length === 1 ? 'post' : 'posts'}
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
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
              </div>
            ))
          ) : error ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Hash size={28} />
              </div>
              <p className="empty-state-title">{t('feed.loadFailed')}</p>
              <p className="empty-state-desc">{error}</p>
              <button
                onClick={load}
                className="mt-4 rounded-full bg-brand-primary px-5 py-2 text-white text-sm font-medium touch-target"
              >
                {t('feed.retry')}
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Hash size={28} />
              </div>
              <p className="empty-state-title">No posts yet</p>
              <p className="empty-state-desc">Posts tagged with #{name} will appear here.</p>
            </div>
          ) : (
            posts.map(post => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  );
}
