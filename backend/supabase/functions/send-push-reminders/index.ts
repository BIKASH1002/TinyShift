// @ts-nocheck -- Supabase Deno runtime. Delivery logic is tested separately in Node.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import { deliverPushBatch } from '../_shared/pushDelivery.ts';

Deno.serve(async req => {
  const json = (body, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('PUSH_WORKER_SECRET');
  if (!secret || secret.length < 32) return json({ error: 'Worker unavailable' }, 503);
  if (req.headers.get('Authorization') !== 'Bearer ' + secret)
    return json({ error: 'Unauthorized' }, 401);
  const publicKey = Deno.env.get('WEB_PUSH_PUBLIC_KEY');
  const privateKey = Deno.env.get('WEB_PUSH_PRIVATE_KEY');
  const subject = Deno.env.get('WEB_PUSH_SUBJECT');
  if (!publicKey || !privateKey || !subject) return json({ error: 'Push unavailable' }, 503);
  try {
    // Validate configuration before claiming work.
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const client = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.rpc('claim_push_deliveries', { p_limit: 20 });
    if (error) throw new Error('Queue unavailable');
    const result = await deliverPushBatch(data || [], async (job, payload, ttl) => {
      const request = webpush.generateRequestDetails({
        endpoint: job.endpoint, keys: { p256dh: job.p256dh, auth: job.auth_key },
      }, payload, { TTL: ttl, urgency: 'normal', contentEncoding: 'aes128gcm' });
      const response = await fetch(request.endpoint, {
        method: request.method, headers: request.headers, body: request.body,
        signal: AbortSignal.timeout(10000), redirect: 'error',
      });
      await response.body?.cancel();
      return response.status;
    }, async (job, code) => {
      const { error } = await client.rpc('finish_push_delivery', {
        p_id: job.delivery_id, p_lease: job.lease_token, p_code: code,
      });
      if (error) throw new Error('Queue acknowledgement failed');
    });
    return json(result);
  } catch {
    // Never log endpoints, subscription keys, provider bodies or credentials.
    return json({ error: 'Push delivery could not finish. Unfinished work will be retried.' }, 503);
  }
});
