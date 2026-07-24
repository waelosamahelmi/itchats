import { Routes, Route } from 'react-router-dom';

// Lazy-loaded pages
import { lazy, Suspense } from 'react';

const HomePage = lazy(() => import('@/features/home/HomePage'));
const ChatPage = lazy(() => import('@/features/chats/ChatPage'));
const DiscoverPage = lazy(() => import('@/features/discover/DiscoverPage'));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'));

function Loading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
    </div>
  );
}

export function Router() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chats" element={<ChatPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </Suspense>
  );
}
