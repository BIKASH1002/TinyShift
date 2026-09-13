export function validatePublicConfig(url, key) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Configure the public Supabase URL in backend/.env.');
  }
  if (
    parsed.protocol !== 'https:' &&
    !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname))
  )
    throw new Error('Use HTTPS for Supabase outside localhost.');
  if (typeof key !== 'string' || !key)
    throw new Error('Configure the public Supabase anon/publishable key.');
  if (key.startsWith('sb_secret_'))
    throw new Error('A server secret must never be used as the public Supabase key.');
  if (!key.startsWith('sb_publishable_')) {
    let claims;
    try {
      claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
    } catch {}
    if (claims?.role !== 'anon')
      throw new Error('The frontend requires an anon/publishable key, not a privileged key.');
  }
}
