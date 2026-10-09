import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { SportsService } from './sports.service';
import { SportsAtlasService } from './atlas.service';
import { SportsAdminGuard, SportsRateLimit } from './security';
import { AdminSportsController, PublicRewardsController, PublicSportsController } from './sports.controller';
@Module({ imports: [PrismaModule], controllers: [AdminSportsController, PublicRewardsController, PublicSportsController], providers: [SportsService, SportsAtlasService, SportsAdminGuard, SportsRateLimit], exports: [SportsService] })
export class SportsModule {}
