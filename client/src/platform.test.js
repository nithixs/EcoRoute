import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { Share } from '@capacitor/share';
import { api, currentLocation, exportDirections, NATIVE_API_ORIGIN } from './platform';
jest.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: jest.fn() }, CapacitorHttp: { request: jest.fn() } }));
jest.mock('@capacitor/geolocation', () => ({ Geolocation: { requestPermissions: jest.fn(), getCurrentPosition: jest.fn() } }));
jest.mock('@capacitor/share', () => ({ Share: { share: jest.fn() } }));
beforeEach(() => { jest.clearAllMocks(); Capacitor.isNativePlatform.mockReturnValue(false); Object.defineProperty(navigator, 'onLine', { configurable: true, value: true }); });
test('web API uses same-origin requests', async () => {
  global.fetch = jest.fn().mockResolvedValue({ status: 200, json: async () => ({ status: 'ok' }) });
  expect(await api('health')).toEqual({ status: 'ok' });
  expect(fetch.mock.calls[0][0]).toBe('/api/health');
});
test('Android uses native HTTPS requests with structured body and timeouts', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  CapacitorHttp.request.mockResolvedValue({ status: 200, data: { routes: [] } });
  await api('plan', { passengers: 2 });
  expect(CapacitorHttp.request).toHaveBeenCalledWith(expect.objectContaining({ url: NATIVE_API_ORIGIN + '/api/plan', method: 'POST', data: { passengers: 2 }, readTimeout: 45000 }));
});
test('provider validation errors remain visible to users', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  CapacitorHttp.request.mockResolvedValue({ status: 400, data: { error: 'Select valid places.' } });
  await expect(api('plan', {})).rejects.toThrow('Select valid places.');
});
test('offline requests fail before contacting a provider', async () => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
  await expect(api('health')).rejects.toThrow('You are offline');
  expect(CapacitorHttp.request).not.toHaveBeenCalled();
});
test('denied Android location permission does not request coordinates', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  Geolocation.requestPermissions.mockResolvedValue({ coarseLocation: 'denied' });
  await expect(currentLocation()).rejects.toThrow('permission');
  expect(Geolocation.getCurrentPosition).not.toHaveBeenCalled();
});
test('Android directions use native sharing', async () => {
  Capacitor.isNativePlatform.mockReturnValue(true);
  await exportDirections('Chennai to Puducherry');
  expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ text: 'Chennai to Puducherry' }));
});
