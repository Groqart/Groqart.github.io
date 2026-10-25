import crypto from 'node:crypto';

export interface CryptoRate {
  currency: 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'SOL';
  network: string;
  rateToUSD: number; // 1 crypto = X USD
  decimals: number;
}

export const SUPPORTED_CRYPTO: Record<string, CryptoRate> = {
  USDT: { currency: 'USDT', network: 'TRC20 / Polygon', rateToUSD: 1.0, decimals: 2 },
  BTC: { currency: 'BTC', network: 'Bitcoin', rateToUSD: 68500.0, decimals: 6 },
  ETH: { currency: 'ETH', network: 'Ethereum (ERC20)', rateToUSD: 2650.0, decimals: 5 },
  LTC: { currency: 'LTC', network: 'Litecoin', rateToUSD: 72.5, decimals: 4 },
  SOL: { currency: 'SOL', network: 'Solana', rateToUSD: 175.0, decimals: 4 },
};

/**
 * Calculates crypto amount required for a given USD price.
 */
export function calculateCryptoAmount(priceUSD: number, currency: 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'SOL'): number {
  const meta = SUPPORTED_CRYPTO[currency] || SUPPORTED_CRYPTO.USDT;
  const raw = priceUSD / meta.rateToUSD;
  const factor = Math.pow(10, meta.decimals);
  return Math.round(raw * factor) / factor;
}

/**
 * Generates an OxaPay mock/sandbox crypto deposit address for tests
 */
export function generateSandboxAddress(currency: string): string {
  switch (currency) {
    case 'BTC':
      return 'bc1q' + crypto.randomBytes(16).toString('hex');
    case 'ETH':
      return '0x' + crypto.randomBytes(20).toString('hex');
    case 'SOL':
      return crypto.randomBytes(24).toString('base64url');
    case 'LTC':
      return 'ltc1q' + crypto.randomBytes(16).toString('hex');
    case 'USDT':
    default:
      return 'T' + crypto.randomBytes(17).toString('hex').slice(0, 33);
  }
}

/**
 * Generates formatted payment URI for crypto wallets (compatible with QR codes)
 */
export function formatCryptoPaymentURI(currency: string, address: string, amount: number): string {
  switch (currency) {
    case 'BTC':
      return `bitcoin:${address}?amount=${amount}`;
    case 'ETH':
      return `ethereum:${address}?value=${amount}`;
    case 'SOL':
      return `solana:${address}?amount=${amount}`;
    case 'LTC':
      return `litecoin:${address}?amount=${amount}`;
    case 'USDT':
    default:
      return `tron:${address}?amount=${amount}&token=TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t`;
  }
}

/**
 * Generates a standard software license key formatted as XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(prefix = 'NEXUS'): string {
  const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const part3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${part1}-${part2}-${part3}`;
}

/**
 * Generates a signed, time-limited download token.
 * Token structure: base64(orderId:expiresAt:hmacSignature)
 */
export function generateSignedDownloadToken(
  orderId: string,
  secret: string,
  validityHours = 24
): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + validityHours * 3600 * 1000;
  const payload = `${orderId}:${expiresAt}`;
  const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');
  return { token, expiresAt };
}

/**
 * Validates a signed download token.
 * Returns true if valid signature and not expired; otherwise returns reason for rejection.
 */
export function verifyDownloadToken(
  token: string,
  secret: string
): { valid: boolean; orderId?: string; error?: string } {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length !== 3) {
      return { valid: false, error: 'Malformed token structure' };
    }
    const [orderId, expiresAtStr, providedHmac] = parts;
    const expiresAt = Number(expiresAtStr);

    if (isNaN(expiresAt)) {
      return { valid: false, error: 'Invalid expiration timestamp' };
    }

    if (Date.now() > expiresAt) {
      return { valid: false, error: 'Download token has expired (24h limit reached)' };
    }

    const payload = `${orderId}:${expiresAt}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const matches = crypto.timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    );

    if (!matches) {
      return { valid: false, error: 'Invalid token signature' };
    }

    return { valid: true, orderId };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Token verification failed' };
  }
}

/**
 * OxaPay Webhook HMAC verification
 * OxaPay signs webhooks using HMAC-SHA512 of the raw body using the merchant API key or secret.
 */
export function verifyOxaPayWebhookSignature(
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;
  try {
    const computed = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
    const a = Buffer.from(signatureHeader.toLowerCase());
    const b = Buffer.from(computed.toLowerCase());
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
