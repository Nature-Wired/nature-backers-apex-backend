// Server-side, read-only verification. Never serialize Axios errors or request headers.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { searchGuardianProjectsTool, getGuardianProjectTool } from '@nature-wired/hedera-guardian-agent-plugin';

export function sanitizedFailure(error) {
  const status = Number.isInteger(error?.response?.status) ? error.response.status : null;
  return { ok: false, httpStatus: status, error: status ? 'Atlas HTTP request failed' : 'Atlas request could not complete' };
}

export function snapshot(project, expectedTimestamp) {
  if (!project || project.sourceTimestamp !== expectedTimestamp || !/^\d+\.\d+$/.test(expectedTimestamp) || typeof project.name !== 'string' || !project.name.trim()) {
    throw new Error('Invalid project metadata');
  }
  const record = { sourceTimestamp: expectedTimestamp, provenance: 'SUSTAINABILITY_ATLAS', retrievedAt: new Date().toISOString() };
  for (const field of ['name', 'country', 'registryName', 'developer', 'methodology', 'category', 'sector', 'status', 'lifecycleStage']) {
    record[field] = typeof project[field] === 'string' ? project[field].slice(0, 1000) : null;
  }
  record.sdgs = Array.isArray(project.sdgs) ? project.sdgs.filter(v => Number.isInteger(v) && v >= 1 && v <= 17) : [];
  return record;
}

export async function verifyAtlas({ query = 'mangrove', selected = [], output } = {}) {
  if (!process.env.ATLAS_API_KEY) return { ok: false, httpStatus: null, error: 'ATLAS_API_KEY is unavailable in this runtime; no request sent' };
  const api = new URL(process.env.ATLAS_API_URL || 'https://atlas.xeptagon.com/api/v1');
  if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash) throw new Error('Invalid server-side Atlas URL');
  if (selected.length && (selected.length !== 3 || new Set(selected).size !== 3)) throw new Error('Select exactly three distinct source timestamps');
  try {
    const result = await searchGuardianProjectsTool({}).coreAction({ query, pageSize: 20 });
    const candidates = result.raw.projects;
    if (!Array.isArray(candidates) || !candidates.length) return { ok: true, authenticated: true, candidates: [], detailsVerified: false };
    const timestamps = selected.length ? selected : [candidates[0].sourceTimestamp];
    const records = [];
    for (const timestamp of timestamps) {
      const detail = await getGuardianProjectTool({}).coreAction({ sourceTimestamp: timestamp });
      records.push(snapshot(detail.raw.project, timestamp));
    }
    if (output && selected.length === 3) {
      const path = resolve(output);
      await mkdir(resolve(path, '..'), { recursive: true });
      await writeFile(path, JSON.stringify({ schemaVersion: 1, projects: records }, null, 2) + '\n', { mode: 0o600 });
    }
    return { ok: true, authenticated: true, detailsVerified: true, candidates: candidates.map(p => ({ sourceTimestamp: p.sourceTimestamp, name: p.name, country: p.country, methodology: p.methodology })), snapshots: records, persisted: Boolean(output && selected.length === 3) };
  } catch (error) { return sanitizedFailure(error); }
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const args = process.argv.slice(2);
  const value = flag => args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  try {
    const result = await verifyAtlas({ query: value('--query'), selected: value('--select')?.split(',') || [], output: value('--output') });
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } catch { console.error(JSON.stringify({ ok: false, httpStatus: null, error: 'Invalid Atlas verification configuration' })); process.exitCode = 1; }
}
