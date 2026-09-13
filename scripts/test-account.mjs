import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const directory = await mkdtemp(join(tmpdir(), 'tinyshift-account-tests-'));
let handler,
  authenticated = true,
  allowed = true,
  mfa = false,
  verifyError = false,
  wrongUser = false,
  adminError = false;
let quotaCalls = 0,
  verified = 0,
  signedOut = 0;
const deletedIds = [];
const secrets = {
  SUPABASE_URL: 'https://example.test',
  SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'server-only-test-key',
};
globalThis.Deno = {
  env: { get: (name) => secrets[name] },
  serve: (fn) => {
    handler = fn;
  },
};
globalThis.accountTestFactory = (_url, key, options) => {
  assert.equal(options.auth.persistSession, false);
  if (key === secrets.SUPABASE_SERVICE_ROLE_KEY)
    return {
      auth: {
        admin: {
          deleteUser: async (id, soft) => {
            assert.equal(soft, false);
            deletedIds.push(id);
            return { error: adminError ? { message: 'failed' } : null };
          },
        },
      },
    };
  if (options.global)
    return {
      auth: {
        getUser: async () => ({
          data: {
            user: authenticated
              ? {
                  id: 'current-user',
                  email: 'test@example.test',
                  factors: mfa ? [{ status: 'verified' }] : [],
                }
              : null,
          },
          error: null,
        }),
      },
      rpc: async (name) => {
        assert.equal(name, 'reserve_account_deletion');
        quotaCalls++;
        return { data: allowed, error: null };
      },
    };
  return {
    auth: {
      signInWithPassword: async (input) => {
        verified++;
        assert.equal(input.email, 'test@example.test');
        assert.equal(input.password, 'test-password');
        return {
          data: { user: { id: wrongUser ? 'other-user' : 'current-user' }, session: {} },
          error: verifyError ? { message: 'wrong password' } : null,
        };
      },
      signOut: async (options) => {
        assert.equal(options.scope, 'local');
        signedOut++;
        return { error: null };
      },
    },
  };
};
try {
  const outfile = join(directory, 'endpoint.mjs');
  await build({
    entryPoints: ['backend/supabase/functions/delete-account/index.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    plugins: [
      {
        name: 'mock-auth',
        setup(build) {
          build.onResolve({ filter: /^https:/ }, (args) => ({
            path: args.path,
            namespace: 'mock',
          }));
          build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
            contents:
              'export const createClient = (...args) => globalThis.accountTestFactory(...args);',
          }));
        },
      },
    ],
  });
  await import(pathToFileURL(outfile).href);
  const request = (
    body = {
      password: 'test-password',
      confirmation: 'DELETE',
      userId: 'attacker-selected-other-user',
    },
    token = 'Bearer test',
  ) =>
    new Request('https://example.test', {
      method: 'POST',
      headers: token ? { Authorization: token } : {},
      body: JSON.stringify(body),
    });
  assert.equal((await handler(request(undefined, ''))).status, 401);
  authenticated = false;
  assert.equal((await handler(request())).status, 401);
  authenticated = true;
  assert.equal(
    (await handler(request({ confirmation: 'delete', password: 'test-password' }))).status,
    400,
  );
  assert.equal((await handler(request({ confirmation: 'DELETE', password: '' }))).status, 400);
  assert.equal((await handler(request({ padding: 'x'.repeat(2100) }))).status, 413);
  mfa = true;
  assert.equal((await handler(request())).status, 409);
  mfa = false;
  assert.equal(quotaCalls, 0);
  const service = secrets.SUPABASE_SERVICE_ROLE_KEY;
  delete secrets.SUPABASE_SERVICE_ROLE_KEY;
  assert.equal((await handler(request())).status, 503);
  secrets.SUPABASE_SERVICE_ROLE_KEY = service;
  allowed = false;
  assert.equal((await handler(request())).status, 429);
  allowed = true;
  verifyError = true;
  assert.equal((await handler(request())).status, 403);
  verifyError = false;
  wrongUser = true;
  assert.equal((await handler(request())).status, 403);
  wrongUser = false;
  assert.deepEqual(deletedIds, []);
  adminError = true;
  assert.equal((await handler(request())).status, 502);
  adminError = false;
  const result = await handler(request());
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), { deleted: true });
  assert.deepEqual(deletedIds, ['current-user', 'current-user']);
  assert.equal(verified, signedOut);
  assert.equal((await handler(new Request('https://example.test'))).status, 405);
  assert.equal(
    (await handler(new Request('https://example.test', { method: 'OPTIONS' }))).status,
    204,
  );

  let resetRequest, newPassword;
  globalThis.frontendAccountMock = {
    auth: {
      resetPasswordForEmail: async (email, options) => {
        resetRequest = { email, options };
        return { error: null };
      },
      updateUser: async (value) => {
        newPassword = value.password;
        return { error: null };
      },
    },
  };
  globalThis.window = { location: { origin: 'https://app.example.test' } };
  const servicePath = join(directory, 'service.mjs');
  await build({
    entryPoints: ['src/lib/accountService.ts'],
    outfile: servicePath,
    bundle: true,
    platform: 'node',
    format: 'esm',
    define: { 'import.meta.env.BASE_URL': JSON.stringify('/') },
    plugins: [
      {
        name: 'mock-client',
        setup(build) {
          build.onResolve({ filter: /supabaseClient$/ }, (args) => ({
            path: args.path,
            namespace: 'mock',
          }));
          build.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({
            contents: 'export default globalThis.frontendAccountMock;',
          }));
        },
      },
    ],
  });
  const account = await import(pathToFileURL(servicePath).href);
  assert.throws(() => account.validateNewPassword('short'));
  assert.throws(() => account.validateNewPassword('x'.repeat(129)));
  await account.requestPasswordReset(' test@example.test ');
  assert.deepEqual(resetRequest, {
    email: 'test@example.test',
    options: { redirectTo: 'https://app.example.test/?account=recovery' },
  });
  await account.updateAccountPassword('long-test-password');
  assert.equal(newPassword, 'long-test-password');
  console.log(
    'Account checks passed: auth, confirmation, re-verification, target binding, MFA refusal, quota, admin errors, temporary session cleanup, recovery URL and password validation.',
  );
} finally {
  delete globalThis.Deno;
  delete globalThis.accountTestFactory;
  delete globalThis.frontendAccountMock;
  delete globalThis.window;
  await rm(directory, { recursive: true, force: true });
}
