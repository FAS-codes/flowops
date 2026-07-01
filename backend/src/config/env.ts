import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/flowops'),
  // Public URL of this API, used to build absolute file-upload URLs and the
  // OAuth callback. Render injects RENDER_EXTERNAL_URL automatically, so prod
  // works with no manual config.
  apiUrl:
    process.env.API_URL ?? process.env.RENDER_EXTERNAL_URL ?? 'http://localhost:4000',
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    // Must exactly match an Authorized redirect URI in the Google Cloud console.
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ??
      'http://localhost:4000/api/auth/google/callback',
    get enabled() {
      return !!(this.clientId && this.clientSecret);
    },
  },
  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.MAIL_FROM ?? 'FlowOps <no-reply@flowops.app>',
    get enabled() {
      return !!(this.host && this.user && this.pass);
    },
  },
  isProd: (process.env.NODE_ENV ?? 'development') === 'production',
};

// The first allowed client origin, used for building links in emails/redirects.
export function primaryClientUrl(): string {
  return (process.env.CLIENT_URL ?? 'http://localhost:5173').split(',')[0].trim();
}
