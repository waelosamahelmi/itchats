import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import type { RootState } from './store';

/** Redirects to /auth if no valid session exists. Checks for both token and user object. */
const RequireAuth = () => {
  const { token, user } = useSelector((s: RootState) => s.auth);
  const localToken = localStorage.getItem('accessToken');

  if (!token && !localToken) {
    return <Navigate to="/auth" replace />;
  }
  if (!token && localToken) {
    return <Outlet />;
  }
  return <Outlet />;
};

export default RequireAuth;

