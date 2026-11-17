import type { CryptoCurrency } from '../types/marketplace';

export interface CryptoOption {
  currency: CryptoCurrency;
  nowTicker: string;
  network: string;
  label: string;
}

export const SUPPORTED_CRYPTO: Record<CryptoCurrency, CryptoOption> = {
  USDT: {
    currency: 'USDT',
    nowTicker: 'usdttrc20',
    network: 'TRON (TRC20)',
    label: 'Tether USD (TRC20)',
  },
  BTC: {
    currency: 'BTC',
    nowTicker: 'btc',
    network: 'Bitcoin',
    label: 'Bitcoin',
  },
  ETH: {
    currency: 'ETH',
    nowTicker: 'eth',
    network: 'Ethereum (ERC20)',
    label: 'Ethereum',
  },
  LTC: {
    currency: 'LTC',
    nowTicker: 'ltc',
    network: 'Litecoin',
    label: 'Litecoin',
  },
  SOL: {
    currency: 'SOL',
    nowTicker: 'sol',
    network: 'Solana',
    label: 'Solana',
  },
};

export function getPayCurrencyTicker(currency: CryptoCurrency): string {
  return (SUPPORTED_CRYPTO[currency] || SUPPORTED_CRYPTO.USDT).nowTicker;
}
