import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const directory = await mkdtemp(join(tmpdir(), 'tinyshift-weekly-tests-'));
const originalFetch = globalThis.fetch,
  originalTimeout = globalThis.setTimeout;
let handler,
  authenticated = true,
  allowed = true,
  queryError = false,
  quotaError = false;
let providerCalls = 0,
  quotaCalls = 0;
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
  const { completedWeek, buildEvidence, validateReview } = await import(
    pathToFileURL(sharedPath).href
  );
  assert.deepEqual(completedWeek('Asia/Kolkata', new Date('2026-09-06T20:00:00Z')), {
    start: '2026-08-31',
    end: '2026-09-06',
  });
  assert.deepEqual(completedWeek('America/Los_Angeles', new Date('2026-09-06T20:00:00Z')), {
    start: '2026-08-24',
    end: '2026-08-30',
  });
  assert.deepEqual(completedWeek('UTC', new Date('2026-01-01T12:00:00Z')), {
    start: '2025-12-22',
    end: '2025-12-28',
  });
  assert.deepEqual(completedWeek('America/Los_Angeles', new Date('2026-03-09T08:00:00Z')), {
    start: '2026-03-02',
    end: '2026-03-08',
  });
  assert.throws(() => completedWeek('Not/AZone'));
  assert.throws(() => completedWeek(null));
  const range = completedWeek('UTC');
  const habit = { id: 'private-habit-id', user_id: 'user-a', name: 'Read', is_active: true };
  const normal = {
    habit_id: habit.id,
    user_id: 'user-a',
    log_date: range.start,
    status: 'done',
    completion_method: 'normal',
    skip_reason: null,
  };
  const skipped = { ...normal, log_date: range.end, status: 'skipped', skip_reason: 'no_time' };
  const facts = buildEvidence(
    [habit, { id: 'new', name: 'New' }],
    [normal, normal, skipped, { ...normal, log_date: '2000-01-01' }],
    range.start,
    range.end,
  );
  assert.deepEqual(facts[0], {
    habitId: habit.id,
    name: 'Read',
    normal: 1,
    minimum: 0,
    skipped: 1,
    reasons: { no_time: 1 },
  });
  assert.equal(facts[1].skipped, 0);
  assert.equal(
    buildEvidence([habit], [{ ...normal, completion_method: 'minimum' }], range.start, range.end)[0]
      .minimum,
    1,
  );
  const review = {
    summary: 'A small step counts.',
    observations: [
      {
        habitId: habit.id,
        interpretation: 'Time may have been a constraint.',
        question: 'What made reading easier?',
      },
    ],
  };
  assert.deepEqual(validateReview(review, facts), review);
  for (const bad of [
    null,
    { ...review, summary: 'x'.repeat(1001) },
    { ...review, observations: [] },
    { ...review, observations: [review.observations[0], review.observations[0]] },
    { ...review, observations: [{ ...review.observations[0], habitId: 'invented' }] },
    { ...review, observations: [{ ...review.observations[0], habitId: 'new' }] },
  ])
    assert.throws(() => validateReview(bad, facts));

  let rows = {
    habits: [
      habit,
      { ...habit, id: 'archived', name: 'Archived private name', is_active: false },
      { ...habit, id: 'other', user_id: 'user-b', name: 'Other account' },
    ],
    habit_logs: [
      normal,
      skipped,
      { ...normal, habit_id: 'archived' },
      { ...normal, habit_id: 'other', user_id: 'user-b' },
    ],
  };
  globalThis.weeklyTestClient = {
    auth: {
      getUser: async () => ({
        data: { user: authenticated ? { id: 'user-a' } : null },
        error: null,
      }),
    },
    rpc: async (name) => {
      assert.equal(name, 'reserve_habit_draft');
      quotaCalls++;
      return { data: allowed, error: quotaError ? { message: 'failure' } : null };
    },
    from: (table) => {
      assert.ok(
        ['habits', 'habit_logs'].includes(table),
        'No profiles/reflections or writes allowed',
      );
      const filters = [];
      let columns, limit;
      const query = {
        select(value) {
          columns = value.split(',');
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
        order() {
          return query;
        },
        limit(value) {
          limit = value;
          return query;
        },
        then(resolve, reject) {
          return Promise.resolve({
            error: queryError ? { message: 'failure' } : null,
            data: rows[table]
              .filter((row) => filters.every((f) => f(row)))
              .slice(0, limit)
              .map((row) => Object.fromEntries(columns.map((column) => [column, row[column]]))),
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const outfile = join(directory, 'endpoint.mjs');
  await build({
    entryPoints: ['backend/supabase/functions/create-weekly-review/index.ts'],
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
            contents: 'export const createClient = () => globalThis.weeklyTestClient;',
          }));
        },
      },
    ],
  });
  await import(pathToFileURL(outfile).href);
  const request = (body = { consent: true, timeZone: 'UTC' }, token = 'Bearer test') =>
    new Request('https://example.test', {
      method: 'POST',
      headers: token ? { Authorization: token } : {},
      body: JSON.stringify(body),
    });
  const successfulProvider = async (url, options) => {
    providerCalls++;
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    const body = JSON.parse(options.body);
    const payload = JSON.parse(body.contents[0].parts[0].text);
    assert.deepEqual(payload, { ...range, evidence: [{ ...facts[0], habitId: 'habit-0' }] });
    assert.ok(!options.body.includes('private-habit-id'));
    assert.ok(!options.body.includes('user-a'));
    return Response.json({
      candidates: [
        {
          finishReason: 'STOP',
          content: {
            parts: [
              {
                text: JSON.stringify({
                  ...review,
                  observations: [{ ...review.observations[0], habitId: 'habit-0' }],
                }),
              },
            ],
          },
        },
      ],
    });
  };
  globalThis.fetch = successfulProvider;
  assert.equal((await handler(request(undefined, ''))).status, 401);
  authenticated = false;
  assert.equal((await handler(request())).status, 401);
  authenticated = true;
  assert.equal((await handler(request({ consent: false, timeZone: 'UTC' }))).status, 400);
  assert.equal((await handler(request({ consent: true, timeZone: 'bad' }))).status, 400);
  assert.equal((await handler(request({ consent: true, timeZone: 'x'.repeat(1100) }))).status, 413);
  assert.equal(providerCalls, 0);
  assert.equal(quotaCalls, 0);
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { ...range, evidence: [facts[0]], review });
  const previousRows = rows;
  rows = { ...rows, habit_logs: [] };
  const beforeEmpty = quotaCalls;
  const empty = await handler(request());
  assert.equal((await empty.json()).review, null);
  assert.equal(quotaCalls, beforeEmpty);
  assert.equal(providerCalls, 1);
  rows = previousRows;
  queryError = true;
  assert.equal((await handler(request())).status, 503);
  queryError = false;
  const key = secrets.GEMINI_API_KEY;
  delete secrets.GEMINI_API_KEY;
  assert.equal((await handler(request())).status, 503);
  secrets.GEMINI_API_KEY = key;
  quotaError = true;
  assert.equal((await handler(request())).status, 503);
  quotaError = false;
  allowed = false;
  assert.equal((await handler(request())).status, 429);
  allowed = true;
  rows = { ...rows, habits: Array.from({ length: 101 }, (_, i) => ({ ...habit, id: String(i) })) };
  assert.equal((await handler(request())).status, 422);
  rows = { ...previousRows, habit_logs: Array.from({ length: 1000 }, () => normal) };
  assert.equal((await handler(request())).status, 422);
  rows = previousRows;
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  assert.equal((await handler(request())).status, 502);
  globalThis.fetch = async () => Response.json({ candidates: [{ finishReason: 'SAFETY' }] });
  assert.equal((await handler(request())).status, 502);
  globalThis.fetch = async () =>
    Response.json({
      candidates: [
        { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(review) }] } },
      ],
    });
  assert.equal(
    (await handler(request())).status,
    502,
    'Provider must not invent or use private IDs',
  );
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
  globalThis.setTimeout = originalTimeout;
  assert.equal(
    (await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status,
    204,
  );
  assert.equal((await handler(new Request('https://example.test'))).status, 405);
  console.log(
    'Weekly review checks passed: time zones/DST, evidence, validation, auth, consent, account filtering, payload minimization, empty history, quota, size limits, provider failures and timeout.',
  );
} finally {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalTimeout;
  delete globalThis.Deno;
  delete globalThis.weeklyTestClient;
  await rm(directory, { recursive: true, force: true });
}
