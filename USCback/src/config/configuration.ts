export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3002', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    platformFeePercent: parseInt(process.env.STRIPE_PLATFORM_FEE_PERCENT || '15', 10),
  },
  resend: {
    apiKey: process.env.RESEND_API_KEY,
  },
  auth: {
    // 2FA por correo en login/registro. Se puede desactivar en desarrollo
    // (AUTH_2FA_ENABLED=false) para no depender del envío de correo; la
    // lógica de OTP queda intacta y se reactiva quitando la variable o
    // poniéndola en true. Nunca se desactiva si NODE_ENV=production.
    twoFactorEnabled:
      process.env.NODE_ENV === 'production' || process.env.AUTH_2FA_ENABLED !== 'false',
  },
});
