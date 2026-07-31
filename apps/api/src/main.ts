import 'reflect-metadata';
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
    new FastifyAdapter({ logger: config.NODE_ENV !== 'production', bodyLimit: 50 * 1024 * 1024 }),
    { logger: config.LOG_LEVEL === 'debug' ? ['error', 'warn', 'log', 'debug', 'verbose'] : ['error', 'warn', 'log'] },
  );

  const { default: helmet } = await import('@fastify/helmet');
  await app.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https:', 'wss:'],
      },
    },
    hsts: config.NODE_ENV === 'production'
      ? { maxAge: 15552000, includeSubDomains: true, preload: false }
      : false,
    referrerPolicy: { policy: 'no-referrer' },
  });

  // Manual CORS — handles all requests including SSE raw writes
  const fastify = app.getHttpAdapter().getInstance();

  // Stripe webhook signature verification requires the RAW request body.
  // Replace the default JSON parser with one that keeps the raw buffer for the
  // webhook route (only there, to avoid double memory for every request) and
  // still hands parsed JSON to the rest of the app.
  const STRIPE_WEBHOOK_PATH = '/v1/billing/webhook';
  // Fastify ships a built-in application/json parser; it must be removed
  // before ours can be registered (FST_ERR_CTP_ALREADY_PRESENT otherwise).
  if (fastify.hasContentTypeParser('application/json')) {
    fastify.removeContentTypeParser('application/json');
  }
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req: any, body: Buffer, done: (err: Error | null, result?: unknown) => void) => {
      if (req.url === STRIPE_WEBHOOK_PATH || req.url?.startsWith(`${STRIPE_WEBHOOK_PATH}?`)) {
        req.rawBody = body;
      }
      try {
        done(null, body.length > 0 ? JSON.parse(body.toString('utf8')) : {});
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // Multipart uploads (voice notes, avatars). attachFieldsToBody keeps files
  // buffered on req.body so Nest controllers can read them via req.body.<field>.
  const { default: fastifyMultipart } = await import('@fastify/multipart');
  await fastify.register(fastifyMultipart, {
    attachFieldsToBody: true,
    limits: { fileSize: 30 * 1024 * 1024, files: 3 },
  });

  // Cookie support for refresh token HttpOnly cookies
  const { default: fastifyCookie } = await import('@fastify/cookie');
  await fastify.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET || config.JWT_SECRET,
    parseOptions: {},
  });

  function isAllowedOrigin(origin: string | undefined): string {
    if (!origin) return config.CORS_ORIGIN;
    // Allow localhost origins
    if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return origin;
    if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return origin;
    // Allow 172.20.10.x subnet (phone hotspot / local network)
    if (/^https?:\/\/172\.20\.10\.\d{1,3}(:\d+)?$/.test(origin)) return origin;
    return config.CORS_ORIGIN;
  }

  fastify.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    reply.header('Access-Control-Allow-Origin', isAllowedOrigin(origin));
    reply.header('Access-Control-Allow-Credentials', 'true');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (request.method === 'OPTIONS') {
      reply.status(204).send();
    }
  });

  const port = config.PORT;
  await app.listen(port, config.HOST);
  logger.log(`🚀 API running on http://${config.HOST}:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API:', err);
  process.exit(1);
});
