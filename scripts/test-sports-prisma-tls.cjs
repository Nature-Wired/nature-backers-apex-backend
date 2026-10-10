// PREPARATION ONLY: execution requires separate approval.
// Docker/OpenSSL test harness; no AWS API, migrations, image build/push or live API calls.
const { execFileSync } = require('node:child_process');
const { randomUUID, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const approved = '296903956631.dkr.ecr.us-west-2.amazonaws.com/nature-backers-sports-staging@sha256:ea7fb45d6d72129ad5899f6f089bea769ba31282b0dd4561f1719b1f78cbee3c';
const image = process.argv[2];
const pgImage = process.env.SPORTS_TLS_POSTGRES_IMAGE;
const prefix = `sports-tls-${randomUUID()}`;
const containers = [];
const volumes = [];
let work, networkCreated = false, phase = 'preflight', cleaned = false, cleanupStarted = false, interruptionStarted = false;
let scenarioCount = 0;
const run = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 60000, killSignal: 'SIGKILL', ...options,
}).trim();
const docker = (...args) => run('docker', args);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const write = (name, value, mode = 0o600) => {
  const file = path.join(work, name); fs.writeFileSync(file, value, { mode }); return file;
};
const mount = (source, destination) => ['--mount', `type=bind,src=${source},dst=${destination},readonly`];
function cleanup() {
  if (cleanupStarted) return; // Never start a competing second teardown.
  cleanupStarted = true;
  const deadline = Date.now() + 45000;
  let failures = 0;
  const bounded = (command, args) => {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new Error('Cleanup budget exceeded');
    return run(command, args, { timeout: Math.min(5000, remaining), killSignal: 'SIGKILL' });
  };
  const removeAndVerify = (removeArgs, listArgs, name) => {
    try { bounded('docker', removeArgs); } catch { /* Verify absence independently. */ }
    try {
      // Only a SUCCESSFUL daemon listing establishes absence. Errors are unknown/fail.
      const names = bounded('docker', listArgs).split(/\r?\n/);
      if (names.includes(name)) failures++;
    } catch { failures++; }
  };
  for (const name of [...containers].reverse()) removeAndVerify(['rm', '-fv', name], ['container', 'ls', '--all', '--format', '{{.Names}}'], name);
  for (const name of volumes) removeAndVerify(['volume', 'rm', name], ['volume', 'ls', '--format', '{{.Name}}'], name);
  if (networkCreated) removeAndVerify(['network', 'rm', prefix], ['network', 'ls', '--format', '{{.Name}}'], prefix);
  if (work) {
    try {
      bounded(process.execPath, ['-e', "require('node:fs').rmSync(process.argv[1], {recursive:true,force:true})", work]);
      if (fs.existsSync(work)) failures++;
    } catch { failures++; }
  }
  cleaned = failures === 0;
  console.log(`TLS_CLEANUP ${cleaned ? 'PASS' : 'FAIL'} run=${prefix}`);
  if (!cleaned) process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  if (interruptionStarted) return;
  interruptionStarted = true;
  process.exitCode = signal === 'SIGINT' ? 130 : 143;
  if (cleanupStarted) return;
  cleanup(); process.exit(signal === 'SIGINT' ? 130 : 143);
});
function certificates(label, hostname) {
  const rootKey = path.join(work, `${label}-root.key`);
  const root = path.join(work, `${label}-root.pem`);
  const serverKey = path.join(work, `${label}-server.key`);
  const request = path.join(work, `${label}.csr`);
  const cert = path.join(work, `${label}-server.pem`);
  run('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-days', '2', '-keyout', rootKey, '-out', root,
    '-subj', `/CN=Disposable ${label} test CA`, '-addext', 'basicConstraints=critical,CA:TRUE', '-addext', 'keyUsage=critical,keyCertSign,cRLSign']);
  run('openssl', ['req', '-newkey', 'rsa:2048', '-nodes', '-sha256', '-keyout', serverKey, '-out', request, '-subj', `/CN=${hostname}`]);
  const extensions = write(`${label}.ext`, `basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=DNS:${hostname}\n`);
  run('openssl', ['x509', '-req', '-in', request, '-CA', root, '-CAkey', rootKey, '-CAcreateserial', '-out', cert, '-days', '2', '-sha256', '-extfile', extensions]);
  for (const file of [rootKey, serverKey]) fs.chmodSync(file, 0o600);
  for (const file of [root, cert]) fs.chmodSync(file, 0o444);
  run('openssl', ['verify', '-CAfile', root, '-verify_hostname', hostname, cert]);
  return { root, serverKey, cert };
}
async function database(name, alias, password, tls) {
  containers.push(name);
  const volume = `${name}-data`; volumes.push(volume);
  const envFile = write(`${alias}.env`, `POSTGRES_PASSWORD=${password}\nPOSTGRES_DB=tls_test\n`);
  const args = ['run', '--pull=never', '-d', '--name', name, '--network', prefix, '--network-alias', alias,
    '--env-file', envFile, '--mount', `type=volume,src=${volume},dst=/var/lib/postgresql/data`];
  if (alias === 'pg-trusted') args.push('--network-alias', 'pg-wrong-host');
  if (tls) {
    args.push(...mount(tls.serverKey, '/run/test-tls/server.key'), ...mount(tls.cert, '/run/test-tls/server.pem'),
      '--entrypoint', '/bin/sh', pgImage, '-c',
      'set -eu; cp /run/test-tls/server.key /tmp/server.key; chown postgres:postgres /tmp/server.key; chmod 600 /tmp/server.key; exec /usr/local/bin/docker-entrypoint.sh postgres -c ssl=on -c ssl_cert_file=/run/test-tls/server.pem -c ssl_key_file=/tmp/server.key');
  } else args.push(pgImage, 'postgres', '-c', 'ssl=off');
  docker(...args);
  for (let attempt = 0; attempt < 80; attempt++) {
    try { docker('exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres', '-d', 'tls_test'); return; } catch { await sleep(250); }
  }
  throw new Error('Disposable database startup failed');
}
function scenario(name, host, password, ca, expect) {
  phase = name;
  const container = `${prefix}-${name}`; containers.push(container);
  // Temp directory is 0700; only individual files are exposed via read-only mounts.
  const config = write(`${name}.json`, JSON.stringify({ scenario: name, host, password, caPath: ca ? '/tmp/test-root.pem' : '/tmp/missing-test-root.pem', expect }), 0o444);
  const args = ['run', '--pull=never', '--rm', '--name', container, '--network', prefix,
    ...mount(path.join(work, 'client.cjs'), '/tmp/tls-client.cjs'), ...mount(config, '/tmp/tls-scenario.json')];
  if (ca) args.push(...mount(ca, '/tmp/test-root.pem'));
  // Test-only command; image configuration and production default CMD are unchanged.
  args.push('--entrypoint', 'node', image, '/tmp/tls-client.cjs');
  let output, commandSucceeded = false;
  try { output = docker(...args); commandSucceeded = true; } catch (error) {
    // Only explicitly structured runner records are candidates for output.
    output = typeof error.stdout === 'string' ? error.stdout : '';
  }
  const records = output.split(/\r?\n/).filter(line => line.startsWith('TLS_CASE '));
  assert.equal(records.length, 1);
  const result = JSON.parse(records[0].slice(9));
  const allowedCodes = new Set(['none', 'unknown', 'P1000', 'P1001', 'P1002', 'P1003', 'P1010', 'P1011', 'P1012', 'P1013', 'P1017', 'P2010', 'P2024']);
  const allowedCategories = new Set(['setup', 'connected', 'unrelated', 'unknown-tls', 'untrusted-chain', 'hostname-mismatch', 'tls-disabled', 'missing-ca', 'malformed-ca']);
  const allowedPhases = new Set(['configuration', 'native-client', 'connect', 'encrypted-query', 'disconnect']);
  assert.equal(result.scenario, name);
  assert.ok(['PASS', 'FAIL'].includes(result.status) && allowedCodes.has(result.code) && allowedCategories.has(result.category) && allowedPhases.has(result.phase));
  console.log('TLS_CASE ' + JSON.stringify({ scenario: name, status: result.status, phase: result.phase, code: result.code, category: result.category }));
  assert.ok(commandSucceeded);
  assert.equal(result.status, 'PASS');
  scenarioCount++;
}
(async () => {
  try {
    assert.equal(image, approved, 'Supply the already-present approved digest, not a mutable tag');
    const metadata = JSON.parse(docker('image', 'inspect', image))[0];
    assert.equal(metadata.Config.User, 'node');
    assert.deepEqual(metadata.Config.Cmd, ['node', 'dist/src/sports/main.js']);
    assert.ok(metadata.RepoDigests.includes(approved));
    assert.equal(metadata.Architecture, 'amd64');
    assert.match(pgImage || '', /^(?:docker\.io\/library\/)?postgres@sha256:[0-9a-f]{64}$/);
    const postgresMetadata = JSON.parse(docker('image', 'inspect', pgImage))[0];
    const normalized = ref => ref.replace(/^docker\.io\/library\//, '');
    assert.ok(postgresMetadata.RepoDigests.some(ref => normalized(ref) === normalized(pgImage)));
    assert.equal(postgresMetadata.Os, 'linux');
    assert.equal(postgresMetadata.Architecture, 'amd64');
    assert.ok(postgresMetadata.Config.Env.includes('PG_MAJOR=16'));
    assert.match(postgresMetadata.Id, /^sha256:[0-9a-f]{64}$/);
    assert.equal(metadata.Os, 'linux');
    console.log(`TLS_POSTGRES image=${pgImage} platform=linux/amd64 imageId=${postgresMetadata.Id}`);
    run('openssl', ['version']);
    work = fs.mkdtempSync(path.join(os.tmpdir(), 'sports-prisma-tls-'));
    fs.chmodSync(work, 0o700);
    console.log(`TLS_RUN id=${prefix} temporaryDirectory=${work}`);
    fs.copyFileSync(path.join(__dirname, 'sports-prisma-tls-client.cjs'), path.join(work, 'client.cjs'));
    fs.chmodSync(path.join(work, 'client.cjs'), 0o444);
    phase = 'generate-disposable-certificates';
    const trusted = certificates('trusted', 'pg-trusted');
    const untrusted = certificates('untrusted', 'pg-untrusted');
    const malformed = write('malformed.pem', 'This is deliberately not a PEM certificate.\n', 0o444);
    const password = randomBytes(32).toString('hex');
    networkCreated = true; // Track even if the Docker command is interrupted after creation.
    docker('network', 'create', '--internal', prefix);
    phase = 'disposable-databases';
    await database(`${prefix}-trusted`, 'pg-trusted', password, trusted);
    await database(`${prefix}-untrusted`, 'pg-untrusted', password, untrusted);
    await database(`${prefix}-plaintext`, 'pg-plaintext', password, null);
    scenario('trusted-valid-ca', 'pg-trusted', password, trusted.root, 'connect');
    scenario('second-ca-baseline', 'pg-untrusted', password, untrusted.root, 'connect');
    scenario('untrusted-chain', 'pg-untrusted', password, trusted.root, 'reject');
    scenario('hostname-mismatch', 'pg-wrong-host', password, trusted.root, 'reject');
    scenario('tls-disabled', 'pg-plaintext', password, trusted.root, 'reject');
    scenario('missing-ca-file', 'pg-trusted', password, null, 'reject');
    scenario('malformed-ca-file', 'pg-trusted', password, malformed, 'reject');
    phase = 'complete';
  } catch {
    console.error(`TLS_REPORT FAIL phase=${phase} passedCases=${scenarioCount} sanitized=true`);
    process.exitCode = 1;
  } finally {
    cleanup();
    if (!process.exitCode && cleaned) console.log(`TLS_REPORT PASS cases=${scenarioCount} nativeClient=6.19.2 migrations=false cleanup=true`);
  }
})();
