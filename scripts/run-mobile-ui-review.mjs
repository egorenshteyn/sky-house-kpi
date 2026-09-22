/** Builds and tests only a disposable synthetic database on localhost. */
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
const dir = await mkdtemp(join(tmpdir(), 'sky-house-ui-'));
const sessionFile = join(dir, 'session.json');
const env = {
  ...process.env,
  DATABASE_PATH: join(dir, 'fixture.db'),
  ADMIN_USERNAME: 'ui-review',
  ADMIN_PASSWORD: randomBytes(24).toString('hex'),
  NEXTAUTH_SECRET: randomBytes(32).toString('hex'),
  NEXTAUTH_URL: 'http://localhost:3100',
  UI_TEST_SESSION: sessionFile,
};
function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
let server;
try {
  // Do not accidentally test an unrelated process already occupying the port.
  try {
    await fetch('http://localhost:3100', { signal: AbortSignal.timeout(1000) });
    throw new Error('Port 3100 is already in use. Stop that server before running test:ui.');
  } catch (error) {
    if (error.message.includes('already in use')) throw error;
  }
  await writeFile(sessionFile, JSON.stringify({ dir, username: env.ADMIN_USERNAME, password: env.ADMIN_PASSWORD }), { mode: 0o600 });
  await run('./node_modules/.bin/tsx', ['scripts/mobile-ui-fixture.ts']);
  await run('npm', ['run', 'build']);
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', '3100', '-H', '127.0.0.1'], { env, stdio: 'inherit' });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    if (server.exitCode !== null) throw new Error('Local test server exited before becoming ready');
    try { const response = await fetch('http://localhost:3100/login'); if (response.ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Local test server did not become ready');
  await run(process.execPath, ['scripts/verify-mobile-ui.mjs']);
} finally {
  if (server) {
    server.kill('SIGTERM');
    await new Promise(resolve => server.once('exit', resolve));
  }
  await rm(dir, { recursive: true, force: true });
}
