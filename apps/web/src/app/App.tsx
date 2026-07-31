import { useEffect } from 'react';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { Provider, useDispatch } from 'react-redux';
import { store, fetchMe, logout, setLanguage } from './store';
import { Router } from './router';
import { refreshPushSubscription } from '@/lib/push';
import { apiFetch } from '@/lib/api';
import { getStoredTheme, applyTheme } from './theme';
import { applyLanguage } from '@/lib/i18n';

/** Apply server-stored theme/language preferences (server wins over localStorage cache) */
function syncServerPreferences(dispatch: any) {
  apiFetch('/users/me/settings').then((s: any) => {
    if (s?.theme === 'light' || s?.theme === 'dark') {
      if (s.theme !== getStoredTheme()) {
        applyTheme(s.theme);
        window.dispatchEvent(new CustomEvent('themechange', { detail: s.theme }));
      }
    }
    if (s?.language && typeof s.language === 'string') {
      try {
        if (s.language !== localStorage.getItem('itchats-language')) {
          dispatch(setLanguage(s.language));
          applyLanguage(s.language);
        }
      } catch {}
    }
  }).catch(() => {});
}

function AuthLoader({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<any>();
  useEffect(() => {
    const t = localStorage.getItem('accessToken');
    if (t) {
      dispatch(fetchMe());
      // Refresh push subscription on token change
      refreshPushSubscription().catch(() => {});
      // Apply server-side theme/language (localStorage stays as instant-apply cache)
      syncServerPreferences(dispatch);
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
