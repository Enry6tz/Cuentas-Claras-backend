export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  clerk: {
    issuerUrl: process.env.CLERK_ISSUER_URL,
    webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  },
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
});
