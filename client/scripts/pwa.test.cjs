const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dir = path.join(__dirname, '../build');
function runtime() {
  const handlers = {}, shell = { offline: true }, precached = [];
  vm.runInNewContext(fs.readFileSync(path.join(dir, 'service-worker.js'), 'utf8'), {
    URL, self: { location: { origin: 'https://ecoroute.test' }, addEventListener: (name, fn) => { handlers[name] = fn; } },
    caches: { match: async () => shell, open: async () => ({ addAll: async assets => precached.push(...assets) }) },
    fetch: async () => { throw new Error('offline'); }
  });
  return { handlers, shell, precached };
}
test('all precached app-shell files exist in the production build', async () => {
  const r = runtime(); let promise;
  r.handlers.install({ waitUntil: p => { promise = p; } }); await promise;
  assert.ok(r.precached.includes('/index.html'));
  for (const asset of r.precached) assert.ok(fs.existsSync(path.join(dir, asset)), asset);
});
test('offline navigation returns the cached shell', async () => {
  const r = runtime(); let response;
  r.handlers.fetch({ request: { url: 'https://ecoroute.test/', method: 'GET', mode: 'navigate' }, respondWith: p => { response = p; } });
  assert.equal(await response, r.shell);
});
test('API responses and map tiles are never intercepted or cached', () => {
  const r = runtime();
  for (const url of ['https://ecoroute.test/api/places?q=Chennai', 'https://tile.openstreetmap.org/1/1/1.png']) {
    r.handlers.fetch({ request: { url, method: 'GET' }, respondWith: () => assert.fail('Sensitive/provider request intercepted') });
  }
});
