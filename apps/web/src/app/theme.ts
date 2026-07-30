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

  // Update theme-color meta tag for browser chrome
  updateThemeColorMeta(theme);
}

export function toggleTheme(): Theme {
  const next = getStoredTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

/**
 * Toggle theme and notify all listeners via a custom event.
 * Use this in UI components that need to reactively update.
 */
export function toggleAndNotify(): Theme {
  const next = toggleTheme();
  window.dispatchEvent(new CustomEvent('themechange', { detail: next }));
  return next;
}

/** Call once at app init to apply the stored preference */
export function initTheme() {
  applyTheme(getStoredTheme());
}

/** Update the <meta name="theme-color"> tag to match the current background */
function updateThemeColorMeta(theme: Theme) {
  const meta = document.getElementById('theme-color-meta') as HTMLMetaElement | null;
  if (!meta) return;
  meta.content = theme === 'dark' ? '#08080f' : '#f8f8fc';
}
