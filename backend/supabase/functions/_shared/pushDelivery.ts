export function allowedPushEndpoint(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048 || /[\s\\]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.port && !url.username && !url.password && !url.hash &&
      (url.hostname === 'fcm.googleapis.com' ||
        /^([a-z0-9-]+\.)?push\.services\.mozilla\.com$/.test(url.hostname) ||
        /^([a-z0-9-]+\.)?push\.apple\.com$/.test(url.hostname) ||
        /^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname));
  } catch { return false; }
}
export function pushPayload(kind: string, id: string) {
  // Only generic routing data goes through browser push providers.
  return JSON.stringify({ kind: kind === 'weekly' ? 'weekly' : 'daily', tag: 'tinyshift-' + id });
}
export interface PushJob {
  delivery_id: string;
  lease_token: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  kind: string;
  expires_at: string;
  reminder_id: string;
}
export async function deliverPushBatch(
  jobs: PushJob[],
  send: (job: PushJob, payload: string, ttl: number) => Promise<number>,
  finish: (job: PushJob, code: number) => Promise<void>,
) {
  let sent = 0, failed = 0;
  // Small concurrent groups keep the worker bounded below the two-minute lease.
  for (let index = 0; index < jobs.length; index += 5) {
    await Promise.all(jobs.slice(index, index + 5).map(async job => {
      let code = 400;
      const ttl = Math.min(3600, Math.floor((Date.parse(job.expires_at) - Date.now()) / 1000));
      if (allowedPushEndpoint(job.endpoint) && Number.isFinite(ttl) && ttl > 0) {
        try { code = await send(job, pushPayload(job.kind, job.reminder_id), ttl); }
        catch { code = 0; }
      }
      await finish(job, code);
      if (code >= 200 && code < 300) sent++; else failed++;
    }));
  }
  return { sent, failed };
}
