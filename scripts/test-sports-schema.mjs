// Creates its own disposable database; deliberately never reads DATABASE_URL.
import { execFileSync } from 'node:child_process';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';

const name = `nature-sports-test-${randomUUID()}`;
const password = randomBytes(24).toString('hex');
let db;
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
try {
  docker('run', '--rm', '-d', '--name', name, '-e', 'POSTGRES_DB=sports_disposable', '-e', `POSTGRES_PASSWORD=${password}`, '-p', '127.0.0.1::5432', 'postgres:16');
  const port = Number(docker('port', name, '5432/tcp').split(':').at(-1));
  for (let i = 0; i < 40; i++) {
    const candidate = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'sports_disposable' });
    try { await candidate.connect(); db = candidate; break; }
    catch { await candidate.end().catch(() => {}); await new Promise(r => setTimeout(r, 250)); }
  }
  assert.ok(db, 'Disposable PostgreSQL must start');
  // Representative legacy sentinels, not a reconstruction of the production schema.
  await db.query(`CREATE TABLE "Campaign" (id INTEGER PRIMARY KEY, status TEXT); CREATE TABLE "Project" (id INTEGER PRIMARY KEY, name TEXT); CREATE TABLE legacy_effects (id SERIAL); CREATE FUNCTION legacy_probe() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN INSERT INTO legacy_effects DEFAULT VALUES; RETURN NEW; END $$; CREATE TRIGGER campaign_status_probe AFTER INSERT OR UPDATE ON "Campaign" FOR EACH ROW EXECUTE FUNCTION legacy_probe(); INSERT INTO "Campaign" VALUES (1, 'Active'); INSERT INTO "Project" VALUES (1, 'Legacy project'); TRUNCATE legacy_effects;`);
  const before = await db.query(`SELECT tgname, pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname`);
  const sql = await readFile(new URL('../prisma/migrations/20261009000000_add_isolated_sports_demo/migration.sql', import.meta.url), 'utf8');
  assert.doesNotMatch(sql, /\b(?:DROP|ALTER|TRUNCATE|DELETE|UPDATE)\s+(?:TABLE\s+)?"?(?:Campaign|Project|Vote|User)\b/i);
  await db.query('BEGIN'); await db.query(sql); await db.query('COMMIT');
  const campaign = randomUUID(), other = randomUUID(), ballot = randomUUID(), selection = randomUUID(), reward = randomUUID(), participant = randomUUID();
  const createCampaign = `INSERT INTO "SportsCampaign" (id,slug,name,event,"startsAt","endsAt","rewardConfig","createdBySubject","updatedAt") VALUES ($1,$2,'Fictional demonstration','Fictional sports event',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP + INTERVAL '1 day','{}','test',CURRENT_TIMESTAMP)`;
  await db.query(createCampaign, [campaign, 'fixture-demo']); await db.query(createCampaign, [other, 'fixture-other']);
  const project = await db.query(`INSERT INTO "AtlasProject" ("sourceTimestamp",metadata,"fetchedAt") VALUES ('fixture-only','{"provenance":"DEVELOPMENT_FIXTURE"}',CURRENT_TIMESTAMP) RETURNING id`);
  await db.query(`INSERT INTO "SportsBallotProject" (id,"campaignId","atlasProjectId",position,snapshot) VALUES ($1,$2,$3,1,'{"provenance":"DEVELOPMENT_FIXTURE"}')`, [ballot, campaign, project.rows[0].id]);
  const addSelection = `INSERT INTO "FanSelection" (id,"campaignId","ballotProjectId","participantHash","idempotencyKey") VALUES ($1,$2,$3,$4,$5)`;
  await db.query(addSelection, [selection, campaign, ballot, participant, randomUUID()]);
  await assert.rejects(db.query(addSelection, [randomUUID(), campaign, ballot, participant, randomUUID()]), e => e.code === '23505');
  await assert.rejects(db.query(addSelection, [randomUUID(), other, ballot, 'different', randomUUID()]), e => e.code === '23503');
  const key = (await db.query(`SELECT "idempotencyKey" FROM "FanSelection" WHERE id=$1`, [selection])).rows[0].idempotencyKey;
  await assert.rejects(db.query(addSelection, [randomUUID(), campaign, ballot, 'different', key]), e => e.code === '23505');
  const issue = `INSERT INTO "RewardIssuance" (id,"selectionId","rewardType",snapshot,"claimKeyVersion") VALUES ($1,$2,'DIGITAL_BADGE','{"fixture":true}','v1')`;
  await db.query(issue, [reward, selection]);
  await assert.rejects(db.query(issue, [randomUUID(), selection]), e => e.code === '23505');
  await assert.rejects(db.query(`UPDATE "SportsCampaign" SET "endsAt"="startsAt" WHERE id=$1`, [campaign]), e => e.code === '23514');
  await assert.rejects(db.query(`UPDATE "SportsCampaign" SET "commitmentAmount"=100 WHERE id=$1`, [campaign]), e => e.code === '23514');
  assert.deepEqual((await db.query(`SELECT tgname, pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname`)).rows, before.rows);
  assert.equal((await db.query('SELECT count(*)::int AS count FROM legacy_effects')).rows[0].count, 0);
  assert.deepEqual((await db.query('SELECT * FROM "Campaign"')).rows, [{ id: 1, status: 'Active' }]);
  assert.deepEqual((await db.query('SELECT * FROM "Project"')).rows, [{ id: 1, name: 'Legacy project' }]);
  await db.end(); db = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', password, database: 'sports_disposable' }); await db.connect();
  assert.equal((await db.query(`SELECT id FROM "RewardIssuance" WHERE id=$1`, [reward])).rows[0].id, reward);
  console.log('PASS: disposable SQL migration, duplicate browser/idempotency constraints, ballot membership, one badge per selection, valid windows/commitments, reconnect persistence, unchanged legacy records/triggers and zero legacy automation effects.');
} catch (error) {
  // Do not emit connection arguments or password-containing driver errors.
  console.error(`FAIL: disposable schema test (${error.code || 'assertion/setup failure'})`);
  process.exitCode = 1;
} finally { if (db) await db.end().catch(() => {}); try { docker('rm', '-f', name); } catch {} }
