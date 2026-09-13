import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'tinyshift-ai-tests-'));
const originalFetch = globalThis.fetch;
let handler;
let authenticated = true,
  allowed = true,
  calls = 0;
const secrets = {
  SUPABASE_URL: 'https://example.test',
  SUPABASE_ANON_KEY: 'test',
  GEMINI_API_KEY: 'test-secret',
  GEMINI_MODEL: 'test-model',
};
globalThis.Deno = {
  env: { get: (name) => secrets[name] },
  serve: (fn) => {
    handler = fn;
  },
};
globalThis.aiTestClient = {
  auth: {
    getUser: async () => ({
      data: { user: authenticated ? { id: 'test-user' } : null },
      error: null,
    }),
  },
  rpc: async (name) => {
    assert.equal(name, 'reserve_habit_draft');
    return { data: allowed, error: null };
  },
};
const draft = {
  name: 'Read',
  anchor: 'After tea',
  normalVersion: 'Read five pages',
  minimumVersion: 'Read one sentence',
  motivation: 'Enjoy learning',
  category: 'Learning',
  frequency: 'Daily',
};
const request = (goal = 'I want to read more', token = 'Bearer test') =>
  new Request('https://example.test/create-habit-draft', {
    method: 'POST',
    headers: token ? { Authorization: token } : {},
    body: JSON.stringify({ goal }),
  });
try {
  const outfile = join(directory, 'edge.mjs');
  await build({
    entryPoints: ['backend/supabase/functions/create-habit-draft/index.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    plugins: [
      {
        name: 'mock-supabase',
        setup(build) {
          build.onResolve({ filter: /^https:/ }, (args) => ({
            path: args.path,
            namespace: 'mock',
          }));
          build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
            contents: 'export const createClient = () => globalThis.aiTestClient;',
          }));
        },
      },
    ],
  });
  await import(pathToFileURL(outfile).href);
  globalThis.fetch = async (_url, options) => {
    calls++;
    const payload = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(payload.contents[0].parts[0].text), {
      goal: 'I want to read more',
    });
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    return Response.json({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(draft) }] } }],
    });
  };
  assert.equal((await handler(request(undefined, ''))).status, 401);
  authenticated = false;
  assert.equal((await handler(request())).status, 401);
  authenticated = true;
  assert.equal((await handler(request('short'))).status, 400);
  const key = secrets.GEMINI_API_KEY;
  delete secrets.GEMINI_API_KEY;
  assert.equal((await handler(request())).status, 503);
  secrets.GEMINI_API_KEY = key;
  allowed = false;
  assert.equal((await handler(request())).status, 429);
  assert.equal(calls, 0);
  allowed = true;
  const success = await handler(request());
  assert.equal(success.status, 200);
  assert.deepEqual(await success.json(), { draft });
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  assert.equal((await handler(request())).status, 502);
  globalThis.fetch = async () =>
    Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: { parts: [{ text: JSON.stringify({ ...draft, frequency: 'Whenever' }) }] },
        },
      ],
    });
  assert.equal((await handler(request())).status, 502);
  globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'SAFETY' }] });
  assert.equal((await handler(request())).status, 502);
  assert.equal((await handler(new Request('https://example.test', { method: 'GET' }))).status, 405);
  assert.equal(
    (await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status,
    204,
  );
  console.log(
    'AI handler checks passed: auth, validation, configuration, quota, draft, provider failure, invalid output, safety, methods.',
  );
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.Deno;
  delete globalThis.aiTestClient;
  await rm(directory, { recursive: true, force: true });
}
