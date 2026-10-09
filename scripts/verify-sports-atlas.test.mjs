import test from 'node:test';
import assert from 'node:assert/strict';
import { responseShape, compatible, verifyAdapter } from './verify-sports-atlas.mjs';
const project = { sourceTimestamp: '1234567890.123456789', name: 'Synthetic fixture', sdgs: [13, 15] };
test('validates actual search and unwrapped detail envelope assumptions', () => {
  assert.equal(compatible([responseShape({ data: [project] }), responseShape(project, true)]), true);
  assert.equal(responseShape({ items: [project] }).envelopeValid, false);
  assert.equal(responseShape({ data: project }, true).envelopeValid, false);
});
test('detects SDG and metadata loss instead of treating normalization as proof', () => {
  for (const change of [{ sdgs: ['15'] }, { sdgs: [{ id: 15 }] }, { methodology: ['VM0047'] }, { name: 'x'.repeat(1001) }, { sourceTimestamp: 123.45 }]) {
    assert.equal(compatible([responseShape({ data: [project] }), responseShape({ ...project, ...change }, true)]), false);
  }
});
test('executes supplied adapter search/details and verifies source provenance', async () => {
  const calls = [];
  const result = await verifyAdapter({ search: async q => { calls.push(q); return [project]; }, details: async t => { calls.push(t); return { ...project, provenance: 'SUSTAINABILITY_ATLAS' }; } }, 'forest');
  assert.deepEqual(calls, ['forest', project.sourceTimestamp]);
  assert.equal(result.databaseAccessed, false); assert.equal(result.campaignPublished, false);
  await assert.rejects(verifyAdapter({ search: async () => [project], details: async () => ({ ...project, sourceTimestamp: '1.2' }) }, 'forest'));
});
test('shape report excludes arbitrary fields and invalid timestamp values', () => {
  const report = responseShape({ ...project, sourceTimestamp: 'sensitive-test-value', privateData: 'sensitive-test-value' }, true);
  assert.doesNotMatch(JSON.stringify(report), /sensitive-test-value/);
});
