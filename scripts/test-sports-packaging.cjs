// Executes the real compiled adapter and published plugin against loopback HTTP only.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createRequire } = require('node:module');
const target = path.resolve(process.env.SPORTS_PACKAGE_TEST_DIR || '.');
const load = createRequire(path.join(target, 'package.json'));
const manifest = load('./package.json');
const lock = load('./package-lock.json');
const { SportsAtlasService } = load('./dist/src/sports/atlas.service.js');
const record = {
  sourceTimestamp: '1700000000.123456789', name: 'Controlled response: coastal restoration',
  country: '-2', registryName: 'Controlled registry', methodology: 'Controlled methodology',
  status: 'Controlled status', sdgs: [6, 13, 14, 15], developer: 'Controlled community developer',
};
let server, calls = [], responseMode = 'ok';
const previous = { key: process.env.ATLAS_API_KEY, url: process.env.ATLAS_API_URL };
before(async () => {
  process.env.ATLAS_API_KEY = 'controlled-test-only-not-a-live-credential';
  server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    calls.push({ path: url.pathname, search: url.searchParams.get('search'), authenticated: req.headers['x-api-key'] === process.env.ATLAS_API_KEY });
    res.setHeader('Content-Type', 'application/json');
    if (responseMode === 'error') { res.writeHead(403); res.end(JSON.stringify({ message: 'controlled upstream failure' })); return; }
    if (url.pathname === '/api/v1/mainnet/projects') res.end(JSON.stringify({ data: [record], meta: { total: 1 } }));
    else res.end(JSON.stringify({ ...record, sourceTimestamp: responseMode === 'mismatch' ? '1700000000.999' : record.sourceTimestamp }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  process.env.ATLAS_API_URL = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  for (const [name, value] of [['ATLAS_API_KEY', previous.key], ['ATLAS_API_URL', previous.url]]) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
});
test('isolated manifest and lock contain no Indexer or Git artifacts', () => {
  assert.equal(manifest.name, 'nature-backers-sports-backend');
  assert.equal(manifest.dependencies['@hashgraph/hedera-agent-kit'], '4.1.0');
  assert.doesNotMatch(JSON.stringify(lock), /CarbonSustain|cs-indexer|hedera-global-indexer|git\+|git:\/\/|git@github/i);
  for (const entry of Object.values(lock.packages)) if (entry.resolved) assert.match(entry.resolved, /^https:\/\/registry\.npmjs\.org\//);
  assert.throws(() => load.resolve('hedera-global-indexer'), { code: 'MODULE_NOT_FOUND' });
});
test('compiled output contains only sports sources and shared Prisma services', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
  const files = walk(path.join(target, 'dist'));
  for (const file of files) {
    const relative = path.relative(path.join(target, 'dist'), file).replaceAll('\\', '/');
    assert.match(relative, /^(src\/sports\/|prisma\/prisma\.(module|service)\.)/);
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /hedera-global-indexer|cs-indexer|IndexerModule|PgListenerService/);
  }
  assert.ok(files.some(f => f.endsWith('/src/sports/main.js')));
});
test('actual plugin search/detail preserve identities, metadata, SDGs and provenance', async () => {
  const adapter = new SportsAtlasService();
  const results = await adapter.search('coastal restoration');
  const detail = await adapter.details(record.sourceTimestamp);
  for (const p of [results[0], detail]) {
    for (const key of Object.keys(record)) assert.deepEqual(p[key], record[key]);
    assert.equal(p.provenance, 'SUSTAINABILITY_ATLAS');
    assert.ok(Number.isFinite(Date.parse(p.retrievedAt)));
  }
  assert.deepEqual(calls, [
    { path: '/api/v1/mainnet/projects', search: 'coastal restoration', authenticated: true },
    { path: `/api/v1/mainnet/projects/${record.sourceTimestamp}`, search: null, authenticated: true },
  ]);
});
test('actual detail identity mismatch and upstream errors fail safely', async () => {
  const adapter = new SportsAtlasService();
  responseMode = 'mismatch';
  await assert.rejects(adapter.details(record.sourceTimestamp));
  responseMode = 'error';
  await assert.rejects(adapter.search('controlled failure'), e => {
    assert.deepEqual(e.getResponse(), { message: 'Atlas search unavailable', atlasHttpStatus: 403 });
    assert.doesNotMatch(JSON.stringify(e.getResponse()), /controlled-test-only/);
    return true;
  });
  responseMode = 'ok';
});
