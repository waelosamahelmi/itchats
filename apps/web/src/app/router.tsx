import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import AppShell from './AppShell';

const CameraPage = lazy(() => import('@/features/camera/CameraPage'));
const ChatsPage = lazy(() => import('@/features/chats/ChatsPage'));
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

function Loading() {
  return <div className="flex h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" /></div>;
}

export function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<CameraPage />} />
          <Route path="/chats" element={<ChatsPage />} />
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
        </Route>
      </Routes>
    </Suspense>
  );
}
