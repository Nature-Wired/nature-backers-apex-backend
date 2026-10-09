import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('health/sports')
export class SportsHealthController {
  constructor(private readonly db: PrismaService) {}
  @Get('live') @Header('Cache-Control', 'no-store')
  live() { return { status: 'ok' }; }

  @Get() @Header('Cache-Control', 'no-store')
  async ready() {
    try {
      const rows = await this.db.$queryRaw<Array<{ ready: boolean }>>`
        SELECT to_regclass('"SportsCampaign"') IS NOT NULL
          AND to_regclass('"AtlasProject"') IS NOT NULL
          AND to_regclass('"SportsBallotProject"') IS NOT NULL
          AND to_regclass('"FanSelection"') IS NOT NULL
          AND to_regclass('"RewardIssuance"') IS NOT NULL AS ready`;
      if (rows[0]?.ready) return { status: 'ok' };
    } catch { /* Never expose driver errors, connection strings or schema details. */ }
    throw new ServiceUnavailableException('Sports service unavailable');
  }
}
