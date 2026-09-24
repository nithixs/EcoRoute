import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';

export const isNative = () => Capacitor.isNativePlatform();
export const NATIVE_API_ORIGIN = process.env.REACT_APP_API_ORIGIN || 'https://ecoroute-production.up.railway.app';

export async function api(path, body) {
  if (navigator.onLine === false) throw new Error('You are offline. Saved trips are available; connect to the internet to plan a new route.');
  let status, data;
  try {
    if (isNative()) {
      if (!NATIVE_API_ORIGIN.startsWith('https://')) throw new Error('The mobile API must use HTTPS.');
      const response = await CapacitorHttp.request({
        url: NATIVE_API_ORIGIN.replace(/\/$/, '') + '/api/' + path,
        method: body ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        ...(body ? { data: body } : {}),
        connectTimeout: 15000,
        readTimeout: 45000,
        responseType: 'json'
      });
      status = response.status;
      data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } else {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      try {
        const response = await fetch('/api/' + path, {
          signal: controller.signal,
          ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {})
        });
        status = response.status ?? (response.ok ? 200 : 500);
        data = await response.json();
      } finally { clearTimeout(timer); }
    }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The request timed out. Please try again.');
    throw new Error('Unable to reach EcoRoute. Check your connection and try again.');
  }
  if (status < 200 || status >= 300) throw new Error(data?.error || 'Request failed. Please retry.');
  return data;
}

export async function currentLocation() {
  if (isNative()) {
    const permission = await Geolocation.requestPermissions({ permissions: ['coarseLocation'] });
    if (permission.coarseLocation !== 'granted') throw new Error('Location permission was not granted.');
    return Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  }
  if (!navigator.geolocation) throw new Error('Location is unavailable in this browser.');
  return new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, maximumAge: 60000 }));
}

export async function exportDirections(text) {
  if (isNative()) {
    await Share.share({ title: 'EcoRoute trip directions', text, dialogTitle: 'Share your journey' });
    return;
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ecoroute-trip.txt';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
