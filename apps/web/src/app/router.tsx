import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppShell from './AppShell';
import RequireAuth from './RequireAuth';
import AnimatedLogo from '@/components/AnimatedLogo';

// ── Lazy-loaded pages ──
const FeedPage = lazy(() => import('@/features/feed/FeedPage'));
const ChatsPage = lazy(() => import('@/features/chats/ChatsPage'));
const ChatDetailPage = lazy(() => import('@/features/chats/ChatPage'));
const AIPage = lazy(() => import('@/features/ai/AIPage'));
const AIChatPage = lazy(() => import('@/features/ai/AIChatPage'));
const CreateCharacterPage = lazy(() => import('@/features/ai/CreateCharacterPage'));
const CharacterProfilePage = lazy(() => import('@/features/ai/CharacterProfilePage'));
const DiscoverPage = lazy(() => import('@/features/discover/DiscoverPage'));
const MyCharactersPage = lazy(() => import('@/features/characters/MyCharactersPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const StoriesPage = lazy(() => import('@/features/stories/StoriesPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const LivePage = lazy(() => import('@/features/live/LivePage'));
const BillingPage = lazy(() => import('@/features/billing/BillingPage'));
const AuthPage = lazy(() => import('@/features/auth/AuthPage'));
const AuthCallbackPage = lazy(() => import('@/features/auth/AuthCallbackPage'));
const AdminPanelPage = lazy(() => import('@/features/admin/AdminPanelPage'));
const LegalPage = lazy(() => import('@/features/legal/LegalPage'));
const FAQPage = lazy(() => import('@/features/legal/FAQPage'));
const TermsPage = lazy(() => import('@/features/legal/TermsPage'));
const PrivacyPage = lazy(() => import('@/features/legal/PrivacyPage'));
const CookiePage = lazy(() => import('@/features/legal/CookiePage'));

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-canvas relative overflow-hidden">
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full blur-[100px] opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.5), transparent)' }}
      />
      <div className="relative z-10">
        <AnimatedLogo size={200} />
        <p className="text-center text-text-muted text-sm mt-6 animate-pulse">Loading your AI world…</p>
      </div>
    </div>
  );
}

export function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            {/* Main feed — default landing */}
            <Route index element={<FeedPage />} />
            <Route path="/" element={<FeedPage />} />

            {/* Chats */}
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/chat/:convId" element={<ChatDetailPage />} />

            {/* AI Characters */}
            <Route path="/ai" element={<AIPage />} />
            <Route path="/ai/create" element={<CreateCharacterPage />} />
            <Route path="/ai/edit/:characterId" element={<CreateCharacterPage />} />
            <Route path="/ai/chat/:characterId" element={<AIChatPage />} />
            <Route path="/ai/profile/:characterId" element={<CharacterProfilePage />} />

            {/* Characters (My Characters) */}
            <Route path="/characters" element={<MyCharactersPage />} />
            <Route path="/characters/create" element={<CreateCharacterPage />} />
            <Route path="/characters/edit/:id" element={<CreateCharacterPage />} />

            {/* Discover */}
            <Route path="/discover" element={<DiscoverPage />} />

            {/* Live */}
            <Route path="/live" element={<LivePage />} />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Other */}
            <Route path="/search" element={<SearchPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/admin" element={<AdminPanelPage />} />

            {/* Legal */}
            <Route path="/legal" element={<LegalPage />}>
              <Route index element={<FAQPage />} />
              <Route path="faq" element={<FAQPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="cookies" element={<CookiePage />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
