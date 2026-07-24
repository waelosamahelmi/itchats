import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { getConfig } from '@itchats/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const config = getConfig();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: config.NODE_ENV !== 'production' }),
    { logger: ['error', 'warn', 'log', 'debug'] },
  );

  app.enableCors({
    origin: [config.CORS_ORIGIN, config.ADMIN_ORIGIN],
    credentials: true,
  });

  const port = config.PORT;
  await app.listen(port, config.HOST);
  Logger.log(`🚀 API running on http://${config.HOST}:${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
