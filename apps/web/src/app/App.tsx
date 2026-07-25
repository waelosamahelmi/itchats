import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store, fetchMe, logout } from './store';
import { Router } from './router';

function AuthLoader({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<any>();
  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (t) dispatch(fetchMe());

    const onExpired = () => dispatch(logout());
    window.addEventListener('itchats:session-expired', onExpired);
    return () => window.removeEventListener('itchats:session-expired', onExpired);
  }, [dispatch]);
  return <>{children}</>;
}

export function App() {
  return (
    <Provider store={store}>
      <AuthLoader>
        <BrowserRouter>
          <Router />
        </BrowserRouter>
      </AuthLoader>
    </Provider>
  );
}
