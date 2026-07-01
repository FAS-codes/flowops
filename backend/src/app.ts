import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { UPLOAD_DIR } from './controllers/file.controller';
import { errorHandler, notFound } from './middleware/error';
import routes from './routes';

export function createApp() {
  const app = express();

  // Behind Render/other proxies so secure cookies and req.ip work correctly.
  app.set('trust proxy', 1);
  app.use(helmet());

  // CLIENT_URL may be a comma-separated allowlist (prod domain + previews).
  const allowedOrigins = env.clientUrl.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / server-to-server calls (no Origin header).
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  if (!env.isProd) app.use(morgan('dev'));

  // Serve uploaded files. CORP=cross-origin so the SPA (different domain) can
  // load/download them; long cache since stored names are content-unique.
  app.use(
    '/uploads',
    (_req, res, next) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      next();
    },
    express.static(UPLOAD_DIR, { maxAge: '7d' })
  );

  // Global rate limit; auth routes get a tighter limit below.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 1000,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  app.use(
    '/api/auth',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many authentication attempts, please try again later' },
    })
  );

  app.use('/api', routes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
