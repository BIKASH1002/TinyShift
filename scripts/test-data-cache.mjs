import { build } from 'esbuild';
import assert from 'node:assert/strict';
const bundle = await build({
  entryPoints: ['src/lib/dataCache.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const { setCacheAccount, readCache, peekCache, invalidateHabitData, putCache } = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
setCacheAccount('alice');
let calls = 0;
const fetcher = async () => ++calls;
assert.deepEqual(
  await Promise.all([readCache('alice', 'habits', fetcher), readCache('alice', 'habits', fetcher)]),
  [1, 1],
);
assert.equal(await readCache('alice', 'habits', fetcher), 1);
assert.equal(await readCache('alice', 'habits', fetcher, true), 2);
invalidateHabitData();
assert.equal(await readCache('alice', 'habits', fetcher), 3);
const originalNow = Date.now;
Date.now = () => originalNow() + 61000;
assert.equal(await readCache('alice', 'habits', fetcher), 4);
Date.now = originalNow;
await assert.rejects(
  readCache('alice', 'failure', async () => {
    throw new Error('offline');
  }),
);
assert.equal(await readCache('alice', 'failure', async () => 'recovered'), 'recovered');
let finish;
const pending = readCache(
  'alice',
  'profile',
  () =>
    new Promise((resolve) => {
      finish = resolve;
    }),
);
await Promise.resolve();
putCache('alice', 'profile', 'saved');
finish('old');
assert.equal(await pending, 'saved');
const obsolete = readCache(
  'alice',
  'habits',
  () =>
    new Promise((resolve) => {
      finish = resolve;
    }),
  true,
);
await Promise.resolve();
invalidateHabitData();
finish('outdated');
await assert.rejects(obsolete);
const switched = readCache(
  'alice',
  'profile',
  () =>
    new Promise((resolve) => {
      finish = resolve;
    }),
  true,
);
await Promise.resolve();
setCacheAccount('bob');
finish('alice private data');
await assert.rejects(switched);
assert.equal(peekCache('profile'), undefined);
await assert.rejects(readCache('alice', 'profile', fetcher));
putCache('alice', 'profile', 'late save');
assert.equal(peekCache('profile'), undefined);
putCache('bob', 'profile', 'bob');
setCacheAccount(null);
assert.equal(peekCache('profile'), undefined);
console.log(
  'Data cache checks passed: deduplication, expiry, force refresh, retries, mutation invalidation, late responses and account isolation.',
);
