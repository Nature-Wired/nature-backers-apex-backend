import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SportsModule } from './sports.module';
import { requiredSecret } from './security';
async function bootstrap() {
  requiredSecret('SPORTS_PARTICIPANT_SECRET');
  requiredSecret('SPORTS_CLAIM_KEYS');
  requiredSecret('SPORTS_ADMIN_JWT_SECRET');
  // Sports-only entrypoint never loads legacy listeners, SES or Hedera automation.
  const app = await NestFactory.create(SportsModule);
  app.enableShutdownHooks();
  await app.listen(Number(process.env.SPORTS_PORT || 3100), process.env.SPORTS_HOST || '127.0.0.1');
}
bootstrap();
