import assert from 'node:assert/strict';
import { validatePublicConfig } from './public-config.mjs';
const jwt = (role) =>
  'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
validatePublicConfig('https://example.supabase.co', jwt('anon'));
validatePublicConfig('http://localhost:54321', 'sb_publishable_test');
for (const [url, key] of [
  ['bad', 'key'],
  ['http://external.test', jwt('anon')],
  ['https://example.test', 'sb_secret_test'],
  ['https://example.test', jwt('service_role')],
  ['https://example.test', 'broken'],
  ['https://example.test', ''],
])
  assert.throws(() => validatePublicConfig(url, key));
console.log('Public configuration checks passed: HTTPS and anon/publishable keys only.');
