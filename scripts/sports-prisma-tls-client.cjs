// Test container only; never imported by the sports application.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const expectedCategories = {
  'trusted-valid-ca': 'connected', 'second-ca-baseline': 'connected',
  'untrusted-chain': 'untrusted-chain', 'hostname-mismatch': 'hostname-mismatch',
  'tls-disabled': 'tls-disabled', 'missing-ca-file': 'missing-ca', 'malformed-ca-file': 'malformed-ca',
};
const codes = new Set(['P1000', 'P1001', 'P1002', 'P1003', 'P1010', 'P1011', 'P1012', 'P1013', 'P1017', 'P2010', 'P2024']);
let client, scenario = 'setup', phase = 'configuration', diagnostic = { code: 'none', category: 'setup' };
let passed = false;
function classify(error) {
  const candidate = error?.errorCode || error?.code;
  const code = codes.has(candidate) ? candidate : 'unknown';
  // Inspect messages only in memory; emit fixed labels, never message substrings.
  const text = typeof error?.message === 'string' ? error.message.toLowerCase() : '';
  let category = 'unrelated';
  if (code === 'P1011') {
    category = 'unknown-tls';
    if (/hostname mismatch|does not match.*host|doesn't match.*host|not valid for.*name/.test(text)) category = 'hostname-mismatch';
    else if (/cert file not found/.test(text)) category = 'missing-ca';
    else if (/no start line|bad base64 decode|asn1|invalid pem/.test(text)) category = 'malformed-ca';
    else if (/server does not support (tls|ssl)/.test(text)) category = 'tls-disabled';
    else if (/certificate verify failed|self.signed certificate|unable to get.*issuer|unknown issuer|unknown ca/.test(text)) category = 'untrusted-chain';
  }
  return { code, category };
}
(async () => {
  const config = JSON.parse(fs.readFileSync('/tmp/tls-scenario.json', 'utf8'));
  assert.ok(Object.hasOwn(expectedCategories, config.scenario));
  scenario = config.scenario;
  assert.equal(config.expect, expectedCategories[scenario] === 'connected' ? 'connect' : 'reject');
  phase = 'native-client';
  const { PrismaClient, Prisma } = createRequire('/app/package.json')('@prisma/client');
  assert.equal(Prisma.prismaVersion.client, '6.19.2');
  assert.equal(Prisma.prismaVersion.engine, 'c2990dca591cba766e3b7ef5d9e8a84796e47ab7');
  const url = new URL(`postgresql://${config.host}:5432/tls_test`);
  url.username = 'postgres'; url.password = config.password;
  for (const [key, value] of Object.entries({ sslmode: 'require', sslaccept: 'strict', sslcert: config.caPath, connection_limit: '1', connect_timeout: '5' })) url.searchParams.set(key, value);
  client = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
  phase = 'connect';
  let connectionError;
  try { await client.$connect(); } catch (error) { connectionError = error; diagnostic = classify(error); }
  if (config.expect === 'reject') {
    assert.ok(connectionError);
    assert.equal(diagnostic.code, 'P1011');
    assert.equal(diagnostic.category, expectedCategories[scenario]);
  } else {
    assert.ok(!connectionError);
    phase = 'encrypted-query';
    assert.deepEqual(await client.$queryRawUnsafe('SELECT 1::int AS value'), [{ value: 1 }]);
    assert.deepEqual(await client.$queryRawUnsafe('SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()'), [{ ssl: true }]);
    assert.deepEqual(await client.$queryRawUnsafe("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema = 'public'"), [{ count: 0 }]);
    diagnostic = { code: 'none', category: 'connected' };
  }
  passed = true;
})().catch(error => {
  if (diagnostic.code === 'none') diagnostic = classify(error);
}).finally(async () => {
  try { if (client) await client.$disconnect(); } catch (error) {
    passed = false; phase = 'disconnect'; diagnostic = classify(error);
  }
  console.log('TLS_CASE ' + JSON.stringify({ scenario, status: passed ? 'PASS' : 'FAIL', phase, ...diagnostic }));
  if (!passed) process.exitCode = 1;
});
