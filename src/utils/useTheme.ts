import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem('wa_theme') as Theme) || 'system';
  });

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem('wa_theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return { theme, setTheme };
}
