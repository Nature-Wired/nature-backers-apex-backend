import { claimToken, verifyClaim, renderBadge } from './reward';

describe('persistent wallet-free badge claims', () => {
  const reward = { id: '11111111-1111-4111-8111-111111111111', claimKeyVersion: 'v1' };
  let prior: string;
  beforeAll(() => { prior = process.env.SPORTS_CLAIM_KEYS; process.env.SPORTS_CLAIM_KEYS = JSON.stringify({ v1: 'test-only-badge-key-at-least-32-characters' }); });
  afterAll(() => { if (prior === undefined) delete process.env.SPORTS_CLAIM_KEYS; else process.env.SPORTS_CLAIM_KEYS = prior; });
  it('produces the same claim after reload/restart from persisted identity', () => {
    const first = claimToken(reward); const reloaded = JSON.parse(JSON.stringify(reward));
    expect(claimToken(reloaded)).toBe(first); expect(() => verifyClaim(first, reloaded)).not.toThrow();
  });
  it('rejects altered claims or reward IDs', () => {
    expect(() => verifyClaim(claimToken(reward) + 'x', reward)).toThrow();
    expect(() => verifyClaim(claimToken(reward), { ...reward, id: '22222222-2222-4222-8222-222222222222' })).toThrow();
  });
  it('retains old claims when a new signing key is added', () => {
    const old = claimToken(reward);
    process.env.SPORTS_CLAIM_KEYS = JSON.stringify({ v1: 'test-only-badge-key-at-least-32-characters', v2: 'second-test-only-badge-key-at-least-32-chars' });
    expect(() => verifyClaim(old, reward)).not.toThrow();
    expect(claimToken({ ...reward, claimKeyVersion: 'v2' })).not.toBe(old);
  });
  it('escapes sponsor/project text and labels fixture badges', () => {
    const svg = renderBadge({ ...reward, issuedAt: new Date(), snapshot: { event: '<script>alert(1)</script>', project: { name: 'Fixture & example' }, fixture: true } });
    expect(svg).not.toContain('<script>'); expect(svg).toContain('&lt;script&gt;'); expect(svg).toContain('DEVELOPMENT FIXTURE');
  });
  it('never echoes malformed signing credentials in an error', () => {
    const previous = process.env.SPORTS_CLAIM_KEYS;
    const sensitive = 'test-only-sensitive-invalid-json-with-more-than-32-characters';
    try {
      process.env.SPORTS_CLAIM_KEYS = sensitive;
      try { claimToken(reward); throw new Error('Expected configuration failure'); }
      catch (error) { expect(error.message).toBe('Badge signing configuration unavailable'); expect(error.message).not.toContain(sensitive); }
    } finally { process.env.SPORTS_CLAIM_KEYS = previous; }
  });
});
