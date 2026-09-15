import supabase from './supabaseClient';
import { sessionUser } from './sessionUser';

const ownerKey = 'tinyshift:push-owner';
const publicKey = import.meta.env.EXPO_PUBLIC_WEB_PUSH_KEY || '';
const scopeUrl = () => new URL(import.meta.env.BASE_URL, window.location.origin).href;
export function pushSupport(): string | null {
  if (!window.isSecureContext) return 'Push reminders need a secure HTTPS connection.';
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !window.matchMedia('(display-mode: standalone)').matches &&
      !(navigator as Navigator & { standalone?: boolean }).standalone)
    return 'On iPhone or iPad, use Share → Add to Home Screen, then open TinyShift from that icon.';
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window))
    return 'This browser does not support push reminders. Your in-app reminders still work.';
  return null;
}
export const pushConfigured = () => /^B[A-Za-z0-9_-]{86}$/.test(publicKey);
function owner() {
  try { return localStorage.getItem(ownerKey); } catch { return null; }
}
function clearOwner() {
  try { localStorage.removeItem(ownerKey); } catch { /* Browser storage may be unavailable. */ }
}
async function withPushLock<T>(action: () => Promise<T>): Promise<T> {
  // Serialize subscription changes across tabs; requesting permission stays outside this lock.
  return navigator.locks ? navigator.locks.request('tinyshift-push', action) : action();
}
async function registration() {
  return navigator.serviceWorker.getRegistration(scopeUrl());
}
async function unsubscribeLocal(reg: ServiceWorkerRegistration | undefined) {
  const sub = await reg?.pushManager?.getSubscription();
  if (sub && !(await sub.unsubscribe()))
    throw new Error('Could not turn off this device. Please retry before signing out.');
  for (const notification of await reg?.getNotifications() || []) notification.close();
  clearOwner();
}
async function readPushStatus(): Promise<boolean> {
  if (pushSupport()) return false;
  const user = await sessionUser();
  const reg = await registration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) { clearOwner(); return false; }
  if (owner() !== user.id || Notification.permission !== 'granted') {
    await unsubscribeLocal(reg);
    return false;
  }
  const { data, error } = await supabase.rpc('has_push_subscription', { p_endpoint: sub.endpoint });
  if (error) throw new Error('Could not check push reminders. Try again shortly.');
  if (!data) await unsubscribeLocal(reg);
  return data === true;
}
export async function enablePush() {
  const unsupported = pushSupport();
  if (unsupported) throw new Error(unsupported);
  if (!pushConfigured()) throw new Error('Push reminders are not available yet.');
  // Must run directly from the user's click, before network/registration awaits.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted')
    throw new Error(permission === 'denied'
      ? 'Notifications are blocked. Allow them in your browser or device settings, then try again.'
      : 'Notifications were not enabled. You can try again whenever you want.');
  return withPushLock(async () => {
  const user = await sessionUser();
  const reg = await navigator.serviceWorker.register(
    new URL('sw.js', scopeUrl()).href, { scope: scopeUrl(), updateViaCache: 'none' },
  );
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const existingKey = sub?.options.applicationServerKey;
  if (sub && (owner() !== user.id || !existingKey ||
      Array.from(new Uint8Array(existingKey)).join() !== Array.from(bytes).join())) {
    await unsubscribeLocal(reg);
    sub = null;
  }
  sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
  try {
    if ((await sessionUser()).id !== user.id) throw new Error('Your account changed. Reopen Profile.');
    const json = sub.toJSON();
    const { error } = await supabase.rpc('register_push_subscription', {
      p_endpoint: sub.endpoint, p_p256dh: json.keys?.p256dh, p_auth: json.keys?.auth,
    });
    if (error) throw new Error('Could not enable push reminders. Please try again later.');
    if ((await sessionUser()).id !== user.id) throw new Error('Your account changed. Reopen Profile.');
    localStorage.setItem(ownerKey, user.id);
  } catch (error) {
    await unsubscribeLocal(reg);
    throw error;
  }
  });
}
async function removePush(allDevices = false) {
  if (!('serviceWorker' in navigator)) {
    if (!allDevices) return;
  }
  const reg = 'serviceWorker' in navigator ? await registration() : undefined;
  const sub = await reg?.pushManager?.getSubscription();
  // Provider unsubscription stops this device even if the database is unreachable.
  await unsubscribeLocal(reg);
  if (allDevices || sub) {
    const { error } = await supabase.rpc('remove_push_subscription', {
      p_endpoint: allDevices ? null : sub!.endpoint,
    });
    if (error && allDevices) throw new Error('This device is off, but other devices could not be disabled. Please retry.');
    // A stale server row can only send to an unsubscribed endpoint; the worker removes it on 410.
  }
}
async function reconcileAccount(id: string | null) {
  if (!('serviceWorker' in navigator)) return;
  if (owner() && owner() === id) return;
  await unsubscribeLocal(await registration());
}

export const pushStatus = () => withPushLock(readPushStatus);
export const disablePush = (allDevices = false) => withPushLock(() => removePush(allDevices));
export const reconcilePushAccount = (id: string | null) => withPushLock(() => reconcileAccount(id));
