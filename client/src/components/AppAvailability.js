import { useEffect, useState } from 'react';
import { isNative } from '../platform';

export default function AppAvailability() {
  const [online, setOnline] = useState(navigator.onLine !== false);
  const [prompt, setPrompt] = useState(null);
  const [help, setHelp] = useState(false);
  const [installed, setInstalled] = useState(() => window.matchMedia?.('(display-mode: standalone)').matches || false);
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    const connectivity = () => setOnline(navigator.onLine !== false);
    const available = event => { event.preventDefault(); setPrompt(event); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    const updated = event => setUpdate(event.detail);
    window.addEventListener('online', connectivity);
    window.addEventListener('offline', connectivity);
    window.addEventListener('beforeinstallprompt', available);
    window.addEventListener('appinstalled', complete);
    window.addEventListener('ecoroute-update', updated);
    return () => {
      window.removeEventListener('online', connectivity);
      window.removeEventListener('offline', connectivity);
      window.removeEventListener('beforeinstallprompt', available);
      window.removeEventListener('appinstalled', complete);
      window.removeEventListener('ecoroute-update', updated);
    };
  }, []);
  async function install() {
    if (!prompt) { setHelp(!help); return; }
    try { await prompt.prompt(); await prompt.userChoice; } finally { setPrompt(null); }
  }
  return <section className="availability" aria-label="App availability">
    <span>{isNative() ? 'ANDROID APP' : installed ? 'INSTALLED WEB APP' : 'WEB + ANDROID'} · {online ? 'Online' : 'Offline'}</span>
    {!isNative() && !installed && <button onClick={install}>Install web app</button>}
    {update && <button onClick={() => { update.postMessage({ type: 'ACTIVATE_UPDATE' }); setUpdate(null); }}>Update app</button>}
    {!online && <p role="status">Saved journey summaries are available on this device. Maps, new routes, weather and the copilot need an internet connection.</p>}
    {help && <p>In Chrome or Edge, open the browser menu and choose “Install app” or “Add to Home screen” when available. Installation requires HTTPS and a supported browser.</p>}
  </section>;
}
