export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  clerk: {
    issuerUrl: process.env.CLERK_ISSUER_URL,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
    secretKey: process.env.CLERK_SECRET_KEY,
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  exchangeRate: {
    apiKey: process.env.EXCHANGE_RATE_API_KEY,
    baseUrl:
      process.env.EXCHANGE_RATE_BASE_URL ??
      'https://v6.exchangerate-api.com/v6',
    cacheTtlMs: parseInt(process.env.EXCHANGE_RATE_CACHE_TTL_MS ?? '3600000', 10),
  },
});
