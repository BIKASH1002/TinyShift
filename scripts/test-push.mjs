import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createECDH } from 'node:crypto';
import vm from 'node:vm';
import { build } from 'esbuild';

async function bundle(entry, plugins = [], define = {}) {
  const result = await build({ entryPoints: [entry], bundle: true, write: false,
    platform: 'node', format: 'esm', plugins, define });
  return import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const shared = await bundle('backend/supabase/functions/_shared/pushDelivery.ts');
for (const endpoint of [
  'https://fcm.googleapis.com/fcm/send/test',
  'https://updates.push.services.mozilla.com/wpush/v2/test',
  'https://web.push.apple.com/test',
  'https://wns2.notify.windows.com/test',
]) assert.equal(shared.allowedPushEndpoint(endpoint), true);
for (const endpoint of [
  null, 'http://fcm.googleapis.com/test', 'https://127.0.0.1/test',
  'https://fcm.googleapis.com.evil.test/test', 'https://fcm.googleapis.com@evil.test/test',
  'https://fcm.googleapis.com:8443/test', 'https://fcm.googleapis.com/test#fragment',
  'https://fcm.googleapis.com/test\n', 'https://fcm.googleapis.com\\@evil.test/test',
]) assert.equal(shared.allowedPushEndpoint(endpoint), false);
const job = { delivery_id: 'job', lease_token: 'lease', endpoint: 'https://fcm.googleapis.com/test',
  p256dh: 'test-key', auth_key: 'test-auth', kind: 'daily', reminder_id: 'reminder',
  expires_at: new Date(Date.now() + 7_200_000).toISOString() };
let sending = 0, peak = 0, finishes = [];
const results = await shared.deliverPushBatch(Array.from({ length: 12 }, (_, i) => ({ ...job, delivery_id: String(i) })),
  async (_job, payload, ttl) => {
    sending++; peak = Math.max(peak, sending);
    assert.equal(ttl, 3600);
    assert.deepEqual(JSON.parse(payload), { kind: 'daily', tag: 'tinyshift-reminder' });
    await new Promise(resolve => setTimeout(resolve, 1));
    sending--; return 201;
  }, async (value, code) => finishes.push([value.delivery_id, code]));
assert.deepEqual(results, { sent: 12, failed: 0 });
assert.equal(peak, 5);
assert.equal(finishes.length, 12);
finishes = [];
await shared.deliverPushBatch([
  { ...job, endpoint: 'https://localhost/private' },
  { ...job, expires_at: '2000-01-01T00:00:00Z' },
  { ...job, expires_at: 'bad' },
], () => assert.fail('Invalid/expired job sent'), async (_, code) => finishes.push(code));
assert.deepEqual(finishes, [400, 400, 400]);
await shared.deliverPushBatch([job], async () => { throw new Error('timeout'); },
  async (_, code) => assert.equal(code, 0));

// Exercise the actual edge handler with provider and database boundaries mocked.
let handler, claimed = 0, finished = 0, providerCalls = 0, ackFails = false, queueFails = false;
const secrets = { PUSH_WORKER_SECRET: 'worker-test-'.repeat(4), WEB_PUSH_PUBLIC_KEY: 'test',
  WEB_PUSH_PRIVATE_KEY: 'test', WEB_PUSH_SUBJECT: 'mailto:operator@example.test',
  SUPABASE_URL: 'https://example.test', SUPABASE_SERVICE_ROLE_KEY: 'test' };
globalThis.Deno = { serve: fn => { handler = fn; }, env: { get: name => secrets[name] } };
globalThis.pushTestClient = { rpc: async (name, args) => {
  if (name === 'claim_push_deliveries') { claimed++; assert.equal(args.p_limit, 20); return { data: [job], error: queueFails ? {} : null }; }
  assert.equal(name, 'finish_push_delivery');
  assert.deepEqual(args, { p_id: 'job', p_lease: 'lease', p_code: 201 });
  finished++; return { error: ackFails ? {} : null };
} };
globalThis.pushTestCrypto = {
  setVapidDetails: (subject, key, privateKey) => { assert.ok(subject && key && privateKey); },
  generateRequestDetails: (subscription, payload, options) => {
    assert.equal(subscription.endpoint, job.endpoint);
    assert.deepEqual(subscription.keys, { p256dh: job.p256dh, auth: job.auth_key });
    assert.equal(options.contentEncoding, 'aes128gcm');
    assert.equal(JSON.parse(payload).kind, 'daily');
    return { endpoint: subscription.endpoint, method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: new Uint8Array([1,2,3]) };
  },
};
const edgePlugin = { name: 'push-edge-mocks', setup(build) {
  build.onResolve({ filter: /^(https:|npm:)/ }, ({ path }) => ({ path, namespace: 'mock' }));
  build.onLoad({ filter: /.*/, namespace: 'mock' }, ({ path }) => ({ contents:
    path.startsWith('npm:') ? 'export default globalThis.pushTestCrypto;' :
      'export const createClient = () => globalThis.pushTestClient;' }));
} };
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async (url, options) => {
    providerCalls++;
    assert.equal(url, job.endpoint);
    assert.equal(options.redirect, 'error');
    assert.ok(options.signal instanceof AbortSignal);
    assert.ok(options.body instanceof Uint8Array);
    return new Response(null, { status: 201 });
  };
  await bundle('backend/supabase/functions/send-push-reminders/index.ts', [edgePlugin]);
  const req = (token = secrets.PUSH_WORKER_SECRET) => new Request('https://example.test/push',
    { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
  assert.equal((await handler(new Request('https://example.test'))).status, 405);
  assert.equal((await handler(req('bad'))).status, 401);
  const saved = secrets.WEB_PUSH_PRIVATE_KEY;
  delete secrets.WEB_PUSH_PRIVATE_KEY;
  assert.equal((await handler(req())).status, 503);
  assert.equal(claimed, 0); assert.equal(providerCalls, 0);
  secrets.WEB_PUSH_PRIVATE_KEY = saved;
  const response = await handler(req());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sent: 1, failed: 0 });
  assert.equal(finished, 1);
  queueFails = true;
  assert.equal((await handler(req())).status, 503);
  assert.equal(providerCalls, 1);
  queueFails = false; ackFails = true;
  assert.equal((await handler(req())).status, 503);
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.Deno; delete globalThis.pushTestCrypto;
}

// Browser subscription lifecycle: no permission prompt on load, consent, rollback and isolation.
const key = createECDH('prime256v1'); key.generateKeys();
const publicKey = key.getPublicKey().toString('base64url');
let subscription = null, permissionCalls = 0, registrations = 0, signedIn = 'owner',
  registered = false, rpcError = false, unsubscribeFails = false, permissionResult = 'granted';
const storage = new Map();
const notification = { permission: 'default', requestPermission: () => {
  permissionCalls++; notification.permission = permissionResult; return Promise.resolve(permissionResult);
} };
const reg = { pushManager: {
  getSubscription: async () => subscription,
  subscribe: async ({ userVisibleOnly, applicationServerKey }) => {
    assert.equal(userVisibleOnly, true);
    subscription = { endpoint: job.endpoint, options: { applicationServerKey },
      toJSON: () => ({ keys: { p256dh: publicKey, auth: 'test-auth' } }),
      unsubscribe: async () => { if (unsubscribeFails) return false; subscription = null; return true; } };
    return subscription;
  },
}, getNotifications: async () => [] };
globalThis.window = { isSecureContext: true, location: { origin: 'https://example.test' },
  PushManager: {}, Notification: notification, matchMedia: () => ({ matches: false }) };
globalThis.Notification = notification;
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  userAgent: 'Test desktop', platform: 'Linux', maxTouchPoints: 0,
  serviceWorker: { getRegistration: async () => reg, ready: Promise.resolve(reg),
    register: async (url, options) => {
      registrations++; assert.equal(url, 'https://example.test/app/sw.js');
      assert.equal(options.scope, 'https://example.test/app/'); return reg;
    } },
} });
globalThis.localStorage = { getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
const calls = [];
globalThis.pushTestClient = {
  auth: { getSession: async () => ({ data: { session: signedIn ? { user: { id: signedIn } } : null } }) },
  rpc: async (name, args) => {
    calls.push([name, args]);
    if (rpcError) return { error: {} };
    if (name === 'register_push_subscription') registered = true;
    else if (name === 'remove_push_subscription') registered = false;
    else assert.equal(name, 'has_push_subscription');
    return { data: registered, error: null };
  },
};
const clientPlugin = { name: 'push-client-mock', setup(build) {
  build.onResolve({ filter: /supabaseClient$/ }, () => ({ path: 'client', namespace: 'mock' }));
  build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: 'export default globalThis.pushTestClient;' }));
} };
const client = await bundle('src/lib/pushService.ts', [clientPlugin], {
  'import.meta.env.EXPO_PUBLIC_WEB_PUSH_KEY': JSON.stringify(publicKey), 'import.meta.env.BASE_URL': JSON.stringify('/app/'),
});
assert.equal(await client.pushStatus(), false);
assert.equal(permissionCalls, 0); assert.equal(registrations, 0); assert.equal(calls.length, 0);
permissionResult = 'denied';
await assert.rejects(client.enablePush(), /blocked/);
assert.equal(registrations, 0); assert.equal(calls.length, 0);
permissionResult = 'granted';
await client.enablePush();
assert.equal(await client.pushStatus(), true);
assert.equal(storage.get('tinyshift:push-owner'), 'owner');
await client.disablePush();
assert.equal(subscription, null); assert.equal(registered, false);
rpcError = true;
await assert.rejects(client.enablePush(), /Could not enable/);
assert.equal(subscription, null); assert.equal(storage.size, 0);
rpcError = false;
await client.enablePush();
registered = false; // Another device used "Turn off on all devices".
assert.equal(await client.pushStatus(), false); assert.equal(subscription, null);
await client.enablePush();
signedIn = 'another-owner';
assert.equal(await client.pushStatus(), false); assert.equal(subscription, null);
signedIn = 'owner';
await client.enablePush();
unsubscribeFails = true;
await assert.rejects(client.disablePush(), /retry before signing out/);
assert.ok(subscription);
unsubscribeFails = false;
await client.reconcilePushAccount(null);
assert.equal(subscription, null);
await client.enablePush();
rpcError = true;
await assert.rejects(client.disablePush(true), /other devices could not be disabled/);
assert.equal(subscription, null);
rpcError = false;
window.isSecureContext = false;
assert.match(client.pushSupport(), /HTTPS/);
window.isSecureContext = true; navigator.userAgent = 'iPhone';
assert.match(client.pushSupport(), /Home Screen/);
navigator.userAgent = 'desktop';
delete window.PushManager;
assert.match(client.pushSupport(), /does not support/);

// Real service-worker source in a controlled event runtime.
const listeners = new Map(), shown = [], opened = [], messages = [];
let windows = [], focusCount = 0, closed = 0;
const self = { addEventListener: (name, handler) => listeners.set(name, handler),
  skipWaiting: async () => {}, registration: { scope: 'https://example.test/app/',
    showNotification: async (title, options) => shown.push({ title, options }) },
  clients: { claim: async () => {}, matchAll: async () => windows,
    openWindow: async url => opened.push(url) } };
vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, URL });
assert.equal(listeners.has('fetch'), false, 'Authenticated responses must not be cached');
async function event(name, details) {
  const pending = [];
  listeners.get(name)({ ...details, waitUntil: promise => pending.push(promise) });
  await Promise.all(pending);
}
await event('push', { data: { json: () => ({ kind: 'daily', text: 'private habit title' }) } });
assert.equal(shown[0].title, 'TinyShift');
assert.equal(shown[0].options.actions[1].action, 'rescue');
assert.ok(!JSON.stringify(shown).includes('private habit title'));
await event('push', { data: { json: () => ({ kind: 'weekly' }) } });
assert.equal(shown[1].options.data.tab, 'refresh');
await event('push', { data: { json: () => { throw new Error('bad payload'); } } });
assert.equal(shown.length, 3);
const click = action => event('notificationclick', { action,
  notification: { close: () => closed++, data: { tab: 'today' } } });
await click('rescue');
assert.equal(opened[0], 'https://example.test/app/?reminder=rescue');
await click('https://evil.test/');
assert.equal(opened[1], 'https://example.test/app/?reminder=today');
windows = [{ url: 'https://example.test/app/?editing=true',
  postMessage: message => messages.push(message), focus: async () => focusCount++ }];
await click('refresh');
assert.equal(opened.length, 2);
assert.equal(messages[0].type, 'tinyshift-reminder');
assert.equal(messages[0].tab, 'refresh'); assert.equal(focusCount, 1); assert.equal(closed, 3);
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const data = readFileSync('public/' + icon.src);
  assert.equal(data.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
  assert.equal(data.readUInt32BE(20), Number(icon.sizes.split('x')[1]));
}
console.log('Push checks passed: consent, account isolation, opt-out, rollback, delivery bounds, worker auth, notification privacy, safe routing and app icons.');
