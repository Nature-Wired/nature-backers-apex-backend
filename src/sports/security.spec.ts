import { SignJWT } from 'jose';
import { SportsAdminGuard, SportsRateLimit } from './security';

describe('sports-only administration and submission controls', () => {
  const secret = 'local-test-key-never-use-outside-tests-12345';
  let oldSecret: string, oldEmails: string;
  beforeAll(() => { oldSecret = process.env.SPORTS_ADMIN_JWT_SECRET; oldEmails = process.env.SPORTS_ADMIN_EMAILS; process.env.SPORTS_ADMIN_JWT_SECRET = secret; process.env.SPORTS_ADMIN_EMAILS = 'operator@example.test'; });
  afterAll(() => { for (const [name, value] of [['SPORTS_ADMIN_JWT_SECRET', oldSecret], ['SPORTS_ADMIN_EMAILS', oldEmails]]) { if (value === undefined) delete process.env[name]; else process.env[name] = value; } });
  const context = (headers = {}, body = {}) => ({ switchToHttp: () => ({ getRequest: () => ({ headers, body }) }) }) as any;
  const token = (email = 'operator@example.test', verified = true, issuer = 'nature-backers-frontend', expiration = '45s') => new SignJWT({ email, email_verified: verified }).setProtectedHeader({ alg: 'HS256' }).setIssuer(issuer).setAudience('sports-admin').setSubject('verified-operator').setIssuedAt().setExpirationTime(expiration).sign(Buffer.from(secret));
  it('rejects anonymous requests and caller-supplied administrator IDs', async () => {
    await expect(new SportsAdminGuard().canActivate(context({}, { userId: 1, role: 'Admin' }))).rejects.toThrow();
  });
  it('accepts a verified allowlisted server assertion', async () => {
    await expect(new SportsAdminGuard().canActivate(context({ authorization: `Bearer ${await token()}` }))).resolves.toBe(true);
  });
  it.each(['unverified', 'nonallowlisted', 'wrong-issuer', 'expired', 'tampered'])('rejects %s assertions', async kind => {
    const jwt = await token(kind === 'nonallowlisted' ? 'stranger@example.test' : undefined, kind !== 'unverified', kind === 'wrong-issuer' ? 'untrusted' : undefined, kind === 'expired' ? '-1s' : undefined);
    await expect(new SportsAdminGuard().canActivate(context({ authorization: `Bearer ${kind === 'tampered' ? jwt + 'x' : jwt}` }))).rejects.toThrow();
  });
  it('limits submissions and permits retry after the window', () => {
    jest.useFakeTimers();
    try { const limiter = new SportsRateLimit(); limiter.check('browser', 2); limiter.check('browser', 2); expect(() => limiter.check('browser', 2)).toThrow(); jest.advanceTimersByTime(60001); expect(() => limiter.check('browser', 2)).not.toThrow(); }
    finally { jest.useRealTimers(); }
  });
});
