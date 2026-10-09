import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { applyTheme, resolveTheme, THEME_STORAGE_KEY, type NexusTheme } from '@/lib/theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<NexusTheme>(() => document.documentElement.dataset.theme === 'caliza' ? 'caliza' : 'noche');
  useEffect(() => {
    const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.theme === 'caliza' ? 'caliza' : 'noche'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const sync = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY) applyTheme(resolveTheme(event.newValue, window.matchMedia('(prefers-color-scheme: light)').matches));
    };
    window.addEventListener('storage', sync);
    return () => { observer.disconnect(); window.removeEventListener('storage', sync); };
  }, []);
  const label = theme === 'noche' ? 'Cambiar a Caliza' : 'Cambiar a Noche';
  return <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label={label} title={label} onClick={() => {
    const next = theme === 'noche' ? 'caliza' : 'noche';
    applyTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); localStorage.setItem('theme', next === 'noche' ? 'dark' : 'light'); } catch { /* The current session still changes theme. */ }
  }}>{theme === 'noche' ? <Sun /> : <Moon />}</Button>;
}