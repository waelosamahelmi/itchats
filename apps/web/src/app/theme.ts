const KEY = 'itchats-theme';

export type Theme = 'dark' | 'light';

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light') return 'light';
  } catch {}
  return 'dark';
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
  try { localStorage.setItem(KEY, theme); } catch {}
}

export function toggleTheme(): Theme {
  const next = getStoredTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/** Call once at app init to apply the stored preference */
export function initTheme() {
  applyTheme(getStoredTheme());
}
