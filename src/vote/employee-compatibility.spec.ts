// Exercises unchanged employee vote rules; no AWS, wallet or live database calls.
const mockDb = {
  campaign: { findUnique: jest.fn() }, campaignProject: { findUnique: jest.fn() },
  vote: { findUnique: jest.fn(), create: jest.fn() }, user: { findUnique: jest.fn() }, role: { findUnique: jest.fn() },
};
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mockDb) }));
const { VoteService } = require('./vote.service');

describe('original employee vote compatibility', () => {
  const payload = { userId: 11, campaignId: 22, projectId: 33, reason: 'Fixture employee reason' };
  beforeEach(() => {
    jest.resetAllMocks();
    mockDb.campaign.findUnique.mockResolvedValue({ id: 22, campaignStatus: { name: 'Active' } });
    mockDb.campaignProject.findUnique.mockResolvedValue({ campaignId: 22, projectId: 33 });
    mockDb.vote.findUnique.mockResolvedValue(null);
    mockDb.user.findUnique.mockResolvedValue({ departmentId: 7, role_id: 2 });
    mockDb.role.findUnique.mockResolvedValue({ id: 2, name: 'Employee' });
    mockDb.vote.create.mockResolvedValue({ id: 44 });
  });
  it('accepts a preregistered employee and preserves departmental vote metadata', async () => {
    expect(await new VoteService().createVote(payload)).toEqual({ id: 44 });
    expect(mockDb.vote.create).toHaveBeenCalledWith(expect.objectContaining({ data: { userId: 11, campaignId: 22, projectId: 33, voteData: { reason: payload.reason, departmentId: 7 } } }));
  });
  it('keeps the original employee role requirement', async () => {
    mockDb.user.findUnique.mockResolvedValue({ departmentId: 7, role_id: 3 });
    await expect(new VoteService().createVote(payload)).rejects.toThrow(/Only employees/);
    expect(mockDb.vote.create).not.toHaveBeenCalled();
  });
  it('rejects duplicate employee votes', async () => {
    mockDb.vote.findUnique.mockResolvedValue({ id: 44 });
    await expect(new VoteService().createVote(payload)).rejects.toThrow(/already voted/);
    expect(mockDb.vote.create).not.toHaveBeenCalled();
  });
  it('rejects projects outside the employee campaign', async () => {
    mockDb.campaignProject.findUnique.mockResolvedValue(null);
    await expect(new VoteService().createVote(payload)).rejects.toThrow(/does not belong/);
  });
  it('keeps the legacy Active status requirement', async () => {
    mockDb.campaign.findUnique.mockResolvedValue({ campaignStatus: { name: 'Created' } });
    await expect(new VoteService().createVote(payload)).rejects.toThrow(/active campaigns/);
  });
  it('rejects unregistered employee identities', async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    await expect(new VoteService().createVote(payload)).rejects.toThrow(/User not found/);
  });
});
