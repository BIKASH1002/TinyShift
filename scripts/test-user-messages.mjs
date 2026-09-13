import { build } from 'esbuild';
import assert from 'node:assert/strict';
const result = await build({
  entryPoints: ['src/lib/userMessage.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const { userMessage } = await import(
  'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
);
assert.match(userMessage(new TypeError('Failed to fetch')), /internet connection/);
assert.match(userMessage({ message: 'JWT expired' }), /sign in again/);
assert.match(userMessage({ message: 'relation habits does not exist' }), /temporarily unavailable/);
assert.match(userMessage({ message: 'Invalid login credentials' }), /email or password/);
assert.match(userMessage({ message: 'Email not confirmed' }), /verify your email/);
assert.equal(
  userMessage(new Error('Please fill in tiny version.')),
  'Please fill in tiny version.',
);
assert.equal(userMessage(null, 'Could not save your habit.'), 'Could not save your habit.');
assert.match(userMessage(new Error('Apply phase12.')), /temporarily unavailable/);
console.log('Plain-language error checks passed.');
