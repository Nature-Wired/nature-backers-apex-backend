// Native Prisma startup check only: no schema SQL, migrations or publication.
const { execFileSync, spawn } = require('node:child_process');
const { randomBytes, randomUUID } = require('node:crypto');
const path = require('node:path');
const assert = require('node:assert/strict');
const net = require('node:net');
const target = path.resolve(process.env.SPORTS_PACKAGE_TEST_DIR);
const name = `sports-empty-${randomUUID()}`;
const secret = () => randomBytes(32).toString('hex');
const password = secret();
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
let child, phase = 'database-startup';
const delay = () => new Promise(resolve => setTimeout(resolve, 250));
(async () => {
  try {
    docker('run', '-d', '--name', name, '-e', `POSTGRES_PASSWORD=${password}`, '-e', 'POSTGRES_DB=sports_empty', '-p', '127.0.0.1::5432', 'postgres:16');
    const dbPort = docker('port', name, '5432/tcp').split(':').at(-1);
    let ready = false;
    for (let i = 0; i < 100; i++) { try { docker('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'); ready = true; break; } catch { await delay(); } }
    assert.ok(ready, 'Temporary database startup');
    phase = 'sports-startup';
    const probe = net.createServer();
    await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
    const port = probe.address().port; await new Promise(resolve => probe.close(resolve));
    child = spawn(process.execPath, ['dist/src/sports/main.js'], { cwd: target, stdio: 'ignore', env: {
      PATH: process.env.PATH, NODE_ENV: 'production', SPORTS_HOST: '127.0.0.1', SPORTS_PORT: String(port),
      DATABASE_URL: `postgresql://postgres:${password}@127.0.0.1:${dbPort}/sports_empty`,
      SPORTS_PARTICIPANT_SECRET: secret(), SPORTS_ADMIN_JWT_SECRET: secret(), SPORTS_CLAIM_KEYS: JSON.stringify({ v1: secret() }),
    } });
    let live;
    for (let i = 0; i < 100; i++) { if (child.exitCode !== null) break; try { live = await fetch(`http://127.0.0.1:${port}/health/sports/live`, { signal: AbortSignal.timeout(2000) }); if (live.status === 200) break; } catch {} await delay(); }
    assert.equal(live?.status, 200); assert.deepEqual(await live.json(), { status: 'ok' });
    phase = 'health-and-isolation';
    assert.equal((await fetch(`http://127.0.0.1:${port}/health/sports`)).status, 503);
    assert.equal((await fetch(`http://127.0.0.1:${port}/indexer/search?q=test`)).status, 404);
    assert.equal(docker('exec', name, 'psql', '-U', 'postgres', '-d', 'sports_empty', '-Atc', "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"), '0');
    console.log('PASS: isolated native sports startup; live=200, readiness=503, legacy Indexer route=404, database tables=0; no migrations.');
  } finally {
    if (child && child.exitCode === null) { child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve)); }
    docker('rm', '-fv', name);
  }
})().catch(() => { console.error(`FAIL: isolated sports empty-database startup check; phase=${phase} (sanitized).`); process.exitCode = 1; });
