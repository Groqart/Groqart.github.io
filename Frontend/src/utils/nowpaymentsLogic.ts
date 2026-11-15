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

export function calculateCryptoAmount(
  priceUSD: number,
  currency: 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'SOL'
): number {
  const meta = SUPPORTED_CRYPTO[currency] || SUPPORTED_CRYPTO.USDT;
  const raw = priceUSD / meta.rateToUSD;
  const factor = Math.pow(10, meta.decimals);
  return Math.round(raw * factor) / factor;
}

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
