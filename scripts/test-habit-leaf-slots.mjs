import { build } from 'esbuild';
import assert from 'node:assert/strict';
const bundle = await build({
  entryPoints: ['src/lib/habitLeafSlots.ts'],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'node',
});
const {
  assignLeafSlots,
  releaseLeafSlots,
  readLeafSlots,
  saveLeafSlots,
  clearLeafSlots,
  leafPosition,
} = await import(
  'data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
const first = assignLeafSlots({}, ['a', 'b', 'c']);
assert.deepEqual(first, { a: 0, b: 1, c: 2 });
assert.equal(assignLeafSlots(first, ['c', 'a', 'b']), first);
const duringExit = assignLeafSlots(first, ['a', 'c', 'd']);
assert.equal(duringExit.d, 3);
const afterExit = releaseLeafSlots(duringExit, ['a', 'c', 'd']);
assert.deepEqual(afterExit, { a: 0, c: 2, d: 3 });
assert.equal(assignLeafSlots(afterExit, ['a', 'c', 'd', 'e']).e, 1);
saveLeafSlots('alice', afterExit);
assert.deepEqual(readLeafSlots('alice'), afterExit);
assert.deepEqual(readLeafSlots('bob'), {});
const many = assignLeafSlots(
  afterExit,
  Array.from({ length: 100 }, (_, i) => 'habit-' + i),
);
assert.equal(new Set(Object.values(many)).size, Object.keys(many).length);
for (const slot of Object.values(many)) assert.ok(Number.isFinite(leafPosition(slot).x));
assert.deepEqual(leafPosition(0), leafPosition(first.a));
storage.set('tinyshift:leaf-slots:v1:bad', '{"x":-1,"y":2,"z":2,"bad":"3"}');
assert.deepEqual(readLeafSlots('bad'), { y: 2 });
globalThis.localStorage.setItem = () => {
  throw new Error('Storage unavailable');
};
saveLeafSlots('fallback', { a: 4 });
assert.deepEqual(readLeafSlots('fallback'), { a: 4 });
clearLeafSlots('alice');
assert.deepEqual(readLeafSlots('alice'), {});
console.log(
  'PASS: stable slots, reorder, reserved exits, reuse, remount, account isolation, 100 habits, invalid storage and fallback.',
);
