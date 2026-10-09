import { SportsAtlasService, normalizeProject, atlasFailure, DEVELOPMENT_PROJECTS } from './atlas.service';

describe('Atlas snapshot boundaries', () => {
  it('labels development fixtures and rejects them as live records', () => {
    const p = DEVELOPMENT_PROJECTS[0];
    expect(normalizeProject(p, p.sourceTimestamp, true).provenance).toBe('DEVELOPMENT_FIXTURE');
    expect(() => normalizeProject(p)).toThrow();
  });
  it('preserves live consensus identity and filters metadata', () => {
    const p = normalizeProject({ sourceTimestamp: '123.456', name: 'Nature project', country: 'US', sdgs: [15, 0, '6'], privateData: 'not-public' }, '123.456');
    expect(p.sourceTimestamp).toBe('123.456'); expect(p.sdgs).toEqual([15]);
    expect(JSON.stringify(p)).not.toContain('not-public');
    expect(() => normalizeProject({ ...p, sourceTimestamp: '123.457' }, '123.456')).toThrow();
  });
  it('retains HTTP status but discards credential-bearing errors', () => {
    const failure = atlasFailure('search', { response: { status: 403, data: 'secret' }, config: { headers: { 'x-api-key': 'secret' } } });
    expect(failure.getResponse()).toEqual({ message: 'Atlas search unavailable', atlasHttpStatus: 403 });
    expect(JSON.stringify(failure.getResponse())).not.toContain('secret');
  });
  it('never enables fixtures in production', () => {
    const previous = { node: process.env.NODE_ENV, fixtures: process.env.SPORTS_ALLOW_FIXTURES };
    try { process.env.NODE_ENV = 'production'; process.env.SPORTS_ALLOW_FIXTURES = 'true'; expect(new SportsAtlasService().fixturesEnabled()).toBe(false); }
    finally { for (const [key, value] of [['NODE_ENV', previous.node], ['SPORTS_ALLOW_FIXTURES', previous.fixtures]]) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
  });
});
