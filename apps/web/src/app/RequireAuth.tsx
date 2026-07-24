import { Navigate, Outlet } from 'react-router-dom';

function hasToken(): boolean {
  try {
    return !!localStorage.getItem('accessToken');
  } catch {
    return false;
  }
}

/** Redirects to /auth if no access token is present */
const RequireAuth = () => {
  if (!hasToken()) {
    return <Navigate to="/auth" replace />;
  }
  return <Outlet />;
};

export default RequireAuth;

