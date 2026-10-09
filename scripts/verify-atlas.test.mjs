import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizedFailure, snapshot, verifyAtlas } from './verify-atlas.mjs';

test('HTTP failures expose status without request credentials or server body', () => {
  const error = { response: { status: 401, data: 'sensitive-body' }, config: { headers: { 'x-api-key': 'sensitive-key' } }, message: 'sensitive-key' };
  const result = sanitizedFailure(error);
  assert.equal(result.httpStatus, 401);
  assert.doesNotMatch(JSON.stringify(result), /sensitive/);
});
test('snapshots retain identity and allowlisted public metadata only', () => {
  const result = snapshot({ sourceTimestamp: '1234567890.123456789', name: 'Project', country: 'US', sdgs: [15, 100, '6'], secret: 'sensitive-key' }, '1234567890.123456789');
  assert.equal(result.sourceTimestamp, '1234567890.123456789');
  assert.equal(result.provenance, 'SUSTAINABILITY_ATLAS');
  assert.deepEqual(result.sdgs, [15]);
  assert.doesNotMatch(JSON.stringify(result), /sensitive-key/);
});
test('mismatched or fixture timestamps cannot become live snapshots', () => {
  assert.throws(() => snapshot({ sourceTimestamp: 'fixture-forest', name: 'Fixture' }, 'fixture-forest'));
  assert.throws(() => snapshot({ sourceTimestamp: '1.2', name: 'Project' }, '1.3'));
});
test('missing key produces no HTTP status or fabricated authentication success', async () => {
  const prior = process.env.ATLAS_API_KEY;
  delete process.env.ATLAS_API_KEY;
  try { const result = await verifyAtlas(); assert.equal(result.ok, false); assert.equal(result.httpStatus, null); assert.match(result.error, /no request sent/); }
  finally { if (prior !== undefined) process.env.ATLAS_API_KEY = prior; }
});
