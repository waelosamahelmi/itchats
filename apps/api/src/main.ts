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
    {
      logger: config.LOG_LEVEL === 'debug' ? ['error', 'warn', 'log', 'debug', 'verbose'] : ['error', 'warn', 'log'],
      // Nest registers the JSON body parser itself during init; rawBody:true makes
      // it keep the raw buffer on req.rawBody (needed for Stripe webhook HMAC).
      rawBody: true,
    },
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

  // Stripe webhook raw body is provided by Nest's rawBody:true option above
  // (available on req.rawBody in the webhook controller). Registering a custom
  // application/json parser here would collide with the one Nest registers
  // during init (FST_ERR_CTP_ALREADY_PRESENT), so no custom parser is used.

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
