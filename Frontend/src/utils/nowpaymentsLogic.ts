import crypto from 'node:crypto';

export interface CryptoRate {
  currency: 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'SOL';
  nowTicker: string;
  network: string;
  rateToUSD: number;
  decimals: number;
}

export const SUPPORTED_CRYPTO: Record<string, CryptoRate> = {
  USDT: { currency: 'USDT', nowTicker: 'usdttrc20', network: 'TRON (TRC20)', rateToUSD: 1.0, decimals: 2 },
  BTC: { currency: 'BTC', nowTicker: 'btc', network: 'Bitcoin', rateToUSD: 68500.0, decimals: 6 },
  ETH: { currency: 'ETH', nowTicker: 'eth', network: 'Ethereum (ERC20)', rateToUSD: 2650.0, decimals: 5 },
  LTC: { currency: 'LTC', nowTicker: 'ltc', network: 'Litecoin', rateToUSD: 72.5, decimals: 4 },
  SOL: { currency: 'SOL', nowTicker: 'sol', network: 'Solana', rateToUSD: 175.0, decimals: 4 },
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

function getRandomHex(bytes: number): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a mock/sandbox crypto deposit address for tests or offline fallbacks
 */
export function generateSandboxAddress(currency: string): string {
  switch (currency) {
    case 'BTC':
      return 'bc1q' + getRandomHex(16);
    case 'ETH':
      return '0x' + getRandomHex(20);
    case 'SOL':
      return getRandomHex(24);
    case 'LTC':
      return 'ltc1q' + getRandomHex(16);
    case 'USDT':
    default:
      return 'T' + getRandomHex(17).slice(0, 33);
  }
}

/**
 * Formats URI compatible with mobile crypto wallets & QR codes
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
 * Generates a software license key formatted as XXXX-XXXX-XXXX-XXXX
 */
export function generateLicenseKey(prefix = 'NEXUS'): string {
  const part1 = getRandomHex(2).toUpperCase();
  const part2 = getRandomHex(2).toUpperCase();
  const part3 = getRandomHex(2).toUpperCase();
  return `${prefix}-${part1}-${part2}-${part3}`;
}

/**
 * Generates a signed, time-limited download token.
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
 * Sorts object keys alphabetically for NOWPayments IPN verification
 */
export function sortObject(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  return Object.keys(obj)
    .sort()
    .reduce((result: Record<string, any>, key: string) => {
      result[key] = sortObject(obj[key]);
      return result;
    }, {});
}

/**
 * NOWPayments IPN HMAC-SHA512 verification.
 * Header: 'x-nowpayments-sig'
 * Payload: sorted keys of the JSON notification body signed with IPN Secret Key.
 */
export function verifyNowPaymentsIpnSignature(
  body: any,
  signatureHeader: string | undefined,
  ipnSecret: string
): boolean {
  if (!signatureHeader || !ipnSecret || !body) return false;
  try {
    const sorted = sortObject(body);
    const jsonString = JSON.stringify(sorted);
    const computed = crypto.createHmac('sha512', ipnSecret).update(jsonString).digest('hex');
    const a = Buffer.from(signatureHeader.toLowerCase());
    const b = Buffer.from(computed.toLowerCase());
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// Backward-compatible alias for OxaPay migration
export const verifyOxaPayWebhookSignature = (
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string
): boolean => {
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
};
