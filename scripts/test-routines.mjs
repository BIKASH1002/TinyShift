import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = await mkdtemp(join(tmpdir(), 'tinyshift-tests-'));
try {
  const outfile = join(directory, 'routine-tests.cjs');
  await build({
    entryPoints: ['tests/routineEngine.test.ts'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
  });
  for (const TZ of ['Asia/Kolkata', 'America/Los_Angeles', 'UTC']) {
    const result = spawnSync(process.execPath, ['--test', outfile], {
      stdio: 'inherit',
      env: { ...process.env, TZ },
    });
    if (result.status !== 0) {
      process.exitCode = result.status || 1;
      break;
    }
  }
} finally {
  await rm(directory, { recursive: true, force: true });
}
