import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { getConfig } from '@itchats/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const config = getConfig();
  const logger = new Logger('Bootstrap');

  // Sentry / OpenTelemetry initialization
  if (config.SENTRY_DSN && config.SENTRY_DSN !== 'https://...') {
    try {
      const Sentry = await import('@sentry/node');
      Sentry.init({
        dsn: config.SENTRY_DSN,
        environment: config.NODE_ENV,
        tracesSampleRate: config.NODE_ENV === 'production' ? 0.1 : 1.0,
        profilesSampleRate: 0.1,
      });
      logger.log('✅ Sentry initialized');
    } catch {
      logger.warn('⚠ Sentry SDK not installed — error tracking disabled');
    }
  }

  // Structured JSON logging
  if (config.NODE_ENV === 'production') {
    const pino = await import('pino').catch(() => null);
    if (pino) {
      logger.log('✅ Pino structured logging available');
    }
  }

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: config.NODE_ENV !== 'production' }),
    { logger: config.LOG_LEVEL === 'debug' ? ['error', 'warn', 'log', 'debug', 'verbose'] : ['error', 'warn', 'log'] },
  );

  app.enableCors({
    origin: [config.CORS_ORIGIN, config.ADMIN_ORIGIN],
    credentials: true,
  });

  const port = config.PORT;
  await app.listen(port, config.HOST);
  logger.log(`🚀 API running on http://${config.HOST}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
