export type UserRole = 'buyer' | 'vendor' | 'admin';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
}

export interface SellerProfile {
  id: string;
  displayName: string;
  walletAddress: string;
  balanceUSD: number;
  createdAt: string;
}

export interface WithdrawalRecord {
  id: string;
  amountUSD: number;
  walletAddress: string;
  batchId: string | null;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
}

export interface VendorStats {
  sellerId: string;
  displayName: string;
  walletAddress: string;
  totalProducts: number;
  totalSalesCount: number;
  totalRevenueUSD: number;
  netEarningsUSD: number;
  availableBalanceUSD: number;
  recentWithdrawals: WithdrawalRecord[];
}

export type ProductCategory =
  | 'All'
  | 'Scripts & Code'
  | 'SaaS Starters'
  | 'Bots & Automation'
  | '3D & Game Assets'
  | 'UI Kits & Design'
  | 'APIs & Microservices';

export type DeliveryType = 'file' | 'license_key' | 'both';

export type LicenseType = 'Commercial' | 'Personal' | 'Extended Multi-Client';

export interface ProductChangelog {
  version: string;
  date: string;
  changes: string[];
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  tagline: string;
  description: string;
  priceUSD: number;
  category: ProductCategory;
  deliveryType: DeliveryType;
  licenseType: LicenseType;
  version: string;
  fileInfo: {
    fileName: string;
    fileSize: string;
    format: string;
  };
  licenseKeysAvailable?: number;
  vendorId: string;
  vendorName: string;
  vendorAvatar: string;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  bannerGradient: string;
  tags: string[];
  features: string[];
  changelog: ProductChangelog[];
  codeSnippetPreview?: {
    language: string;
    filename: string;
    code: string;
  };
  downloadContentSample: string;
  createdAt: string;
}

export type CryptoCurrency = 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'SOL';

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'failed';

export interface Order {
  id: string;
  buyerEmail: string;
  buyerName: string;
  productId: string;
  productTitle: string;
  productCategory: string;
  productVersion: string;
  deliveryType: DeliveryType;
  priceUSD: number;
  status: OrderStatus;
  paymentMeta?: {
    trackId: string;
    cryptoCurrency: string;
  };
  secureDelivery?: {
    downloadUrl?: string;
    downloadToken?: string;
    downloadExpiresAt?: number;
    downloadCount: number;
    maxDownloads: number;
    licenseKey?: string;
    fileName: string;
  };
  createdAt: string;
  paidAt?: string;
}
