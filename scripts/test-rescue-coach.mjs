import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = async (entryPoints, plugins = [], define = {}) => {
  const result = await build({
    entryPoints: [entryPoints],
    bundle: true,
    write: false,
    platform: 'node',
    format: 'esm',
    plugins,
    define,
  });
  return import(
    'data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64')
  );
};
const shared = await bundle('backend/supabase/functions/_shared/rescueCoach.ts');
const suggestion = {
  kind: 'step',
  action: 'Recall one idea from your last chapter.',
  reason: 'No book or quiet space needed.',
  seconds: 30,
};
assert.deepEqual(shared.validateRescueSuggestion(suggestion), suggestion);
assert.equal(shared.validateRescueContext('  no book here  '), 'no book here');
for (const bad of [null, '', 'x'.repeat(1001), 42])
  assert.throws(() => shared.validateRescueContext(bad));
for (const bad of [
  null,
  [],
  {},
  { ...suggestion, kind: 'unknown' },
  { ...suggestion, seconds: 61 },
  { ...suggestion, seconds: 0 },
  { ...suggestion, seconds: 1.5 },
  { ...suggestion, action: ' ' },
  { ...suggestion, action: 'x'.repeat(501) },
  { ...suggestion, reason: 'x'.repeat(401) },
  { ...suggestion, kind: 'pause' },
])
  assert.throws(() => shared.validateRescueSuggestion(bad));
assert.equal(
  shared.validateRescueSuggestion({ ...suggestion, kind: 'pause', seconds: 0 }).kind,
  'pause',
);
assert.equal(shared.rescueDay('Asia/Kolkata', new Date('2026-09-14T20:00:00Z')), '2026-09-15');
assert.equal(
  shared.rescueDay('America/Los_Angeles', new Date('2026-09-14T20:00:00Z')),
  '2026-09-14',
);
assert.throws(() => shared.rescueDay('bad-zone'));
const originalFetch = globalThis.fetch,
  originalTimeout = globalThis.setTimeout;
let handler,
  authenticated = true,
  allowed = true,
  quotaError = false,
  queryError = false;
let calls = 0,
  reservations = 0,
  status = null,
  output = suggestion,
  providerFailure = false,
  truncated = false;
const habit = {
  id: '10000000-0000-0000-0000-000000000001',
  user_id: 'owner',
  is_active: true,
  name: 'Read',
  anchor: 'After tea',
  normal_version: 'Read 10 pages',
  minimum_version: 'Read one page',
  created_at: '2020-01-01T00:00:00Z',
  updated_at: '2026-09-14T08:00:00Z',
  frequency: 'Daily',
};
let available = habit;
const secrets = {
  SUPABASE_URL: 'https://example.test',
  SUPABASE_ANON_KEY: 'anon',
  GEMINI_API_KEY: 'test-secret',
  GEMINI_MODEL: 'test-model',
};
globalThis.Deno = {
  env: { get: (key) => secrets[key] },
  serve: (fn) => {
    handler = fn;
  },
};
globalThis.rescueTestClient = {
  auth: {
    getUser: async () => ({
      data: { user: authenticated ? { id: 'owner' } : null },
      error: null,
    }),
  },
  rpc: async (name) => {
    assert.equal(name, 'reserve_habit_draft', 'Generation must never write completions');
    reservations++;
    return { data: allowed, error: quotaError ? {} : null };
  },
  from(table) {
    assert.ok(['habits', 'habit_logs'].includes(table));
    const filters = {};
    return {
      select() {
        return this;
      },
      eq(key, value) {
        filters[key] = value;
        return this;
      },
      async maybeSingle() {
        assert.equal(filters.user_id, 'owner');
        if (queryError) return { data: null, error: {} };
        if (table === 'habits')
          return {
            data:
              available?.id === filters.id &&
              available?.user_id === filters.user_id &&
              available?.is_active
                ? available
                : null,
            error: null,
          };
        assert.equal(filters.habit_id, habit.id);
        return { data: status ? { status } : null, error: null };
      },
    };
  },
};
const plugin = {
  name: 'mock-supabase',
  setup(build) {
    build.onResolve({ filter: /^https:/ }, ({ path }) => ({ path, namespace: 'mock' }));
    build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
      contents: 'export const createClient = () => globalThis.rescueTestClient;',
    }));
  },
};
const day = shared.rescueDay('UTC');
const body = {
  habitId: habit.id,
  context: 'At the airport without my book.',
  consent: true,
  day,
  timeZone: 'UTC',
};
const request = (changes = {}, token = 'Bearer test') =>
  new Request('https://example.test/rescue', {
    method: 'POST',
    headers: token ? { Authorization: token } : {},
    body: JSON.stringify({ ...body, ...changes }),
  });
try {
  await bundle('backend/supabase/functions/create-rescue-step/index.ts', [plugin]);
  globalThis.fetch = async (_url, options) => {
    calls++;
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    const payload = JSON.parse(options.body);
    assert.deepEqual(JSON.parse(payload.contents[0].parts[0].text), {
      context: body.context,
      habit: {
        name: habit.name,
        anchor: habit.anchor,
        normalVersion: habit.normal_version,
        minimumVersion: habit.minimum_version,
      },
    });
    assert.ok(!options.body.includes(habit.id));
    assert.ok(!options.body.includes('owner'));
    assert.match(payload.systemInstruction.parts[0].text, /pain/);
    if (providerFailure) return new Response('', { status: 503 });
    return Response.json({
      candidates: [
        {
          finishReason: truncated ? 'MAX_TOKENS' : 'STOP',
          content: { parts: [{ text: JSON.stringify(output) }] },
        },
      ],
    });
  };
  assert.equal((await handler(request({}, ''))).status, 401);
  authenticated = false;
  assert.equal((await handler(request())).status, 401);
  authenticated = true;
  assert.equal((await handler(request({ consent: false }))).status, 400);
  assert.equal((await handler(request({ habitId: 'wrong' }))).status, 400);
  assert.equal((await handler(request({ context: 'x' }))).status, 400);
  assert.equal((await handler(request({ context: 'x'.repeat(1001) }))).status, 400);
  assert.equal((await handler(request({ padding: 'x'.repeat(8100) }))).status, 413);
  assert.equal((await handler(request({ timeZone: 'bad' }))).status, 400);
  assert.equal((await handler(request({ day: '2000-01-01' }))).status, 409);
  available = { ...habit, user_id: 'other' };
  assert.equal((await handler(request())).status, 404);
  available = { ...habit, is_active: false };
  assert.equal((await handler(request())).status, 404);
  available = { ...habit, created_at: '2999-01-01T00:00:00Z' };
  assert.equal((await handler(request())).status, 409);
  available = habit;
  status = 'done';
  assert.equal((await handler(request())).status, 409);
  status = null;
  queryError = true;
  assert.equal((await handler(request())).status, 503);
  queryError = false;
  assert.equal(calls, 0);
  assert.equal(reservations, 0);
  delete secrets.GEMINI_API_KEY;
  assert.equal((await handler(request())).status, 503);
  secrets.GEMINI_API_KEY = 'test-secret';
  allowed = false;
  assert.equal((await handler(request())).status, 429);
  allowed = true;
  quotaError = true;
  assert.equal((await handler(request())).status, 503);
  quotaError = false;
  status = 'skipped';
  const response = await handler(request());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    habitId: habit.id,
    habitUpdatedAt: habit.updated_at,
    day,
    timeZone: 'UTC',
    suggestion,
  });
  output = { ...suggestion, kind: 'pause', seconds: 0 };
  assert.equal((await (await handler(request())).json()).suggestion.kind, 'pause');
  output = { ...suggestion, seconds: 90 };
  assert.equal((await handler(request())).status, 502);
  output = suggestion;
  providerFailure = true;
  assert.equal((await handler(request())).status, 502);
  providerFailure = false;
  truncated = true;
  assert.equal((await handler(request())).status, 502);
  truncated = false;
  globalThis.setTimeout = (fn) => originalTimeout(fn, 1);
  globalThis.fetch = (_url, { signal }) =>
    new Promise((_, reject) =>
      signal.addEventListener('abort', () => reject(new Error('aborted'))),
    );
  assert.equal((await handler(request())).status, 502);
  globalThis.setTimeout = originalTimeout;
  assert.equal((await handler(new Request('https://example.test'))).status, 405);
  assert.equal(
    (await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status,
    204,
  );
  console.log(
    'Rescue endpoint passed: consent, ownership, input limits, date, activity, quota, privacy, step/pause, malformed output and timeout.',
  );

  // Exercise the actual client completion path, including refusing a pause.
  let savedPayload,
    rpcCount = 0;
  globalThis.rescueTestClient = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'owner' }, access_token: 'test' } },
      }),
    },
    rpc: async (name, payload) => {
      assert.equal(name, 'complete_rescue_step');
      savedPayload = payload;
      rpcCount++;
      return {
        data: {
          habit_id: payload.p_habit_id,
          log_date: payload.p_day,
          status: 'done',
          completion_method: 'minimum',
          rescue_action: payload.p_action,
        },
      };
    },
  };
  const servicePlugin = {
    name: 'mock-local-client',
    setup(build) {
      build.onResolve({ filter: /supabaseClient$/ }, () => ({
        path: 'client',
        namespace: 'mock',
      }));
      build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
        contents: 'export default globalThis.rescueTestClient;',
      }));
    },
  };
  const service = await bundle('src/lib/rescueCoachService.ts', [servicePlugin], {
    'import.meta.env.EXPO_PUBLIC_SUPABASE_URL': JSON.stringify('https://example.test'),
    'import.meta.env.EXPO_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify('anon'),
  });
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const preview = {
    habitId: habit.id,
    habitUpdatedAt: habit.updated_at,
    day: shared.rescueDay(zone),
    timeZone: zone,
    suggestion,
  };
  await assert.rejects(
    service.completeRescueStep({
      ...preview,
      suggestion: { ...suggestion, kind: 'pause', seconds: 0 },
    }),
  );
  await assert.rejects(service.completeRescueStep({ ...preview, day: '2000-01-01' }));
  assert.equal(rpcCount, 0);
  await service.completeRescueStep(preview);
  assert.equal(savedPayload.p_action, suggestion.action);
  assert.equal(savedPayload.p_habit_updated_at, habit.updated_at);
  globalThis.fetch = async () => Response.json({ ...preview, habitId: 'other' });
  await assert.rejects(service.generateRescueStep(habit.id, body.context));
  globalThis.fetch = async () => Response.json(preview);
  assert.deepEqual(await service.generateRescueStep(habit.id, body.context), preview);
  console.log(
    'Rescue client passed: response binding, pause/date protection and confirmed action persistence.',
  );
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalTimeout;
  delete globalThis.Deno;
  delete globalThis.rescueTestClient;
}
