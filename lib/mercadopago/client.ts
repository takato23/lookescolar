import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

if (!process.env.MP_ACCESS_TOKEN) {
  throw new Error('MP_ACCESS_TOKEN is not configured');
}

export const mercadopago = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    idempotencyKey: 'unique-key'
  }
});

export const preferenceClient = new Preference(mercadopago);
export const paymentClient = new Payment(mercadopago);

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const MP_CONFIG = {
  sandbox: process.env.NEXT_PUBLIC_MP_ENVIRONMENT === 'sandbox',
  publicKey: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '',
  webhookSecret: process.env.MP_WEBHOOK_SECRET || '',
  notificationUrl: `${baseUrl}/api/payments/webhook`,
  successUrl: `${baseUrl}/f`,
  failureUrl: `${baseUrl}/f`,
  pendingUrl: `${baseUrl}/f`
};