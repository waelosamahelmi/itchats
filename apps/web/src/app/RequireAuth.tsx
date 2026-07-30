import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import type { RootState } from './store';
import AnimatedLogo from '@/components/AnimatedLogo';

/** Redirects to /auth if no valid session exists. Shows loader while fetching user. */
const RequireAuth = () => {
  const { token, user, loading } = useSelector((s: RootState) => s.auth);
  const localToken = localStorage.getItem('accessToken');

  if (!token && !localToken) {
    return <Navigate to="/auth" replace />;
  }

  if (!token && localToken) {
    return <Outlet />;
  }

  if (!user && loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-canvas">
        <div className="relative z-10 text-center">
          <AnimatedLogo size={120} />
          <p className="text-text-muted text-sm mt-4 animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};

export default RequireAuth;

