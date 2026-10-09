import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SportsAtlasService } from './atlas.service';
import { claimToken, verifyClaim } from './reward';
import { requiredSecret } from './security';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function requireUuid(value: any) { if (typeof value !== 'string' || !uuid.test(value)) throw new BadRequestException('Invalid request identifier'); }
function text(value: any, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== 'string' || !value.trim() || value.length > 200) throw new BadRequestException('Invalid campaign text');
  return value.trim();
}
@Injectable()
export class SportsService {
  constructor(private db: PrismaService, private atlas: SportsAtlasService) {}
  async create(body: any, subject: string) {
    const startsAt = new Date(body.startsAt), endsAt = new Date(body.endsAt);
    if (!Number.isFinite(+startsAt) || !Number.isFinite(+endsAt) || endsAt <= startsAt) throw new BadRequestException('Invalid campaign window');
    if (typeof body.slug !== 'string' || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(body.slug)) throw new BadRequestException('Invalid campaign slug');
    let commitmentAmount: string | null = null, commitmentCurrency: string | null = null;
    if (body.commitmentAmount != null) {
      commitmentAmount = String(body.commitmentAmount);
      if (!/^\d{1,16}(\.\d{1,2})?$/.test(commitmentAmount) || !/^[A-Z]{3}$/.test(body.commitmentCurrency || '')) throw new BadRequestException('Invalid optional commitment');
      commitmentCurrency = body.commitmentCurrency;
    } else if (body.commitmentCurrency != null) throw new BadRequestException('Currency requires a commitment');
    const campaign = await this.db.sportsCampaign.create({ data: {
      slug: body.slug, name: text(body.name, true)!, event: text(body.event, true)!, startsAt, endsAt,
      league: text(body.league), team: text(body.team), sponsor: text(body.sponsor), venue: text(body.venue),
      partners: Array.isArray(body.partners) ? body.partners.slice(0, 10).map(v => text(v, true)) : [],
      commitmentAmount, commitmentCurrency, rewardType: 'DIGITAL_BADGE',
      rewardConfig: { title: 'Nature Backer', version: 1 }, createdBySubject: subject,
    }});
    return { id: campaign.id, slug: campaign.slug, status: campaign.status };
  }
  async curate(id: string, timestamps: any) {
    requireUuid(id);
    if (!Array.isArray(timestamps) || timestamps.length !== 3 || new Set(timestamps).size !== 3 || timestamps.some(v => typeof v !== 'string')) throw new BadRequestException('Choose exactly three distinct Atlas projects');
    const snapshots = await Promise.all(timestamps.map(v => this.atlas.details(v)));
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "SportsCampaign" WHERE id = ${id}::uuid FOR UPDATE`;
      const campaign = await tx.sportsCampaign.findUnique({ where: { id } });
      if (!campaign) throw new NotFoundException();
      if (campaign.status !== 'DRAFT') throw new ConflictException('Published ballots cannot change');
      await tx.sportsBallotProject.deleteMany({ where: { campaignId: id } });
      for (const [index, snapshot] of snapshots.entries()) {
        const project = await tx.atlasProject.upsert({ where: { sourceTimestamp: snapshot.sourceTimestamp }, create: { sourceTimestamp: snapshot.sourceTimestamp, metadata: snapshot, fetchedAt: new Date() }, update: { metadata: snapshot, fetchedAt: new Date() } });
        await tx.sportsBallotProject.create({ data: { campaignId: id, atlasProjectId: project.id, position: index + 1, snapshot } });
      }
      return { count: 3 };
    });
  }
  async publish(id: string) {
    requireUuid(id);
    return this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "SportsCampaign" WHERE id = ${id}::uuid FOR UPDATE`;
      const campaign = await tx.sportsCampaign.findUnique({ where: { id }, include: { ballot: true } });
      if (!campaign) throw new NotFoundException();
      if (campaign.status !== 'DRAFT' || campaign.ballot.length !== 3 || campaign.endsAt <= new Date()) throw new ConflictException('A current draft with three projects is required');
      if (!this.atlas.fixturesEnabled() && campaign.ballot.some(p => (p.snapshot as any).provenance === 'DEVELOPMENT_FIXTURE')) throw new ConflictException('Fixture campaigns cannot be published in this environment');
      requiredSecret('SPORTS_PARTICIPANT_SECRET');
      claimToken({ id: campaign.id, claimKeyVersion: process.env.SPORTS_CLAIM_KEY_VERSION || 'v1' });
      await tx.sportsCampaign.update({ where: { id }, data: { status: 'PUBLISHED', publishedAt: new Date() } });
      return { slug: campaign.slug, status: 'PUBLISHED' };
    });
  }
  async publicCampaign(slug: string) {
    const c = await this.db.sportsCampaign.findUnique({ where: { slug }, include: { ballot: { orderBy: { position: 'asc' } } } });
    if (!c || c.status === 'DRAFT') throw new NotFoundException('Campaign not found');
    return { slug: c.slug, name: c.name, event: c.event, league: c.league, team: c.team, sponsor: c.sponsor, venue: c.venue,
      startsAt: c.startsAt, endsAt: c.endsAt, open: c.status === 'PUBLISHED' && c.startsAt <= new Date() && c.endsAt > new Date(),
      fixture: c.ballot.some(p => (p.snapshot as any).provenance === 'DEVELOPMENT_FIXTURE'),
      projects: c.ballot.map(p => ({ id: p.id, position: p.position, ...(p.snapshot as any) })) };
  }
  async select(slug: string, input: any) {
    requireUuid(input?.ballotProjectId); requireUuid(input?.participantId); requireUuid(input?.idempotencyKey);
    const participantHash = createHmac('sha256', requiredSecret('SPORTS_PARTICIPANT_SECRET')).update(`${slug}:${input.participantId}`).digest('hex');
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(async tx => {
          const c = await tx.sportsCampaign.findUnique({ where: { slug } });
          if (!c || c.status === 'DRAFT') throw new NotFoundException();
          await tx.$queryRaw`SELECT id FROM "SportsCampaign" WHERE id = ${c.id}::uuid FOR UPDATE`;
          const prior = await tx.fanSelection.findFirst({ where: { campaignId: c.id, OR: [{ idempotencyKey: input.idempotencyKey }, { participantHash }] }, include: { reward: true } });
          if (prior) {
            if (prior.participantHash !== participantHash || prior.ballotProjectId !== input.ballotProjectId) throw new ConflictException('A different selection has already been recorded');
            return this.receipt(prior.reward!, true);
          }
          if (c.status !== 'PUBLISHED' || c.startsAt > new Date() || c.endsAt <= new Date()) throw new ConflictException('Campaign is not open');
          const p = await tx.sportsBallotProject.findUnique({ where: { id_campaignId: { id: input.ballotProjectId, campaignId: c.id } } });
          if (!p) throw new BadRequestException('Project is not in this campaign');
          const snapshot = p.snapshot as any;
          const selection = await tx.fanSelection.create({ data: { campaignId: c.id, ballotProjectId: p.id, participantHash, idempotencyKey: input.idempotencyKey } });
          const reward = await tx.rewardIssuance.create({ data: { selectionId: selection.id, rewardType: c.rewardType, claimKeyVersion: process.env.SPORTS_CLAIM_KEY_VERSION || 'v1', snapshot: { event: c.event, campaign: c.name, sponsor: c.sponsor, project: snapshot, fixture: snapshot.provenance === 'DEVELOPMENT_FIXTURE', config: c.rewardConfig } } });
          return this.receipt(reward, false);
        }, { isolationLevel: 'Serializable' });
      } catch (error) {
        if (['P2034', 'P2002'].includes(error.code) && attempt < 2) continue;
        throw error;
      }
    }
  }
  private receipt(reward: any, replay: boolean) {
    const token = claimToken(reward);
    return { rewardId: reward.id, claimToken: token, claimPath: `/rewards/${token}`, replay };
  }
  async reward(token: string) {
    if (typeof token !== 'string' || token.length > 150) throw new NotFoundException();
    const id = token.split('.')[0];
    if (!uuid.test(id)) throw new NotFoundException();
    const reward = await this.db.rewardIssuance.findUnique({ where: { id } });
    if (!reward) throw new NotFoundException();
    verifyClaim(token, reward);
    return { id: reward.id, rewardType: reward.rewardType, snapshot: reward.snapshot, issuedAt: reward.issuedAt };
  }
  async results(slug: string) {
    const c = await this.db.sportsCampaign.findUnique({ where: { slug }, include: { ballot: { orderBy: { position: 'asc' } } } });
    if (!c) throw new NotFoundException();
    // Read aggregates from one consistent DB snapshot.
    const [groups, rewardsIssued] = await this.db.$transaction(async tx => {
      const groups = await tx.$queryRaw<Array<{ ballotProjectId: string; _count: number }>>`
        SELECT "ballotProjectId", COUNT(*)::integer AS "_count"
        FROM "FanSelection" WHERE "campaignId" = ${c.id}::uuid GROUP BY "ballotProjectId"`;
      const rewards = await tx.rewardIssuance.count({ where: { selection: { campaignId: c.id } } });
      return [groups, rewards] as const;
    }, { isolationLevel: 'RepeatableRead' });
    const acceptedSelections = groups.reduce((sum, v) => sum + v._count, 0);
    const counts = c.ballot.map(p => groups.find(g => g.ballotProjectId === p.id)?._count || 0);
    const cents = c.commitmentAmount == null ? null : BigInt(c.commitmentAmount.toFixed(2).replace('.', ''));
    const allocated = counts.map(count => cents != null && acceptedSelections ? cents * BigInt(count) / BigInt(acceptedSelections) : 0n);
    if (cents != null && acceptedSelections) {
      let remainder = cents - allocated.reduce((a, b) => a + b, 0n);
      const order = counts.map((count, i) => ({ i, rem: cents * BigInt(count) % BigInt(acceptedSelections) })).sort((a, b) => a.rem === b.rem ? a.i - b.i : a.rem > b.rem ? -1 : 1);
      for (const v of order) { if (!remainder) break; allocated[v.i]++; remainder--; }
    }
    const money = (value: bigint) => `${value / 100n}.${(value % 100n).toString().padStart(2, '0')}`;
    return { slug, name: c.name, event: c.event, sponsor: c.sponsor, acceptedSelections, rewardsIssued,
      fixture: c.ballot.some(p => (p.snapshot as any).provenance === 'DEVELOPMENT_FIXTURE'),
      commitment: cents == null ? null : { amount: c.commitmentAmount!.toFixed(2), currency: c.commitmentCurrency, label: 'Illustrative commitment — not disbursed', unallocated: acceptedSelections ? '0.00' : money(cents) },
      projects: c.ballot.map((p, i) => ({ id: p.id, name: (p.snapshot as any).name, selections: counts[i], percentage: acceptedSelections ? counts[i] * 100 / acceptedSelections : 0, illustrativeAllocation: cents == null ? null : money(allocated[i]) })),
      countingNotice: 'Accepted selections are not verified unique fans. Browser controls can be bypassed.' };
  }
}
