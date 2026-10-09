import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, HttpException } from '@nestjs/common';
import { jwtVerify } from 'jose';

export function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  return value;
}

@Injectable()
export class SportsAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !header.startsWith('Bearer ')) throw new UnauthorizedException();
    try {
      const { payload } = await jwtVerify(header.slice(7), Buffer.from(requiredSecret('SPORTS_ADMIN_JWT_SECRET')), {
        algorithms: ['HS256'], issuer: 'nature-backers-frontend', audience: 'sports-admin', maxTokenAge: '60s',
      });
      if (!payload.sub || typeof payload.email !== 'string' || payload.email_verified !== true) throw new UnauthorizedException();
      const allowed = (process.env.SPORTS_ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
      if (!allowed.includes(payload.email.toLowerCase())) throw new ForbiddenException();
      req.sportsAdmin = { subject: payload.sub };
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      throw new UnauthorizedException('Verified administrator authorization required');
    }
  }
}

@Injectable()
export class SportsRateLimit {
  private buckets = new Map<string, { count: number; reset: number }>();
  check(key: string, limit: number) {
    const now = Date.now();
    if (this.buckets.size > 10000) {
      for (const [k, v] of this.buckets) if (v.reset <= now) this.buckets.delete(k);
      if (this.buckets.size > 10000) throw new HttpException('Please retry shortly', 429);
    }
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.reset <= now) { bucket = { count: 0, reset: now + 60000 }; this.buckets.set(key, bucket); }
    if (++bucket.count > limit) throw new HttpException('Too many requests. Please retry in a minute.', 429);
  }
}
