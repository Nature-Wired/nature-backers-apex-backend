import { SportsHealthController } from './health.controller';
describe('sports-only health', () => {
  it('checks database and sports schema independently of campaign publication', async () => {
    const query = jest.fn().mockResolvedValue([{ ready: true }]);
    const controller = new SportsHealthController({ $queryRaw: query } as any);
    expect(controller.live()).toEqual({ status: 'ok' });
    expect(query).not.toHaveBeenCalled();
    expect(await controller.ready()).toEqual({ status: 'ok' });
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('fails closed for unapplied sports tables and sanitizes DB errors', async () => {
    for (const query of [jest.fn().mockResolvedValue([{ ready: false }]), jest.fn().mockRejectedValue(new Error('sensitive-driver-test-data'))]) {
      const controller = new SportsHealthController({ $queryRaw: query } as any);
      try { await controller.ready(); throw new Error('Expected unavailable'); }
      catch (error) { expect(error.getStatus()).toBe(503); expect(JSON.stringify(error.getResponse())).not.toContain('sensitive'); }
    }
  });
});
