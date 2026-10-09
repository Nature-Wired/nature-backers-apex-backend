// Read-only live verification of the compiled Apex adapter. No DB or app bootstrap.
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const fields = ['name', 'country', 'registryName', 'developer', 'methodology', 'category', 'sector', 'status', 'lifecycleStage'];
export function responseShape(data, detail = false) {
  const records = detail ? [data] : Array.isArray(data?.data) ? data.data : [];
  return {
    envelopeValid: detail ? Boolean(data && typeof data === 'object' && !Array.isArray(data) && typeof data.sourceTimestamp === 'string') : Array.isArray(data?.data),
    records: records.slice(0, 20).map(p => ({
      sourceTimestamp: typeof p?.sourceTimestamp === 'string' && /^\d+\.\d+$/.test(p.sourceTimestamp) ? p.sourceTimestamp : null,
      timestampValid: typeof p?.sourceTimestamp === 'string' && /^\d+\.\d+$/.test(p.sourceTimestamp),
      fieldTypes: Object.fromEntries(fields.map(f => [f, p?.[f] == null ? 'absent' : typeof p[f]])),
      oversizedFields: fields.filter(f => typeof p?.[f] === 'string' && p[f].length > 1000),
      sdgsValid: p?.sdgs == null || (Array.isArray(p.sdgs) && p.sdgs.every(v => Number.isInteger(v) && v >= 1 && v <= 17)),
    })),
  };
}

export async function verifyAdapter(adapter, query, timestamps = []) {
  const projects = await adapter.search(query);
  if (!projects.length) throw new Error('NO_CANDIDATES');
  const chosen = timestamps.length ? timestamps : projects.slice(0, 3).map(p => p.sourceTimestamp);
  const details = [];
  for (const timestamp of chosen) {
    const project = await adapter.details(timestamp);
    if (project.sourceTimestamp !== timestamp || project.provenance !== 'SUSTAINABILITY_ATLAS') throw new Error('IDENTITY_MISMATCH');
    details.push(project);
  }
  return { candidates: projects, details, campaignPublished: false, databaseAccessed: false };
}

export function compatible(observations) {
  return observations.length > 1 && observations.every(o => o.envelopeValid && o.records.every(p =>
    p.timestampValid && p.sdgsValid && !p.oversizedFields.length && p.fieldTypes.name === 'string' &&
    fields.every(f => ['string', 'absent'].includes(p.fieldTypes[f]))));
}

async function main() {
  if (!process.env.ATLAS_API_KEY) throw new Error('MISSING_KEY');
  const base = new URL(process.env.ATLAS_API_URL || 'https://atlas.xeptagon.com/api/v1');
  if (base.protocol !== 'https:' || base.hostname !== 'atlas.xeptagon.com' || base.username || base.password || base.search || base.hash) throw new Error('INVALID_BASE');
  if (process.env.SPORTS_ALLOW_FIXTURES === 'true') throw new Error('FIXTURES_ENABLED');
  const args = process.argv.slice(2);
  const query = args[0] || 'mangrove';
  const timestamps = args.slice(1);
  if (timestamps.some(t => !/^\d+\.\d+$/.test(t))) throw new Error('INVALID_TIMESTAMPS');
  const pluginUrl = import.meta.resolve('@nature-wired/hedera-guardian-agent-plugin');
  const req = createRequire(pluginUrl);
  const axios = (await import(pathToFileURL(dirname(req.resolve('axios/package.json')) + '/index.js'))).default;
  const get = axios.get;
  const observations = [];
  // Observe public response shape only; never inspect/log request headers or errors.
  axios.get = async (...arguments_) => {
    const response = await get.apply(axios, arguments_);
    observations.push({ operation: observations.length ? 'detail' : 'search', httpStatus: response.status,
      ...responseShape(response.data, observations.length > 0) });
    return response;
  };
  try {
    const { SportsAtlasService } = await import(new URL('../dist/src/sports/atlas.service.js', import.meta.url));
    const result = await verifyAdapter(new SportsAtlasService(), query, timestamps);
    const pass = compatible(observations);
    console.log(JSON.stringify({ ok: pass, adapterExecuted: true, observations, ...result,
      limitation: 'Allowlisted metadata only; no funding eligibility or approved ballot implied.' }, null, 2));
    if (!pass) process.exitCode = 1;
  } catch (error) {
    const response = typeof error?.getResponse === 'function' ? error.getResponse() : null;
    console.error(JSON.stringify({ ok: false, observations,
      httpStatus: Number.isInteger(response?.atlasHttpStatus) ? response.atlasHttpStatus : null,
      error: 'Compiled adapter did not complete live verification. Shape diagnostics contain no response bodies or request headers.' }, null, 2));
    process.exitCode = 1;
  } finally { axios.get = get; }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await main(); }
  catch (error) {
    const known = ['MISSING_KEY', 'NO_CANDIDATES', 'IDENTITY_MISMATCH', 'INVALID_BASE', 'INVALID_TIMESTAMPS', 'FIXTURES_ENABLED'];
    const response = typeof error?.getResponse === 'function' ? error.getResponse() : null;
    console.error(JSON.stringify({ ok: false, httpStatus: Number.isInteger(response?.atlasHttpStatus) ? response.atlasHttpStatus : null,
      error: known.includes(error?.message) ? error.message : 'Adapter verification failed; check build and Atlas contract. No raw error exposed.' }));
    process.exitCode = 1;
  }
}
