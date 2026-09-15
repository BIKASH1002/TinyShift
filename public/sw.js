/* Push only: no fetch handler or caching of authenticated pages/API responses. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Use generic copy. */ }
  const weekly = payload.kind === 'weekly';
  event.waitUntil(self.registration.showNotification('TinyShift', {
    body: weekly
      ? 'Your weekly check is ready. Take a moment to notice what helped.'
      : 'Room for one small step? Open Today, or find a gentler step in Rescue.',
    icon: new URL('icon-192.png', self.registration.scope).href,
    badge: new URL('icon-192.png', self.registration.scope).href,
    tag: typeof payload.tag === 'string' ? payload.tag.slice(0, 100) : 'tinyshift-reminder',
    renotify: false,
    data: { tab: weekly ? 'refresh' : 'today' },
    actions: weekly
      ? [{ action: 'refresh', title: 'Review week' }]
      : [{ action: 'today', title: 'Open Today' }, { action: 'rescue', title: 'Find a tiny step' }],
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requested = event.action || event.notification.data?.tab;
  const tab = ['today', 'rescue', 'refresh'].includes(requested) ? requested : 'today';
  const target = new URL('./', self.registration.scope);
  target.searchParams.set('reminder', tab);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
    if (existing) {
      // Do not reload a tab containing an unsaved form.
      existing.postMessage({ type: 'tinyshift-reminder', tab });
      await existing.focus();
    } else await self.clients.openWindow(target.href);
  })());
});
