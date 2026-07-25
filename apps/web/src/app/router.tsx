import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppShell from './AppShell';
import RequireAuth from './RequireAuth';
import AnimatedLogo from '@/components/AnimatedLogo';

const CameraPage = lazy(() => import('@/features/camera/CameraPage'));
const ChatsPage = lazy(() => import('@/features/chats/ChatsPage'));
const ChatDetailPage = lazy(() => import('@/features/chats/ChatPage'));
const AIPage = lazy(() => import('@/features/ai/AIPage'));
const AIChatPage = lazy(() => import('@/features/ai/AIChatPage'));
const CreateCharacterPage = lazy(() => import('@/features/ai/CreateCharacterPage'));
const CharacterProfilePage = lazy(() => import('@/features/ai/CharacterProfilePage'));
const DiscoverPage = lazy(() => import('@/features/discover/DiscoverPage'));
const SearchPage = lazy(() => import('@/features/search/SearchPage'));
const StoriesPage = lazy(() => import('@/features/stories/StoriesPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const MapPage = lazy(() => import('@/features/map/MapPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));
const BillingPage = lazy(() => import('@/features/billing/BillingPage'));
const AuthPage = lazy(() => import('@/features/auth/AuthPage'));
const AuthCallbackPage = lazy(() => import('@/features/auth/AuthCallbackPage'));
const AdminPanelPage = lazy(() => import('@/features/admin/AdminPanelPage'));

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-canvas relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] rounded-full blur-[100px] opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(255,72,210,0.5), transparent)' }} />
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
            <Route path="/" element={<CameraPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/chat/:convId" element={<ChatDetailPage />} />
            <Route path="/ai" element={<AIPage />} />
            <Route path="/ai/create" element={<CreateCharacterPage />} />
            <Route path="/ai/chat/:characterId" element={<AIChatPage />} />
            <Route path="/ai/profile/:characterId" element={<CharacterProfilePage />} />
            <Route path="/discover" element={<DiscoverPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/stories" element={<StoriesPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPanelPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
