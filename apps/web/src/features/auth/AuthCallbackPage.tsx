import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function AuthCallbackPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    const token = params.get('token');
    const refresh = params.get('refresh');
    if (token) {
      localStorage.setItem('accessToken', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      nav('/ai', { replace: true });
    } else {
      nav('/auth', { replace: true });
    }
  }, [nav, params]);

  return (
    <div className="flex h-screen items-center justify-center bg-bg-canvas">
      <div className="text-center">
        <div className="flex gap-1 justify-center mb-4">
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-text-muted text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}
