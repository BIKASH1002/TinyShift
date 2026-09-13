import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const directory = await mkdtemp(join(tmpdir(), 'tinyshift-adjustment-tests-'));
const originalFetch = globalThis.fetch,
  originalTimeout = globalThis.setTimeout;
let handler,
  authenticated = true,
  allowed = true,
  quotaError = false,
  queryError = '';
let providerCalls = 0,
  quotaCalls = 0,
  insertError = null;
const secrets = {
  SUPABASE_URL: 'https://example.test',
  SUPABASE_ANON_KEY: 'anon',
  GEMINI_API_KEY: 'test-secret',
  GEMINI_MODEL: 'test-model',
};
globalThis.Deno = {
  env: { get: (name) => secrets[name] },
  serve: (fn) => {
    handler = fn;
  },
};
try {
  const sharedPath = join(directory, 'shared.mjs');
  await build({
    entryPoints: ['backend/supabase/functions/_shared/weeklyReview.ts'],
    outfile: sharedPath,
    bundle: true,
    platform: 'node',
    format: 'esm',
  });
  const { completedWeek } = await import(pathToFileURL(sharedPath).href);
  const range = completedWeek('UTC');
  const habit = {
    id: '10000000-0000-0000-0000-000000000001',
    user_id: 'user-a',
    is_active: true,
    name: 'Read',
    anchor: 'After tea',
    normal_version: 'Read twenty pages',
    minimum_version: 'Read one sentence',
    updated_at: '2026-09-07T00:00:00Z',
  };
  const logs = Array.from({ length: 3 }, (_, i) => {
    const date = new Date(range.start + 'T12:00:00Z');
    date.setUTCDate(date.getUTCDate() + i);
    return {
      habit_id: habit.id,
      user_id: 'user-a',
      log_date: date.toISOString().slice(0, 10),
      status: 'done',
      completion_method: 'minimum',
      skip_reason: null,
    };
  });
  let stored = [],
    availableHabits = [habit],
    availableLogs = logs;
  const candidate = {
    decision: 'change',
    field: 'normal_version',
    after: 'Read one page',
    rationale: 'A smaller regular action may fit your recent tiny completions.',
  };
  let output = candidate,
    raceWinner;
  globalThis.adjustmentTestClient = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: 'user-a' } : null },
        error: null,
      }),
    },
    rpc: async (name) => {
      assert.equal(name, 'reserve_habit_draft', 'Generation must not invoke acceptance');
      quotaCalls++;
      return { data: allowed, error: quotaError ? { message: 'failure' } : null };
    },
    from: (table) => {
      assert.ok(['habits', 'habit_logs', 'ai_habit_adjustments'].includes(table));
      let columns,
        maximum = Infinity,
        one = false,
        insertion;
      const filters = [];
      const query = {
        select(value) {
          columns = value;
          return query;
        },
        eq(key, value) {
          filters.push((row) => row[key] === value);
          return query;
        },
        gte(key, value) {
          filters.push((row) => row[key] >= value);
          return query;
        },
        lte(key, value) {
          filters.push((row) => row[key] <= value);
          return query;
        },
        limit(value) {
          maximum = value;
          return query;
        },
        maybeSingle() {
          one = true;
          return query;
        },
        single() {
          one = true;
          return query;
        },
        insert(value) {
          assert.equal(
            table,
            'ai_habit_adjustments',
            'Generation must never mutate habits or logs',
          );
          insertion = value;
          return query;
        },
        then(resolve, reject) {
          if (queryError === table)
            return Promise.resolve({ data: null, error: { message: 'failure' } }).then(
              resolve,
              reject,
            );
          if (insertion) {
            if (insertError) {
              if (insertError.code === '23505') stored.push(raceWinner);
              return Promise.resolve({ data: null, error: insertError }).then(resolve, reject);
            }
            const saved = { ...insertion, id: 'proposal-1', status: 'pending' };
            stored.push(saved);
            return Promise.resolve({ data: saved, error: null }).then(resolve, reject);
          }
          const source =
            table === 'habits' ? availableHabits : table === 'habit_logs' ? availableLogs : stored;
          const data = source
            .filter((row) => filters.every((f) => f(row)))
            .slice(0, maximum)
            .map((row) =>
              columns === '*'
                ? { ...row }
                : Object.fromEntries(columns.split(',').map((key) => [key, row[key]])),
            );
          return Promise.resolve({ data: one ? data[0] || null : data, error: null }).then(
            resolve,
            reject,
          );
        },
      };
      return query;
    },
  };
  const outfile = join(directory, 'endpoint.mjs');
  await build({
    entryPoints: ['backend/supabase/functions/create-habit-adjustment/index.ts'],
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
            contents: 'export const createClient = () => globalThis.adjustmentTestClient;',
          }));
        },
      },
    ],
  });
  await import(pathToFileURL(outfile).href);
  const request = (
    body = { habitId: habit.id, consent: true, timeZone: 'UTC' },
    token = 'Bearer test',
  ) =>
    new Request('https://example.test', {
      method: 'POST',
      headers: token ? { Authorization: token } : {},
      body: JSON.stringify(body),
    });
  const successfulProvider = async (_url, options) => {
    providerCalls++;
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    const payload = JSON.parse(JSON.parse(options.body).contents[0].parts[0].text);
    assert.deepEqual(payload, {
      ...range,
      habit: {
        name: habit.name,
        anchor: habit.anchor,
        normal_version: habit.normal_version,
        minimum_version: habit.minimum_version,
      },
      evidence: { normal: 0, minimum: 3, skipped: 0, reasons: {} },
    });
    assert.ok(!options.body.includes(habit.id));
    assert.ok(!options.body.includes('user-a'));
    return Response.json({
      candidates: [
        { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(output) }] } },
      ],
    });
  };
  globalThis.fetch = successfulProvider;
  assert.equal((await handler(request(undefined, ''))).status, 401);
  authenticated = false;
  assert.equal((await handler(request())).status, 401);
  authenticated = true;
  assert.equal(
    (await handler(request({ habitId: habit.id, consent: false, timeZone: 'UTC' }))).status,
    400,
  );
  assert.equal(
    (await handler(request({ habitId: 'invalid', consent: true, timeZone: 'UTC' }))).status,
    400,
  );
  assert.equal(
    (await handler(request({ habitId: habit.id, consent: true, timeZone: 'bad' }))).status,
    400,
  );
  assert.equal((await handler(request({ padding: 'x'.repeat(1100) }))).status, 413);
  availableHabits = [{ ...habit, user_id: 'user-b' }];
  assert.equal((await handler(request())).status, 404);
  availableHabits = [{ ...habit, is_active: false }];
  assert.equal((await handler(request())).status, 404);
  availableHabits = [habit];
  availableLogs = logs.slice(0, 2);
  assert.equal((await (await handler(request())).json()).proposal, null);
  assert.equal(quotaCalls, 0);
  assert.equal(providerCalls, 0);
  availableLogs = [
    ...logs,
    { ...logs[0], user_id: 'user-b' },
    { ...logs[0], log_date: '2000-01-01' },
  ];
  let result = await handler(request());
  assert.equal(result.status, 200);
  const saved = (await result.json()).proposal;
  assert.equal(saved.before, habit.normal_version);
  assert.equal(saved.habit_updated_at, habit.updated_at);
  assert.equal(saved.evidence.minimum, 3);
  assert.equal(saved.status, 'pending');
  assert.equal(habit.normal_version, 'Read twenty pages');
  assert.equal(providerCalls, 1);
  result = await handler(request());
  assert.equal((await result.json()).proposal.id, saved.id);
  assert.equal(providerCalls, 1);
  assert.equal(quotaCalls, 1);
  stored[0].status = 'rejected';
  assert.equal((await (await handler(request())).json()).proposal.status, 'rejected');
  assert.equal(providerCalls, 1);
  stored = [];
  availableLogs = logs;
  for (const table of ['habits', 'habit_logs', 'ai_habit_adjustments']) {
    queryError = table;
    assert.equal((await handler(request())).status, 503);
  }
  queryError = '';
  const key = secrets.GEMINI_API_KEY;
  delete secrets.GEMINI_API_KEY;
  assert.equal((await handler(request())).status, 503);
  secrets.GEMINI_API_KEY = key;
  allowed = false;
  assert.equal((await handler(request())).status, 429);
  allowed = true;
  quotaError = true;
  assert.equal((await handler(request())).status, 503);
  quotaError = false;
  availableHabits = [{ ...habit, anchor: null }];
  assert.equal((await handler(request())).status, 422);
  availableHabits = [habit];
  output = { decision: 'keep', field: 'anchor', after: '', rationale: '' };
  assert.equal((await (await handler(request())).json()).proposal, null);
  assert.equal(stored.length, 0);
  output = { ...candidate, field: 'frequency' };
  assert.equal((await handler(request())).status, 502);
  output = candidate;
  insertError = { code: '42501' };
  assert.equal((await handler(request())).status, 409);
  assert.equal(stored.length, 0);
  raceWinner = { ...saved, status: 'accepted' };
  insertError = { code: '23505' };
  assert.equal((await (await handler(request())).json()).proposal.status, 'accepted');
  assert.equal(stored.length, 1);
  stored = [];
  insertError = null;
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  assert.equal((await handler(request())).status, 502);
  globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'SAFETY' }] });
  assert.equal((await handler(request())).status, 502);
  globalThis.fetch = async () =>
    Response.json({
      candidates: [{ finishReason: 'STOP', content: { parts: [{ text: 'bad JSON' }] } }],
    });
  assert.equal((await handler(request())).status, 502);
  globalThis.setTimeout = (fn, delay) => originalTimeout(fn, delay === 25000 ? 1 : delay);
  globalThis.fetch = async (_url, { signal }) =>
    new Promise((_resolve, reject) =>
      signal.addEventListener('abort', () => reject(new Error('Aborted')), { once: true }),
    );
  assert.equal((await handler(request())).status, 502);
  assert.equal(stored.length, 0);
  assert.equal(
    (await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status,
    204,
  );
  assert.equal((await handler(new Request('https://example.test'))).status, 405);
  console.log(
    'AI adjustment endpoint checks passed: auth, consent, ownership, evidence threshold, payload, preview persistence/reuse, no-change, quota, conflicts, output validation and timeout.',
  );
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalTimeout;
  delete globalThis.Deno;
  delete globalThis.adjustmentTestClient;
  await rm(directory, { recursive: true, force: true });
}
