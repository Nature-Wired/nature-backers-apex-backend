import { Controller, Get, Post, Put, Body, Param, Query, Req, Res, UseGuards, Header } from '@nestjs/common';
import { SportsService } from './sports.service';
import { SportsAtlasService } from './atlas.service';
import { SportsAdminGuard, SportsRateLimit } from './security';
import { renderBadge } from './reward';

@Controller('public/sports-campaigns')
export class PublicSportsController {
  constructor(private sports: SportsService, private limiter: SportsRateLimit) {}
  @Get(':slug') @Header('Cache-Control', 'no-store')
  campaign(@Param('slug') slug: string, @Req() req: any) {
    this.limiter.check(`read:${req.socket.remoteAddress}`, 600);
    return this.sports.publicCampaign(slug);
  }
  @Post(':slug/selections') @Header('Cache-Control', 'no-store')
  select(@Param('slug') slug: string, @Body() body: any, @Req() req: any) {
    this.limiter.check(`write-ip:${req.socket.remoteAddress}`, 600);
    this.limiter.check(`write-browser:${String(body?.participantId).slice(0, 40)}`, 10);
    return this.sports.select(slug, body);
  }
}
@Controller('public/rewards')
export class PublicRewardsController {
  constructor(private sports: SportsService, private limiter: SportsRateLimit) {}
  @Get(':token/download')
  async download(@Param('token') token: string, @Req() req: any, @Res() res: any) {
    this.limiter.check(`badge:${req.socket.remoteAddress}`, 120);
    const reward = await this.sports.reward(token);
    res.set({ 'Content-Type': 'image/svg+xml', 'Content-Disposition': 'attachment; filename="nature-backer-badge.svg"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" }).send(renderBadge(reward));
  }
  @Get(':token') @Header('Cache-Control', 'private, no-store') @Header('Referrer-Policy', 'no-referrer')
  reward(@Param('token') token: string, @Req() req: any) {
    this.limiter.check(`badge:${req.socket.remoteAddress}`, 120);
    return this.sports.reward(token);
  }
}
@Controller('admin/sports-campaigns') @UseGuards(SportsAdminGuard)
export class AdminSportsController {
  constructor(private sports: SportsService, private atlas: SportsAtlasService) {}
  @Post() create(@Body() body: any, @Req() req: any) { return this.sports.create(body, req.sportsAdmin.subject); }
  @Put(':id/ballot') curate(@Param('id') id: string, @Body() body: any) { return this.sports.curate(id, body.sourceTimestamps); }
  @Post(':id/publish') publish(@Param('id') id: string) { return this.sports.publish(id); }
  @Get(':slug/results') @Header('Cache-Control', 'private, no-store') results(@Param('slug') slug: string) { return this.sports.results(slug); }
  @Get('atlas/search') search(@Query('query') query: string) { return this.atlas.search(query); }
}
