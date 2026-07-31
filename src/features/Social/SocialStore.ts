import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from 'utils';

export interface Character {
  id: string;
  name: string;
  handle?: string;
  avatarUrl?: string;
  description?: string;
  mood?: string;
  followersCount?: number;
  score?: number;
  gender?: string;
  ageDisplay?: string;
  visibility?: string;
  status?: string;
  interests?: string[];
  ownerUserId?: string;
  isFollowing?: boolean;
}

export interface PostReaction {
  type: string;
  count: number;
}

export interface Post {
  id: string;
  authorUserId?: string;
  authorCharacterId?: string;
  content?: string;
  mediaUrl?: string;
  mediaType?: string;
  thumbnailUrl?: string;
  visibility?: string;
  repostOfPostId?: string;
  nsfw?: boolean;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  viewCount?: number;
  isAiGenerated?: boolean;
  sourceNewsUrl?: string;
  sourceNewsTitle?: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
  authorName?: string;
  authorAvatar?: string;
  authorIsAI?: boolean;
  viewerReaction?: string | null;
  reactions?: PostReaction[];
}

export interface Comment {
  id: string;
  postId: string;
  userId?: string;
  characterId?: string;
  parentCommentId?: string;
  content: string;
  isAiGenerated?: boolean;
  likeCount?: number;
  createdAt?: string;
  authorName?: string;
  authorAvatar?: string;
  authorIsAI?: boolean;
  viewerReaction?: string | null;
  reactions?: PostReaction[];
  replies?: Comment[];
}

export interface ReactionResponse {
  postId?: string;
  commentId?: string;
  viewerReaction: string | null;
  reactionCount: number;
  reactions: PostReaction[];
}

interface SocialState {
  // Characters
  mine: Character[];
  discover: Character[];
  currentCharacter: Character | null;
  charactersLoading: boolean;
  discoverLoading: boolean;

  // Feed
  feed: Post[];
  feedLoading: boolean;
  feedPage: number;
  feedHasMore: boolean;

  // Follow
  followLoading: Record<string, boolean>;

  error: string | null;
}

const safeNum = (value: unknown): number =>
  Number.isFinite(Number(value)) ? Number(value) : 0;

const initialState: SocialState = {
  mine: [],
  discover: [],
  currentCharacter: null,
  charactersLoading: false,
  discoverLoading: false,

  feed: [],
  feedLoading: false,
  feedPage: 1,
  feedHasMore: true,

  followLoading: {},

  error: null,
};

// ── Thunks ──

export const fetchMyCharacters = createAsyncThunk(
  'social/fetchMine',
  async () => {
    const [, response] = await api.get('/v1/characters/mine');
    return (response || []) as Character[];
  },
);

export const fetchDiscoverCharacters = createAsyncThunk(
  'social/fetchDiscover',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
    const [, response] = await api.get(`/v1/characters/discover?page=${page}&limit=${limit}`);
    return { characters: (response || []) as Character[], page };
  },
);

export const fetchCharacterById = createAsyncThunk(
  'social/fetchCharacterById',
  async (characterId: string) => {
    const [, response] = await api.get(`/v1/characters/${characterId}`);
    return response as Character;
  },
);

export const followCharacter = createAsyncThunk(
  'social/followCharacter',
  async ({ characterId, isFollowing }: { characterId: string; isFollowing: boolean }, { getState }) => {
    if (!isFollowing) {
      const [, response] = await api.post(`/v1/characters/${characterId}/follow`, {});
      return { characterId, isFollowing: true, response };
    } else {
      await api.delete(`/v1/characters/${characterId}/follow`);
      return { characterId, isFollowing: false };
    }
  },
);

export const fetchFeed = createAsyncThunk(
  'social/fetchFeed',
  async ({ page = 1, limit = 20 }: { page?: number; limit?: number } = {}) => {
    const [, response] = await api.get(`/v1/posts/feed?page=${page}&limit=${limit}`);
    return { posts: (response || []) as Post[], page };
  },
);

export const reactToPost = createAsyncThunk(
  'social/reactToPost',
  async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
    const [, response] = await api.put(`/v1/posts/${postId}/reaction`, { reactionType });
    return { postId, ...(response as ReactionResponse) };
  },
);

export const unreactToPost = createAsyncThunk(
  'social/unreactToPost',
  async (postId: string) => {
    const [, response] = await api.delete(`/v1/posts/${postId}/reaction`);
    return { postId, ...(response as ReactionResponse) };
  },
);

export const addComment = createAsyncThunk(
  'social/addComment',
  async ({ postId, content, parentCommentId }: { postId: string; content: string; parentCommentId?: string }) => {
    const [, response] = await api.post(`/v1/posts/${postId}/comments`, { content, parentCommentId });
    return { postId, comment: response as Comment };
  },
);

export const fetchComments = createAsyncThunk(
  'social/fetchComments',
  async ({ postId, page = 1, limit = 20 }: { postId: string; page?: number; limit?: number }) => {
    const [, response] = await api.get(`/v1/posts/${postId}/comments?page=${page}&limit=${limit}`);
    return { postId, comments: (response || []) as Comment[] };
  },
);

export const reactToComment = createAsyncThunk(
  'social/reactToComment',
  async ({ commentId, reactionType }: { commentId: string; reactionType: string }) => {
    const [, response] = await api.put(`/v1/posts/comments/${commentId}/reaction`, { reactionType });
    return { commentId, ...(response as ReactionResponse) };
  },
);

export const unreactToComment = createAsyncThunk(
  'social/unreactToComment',
  async (commentId: string) => {
    const [, response] = await api.delete(`/v1/posts/comments/${commentId}/reaction`);
    return { commentId, ...(response as ReactionResponse) };
  },
);

// ── Slice ──

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    clearCurrentCharacter(state) {
      state.currentCharacter = null;
    },
    resetFeed(state) {
      state.feed = [];
      state.feedPage = 1;
      state.feedHasMore = true;
    },
    optimisticPostReaction(
      state,
      action: PayloadAction<{ postId: string; viewerReaction: string; prevReaction: string | null; prevCount: number }>,
    ) {
      const post = state.feed.find((p) => p.id === action.payload.postId);
      if (post) {
        post.viewerReaction = action.payload.viewerReaction;
        post.likeCount = action.payload.prevCount;
      }
    },
  },
  extraReducers: (builder) => {
    // My characters
    builder.addCase(fetchMyCharacters.pending, (state) => {
      state.charactersLoading = true;
    });
    builder.addCase(fetchMyCharacters.fulfilled, (state, action) => {
      state.charactersLoading = false;
      state.mine = action.payload;
    });
    builder.addCase(fetchMyCharacters.rejected, (state, action) => {
      state.charactersLoading = false;
      state.error = action.error.message || 'Failed to load characters';
    });

    // Discover
    builder.addCase(fetchDiscoverCharacters.pending, (state) => {
      state.discoverLoading = true;
    });
    builder.addCase(fetchDiscoverCharacters.fulfilled, (state, action) => {
      state.discoverLoading = false;
      if (action.payload.page === 1) {
        state.discover = action.payload.characters;
      } else {
        const existingIds = new Set(state.discover.map((c) => c.id));
        const newChars = action.payload.characters.filter((c) => !existingIds.has(c.id));
        state.discover = [...state.discover, ...newChars];
      }
    });
    builder.addCase(fetchDiscoverCharacters.rejected, (state, action) => {
      state.discoverLoading = false;
      state.error = action.error.message || 'Failed to load discover';
    });

    // Character by ID
    builder.addCase(fetchCharacterById.fulfilled, (state, action) => {
      state.currentCharacter = action.payload;
    });
    builder.addCase(fetchCharacterById.rejected, (state, action) => {
      state.error = action.error.message || 'Failed to load character';
    });

    // Follow
    builder.addCase(followCharacter.pending, (state, action) => {
      state.followLoading[action.meta.arg.characterId] = true;
    });
    builder.addCase(followCharacter.fulfilled, (state, action) => {
      state.followLoading[action.payload.characterId] = false;
      const updateFollow = (list: Character[]) => {
        const char = list.find((c) => c.id === action.payload.characterId);
        if (char) {
          char.isFollowing = action.payload.isFollowing;
        }
      };
      updateFollow(state.mine);
      updateFollow(state.discover);
      if (state.currentCharacter?.id === action.payload.characterId) {
        state.currentCharacter.isFollowing = action.payload.isFollowing;
      }
    });
    builder.addCase(followCharacter.rejected, (state, action) => {
      const charId = action.meta.arg.characterId;
      state.followLoading[charId] = false;
      // Rollback: restore previous isFollowing
      const prev = !action.meta.arg.isFollowing;
      const rollback = (list: Character[]) => {
        const char = list.find((c) => c.id === charId);
        if (char) char.isFollowing = prev;
      };
      rollback(state.mine);
      rollback(state.discover);
      if (state.currentCharacter?.id === charId) {
        state.currentCharacter.isFollowing = prev;
      }
      state.error = action.error.message || 'Failed to update follow';
    });

    // Feed
    builder.addCase(fetchFeed.pending, (state) => {
      state.feedLoading = true;
    });
    builder.addCase(fetchFeed.fulfilled, (state, action) => {
      state.feedLoading = false;
      const posts = action.payload.posts.map((p) => ({
        ...p,
        likeCount: safeNum(p.likeCount),
        commentCount: safeNum(p.commentCount),
        shareCount: safeNum(p.shareCount),
        viewCount: safeNum(p.viewCount),
      }));
      if (action.payload.page === 1) {
        state.feed = posts;
      } else {
        const existingIds = new Set(state.feed.map((p) => p.id));
        state.feed = [...state.feed, ...posts.filter((p) => !existingIds.has(p.id))];
      }
      state.feedHasMore = posts.length >= 20;
      state.feedPage = action.payload.page;
    });
    builder.addCase(fetchFeed.rejected, (state, action) => {
      state.feedLoading = false;
      state.error = action.error.message || 'Failed to load feed';
    });

    // Post reaction
    builder.addCase(reactToPost.fulfilled, (state, action) => {
      const { postId, viewerReaction, reactionCount, reactions } = action.payload;
      const post = state.feed.find((p) => p.id === postId);
      if (post) {
        post.viewerReaction = viewerReaction;
        post.likeCount = safeNum(reactionCount);
        post.reactions = reactions;
      }
    });
    builder.addCase(reactToPost.rejected, (state, action) => {
      // Rollback handled by optimistic approach in components
    });

    builder.addCase(unreactToPost.fulfilled, (state, action) => {
      const { postId, viewerReaction, reactionCount, reactions } = action.payload;
      const post = state.feed.find((p) => p.id === postId);
      if (post) {
        post.viewerReaction = viewerReaction;
        post.likeCount = safeNum(reactionCount);
        post.reactions = reactions;
      }
    });

    // Comments
    builder.addCase(fetchComments.fulfilled, (state, action) => {
      // Comments are typically managed in component state, but we store for persistence
    });

    builder.addCase(addComment.fulfilled, (state, action) => {
      const post = state.feed.find((p) => p.id === action.payload.postId);
      if (post) {
        post.commentCount = safeNum((post.commentCount ?? 0) + 1);
      }
    });

    // Comment reactions
    builder.addCase(reactToComment.fulfilled, () => {});
    builder.addCase(unreactToComment.fulfilled, () => {});
  },
});

export const { clearCurrentCharacter, resetFeed, optimisticPostReaction } = socialSlice.actions;
export default socialSlice.reducer;
