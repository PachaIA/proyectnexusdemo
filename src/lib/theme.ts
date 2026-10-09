export type NexusTheme = 'noche' | 'caliza';
export const THEME_STORAGE_KEY = 'nexus-theme';

export function resolveTheme(saved: string | null, prefersLight: boolean): NexusTheme {
  if (saved === 'noche' || saved === 'dark') return 'noche';
  if (saved === 'caliza' || saved === 'light') return 'caliza';
  return prefersLight ? 'caliza' : 'noche';
}

export function applyTheme(theme: NexusTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'noche');
  root.style.colorScheme = theme === 'noche' ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'noche' ? '#101A22' : '#EFE7D7');
}

export function initializeTheme() {
  let saved: string | null = null;
  try { saved = localStorage.getItem(THEME_STORAGE_KEY) ?? localStorage.getItem('theme'); } catch { /* Storage may be blocked. */ }
  applyTheme(resolveTheme(saved, window.matchMedia('(prefers-color-scheme: light)').matches));
}