import { useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store, fetchMe, logout } from './store';
import { Router } from './router';
import { refreshPushSubscription } from '@/lib/push';

function AuthLoader({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<any>();
  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (t) {
      dispatch(fetchMe());
      // Refresh push subscription on token change
      refreshPushSubscription().catch(() => {});
    }

    const onExpired = () => dispatch(logout());
    window.addEventListener('itchats:session-expired', onExpired);
    return () => window.removeEventListener('itchats:session-expired', onExpired);
  }, [dispatch]);
  return <>{children}</>;
}

/** Listen for push notification navigate messages from service worker */
function PushNavigateListener({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'ITCHATS_PUSH_NAVIGATE' && event.data?.url) {
        navigate(event.data.url);
      }
    };

    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, [navigate]);

  return <>{children}</>;
}

export function App() {
  return (
    <Provider store={store}>
      <AuthLoader>
        <BrowserRouter>
          <PushNavigateListener>
            <Router />
          </PushNavigateListener>
        </BrowserRouter>
      </AuthLoader>
    </Provider>
  );
}
