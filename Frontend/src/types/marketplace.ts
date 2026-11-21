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
  isTrusted?: boolean;
  createdAt: string;
}

export type WithdrawalStatus =
  | 'creating'
  | 'pending_verification'
  | 'processing'
  | 'completed'
  | 'failed';

export interface WithdrawalRecord {
  id: string;
  amountUSD: number;
  walletAddress: string;
  batchId: string | null;
  status: WithdrawalStatus;
  createdAt: string;
}

export interface VendorRecentOrder {
  id: string;
  productId: string;
  productTitle: string;
  totalUSD: number;
  sellerShareUSD: number;
  status: string;
  payCurrency?: string | null;
  buyerEmailMasked: string;
  createdAt: string;
  paidAt?: string | null;
}

export interface VendorStats {
  sellerId: string;
  displayName: string;
  walletAddress: string;
  isTrusted?: boolean;
  totalProducts: number;
  totalSalesCount: number;
  totalRevenueUSD: number;
  netEarningsUSD: number;
  availableBalanceUSD: number;
  recentOrders: VendorRecentOrder[];
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

export type ProductStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export interface ProductChangelog {
  version: string;
  date: string;
  changes: string[];
}

export interface ProductLicenseTier {
  id: string;
  name: string;
  priceUSD: number;
  description?: string;
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
  status?: ProductStatus;
  rejectionReason?: string;
  b2FileKey?: string;
  storeId?: string;
  storeSlug?: string;
  demoUrl?: string;
  repoUrl?: string;
  previewMediaUrl?: string;
  licenseTiers?: ProductLicenseTier[];
  virusScanStatus?: 'clean' | 'pending' | 'flagged';
  fileInfo: {
    fileName: string;
    fileSize: string;
    format: string;
  };
  licenseKeysAvailable?: number;
  vendorId: string;
  vendorName: string;
  vendorAvatar: string;
  isTrustedVendor?: boolean;
  rating: number;
  reviewsCount: number;
  salesCount: number;
  bannerGradient: string;
  previewImages?: string[];
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

export type StoreTemplateId = 'minimal_grid' | 'featured_hero' | 'developer_portfolio';

export type StoreSectionId = 'hero' | 'featured' | 'catalog' | 'about' | 'socials';

export type PaymentGatewayId = 'nowpayments' | 'cryptomus' | 'walletconnect';

export interface StoreSectionConfig {
  id: StoreSectionId;
  label: string;
  enabled: boolean;
}

export interface StoreThemeConfig {
  template: StoreTemplateId;
  logoUrl: string;
  faviconUrl: string;
  accentColor: string;
  defaultTheme: 'light' | 'dark';
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroMediaType: 'gradient' | 'image' | 'video';
  heroMediaUrl: string;
  featuredProductIds: string[];
  aboutMarkdown: string;
  socials: {
    github: string;
    telegram: string;
    twitter: string;
    discord: string;
    contactEmail: string;
  };
  sections: StoreSectionConfig[];
}

export interface StorePaymentConfig {
  gateway: PaymentGatewayId;
  walletAddress: string;
  apiKeyMasked: string;
  hasApiKey: boolean;
  preferredCurrency: 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TON';
}

export interface StoreRecord {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  customDomain: string | null;
  dnsVerified: boolean;
  sslStatus: 'none' | 'pending' | 'active';
  isPublicInFeed: boolean;
  themeConfig: StoreThemeConfig;
  paymentConfig: StorePaymentConfig;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewRecord {
  id: string;
  productId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface ReportRecord {
  id: string;
  productId: string;
  productTitle: string;
  reporterEmailMasked: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface AdminOverviewData {
  stats: {
    totalUsers: number;
    totalSellers: number;
    totalProducts: number;
    pendingReviewCount: number;
    finishedOrders: number;
    platformRevenueUSD: number;
    openReportsCount: number;
  };
  moderationQueue: Product[];
  sellers: Array<{
    id: string;
    email: string;
    displayName: string;
    walletAddress: string;
    balanceUSD: number;
    isTrusted: boolean;
    productCount: number;
    createdAt: string;
  }>;
  orders: Array<{
    id: string;
    productId: string;
    productTitle: string;
    buyerEmailMasked: string;
    totalUSD: number;
    status: string;
    payCurrency?: string | null;
    createdAt: string;
  }>;
  pendingWithdrawals: Array<{
    id: string;
    sellerId: string;
    sellerName: string;
    amountUSD: number;
    walletAddress: string;
    batchId: string | null;
    status: string;
    createdAt: string;
  }>;
  reports: ReportRecord[];
}

export type CryptoCurrency = 'USDT' | 'BTC' | 'ETH' | 'LTC' | 'SOL';

export type OrderStatus =
  | 'pending'
  | 'confirming'
  | 'sending'
  | 'partially_paid'
  | 'paid'
  | 'expired'
  | 'failed';

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
  hasReviewed?: boolean;
  reviewRating?: number;
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
