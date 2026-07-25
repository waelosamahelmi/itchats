import { useSelector } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import type { RootState } from './store';

/** Redirects to /auth if no valid session exists */
const RequireAuth = () => {
  const token = useSelector((s: RootState) => s.auth.token);

  if (!token) {
    return <Navigate to="/auth" replace />;
  }
  return <Outlet />;
};

export default RequireAuth;

