import { SportsModule } from './sports/sports.module';
import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { CampaignModule } from './campaign/campaign.module';
import { ProjectModule } from './project/project.module';
import { PgListenerService } from './pg-listener.service';
import { CampaignProjectModule } from './campaign_project/campaign_project.module';
import { CampaignDepartmentModule } from './campaign_department/campaign_department.module';
import { DepartmentModule } from './department/department.module';
import { RoleModule } from './role/role.module';
import { EmailModule } from './email/email.module';
import { CampaignStatusModule } from './campaign-status/campaign-status.module';
import { SDGModule } from './sdg/sdg.module';
import { ProjectSDGModule } from './projectsdg/projectsdg.module';
import { ExportModule } from './export/export.module';
import { RecommendProjectsModule } from './recommend-projects/recommend-projects.module';
import { HealthController } from './health/health.controller';
import { IndexerModule } from './indexer/indexer.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { VoteModule } from './vote/vote.module';
import { VolunteerModule } from './volunteer/volunteer.module';
import { PrismaModule } from '../prisma/prisma.module';


@Module({
  imports: [
    SportsModule,
    AdminModule,
    CampaignModule,
    ProjectModule,
    CampaignProjectModule,
    CampaignDepartmentModule,
    DepartmentModule,
    RoleModule,
    EmailModule,
    CampaignStatusModule,
    SDGModule,
    ProjectSDGModule,
    ExportModule,
    RecommendProjectsModule,
    IndexerModule,
    AuthModule,
    UserModule,
    VoteModule,
    VolunteerModule,
    PrismaModule,
  ],
  providers: [PgListenerService],
  controllers: [HealthController],
})
export class AppModule { }
