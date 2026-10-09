import { Injectable, BadGatewayException, BadRequestException } from '@nestjs/common';

// Native import preserves compatibility with the Guardian plugin's ESM package.
const nativeImport = new Function('specifier', 'return import(specifier)') as (name: string) => Promise<any>;
export const DEVELOPMENT_PROJECTS = [
  { sourceTimestamp: 'fixture-wetlands', name: 'Fixture: Wetland Habitat', country: 'Example country', registryName: 'Development fixture', methodology: 'Example wetland method', sector: 'Nature', sdgs: [6, 15] },
  { sourceTimestamp: 'fixture-forest', name: 'Fixture: Forest Restoration', country: 'Example country', registryName: 'Development fixture', methodology: 'Example forest method', sector: 'Nature', sdgs: [13, 15] },
  { sourceTimestamp: 'fixture-coast', name: 'Fixture: Coastal Ecosystem', country: 'Example country', registryName: 'Development fixture', methodology: 'Example coastal method', sector: 'Nature', sdgs: [14] },
];

export function normalizeProject(project: any, expectedTimestamp?: string, fixture = false) {
  if (!project || typeof project.name !== 'string' || !project.name.trim() || typeof project.sourceTimestamp !== 'string' || !project.sourceTimestamp.trim()) {
    throw new BadGatewayException('Atlas returned incomplete project metadata');
  }
  if (expectedTimestamp && project.sourceTimestamp !== expectedTimestamp) throw new BadGatewayException('Atlas project identity mismatch');
  if (!fixture && !/^\d+\.\d+$/.test(project.sourceTimestamp)) throw new BadGatewayException('Atlas returned an invalid source timestamp');
  const text = (v: any) => typeof v === 'string' ? v.slice(0, 1000) : null;
  return {
    sourceTimestamp: project.sourceTimestamp, name: text(project.name), country: text(project.country),
    registryName: text(project.registryName), developer: text(project.developer), methodology: text(project.methodology),
    category: text(project.category), sector: text(project.sector), status: text(project.status), lifecycleStage: text(project.lifecycleStage),
    sdgs: Array.isArray(project.sdgs) ? project.sdgs.filter((v: any) => Number.isInteger(v) && v >= 1 && v <= 17) : [],
    provenance: fixture ? 'DEVELOPMENT_FIXTURE' : 'SUSTAINABILITY_ATLAS',
    retrievedAt: new Date().toISOString(),
  };
}

export function atlasFailure(operation: string, error: any) {
  const status = Number.isInteger(error?.response?.status) ? error.response.status : null;
  // Axios errors contain credential-bearing headers; never log or serialize them.
  return new BadGatewayException({ message: `Atlas ${operation} unavailable`, atlasHttpStatus: status });
}

@Injectable()
export class SportsAtlasService {
  fixturesEnabled() {
    return process.env.SPORTS_ALLOW_FIXTURES === 'true' && process.env.NODE_ENV !== 'production';
  }
  async search(query: string) {
    if (!query || query.length > 200) throw new BadRequestException('A search query is required');
    const plugin = await nativeImport('@nature-wired/hedera-guardian-agent-plugin');
    try {
      const result = await plugin.searchGuardianProjectsTool({}).coreAction({ query, pageSize: 20 });
      return result.raw.projects.map((p: any) => normalizeProject(p));
    } catch (error) { throw atlasFailure('search', error); }
  }
  async details(timestamp: string) {
    if (timestamp.startsWith('fixture-')) {
      if (!this.fixturesEnabled()) throw new BadRequestException('Development fixtures are disabled');
      const p = DEVELOPMENT_PROJECTS.find(v => v.sourceTimestamp === timestamp);
      if (!p) throw new BadRequestException('Unknown fixture');
      return normalizeProject(p, timestamp, true);
    }
    if (!/^\d+\.\d+$/.test(timestamp)) throw new BadRequestException('Invalid Atlas source timestamp');
    const plugin = await nativeImport('@nature-wired/hedera-guardian-agent-plugin');
    try {
      const result = await plugin.getGuardianProjectTool({}).coreAction({ sourceTimestamp: timestamp });
      return normalizeProject(result.raw.project, timestamp);
    } catch (error) { throw atlasFailure('project retrieval', error); }
  }
}
