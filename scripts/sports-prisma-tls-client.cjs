// Test container only. Never imported by the sports application.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const load = createRequire('/app/package.json');
const { PrismaClient, Prisma } = load('@prisma/client');
const config = JSON.parse(fs.readFileSync('/tmp/tls-scenario.json', 'utf8'));
let client;
let failed = false;
(async () => {
  assert.equal(Prisma.prismaVersion.client, '6.19.2');
  assert.equal(Prisma.prismaVersion.engine, 'c2990dca591cba766e3b7ef5d9e8a84796e47ab7');
  const url = new URL(`postgresql://${config.host}:5432/tls_test`);
  url.username = 'postgres';
  url.password = config.password;
  url.searchParams.set('sslmode', 'require');
  url.searchParams.set('sslaccept', 'strict');
  url.searchParams.set('sslcert', config.caPath);
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '5');
  client = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
  let connectionError;
  try { await client.$connect(); } catch (error) { connectionError = error; }
  if (config.expect === 'reject') {
    assert.ok(connectionError, 'Strict TLS must reject this case');
    // DNS/authentication/timeouts must not be mistaken for successful TLS rejection.
    assert.equal(connectionError.errorCode || connectionError.code, 'P1011');
    console.log(`TLS_CASE ${config.scenario} PASS rejected=P1011`);
  } else {
    assert.ok(!connectionError, 'Trusted matching endpoint must connect');
    assert.deepEqual(await client.$queryRawUnsafe('SELECT 1::int AS value'), [{ value: 1 }]);
    const rows = await client.$queryRawUnsafe('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()');
    assert.equal(rows.length, 1);
    assert.equal(rows[0].ssl, true);
    const tables = await client.$queryRawUnsafe("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'");
    assert.equal(tables[0].count, 0);
    console.log(`TLS_CASE ${config.scenario} PASS encrypted=true tables=0`);
  }
})().catch(() => {
  // Prisma exceptions may embed credentials/connection strings. Never serialize them.
  failed = true;
  console.error(`TLS_CASE ${config.scenario} FAIL sanitized=true`);
}).finally(async () => {
  try { if (client) await client.$disconnect(); } catch { failed = true; }
  if (failed) process.exitCode = 1;
});
