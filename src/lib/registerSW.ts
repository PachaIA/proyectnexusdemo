// Único punto de registro del service worker. Nunca en desarrollo ni en la vista previa.
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const h = window.location.hostname;
  let inIframe = false;
  try { inIframe = window.self !== window.top; } catch { inIframe = true; }
  const refused =
    !import.meta.env.PROD ||
    inIframe ||
    h.startsWith('id-preview--') || h.startsWith('preview--') ||
    h === 'lovableproject.com' || h.endsWith('.lovableproject.com') ||
    h === 'lovableproject-dev.com' || h.endsWith('.lovableproject-dev.com') ||
    h === 'beta.lovable.dev' || h.endsWith('.beta.lovable.dev') ||
    new URLSearchParams(window.location.search).get('sw') === 'off';

  if (refused) {
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.filter((r) => r.active?.scriptURL.endsWith('/sw.js')).map((r) => r.unregister()));
    return;
  }
  const { registerSW } = await import('virtual:pwa-register');
  registerSW({ immediate: true });
}
