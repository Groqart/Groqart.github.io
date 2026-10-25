export type UserRole = 'buyer' | 'vendor' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  balanceUSD: number;
  joinedDate: string;
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
  downloadContentSample: string; // The text content packaged for the file download
  createdAt: string;
}

export type CryptoCurrency = 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'SOL';

export interface OxaInvoice {
  trackId: string;
  address: string;
  cryptoCurrency: CryptoCurrency;
  network: string;
  cryptoAmount: number;
  qrCodeData: string;
  expiresAt: number; // timestamp
  payLink?: string;
  isSandbox: boolean;
}

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
  oxaInvoice: OxaInvoice;
  secureDelivery?: {
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

export interface VendorPayout {
  id: string;
  vendorId: string;
  amountUSD: number;
  cryptoCurrency: CryptoCurrency;
  address: string;
  status: 'pending' | 'processing' | 'completed';
  createdAt: string;
}

export interface OxaPayConfig {
  merchantApiKey: string;
  sandboxMode: boolean;
  webhookSecret: string;
}
