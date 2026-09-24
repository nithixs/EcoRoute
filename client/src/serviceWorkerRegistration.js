import { isNative } from './platform';

export function registerServiceWorker() {
  if (process.env.NODE_ENV !== 'production' || isNative() || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      const announce = () => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('ecoroute-update', { detail: registration.waiting }));
        }
      };
      announce();
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        worker?.addEventListener('statechange', () => { if (worker.state === 'installed') announce(); });
      });
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) { refreshing = true; window.location.reload(); }
      });
    }).catch(() => { /* Network-only mode remains available if installation fails. */ });
  });
}
