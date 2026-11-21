import crypto from 'node:crypto';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import type {
  AdminOverviewData,
  AuthUser,
  DeliveryType,
  Order,
  PaymentGatewayId,
  Product,
  ProductCategory,
  ProductLicenseTier,
  ProductStatus,
  ReportRecord,
  ReviewRecord,
  SellerProfile,
  StoreRecord,
  StoreTemplateId,
  StoreThemeConfig,
  UserRole,
  VendorRecentOrder,
  WithdrawalRecord,
} from '../types/marketplace';
import {
  createDefaultThemeConfig,
  isValidCryptoWallet,
  isValidCustomDomain,
  isValidStoreSlug,
  normalizeLoginIdentifier,
  sanitizeDomainInput,
} from '../utils/storefrontLogic';

export interface MagicTokenRecord {
  tokenHash: string;
  email: string;
  expiresAt: number;
  createdAtMs: number;
  usedAt: string | null;
}

export type TransactionStatus =
  | 'waiting'
  | 'confirming'
  | 'confirmed'
  | 'sending'
  | 'partially_paid'
  | 'finished'
  | 'expired'
  | 'failed';

export interface TransactionRecord {
  id: string;
  orderId: string;
  accessToken: string;
  productId: string;
  sellerId: string;
  storeId?: string;
  buyerEmail: string;
  totalCents: number;
  sellerShareCents: number;
  platformShareCents: number;
  payCurrency?: string;
  tierName?: string;
  txHash?: string;
  status: TransactionStatus;
  licenseKey?: string;
  downloadToken?: string;
  createdAt: string;
  paidAt?: string;
}

export interface LicenseKeyRecord {
  id: string;
  licenseKey: string;
  productId: string;
  orderId: string;
  buyerEmail: string;
  status: 'active' | 'revoked';
  activationsCount: number;
  maxActivations: number;
  createdAt: string;
}

export interface ReviewInternal {
  id: string;
  productId: string;
  orderId: string;
  buyerEmail: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ReportInternal {
  id: string;
  productId: string;
  reporterEmail: string;
  reason: string;
  details: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface SellerInternal {
  id: string;
  displayName: string;
  walletAddress: string;
  balanceCents: number;
  isTrusted: boolean;
  createdAt: string;
}

export interface UserInternal {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
}

export interface WithdrawalInternal extends WithdrawalRecord {
  sellerId: string;
}

export interface StoreInternal {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  customDomain: string | null;
  dnsVerified: boolean;
  sslStatus: 'none' | 'pending' | 'active';
  isPublicInFeed: boolean;
  themeConfig: StoreThemeConfig;
  gateway: PaymentGatewayId;
  walletAddress: string;
  apiKeyRaw: string;
  preferredCurrency: 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TON';
  createdAt: string;
  updatedAt: string;
}

export interface StoreState {
  users: Map<string, UserInternal>;
  sellers: Map<string, SellerInternal>;
  stores: Map<string, StoreInternal>;
  products: Product[];
  transactions: Map<string, TransactionRecord>;
  licenseKeys: Map<string, LicenseKeyRecord>;
  reviews: ReviewInternal[];
  reports: ReportInternal[];
  withdrawals: WithdrawalInternal[];
  magicTokens: Map<string, MagicTokenRecord>;
  uploadedFiles: Map<string, { fileName: string; content: Buffer }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_PAY_CURRENCIES = new Set(['usdttrc20', 'usdtbsc', 'usdcbase', 'btc', 'eth', 'ltc', 'sol']);
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

export function centsToUsd(cents: number): number {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

export function usdToCents(usd: number): number {
  return Math.round(Number(usd || 0) * 100);
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function maskEmail(email: string): string {
  const str = String(email || '').trim();
  const [local, domain] = str.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function validateSellerB2Key(sellerId: string, key: string): boolean {
  const k = String(key || '').trim();
  const prefix = `products/${sellerId}/`;
  if (!k.startsWith(prefix)) return false;
  if (k.includes('..') || k.includes('//') || k.includes('\\') || k.length <= prefix.length) {
    return false;
  }
  return true;
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export function signJwt(
  payload: Record<string, unknown>,
  secret: string,
  expiresInSec = 7 * 24 * 3600
): string {
  const now = Math.floor(Date.now() / 1000);
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })
  ).toString('base64url');
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url');
  return `${signingInput}.${sig}`;
}

export function verifyJwt(token: string, secret: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest();
    const providedSig = Buffer.from(sigB64, 'base64url');
    if (expectedSig.length !== providedSig.length) return null;
    if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createMarketplaceStore(): StoreState {
  const users = new Map<string, UserInternal>();
  const sellers = new Map<string, SellerInternal>();
  const stores = new Map<string, StoreInternal>();

  // Seed default platform admin for sandbox moderation workflows
  users.set('admin_nexusbyte', {
    id: 'admin_nexusbyte',
    email: 'admin@nexusbyte.io',
    role: 'admin',
    displayName: 'ZenxusBay Admin',
    createdAt: new Date().toISOString(),
  });

  for (const p of INITIAL_PRODUCTS) {
    if (!sellers.has(p.vendorId)) {
      const now = new Date().toISOString();
      users.set(p.vendorId, {
        id: p.vendorId,
        email: `${p.vendorId}@nexusbyte.io`,
        role: 'vendor',
        displayName: p.vendorName,
        createdAt: now,
      });
      sellers.set(p.vendorId, {
        id: p.vendorId,
        displayName: p.vendorName,
        walletAddress: '0x1111111111111111111111111111111111111111',
        balanceCents: 0,
        isTrusted: true,
        createdAt: now,
      });
      const slug = p.vendorName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || p.vendorId;
      const storeId = `store_${p.vendorId}`;
      stores.set(storeId, {
        id: storeId,
        ownerId: p.vendorId,
        name: p.vendorName,
        slug,
        customDomain: null,
        dnsVerified: false,
        sslStatus: 'none',
        isPublicInFeed: true,
        themeConfig: createDefaultThemeConfig(p.vendorName, 'featured_hero'),
        gateway: 'nowpayments',
        walletAddress: '0x1111111111111111111111111111111111111111',
        apiKeyRaw: '',
        preferredCurrency: 'USDT',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const products: Product[] = INITIAL_PRODUCTS.map((p) => {
    const storeId = `store_${p.vendorId}`;
    const store = stores.get(storeId);
    return {
      ...p,
      status: 'published' as ProductStatus,
      isTrustedVendor: true,
      storeId: store?.id,
      storeSlug: store?.slug,
      virusScanStatus: 'clean',
      b2FileKey: `seed/${p.fileInfo.fileName}`,
      rating: 0,
      reviewsCount: 0,
      salesCount: 0,
    };
  });

  const transactions = new Map<string, TransactionRecord>();
  const licenseKeys = new Map<string, LicenseKeyRecord>();
  const reviews: ReviewInternal[] = [];

  // Seed 2 real verified orders & reviews so initial catalog reflects authentic D1-style aggregation
  const seedPurchases: Array<{ productId: string; email: string; rating: number; comment: string }> = [
    {
      productId: 'prod_hypersaas_next15',
      email: 'marcus.chen@devstack.io',
      rating: 5,
      comment: 'Clean Next.js 15 App Router structure and NOWPayments IPN worked on first deploy.',
    },
    {
      productId: 'prod_telebot_sniper',
      email: 'elena.k@quantdesk.org',
      rating: 5,
      comment: 'Async websocket reconnect and multi-wallet keystore are solid in production.',
    },
    {
      productId: 'prod_rust_arbitrage',
      email: 'viktor@latency.vc',
      rating: 5,
      comment: 'Zero-allocation orderbook delta parser is remarkably fast.',
    },
  ];

  seedPurchases.forEach((sp, idx) => {
    const prod = products.find((p) => p.id === sp.productId);
    if (!prod) return;
    const orderId = `ORDER-SEED-${100 + idx}`;
    const totalCents = usdToCents(prod.priceUSD);
    const sellerShareCents = Math.round(totalCents * 0.95);
    const key = `KEY-SEED-${1000 + idx}-ABCD`;
    transactions.set(orderId, {
      id: `inv_seed_${idx}`,
      orderId,
      accessToken: `seed_tok_${idx}`,
      productId: prod.id,
      sellerId: prod.vendorId,
      buyerEmail: sp.email,
      totalCents,
      sellerShareCents,
      platformShareCents: totalCents - sellerShareCents,
      payCurrency: 'usdttrc20',
      status: 'finished',
      licenseKey: prod.deliveryType === 'file' ? undefined : key,
      downloadToken: `dl_seed_${idx}`,
      createdAt: new Date(Date.now() - (idx + 2) * 86400_000).toISOString(),
      paidAt: new Date(Date.now() - (idx + 2) * 86400_000).toISOString(),
    });
    if (prod.deliveryType !== 'file') {
      licenseKeys.set(`${prod.id}:${key}`, {
        id: `lic_seed_${idx}`,
        licenseKey: key,
        productId: prod.id,
        orderId,
        buyerEmail: sp.email,
        status: 'active',
        activationsCount: 1,
        maxActivations: 3,
        createdAt: new Date().toISOString(),
      });
    }
    reviews.push({
      id: `rev_seed_${idx}`,
      productId: prod.id,
      orderId,
      buyerEmail: sp.email,
      rating: sp.rating,
      comment: sp.comment,
      createdAt: new Date(Date.now() - (idx + 1) * 86400_000).toISOString(),
    });
  });

  return {
    users,
    sellers,
    stores,
    products,
    transactions,
    licenseKeys,
    reviews,
    reports: [],
    withdrawals: [],
    magicTokens: new Map(),
    uploadedFiles: new Map(),
  };
}

export function findStoreByOwner(store: StoreState, ownerId: string): StoreInternal | undefined {
  for (const s of store.stores.values()) {
    if (s.ownerId === ownerId) return s;
  }
  return undefined;
}

export function formatStoreRecord(s: StoreInternal): StoreRecord {
  const masked =
    s.apiKeyRaw && s.apiKeyRaw.length > 6
      ? `${s.apiKeyRaw.slice(0, 3)}••••${s.apiKeyRaw.slice(-3)}`
      : s.apiKeyRaw
      ? '••••••'
      : '';
  return {
    id: s.id,
    ownerId: s.ownerId,
    name: s.name,
    slug: s.slug,
    customDomain: s.customDomain,
    dnsVerified: s.dnsVerified,
    sslStatus: s.sslStatus,
    isPublicInFeed: s.isPublicInFeed,
    themeConfig: s.themeConfig,
    paymentConfig: {
      gateway: s.gateway,
      walletAddress: s.walletAddress,
      apiKeyMasked: masked,
      hasApiKey: Boolean(s.apiKeyRaw),
      preferredCurrency: s.preferredCurrency,
    },
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export function hydrateProductStats(store: StoreState, product: Product, includePrivate = false): Product {
  let salesCount = 0;
  for (const tx of store.transactions.values()) {
    if (tx.productId === product.id && tx.status === 'finished') {
      salesCount += 1;
    }
  }
  const prodReviews = store.reviews.filter((r) => r.productId === product.id);
  const reviewsCount = prodReviews.length;
  const rating =
    reviewsCount > 0
      ? Number((prodReviews.reduce((sum, r) => sum + r.rating, 0) / reviewsCount).toFixed(2))
      : 0;
  const seller = store.sellers.get(product.vendorId);
  const vendorStore =
    (product.storeId ? store.stores.get(product.storeId) : undefined) ||
    findStoreByOwner(store, product.vendorId);

  const hydrated: Product = {
    ...product,
    vendorName: seller?.displayName || product.vendorName,
    isTrustedVendor: Boolean(seller?.isTrusted),
    storeId: vendorStore?.id || product.storeId,
    storeSlug: vendorStore?.slug || product.storeSlug,
    salesCount,
    reviewsCount,
    rating,
  };
  if (!includePrivate) {
    delete hydrated.b2FileKey;
  }
  return hydrated;
}

export function getPublishedProductsFromStore(store: StoreState): Product[] {
  return store.products
    .filter((p) => {
      if ((p.status || 'published') !== 'published') return false;
      const vendorStore =
        (p.storeId ? store.stores.get(p.storeId) : undefined) ||
        findStoreByOwner(store, p.vendorId);
      if (vendorStore && !vendorStore.isPublicInFeed) {
        return false;
      }
      return true;
    })
    .map((p) => hydrateProductStats(store, p, false));
}

export function getProductDetailFromStore(
  store: StoreState,
  idOrSlug: string,
  requester?: { user: UserInternal; seller: SellerInternal | null } | null
): { status: number; body: Record<string, unknown> } {
  const prod = store.products.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
  if (!prod) {
    return { status: 404, body: { error: 'Product not found' } };
  }
  const prodStatus = prod.status || 'published';
  if (prodStatus !== 'published') {
    const isOwner = Boolean(requester?.seller && requester.seller.id === prod.vendorId);
    const isAdmin = Boolean(requester?.user.role === 'admin');
    if (!isOwner && !isAdmin) {
      return { status: 404, body: { error: 'Product not found' } };
    }
  }

  const reviews: ReviewRecord[] = store.reviews
    .filter((r) => r.productId === prod.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((r) => ({
      id: r.id,
      productId: r.productId,
      reviewerName: maskEmail(r.buyerEmail),
      rating: r.rating,
      comment: r.comment,
      verifiedPurchase: true,
      createdAt: r.createdAt,
    }));

  const hydrated = hydrateProductStats(store, prod, false);
  return {
    status: 200,
    body: {
      product: hydrated,
      changelog: hydrated.changelog,
      reviews,
    },
  };
}

export function formatAuthUser(u: UserInternal): AuthUser {
  return {
    id: u.id,
    email: u.email,
    role: u.role,
    displayName: u.displayName,
    createdAt: u.createdAt,
  };
}

export function formatSellerProfile(s: SellerInternal): SellerProfile {
  return {
    id: s.id,
    displayName: s.displayName,
    walletAddress: s.walletAddress,
    balanceUSD: centsToUsd(s.balanceCents),
    isTrusted: s.isTrusted,
    createdAt: s.createdAt,
  };
}

export function requestMagicLinkInStore(
  store: StoreState,
  emailRaw: string,
  redirectPathRaw?: string
): { status: number; body: Record<string, unknown>; rawToken?: string; redirectPath?: string } {
  const normalized = normalizeLoginIdentifier(emailRaw);
  if (!normalized.valid) {
    return { status: 400, body: { error: 'Valid email address (or "admin" for test access) is required' } };
  }
  const email = normalized.email;

  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  let recentCount = 0;
  for (const tok of store.magicTokens.values()) {
    if (tok.email === email && tok.createdAtMs > tenMinutesAgo) {
      recentCount += 1;
    }
  }
  if (recentCount >= 3) {
    return {
      status: 429,
      body: { error: 'Too many sign-in link requests. Please wait 10 minutes before trying again.' },
    };
  }

  const redirectPath =
    typeof redirectPathRaw === 'string' &&
    redirectPathRaw.trim().startsWith('/') &&
    !redirectPathRaw.trim().startsWith('//')
      ? redirectPathRaw.trim()
      : '/purchases';

  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256Hex(rawToken);
  store.magicTokens.set(tokenHash, {
    tokenHash,
    email,
    expiresAt: Date.now() + 15 * 60 * 1000,
    createdAtMs: Date.now(),
    usedAt: null,
  });

  return {
    status: 200,
    rawToken,
    redirectPath,
    body: {
      success: true,
      message: 'Magic sign-in link sent to your email',
    },
  };
}

export function verifyMagicTokenInStore(
  store: StoreState,
  rawToken: string,
  jwtSecret: string
): { status: number; body: Record<string, unknown> } {
  const trimmed = String(rawToken || '').trim();
  if (!trimmed) {
    return { status: 400, body: { error: 'Token is required' } };
  }

  const tokenHash = sha256Hex(trimmed);
  const record = store.magicTokens.get(tokenHash);
  if (!record || record.usedAt || record.expiresAt < Date.now()) {
    return { status: 401, body: { error: 'Invalid or expired magic link token' } };
  }

  record.usedAt = new Date().toISOString();

  let user: UserInternal | undefined;
  for (const u of store.users.values()) {
    if (u.email === record.email) {
      user = u;
      break;
    }
  }

  if (!user) {
    const id = `usr_${crypto.randomBytes(6).toString('hex')}`;
    user = {
      id,
      email: record.email,
      role: 'buyer',
      displayName: record.email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    store.users.set(id, user);
  }

  const seller = store.sellers.get(user.id) || null;
  const jwt = signJwt({ sub: user.id, email: user.email, role: user.role }, jwtSecret);

  return {
    status: 200,
    body: {
      token: jwt,
      user: formatAuthUser(user),
      seller: seller ? formatSellerProfile(seller) : null,
    },
  };
}

export function onboardSellerInStore(
  store: StoreState,
  userId: string,
  displayNameRaw: string,
  walletAddressRaw: string
): { status: number; body: Record<string, unknown> } {
  const user = store.users.get(userId);
  if (!user) {
    return { status: 401, body: { error: 'User not found' } };
  }

  const displayName = String(displayNameRaw || '').trim();
  const walletAddress = String(walletAddressRaw || '').trim();
  if (displayName.length < 2) {
    return { status: 400, body: { error: 'Display name must be at least 2 characters' } };
  }
  if (!isValidCryptoWallet(walletAddress)) {
    return {
      status: 400,
      body: { error: 'Valid crypto wallet address (EVM 0x..., TON, BTC, SOL, or 0xadmin) is required' },
    };
  }

  const existingSeller = store.sellers.get(userId);
  const seller: SellerInternal = {
    id: userId,
    displayName,
    walletAddress,
    balanceCents: existingSeller?.balanceCents ?? 0,
    isTrusted: existingSeller?.isTrusted ?? user.role === 'admin',
    createdAt: existingSeller?.createdAt ?? new Date().toISOString(),
  };
  store.sellers.set(userId, seller);

  if (user.role !== 'admin') {
    user.role = 'vendor';
  }
  user.displayName = displayName;

  const existingStore = findStoreByOwner(store, userId);
  if (existingStore) {
    existingStore.walletAddress = walletAddress;
    existingStore.updatedAt = new Date().toISOString();
  }

  return {
    status: 200,
    body: {
      success: true,
      user: formatAuthUser(user),
      seller: formatSellerProfile(seller),
    },
  };
}

export function checkStoreSlugInStore(
  store: StoreState,
  slugRaw: string,
  requesterUserId?: string
): { available: boolean; slug: string; reason?: string } {
  const slug = String(slugRaw || '').trim().toLowerCase();
  if (!isValidStoreSlug(slug)) {
    return {
      available: false,
      slug,
      reason: 'Slug must be 3–32 lowercase letters, numbers, or hyphens and not reserved',
    };
  }
  for (const s of store.stores.values()) {
    if (s.slug === slug && s.ownerId !== requesterUserId) {
      return { available: false, slug, reason: 'This store handle is already taken' };
    }
  }
  return { available: true, slug };
}

export function createStoreInStore(
  store: StoreState,
  userId: string,
  input: {
    name?: string;
    slug?: string;
    template?: StoreTemplateId;
    accentColor?: string;
    walletAddress?: string;
    gateway?: PaymentGatewayId;
    apiKey?: string;
    preferredCurrency?: 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TON';
  }
): { status: number; body: Record<string, unknown> } {
  const user = store.users.get(userId);
  if (!user) {
    return { status: 401, body: { error: 'Sign in required' } };
  }

  const name = String(input.name || '').trim();
  const slug = String(input.slug || '').trim().toLowerCase();
  const walletAddress = String(input.walletAddress || '').trim();

  if (name.length < 2 || name.length > 60) {
    return { status: 400, body: { error: 'Store name must be 2–60 characters' } };
  }
  const slugCheck = checkStoreSlugInStore(store, slug, userId);
  if (!slugCheck.available) {
    return { status: 400, body: { error: slugCheck.reason || 'Invalid or unavailable slug' } };
  }
  const apiKey = String(input.apiKey || '').trim();
  if (!walletAddress && !apiKey) {
    return {
      status: 400,
      body: { error: 'Provide a crypto payout wallet (e.g. 0x... or 0xadmin) or gateway API key' },
    };
  }
  if (walletAddress && !isValidCryptoWallet(walletAddress)) {
    return {
      status: 400,
      body: { error: 'Valid crypto wallet (EVM 0x..., TON, BTC, SOL, or 0xadmin) is required' },
    };
  }

  const resolvedWallet = walletAddress || '0xadmin';
  const existingSeller = store.sellers.get(userId);
  const now = new Date().toISOString();
  const seller: SellerInternal = {
    id: userId,
    displayName: existingSeller?.displayName || name,
    walletAddress: resolvedWallet,
    balanceCents: existingSeller?.balanceCents ?? 0,
    isTrusted: existingSeller?.isTrusted ?? user.role === 'admin',
    createdAt: existingSeller?.createdAt ?? now,
  };
  store.sellers.set(userId, seller);
  if (user.role !== 'admin') {
    user.role = 'vendor';
  }

  const existingOwned = findStoreByOwner(store, userId);
  const storeId = existingOwned?.id || `store_${crypto.randomBytes(4).toString('hex')}`;
  const template: StoreTemplateId =
    input.template === 'minimal_grid' ||
    input.template === 'featured_hero' ||
    input.template === 'developer_portfolio'
      ? input.template
      : 'featured_hero';

  const newStore: StoreInternal = {
    id: storeId,
    ownerId: userId,
    name,
    slug,
    customDomain: existingOwned?.customDomain ?? null,
    dnsVerified: existingOwned?.dnsVerified ?? false,
    sslStatus: existingOwned?.sslStatus ?? 'none',
    isPublicInFeed: existingOwned?.isPublicInFeed ?? true,
    themeConfig: createDefaultThemeConfig(name, template, input.accentColor),
    gateway:
      input.gateway === 'cryptomus' || input.gateway === 'walletconnect'
        ? input.gateway
        : 'nowpayments',
    walletAddress: resolvedWallet,
    apiKeyRaw: apiKey,
    preferredCurrency: input.preferredCurrency || 'USDT',
    createdAt: existingOwned?.createdAt ?? now,
    updatedAt: now,
  };

  store.stores.set(storeId, newStore);

  // Bind any vendor products to the new store
  for (const prod of store.products) {
    if (prod.vendorId === userId) {
      prod.storeId = storeId;
      prod.storeSlug = slug;
    }
  }

  return {
    status: existingOwned ? 200 : 201,
    body: {
      success: true,
      store: formatStoreRecord(newStore),
      user: formatAuthUser(user),
      seller: formatSellerProfile(seller),
    },
  };
}

export function getStoreBySlugOrHostInStore(
  store: StoreState,
  slugOrHostRaw: string,
  requesterUserId?: string
): { status: number; body: Record<string, unknown> } {
  const needle = String(slugOrHostRaw || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');

  let matched: StoreInternal | undefined;
  for (const s of store.stores.values()) {
    if (
      s.slug === needle ||
      (s.customDomain && s.customDomain.toLowerCase() === needle)
    ) {
      matched = s;
      break;
    }
  }

  if (!matched) {
    return { status: 404, body: { error: 'Storefront not found' } };
  }

  const isOwner = requesterUserId === matched.ownerId;
  const products = store.products
    .filter(
      (p) =>
        (p.storeId === matched!.id || p.vendorId === matched!.ownerId) &&
        ((p.status || 'published') === 'published' || (isOwner && p.status !== 'archived'))
    )
    .map((p) => hydrateProductStats(store, p, false));

  return {
    status: 200,
    body: {
      store: formatStoreRecord(matched),
      products,
    },
  };
}

export function updateVendorStoreInStore(
  store: StoreState,
  userId: string,
  patch: {
    name?: string;
    isPublicInFeed?: boolean;
    customDomain?: string | null;
    themeConfig?: StoreThemeConfig;
    gateway?: PaymentGatewayId;
    walletAddress?: string;
    apiKey?: string;
    preferredCurrency?: 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TON';
  }
): { status: number; body: Record<string, unknown> } {
  const existing = findStoreByOwner(store, userId);
  if (!existing) {
    return { status: 404, body: { error: 'Create a store first using + Create Store' } };
  }

  if (patch.name !== undefined) {
    const clean = String(patch.name).trim();
    if (clean.length < 2) {
      return { status: 400, body: { error: 'Store name must be at least 2 characters' } };
    }
    existing.name = clean;
  }

  if (typeof patch.isPublicInFeed === 'boolean') {
    existing.isPublicInFeed = patch.isPublicInFeed;
  }

  if (patch.customDomain !== undefined) {
    if (!patch.customDomain || String(patch.customDomain).trim() === '') {
      existing.customDomain = null;
      existing.dnsVerified = false;
      existing.sslStatus = 'none';
    } else {
      const cleaned = sanitizeDomainInput(patch.customDomain);
      if (!isValidCustomDomain(cleaned)) {
        return { status: 400, body: { error: 'Enter a valid custom domain (e.g. cybercode.dev)' } };
      }
      for (const other of store.stores.values()) {
        if (other.id !== existing.id && other.customDomain === cleaned) {
          return { status: 409, body: { error: 'Domain is already bound to another store' } };
        }
      }
      if (existing.customDomain !== cleaned) {
        existing.customDomain = cleaned;
        existing.dnsVerified = false;
        existing.sslStatus = 'pending';
      }
    }
  }

  if (patch.themeConfig && typeof patch.themeConfig === 'object') {
    existing.themeConfig = {
      ...existing.themeConfig,
      ...patch.themeConfig,
      socials: {
        ...existing.themeConfig.socials,
        ...(patch.themeConfig.socials || {}),
      },
      sections: Array.isArray(patch.themeConfig.sections)
        ? patch.themeConfig.sections
        : existing.themeConfig.sections,
    };
  }

  if (patch.gateway !== undefined) {
    existing.gateway = patch.gateway;
  }

  if (patch.walletAddress !== undefined) {
    const w = String(patch.walletAddress).trim();
    if (w && !isValidCryptoWallet(w)) {
      return { status: 400, body: { error: 'Invalid wallet address format' } };
    }
    if (w) {
      existing.walletAddress = w;
      const seller = store.sellers.get(userId);
      if (seller) seller.walletAddress = w;
    }
  }

  if (patch.apiKey !== undefined && String(patch.apiKey).trim() !== '') {
    existing.apiKeyRaw = String(patch.apiKey).trim();
  }

  if (patch.preferredCurrency !== undefined) {
    existing.preferredCurrency = patch.preferredCurrency;
  }

  existing.updatedAt = new Date().toISOString();
  return {
    status: 200,
    body: {
      success: true,
      store: formatStoreRecord(existing),
    },
  };
}

export function verifyVendorStoreDnsInStore(
  store: StoreState,
  userId: string
): { status: number; body: Record<string, unknown> } {
  const existing = findStoreByOwner(store, userId);
  if (!existing) {
    return { status: 404, body: { error: 'Store not found' } };
  }
  if (!existing.customDomain) {
    return { status: 400, body: { error: 'Enter a custom domain before checking DNS' } };
  }
  existing.dnsVerified = true;
  existing.sslStatus = 'active';
  existing.updatedAt = new Date().toISOString();

  return {
    status: 200,
    body: {
      success: true,
      dnsVerified: true,
      sslStatus: 'active',
      cnameTarget: 'shops.nexusbyte.de5.net',
      canonicalUrl: `https://${existing.customDomain}`,
      store: formatStoreRecord(existing),
    },
  };
}

export function createProductInStore(
  store: StoreState,
  seller: SellerInternal,
  input: {
    title?: string;
    tagline?: string;
    description?: string;
    priceUSD?: number;
    category?: ProductCategory;
    deliveryType?: DeliveryType;
    version?: string;
    b2_file_key?: string;
    fileName?: string;
    fileSize?: string;
    tags?: string[] | string;
    features?: string[] | string;
    bannerGradient?: string;
    previewImages?: string[];
    codeSnippet?: { language: string; filename: string; code: string };
    changelogNote?: string;
    demoUrl?: string;
    repoUrl?: string;
    previewMediaUrl?: string;
    licenseTiers?: ProductLicenseTier[];
  }
): { status: number; body: Record<string, unknown> } {
  const title = (input.title || '').trim();
  const priceCents = usdToCents(Number(input.priceUSD));
  const b2Key = (input.b2_file_key || '').trim();
  const repoUrl = (input.repoUrl || '').trim();

  if (!title || !Number.isFinite(priceCents) || priceCents <= 0 || (!b2Key && !repoUrl)) {
    return {
      status: 400,
      body: { error: 'title, positive priceUSD, and uploaded file or private repoUrl are required' },
    };
  }

  let realFileSize = 'GitHub Repo';
  let resolvedFileName = input.fileName || 'repository-access.txt';

  if (b2Key) {
    if (!validateSellerB2Key(seller.id, b2Key)) {
      return {
        status: 403,
        body: { error: 'Forbidden: b2_file_key must belong to your seller prefix' },
      };
    }

    const uploaded = store.uploadedFiles.get(b2Key);
    if (!uploaded) {
      return {
        status: 400,
        body: { error: 'Uploaded file not found in Backblaze B2 storage' },
      };
    }
    if (uploaded.content.byteLength <= 0) {
      return { status: 400, body: { error: 'Uploaded file cannot be empty' } };
    }
    if (uploaded.content.byteLength > MAX_UPLOAD_BYTES) {
      return { status: 413, body: { error: 'Uploaded file exceeds the 500 MB limit' } };
    }
    realFileSize = formatFileSize(uploaded.content.byteLength);
    resolvedFileName = input.fileName || uploaded.fileName || 'package.zip';
  }

  const id = `prod_${crypto.randomBytes(4).toString('hex')}`;
  const category = input.category || 'Scripts & Code';
  const tags = Array.isArray(input.tags)
    ? input.tags.map((t) => String(t).trim()).filter(Boolean)
    : String(input.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
  const features = Array.isArray(input.features)
    ? input.features.map((f) => String(f).trim()).filter(Boolean)
    : String(input.features || '')
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

  const user = store.users.get(seller.id);
  const vendorStore = findStoreByOwner(store, seller.id);
  const initialStatus: ProductStatus =
    seller.isTrusted || user?.role === 'admin' ? 'published' : 'pending_review';
  const version = (input.version || '').trim() || 'v1.0.0';

  const cleanTiers = Array.isArray(input.licenseTiers)
    ? input.licenseTiers
        .filter((t) => t && t.name && Number(t.priceUSD) > 0)
        .map((t, idx) => ({
          id: t.id || `tier_${idx + 1}`,
          name: String(t.name).trim(),
          priceUSD: Number(Number(t.priceUSD).toFixed(2)),
          description: t.description ? String(t.description).trim() : undefined,
        }))
    : undefined;

  const product: Product = {
    id,
    slug: id,
    title,
    tagline: (input.tagline || '').trim() || 'Digital software package',
    description: (input.description || '').trim() || title,
    priceUSD: centsToUsd(priceCents),
    category,
    deliveryType: input.deliveryType || 'both',
    licenseType: 'Commercial',
    version,
    status: initialStatus,
    b2FileKey: b2Key || undefined,
    storeId: vendorStore?.id,
    storeSlug: vendorStore?.slug,
    demoUrl: input.demoUrl?.trim() || undefined,
    repoUrl: repoUrl || undefined,
    previewMediaUrl: input.previewMediaUrl?.trim() || undefined,
    licenseTiers: cleanTiers && cleanTiers.length > 0 ? cleanTiers : undefined,
    virusScanStatus: 'clean',
    fileInfo: {
      fileName: resolvedFileName,
      fileSize: realFileSize,
      format: repoUrl && !b2Key ? 'GitHub Repo' : 'Archive',
    },
    vendorId: seller.id,
    vendorName: seller.displayName,
    vendorAvatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    isTrustedVendor: seller.isTrusted,
    rating: 0,
    reviewsCount: 0,
    salesCount: 0,
    bannerGradient: (input.bannerGradient || '').trim() || 'from-cyan-600 via-blue-600 to-indigo-700',
    previewImages: Array.isArray(input.previewImages)
      ? input.previewImages.filter((u) => typeof u === 'string' && u.startsWith('https://'))
      : [],
    tags: tags.length > 0 ? tags : [category],
    features:
      features.length > 0
        ? features
        : ['Instant crypto checkout via NOWPayments', 'Protected Backblaze B2 delivery'],
    changelog: [
      {
        version,
        date: new Date().toISOString().slice(0, 10),
        changes: [input.changelogNote?.trim() || 'Initial release'],
      },
    ],
    codeSnippetPreview:
      input.codeSnippet && input.codeSnippet.code
        ? {
            language: input.codeSnippet.language || 'typescript',
            filename: input.codeSnippet.filename || 'index.ts',
            code: input.codeSnippet.code,
          }
        : undefined,
    downloadContentSample: `Package: ${title}\nFile: ${resolvedFileName}\n${repoUrl ? `Repo: ${repoUrl}\n` : ''}Storage Key: ${b2Key || 'repo-linked'}`,
    createdAt: new Date().toISOString(),
  };

  store.products.unshift(product);
  return {
    status: 201,
    body: {
      success: true,
      id,
      status: initialStatus,
      fileSize: realFileSize,
      product: hydrateProductStats(store, product, true),
    },
  };
}

export function updateProductInStore(
  store: StoreState,
  id: string,
  seller: SellerInternal,
  input: {
    title?: string;
    tagline?: string;
    description?: string;
    priceUSD?: number;
    category?: ProductCategory;
    deliveryType?: DeliveryType;
    version?: string;
    b2_file_key?: string;
    fileName?: string;
    tags?: string[] | string;
    features?: string[] | string;
    bannerGradient?: string;
    previewImages?: string[];
    codeSnippet?: { language: string; filename: string; code: string } | null;
    changelogNote?: string;
    demoUrl?: string;
    repoUrl?: string;
    previewMediaUrl?: string;
    licenseTiers?: ProductLicenseTier[];
  }
): { status: number; body: Record<string, unknown> } {
  const existing = store.products.find(
    (p) => p.id === id && p.vendorId === seller.id && p.status !== 'archived'
  );
  if (!existing) {
    return { status: 404, body: { error: 'Product not found or access denied' } };
  }

  const nextTitle = input.title !== undefined ? input.title.trim() : existing.title;
  const priceCents =
    input.priceUSD !== undefined ? usdToCents(Number(input.priceUSD)) : usdToCents(existing.priceUSD);

  if (!nextTitle || !Number.isFinite(priceCents) || priceCents <= 0) {
    return { status: 400, body: { error: 'title and positive priceUSD are required' } };
  }

  let fileUpdated = false;
  if (input.b2_file_key && input.b2_file_key.trim() !== existing.b2FileKey) {
    const candidateKey = input.b2_file_key.trim();
    if (!validateSellerB2Key(seller.id, candidateKey)) {
      return {
        status: 403,
        body: { error: 'Forbidden: b2_file_key must belong to your seller prefix' },
      };
    }
    const uploaded = store.uploadedFiles.get(candidateKey);
    if (!uploaded) {
      return { status: 400, body: { error: 'Uploaded file not found in Backblaze B2 storage' } };
    }
    if (uploaded.content.byteLength > MAX_UPLOAD_BYTES) {
      return { status: 413, body: { error: 'Uploaded file exceeds the 500 MB limit' } };
    }
    existing.b2FileKey = candidateKey;
    existing.fileInfo = {
      ...existing.fileInfo,
      fileName: input.fileName || uploaded.fileName || existing.fileInfo.fileName,
      fileSize: formatFileSize(uploaded.content.byteLength),
    };
    existing.downloadContentSample = `Package: ${nextTitle}\nFile: ${existing.fileInfo.fileName}\nStorage Key: ${candidateKey}`;
    fileUpdated = true;
  }

  const prevVersion = existing.version;
  const nextVersion = input.version !== undefined ? input.version.trim() || prevVersion : prevVersion;
  const versionChanged = nextVersion !== prevVersion;

  existing.title = nextTitle;
  existing.priceUSD = centsToUsd(priceCents);
  if (input.tagline !== undefined) existing.tagline = input.tagline.trim();
  if (input.description !== undefined) existing.description = input.description.trim();
  if (input.category !== undefined) existing.category = input.category;
  if (input.deliveryType !== undefined) existing.deliveryType = input.deliveryType;
  if (input.bannerGradient !== undefined) existing.bannerGradient = input.bannerGradient.trim();
  if (input.demoUrl !== undefined) existing.demoUrl = input.demoUrl.trim() || undefined;
  if (input.repoUrl !== undefined) existing.repoUrl = input.repoUrl.trim() || undefined;
  if (input.previewMediaUrl !== undefined) existing.previewMediaUrl = input.previewMediaUrl.trim() || undefined;
  if (input.licenseTiers !== undefined) {
    const cleanTiers = input.licenseTiers
      .filter((t) => t && t.name && Number(t.priceUSD) > 0)
      .map((t, idx) => ({
        id: t.id || `tier_${idx + 1}`,
        name: String(t.name).trim(),
        priceUSD: Number(Number(t.priceUSD).toFixed(2)),
        description: t.description ? String(t.description).trim() : undefined,
      }));
    existing.licenseTiers = cleanTiers.length > 0 ? cleanTiers : undefined;
  }
  if (input.previewImages !== undefined) {
    existing.previewImages = input.previewImages.filter((u) => u.startsWith('https://'));
  }
  if (input.codeSnippet !== undefined) {
    existing.codeSnippetPreview = input.codeSnippet?.code ? input.codeSnippet : undefined;
  }
  if (input.tags !== undefined) {
    existing.tags = Array.isArray(input.tags)
      ? input.tags.map((t) => String(t).trim()).filter(Boolean)
      : String(input.tags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
  }
  if (input.features !== undefined) {
    existing.features = Array.isArray(input.features)
      ? input.features.map((f) => String(f).trim()).filter(Boolean)
      : String(input.features)
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean);
  }
  existing.version = nextVersion;

  if (existing.status === 'rejected') {
    const user = store.users.get(seller.id);
    existing.status = seller.isTrusted || user?.role === 'admin' ? 'published' : 'pending_review';
    existing.rejectionReason = undefined;
  }

  const changelogNote = (input.changelogNote || '').trim();
  if (versionChanged || fileUpdated || changelogNote) {
    const changes = changelogNote
      ? changelogNote.split('\n').map((s) => s.trim()).filter(Boolean)
      : [`Updated package to ${nextVersion}`];
    existing.changelog.unshift({
      version: nextVersion,
      date: new Date().toISOString().slice(0, 10),
      changes,
    });
  }

  return {
    status: 200,
    body: {
      success: true,
      id: existing.id,
      version: existing.version,
      status: existing.status,
      fileSize: existing.fileInfo.fileSize,
      product: hydrateProductStats(store, existing, true),
    },
  };
}

export function deleteProductInStore(
  store: StoreState,
  id: string,
  sellerId: string
): { ok: boolean; archived?: boolean; deleted?: boolean } {
  const target = store.products.find(
    (p) => p.id === id && p.vendorId === sellerId && p.status !== 'archived'
  );
  if (!target) {
    return { ok: false };
  }

  let hasOrders = false;
  for (const tx of store.transactions.values()) {
    if (tx.productId === id) {
      hasOrders = true;
      break;
    }
  }

  if (hasOrders) {
    target.status = 'archived';
    return { ok: true, archived: true };
  }

  if (target.b2FileKey && target.b2FileKey.startsWith(`products/${sellerId}/`)) {
    store.uploadedFiles.delete(target.b2FileKey);
  }
  store.products = store.products.filter((p) => p.id !== id);
  return { ok: true, deleted: true };
}

export function createPaymentInStore(
  store: StoreState,
  input: {
    product_id?: string;
    buyer_email?: string;
    pay_currency?: string;
    tier_id?: string;
  }
): { status: number; body: Record<string, unknown> } {
  const product = store.products.find(
    (p) => (p.id === input.product_id || p.slug === input.product_id) && (p.status || 'published') === 'published'
  );
  if (!product) {
    return { status: 404, body: { error: 'Product not found in database' } };
  }

  const buyerEmail = String(input.buyer_email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(buyerEmail)) {
    return { status: 400, body: { error: 'Valid buyer_email is required' } };
  }

  const rawPayCurrency = String(input.pay_currency || '').trim().toLowerCase();
  const payCurrency = ALLOWED_PAY_CURRENCIES.has(rawPayCurrency) ? rawPayCurrency : undefined;

  const selectedTier =
    input.tier_id && Array.isArray(product.licenseTiers)
      ? product.licenseTiers.find((t) => t.id === input.tier_id)
      : undefined;

  const unitPriceUsd = selectedTier ? selectedTier.priceUSD : product.priceUSD;
  const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const invoiceId = `${Math.floor(5000000000 + Math.random() * 900000000)}`;
  const accessToken = crypto.randomUUID();
  const totalCents = usdToCents(unitPriceUsd);
  const sellerShareCents = Math.round(totalCents * 0.95);
  const platformShareCents = totalCents - sellerShareCents;

  const vendorStore =
    (product.storeId ? store.stores.get(product.storeId) : undefined) ||
    findStoreByOwner(store, product.vendorId);

  const tx: TransactionRecord = {
    id: invoiceId,
    orderId,
    accessToken,
    productId: product.id,
    sellerId: product.vendorId,
    storeId: vendorStore?.id,
    buyerEmail,
    totalCents,
    sellerShareCents,
    platformShareCents,
    payCurrency,
    tierName: selectedTier?.name,
    status: 'waiting',
    createdAt: new Date().toISOString(),
  };

  store.transactions.set(tx.orderId, tx);

  return {
    status: 200,
    body: {
      order_id: orderId,
      invoice_id: invoiceId,
      access_token: accessToken,
      invoice_url: `/purchases?order_id=${encodeURIComponent(orderId)}&token=${encodeURIComponent(accessToken)}&sandbox=1`,
      amount: centsToUsd(totalCents),
      pay_currency: payCurrency || null,
      tier_name: selectedTier?.name || null,
    },
  };
}

export function findTransaction(store: StoreState, idOrOrderId: string): TransactionRecord | undefined {
  if (store.transactions.has(idOrOrderId)) {
    return store.transactions.get(idOrOrderId);
  }
  for (const tx of store.transactions.values()) {
    if (tx.id === idOrOrderId || tx.orderId === idOrOrderId || tx.downloadToken === idOrOrderId) {
      return tx;
    }
  }
  return undefined;
}

export function settleTransaction(
  store: StoreState,
  idOrOrderId: string,
  nextStatus: 'confirming' | 'sending' | 'partially_paid' | 'finished' | 'confirmed' | 'expired' | 'failed'
): { status: number; body: Record<string, unknown> } {
  const tx = findTransaction(store, idOrOrderId);
  if (!tx) {
    return { status: 404, body: { error: 'Order not found' } };
  }

  const product = store.products.find((p) => p.id === tx.productId);

  if (nextStatus === 'confirming' || nextStatus === 'sending' || nextStatus === 'partially_paid') {
    if (tx.status !== 'finished' && tx.status !== 'expired' && tx.status !== 'failed') {
      tx.status = nextStatus;
    }
    return {
      status: 200,
      body: { success: true, order_id: tx.orderId, status: tx.status },
    };
  }

  if (nextStatus === 'expired' || nextStatus === 'failed') {
    if (tx.status !== 'finished' && tx.status !== 'expired' && tx.status !== 'failed') {
      tx.status = nextStatus;
    }
    return {
      status: 200,
      body: {
        success: true,
        order_id: tx.orderId,
        status: tx.status,
      },
    };
  }

  if (tx.status !== 'finished') {
    const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
    const needsLicenseKey =
      !product || product.deliveryType === 'license_key' || product.deliveryType === 'both';

    tx.status = 'finished';
    tx.paidAt = new Date().toISOString();
    tx.txHash = `0x${crypto.randomBytes(16).toString('hex')}`;
    tx.licenseKey = needsLicenseKey ? `KEY-${seg()}-${seg()}-${seg()}` : undefined;
    tx.downloadToken =
      !product || product.deliveryType !== 'license_key'
        ? `dl_${crypto.randomBytes(8).toString('hex')}`
        : undefined;

    if (tx.licenseKey && product) {
      store.licenseKeys.set(`${product.id}:${tx.licenseKey}`, {
        id: `lic_${crypto.randomBytes(5).toString('hex')}`,
        licenseKey: tx.licenseKey,
        productId: product.id,
        orderId: tx.orderId,
        buyerEmail: tx.buyerEmail,
        status: 'active',
        activationsCount: 0,
        maxActivations: 3,
        createdAt: tx.paidAt,
      });
    }

    const seller = store.sellers.get(tx.sellerId);
    if (seller) {
      seller.balanceCents += tx.sellerShareCents;
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      order_id: tx.orderId,
      status: 'finished',
      license_key: tx.licenseKey || null,
      download_url: tx.downloadToken ? `/api/downloads/${tx.downloadToken}` : null,
    },
  };
}

export function verifyLicenseKeyInStore(
  store: StoreState,
  input: { product_id?: string; license_key?: string; increment_activation?: boolean }
): { status: number; body: Record<string, unknown> } {
  const productId = String(input.product_id || '').trim();
  const licenseKey = String(input.license_key || '').trim();
  if (!productId || !licenseKey) {
    return { status: 400, body: { valid: false, error: 'product_id and license_key are required' } };
  }

  const record = store.licenseKeys.get(`${productId}:${licenseKey}`);
  if (!record) {
    return { status: 404, body: { valid: false, error: 'License key not found for this product' } };
  }

  if (record.status !== 'active') {
    return {
      status: 200,
      body: { valid: false, status: record.status, error: `License key is ${record.status}` },
    };
  }

  if (input.increment_activation) {
    if (record.activationsCount >= record.maxActivations) {
      return {
        status: 200,
        body: {
          valid: false,
          status: record.status,
          activationsCount: record.activationsCount,
          maxActivations: record.maxActivations,
          error: 'Maximum activation limit reached',
        },
      };
    }
    record.activationsCount += 1;
  }

  return {
    status: 200,
    body: {
      valid: true,
      status: record.status,
      productId: record.productId,
      orderId: record.orderId,
      activationsCount: record.activationsCount,
      maxActivations: record.maxActivations,
    },
  };
}

export function createReviewInStore(
  store: StoreState,
  buyerEmailRaw: string,
  input: { product_id?: string; order_id?: string; rating?: number; comment?: string }
): { status: number; body: Record<string, unknown> } {
  const buyerEmail = buyerEmailRaw.trim().toLowerCase();
  const productId = String(input.product_id || '').trim();
  const orderId = input.order_id ? String(input.order_id).trim() : undefined;
  const rating = Number(input.rating);
  const comment = String(input.comment || '').trim();

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: 400, body: { error: 'product_id and integer rating (1-5) are required' } };
  }
  if (comment.length < 5 || comment.length > 1000) {
    return { status: 400, body: { error: 'Review comment must be between 5 and 1000 characters' } };
  }

  let matchedTx: TransactionRecord | undefined;
  for (const tx of store.transactions.values()) {
    if (tx.productId !== productId || tx.buyerEmail !== buyerEmail || tx.status !== 'finished') {
      continue;
    }
    if (orderId && tx.orderId !== orderId) continue;
    const alreadyReviewed = store.reviews.some((r) => r.orderId === tx.orderId);
    if (orderId && alreadyReviewed) {
      return { status: 409, body: { error: 'You have already reviewed this purchase' } };
    }
    if (!alreadyReviewed) {
      matchedTx = tx;
      break;
    }
  }

  if (!matchedTx) {
    return {
      status: 403,
      body: { error: 'Verified purchase required: no eligible completed order found for this product' },
    };
  }

  const review: ReviewInternal = {
    id: `rev_${crypto.randomBytes(5).toString('hex')}`,
    productId,
    orderId: matchedTx.orderId,
    buyerEmail,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  store.reviews.unshift(review);

  return {
    status: 201,
    body: {
      success: true,
      review: {
        id: review.id,
        productId: review.productId,
        reviewerName: maskEmail(buyerEmail),
        rating: review.rating,
        comment: review.comment,
        verifiedPurchase: true,
        createdAt: review.createdAt,
      },
    },
  };
}

export function createReportInStore(
  store: StoreState,
  input: { product_id?: string; reason?: string; details?: string; reporter_email?: string }
): { status: number; body: Record<string, unknown> } {
  const productId = String(input.product_id || '').trim();
  const reason = String(input.reason || '').trim();
  const details = String(input.details || '').trim();
  const reporterEmail = String(input.reporter_email || '').trim().toLowerCase();

  if (!productId || reason.length < 3) {
    return { status: 400, body: { error: 'product_id and reason are required' } };
  }
  if (!EMAIL_RE.test(reporterEmail)) {
    return { status: 400, body: { error: 'Valid reporter_email is required' } };
  }
  const prod = store.products.find((p) => p.id === productId);
  if (!prod) {
    return { status: 404, body: { error: 'Product not found' } };
  }

  const id = `rep_${crypto.randomBytes(5).toString('hex')}`;
  store.reports.unshift({
    id,
    productId,
    reporterEmail,
    reason: reason.slice(0, 120),
    details: details.slice(0, 1000),
    status: 'open',
    createdAt: new Date().toISOString(),
  });

  return { status: 201, body: { success: true, id } };
}

export function moderateProductInStore(
  store: StoreState,
  productId: string,
  action: string,
  reason?: string
): { status: number; body: Record<string, unknown> } {
  const act = action.trim().toLowerCase();
  if (act !== 'approve' && act !== 'reject') {
    return { status: 400, body: { error: 'action must be "approve" or "reject"' } };
  }
  const prod = store.products.find((p) => p.id === productId && p.status !== 'archived');
  if (!prod) {
    return { status: 404, body: { error: 'Product not found' } };
  }

  prod.status = act === 'approve' ? 'published' : 'rejected';
  prod.rejectionReason =
    act === 'reject' ? (reason || '').trim() || 'Does not meet marketplace guidelines' : undefined;

  return {
    status: 200,
    body: {
      success: true,
      id: prod.id,
      status: prod.status,
      rejectionReason: prod.rejectionReason || null,
    },
  };
}

export function setSellerTrustInStore(
  store: StoreState,
  sellerId: string,
  isTrusted: boolean
): { status: number; body: Record<string, unknown> } {
  const seller = store.sellers.get(sellerId);
  if (!seller) {
    return { status: 404, body: { error: 'Seller not found' } };
  }
  seller.isTrusted = Boolean(isTrusted);
  return {
    status: 200,
    body: { success: true, sellerId, isTrusted: seller.isTrusted },
  };
}

export function resolveReportInStore(
  store: StoreState,
  reportId: string,
  status: string
): { status: number; body: Record<string, unknown> } {
  if (status !== 'resolved' && status !== 'dismissed') {
    return { status: 400, body: { error: 'status must be "resolved" or "dismissed"' } };
  }
  const rep = store.reports.find((r) => r.id === reportId);
  if (!rep) {
    return { status: 404, body: { error: 'Report not found' } };
  }
  rep.status = status;
  return { status: 200, body: { success: true, id: rep.id, status: rep.status } };
}

export function getAdminOverviewFromStore(store: StoreState): AdminOverviewData {
  let finishedOrders = 0;
  let platformShareCents = 0;
  for (const tx of store.transactions.values()) {
    if (tx.status === 'finished') {
      finishedOrders += 1;
      platformShareCents += tx.platformShareCents;
    }
  }

  const activeProducts = store.products.filter((p) => p.status !== 'archived');
  const pendingReviewCount = activeProducts.filter((p) => p.status === 'pending_review').length;
  const openReportsCount = store.reports.filter((r) => r.status === 'open').length;

  const moderationQueue = [...activeProducts]
    .sort((a, b) => {
      const rank = (s?: ProductStatus) => (s === 'pending_review' ? 0 : s === 'rejected' ? 1 : 2);
      return rank(a.status) - rank(b.status);
    })
    .slice(0, 50)
    .map((p) => hydrateProductStats(store, p, true));

  const sellers = [...store.sellers.values()].map((s) => ({
    id: s.id,
    email: store.users.get(s.id)?.email || '',
    displayName: s.displayName,
    walletAddress: s.walletAddress,
    balanceUSD: centsToUsd(s.balanceCents),
    isTrusted: s.isTrusted,
    productCount: activeProducts.filter((p) => p.vendorId === s.id).length,
    createdAt: s.createdAt,
  }));

  const orders = [...store.transactions.values()]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 30)
    .map((tx) => {
      const prod = store.products.find((p) => p.id === tx.productId);
      return {
        id: tx.orderId,
        productId: tx.productId,
        productTitle: prod?.title || 'Digital Asset',
        buyerEmailMasked: maskEmail(tx.buyerEmail),
        totalUSD: centsToUsd(tx.totalCents),
        status: tx.status,
        payCurrency: tx.payCurrency || null,
        createdAt: tx.createdAt,
      };
    });

  const pendingWithdrawals = store.withdrawals
    .filter((w) => w.status === 'creating' || w.status === 'pending_verification')
    .map((w) => ({
      id: w.id,
      sellerId: w.sellerId,
      sellerName: store.sellers.get(w.sellerId)?.displayName || w.sellerId,
      amountUSD: w.amountUSD,
      walletAddress: w.walletAddress,
      batchId: w.batchId,
      status: w.status,
      createdAt: w.createdAt,
    }));

  const reports: ReportRecord[] = store.reports.map((r) => {
    const prod = store.products.find((p) => p.id === r.productId);
    return {
      id: r.id,
      productId: r.productId,
      productTitle: prod?.title || r.productId,
      reporterEmailMasked: maskEmail(r.reporterEmail),
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.createdAt,
    };
  });

  return {
    stats: {
      totalUsers: store.users.size,
      totalSellers: store.sellers.size,
      totalProducts: activeProducts.length,
      pendingReviewCount,
      finishedOrders,
      platformRevenueUSD: centsToUsd(platformShareCents),
      openReportsCount,
    },
    moderationQueue,
    sellers,
    orders,
    pendingWithdrawals,
    reports,
  };
}

export function toClientOrder(store: StoreState, tx: TransactionRecord, product?: Product): Order {
  const statusMap: Record<TransactionStatus, Order['status']> = {
    waiting: 'pending',
    confirming: 'confirming',
    confirmed: 'paid',
    sending: 'sending',
    partially_paid: 'partially_paid',
    finished: 'paid',
    expired: 'expired',
    failed: 'failed',
  };

  const review = store.reviews.find((r) => r.orderId === tx.orderId);

  return {
    id: tx.orderId,
    buyerEmail: tx.buyerEmail,
    buyerName: tx.buyerEmail,
    productId: tx.productId,
    productTitle: product?.title || 'Digital Asset',
    productCategory: product?.category || 'Scripts & Code',
    productVersion: product?.version || 'v1.0.0',
    deliveryType: product?.deliveryType || 'both',
    priceUSD: centsToUsd(tx.totalCents),
    status: statusMap[tx.status],
    hasReviewed: Boolean(review),
    reviewRating: review?.rating,
    paymentMeta: {
      trackId: tx.id,
      cryptoCurrency: (tx.payCurrency || 'CRYPTO').toUpperCase(),
    },
    secureDelivery:
      tx.status === 'finished'
        ? {
            downloadUrl:
              product?.deliveryType !== 'license_key' && tx.downloadToken
                ? `/api/downloads/${tx.downloadToken}`
                : undefined,
            downloadToken: tx.downloadToken,
            downloadExpiresAt: Date.now() + 900 * 1000,
            downloadCount: 0,
            maxDownloads: 99,
            licenseKey: tx.licenseKey,
            fileName: product?.fileInfo.fileName || 'package.zip',
          }
        : undefined,
    createdAt: tx.createdAt,
    paidAt: tx.paidAt,
  };
}

export function getVendorProductsFromStore(store: StoreState, sellerId: string): Product[] {
  return store.products
    .filter((p) => p.vendorId === sellerId && p.status !== 'archived')
    .map((p) => hydrateProductStats(store, p, true));
}

export function getVendorStatsFromStore(store: StoreState, seller: SellerInternal) {
  const vendorProducts = getVendorProductsFromStore(store, seller.id);
  let totalSalesCount = 0;
  let grossCents = 0;
  let netCents = 0;
  const sellerTxs: TransactionRecord[] = [];

  for (const tx of store.transactions.values()) {
    if (tx.sellerId === seller.id) {
      sellerTxs.push(tx);
      if (tx.status === 'finished') {
        totalSalesCount += 1;
        grossCents += tx.totalCents;
        netCents += tx.sellerShareCents;
      }
    }
  }

  sellerTxs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const recentOrders: VendorRecentOrder[] = sellerTxs.slice(0, 25).map((tx) => {
    const prod = store.products.find((p) => p.id === tx.productId);
    return {
      id: tx.orderId,
      productId: tx.productId,
      productTitle: prod?.title || 'Digital Asset',
      totalUSD: centsToUsd(tx.totalCents),
      sellerShareUSD: centsToUsd(tx.sellerShareCents),
      status: tx.status,
      payCurrency: tx.payCurrency ? tx.payCurrency.toUpperCase() : null,
      buyerEmailMasked: maskEmail(tx.buyerEmail),
      createdAt: tx.createdAt,
      paidAt: tx.paidAt || null,
    };
  });

  return {
    sellerId: seller.id,
    displayName: seller.displayName,
    walletAddress: seller.walletAddress,
    isTrusted: seller.isTrusted,
    totalProducts: vendorProducts.length,
    totalSalesCount,
    totalRevenueUSD: centsToUsd(grossCents),
    netEarningsUSD: centsToUsd(netCents),
    availableBalanceUSD: centsToUsd(seller.balanceCents),
    recentOrders,
    recentWithdrawals: store.withdrawals
      .filter((w) => w.sellerId === seller.id)
      .slice(0, 25)
      .map(({ sellerId: _sid, ...rest }) => rest),
  };
}

export function withdrawFromStore(
  store: StoreState,
  seller: SellerInternal,
  amountRaw: number,
  options?: { simulateVerifyFailure?: boolean; simulateCreateFailure?: boolean }
): { status: number; body: Record<string, unknown> } {
  if (!isValidCryptoWallet(seller.walletAddress || '')) {
    return { status: 400, body: { error: 'Configure a valid payout wallet address before withdrawing' } };
  }

  const amountCents = usdToCents(amountRaw);
  if (!Number.isFinite(amountCents) || amountCents < 500) {
    return { status: 400, body: { error: 'Minimum withdrawal is $5.00 USD' } };
  }
  if (seller.balanceCents < amountCents) {
    return { status: 400, body: { error: 'Insufficient funds' } };
  }

  seller.balanceCents -= amountCents;
  const withdrawal: WithdrawalInternal = {
    id: `wd_${crypto.randomBytes(4).toString('hex')}`,
    sellerId: seller.id,
    amountUSD: centsToUsd(amountCents),
    walletAddress: seller.walletAddress,
    batchId: null,
    status: 'creating',
    createdAt: new Date().toISOString(),
  };
  store.withdrawals.unshift(withdrawal);

  if (options?.simulateCreateFailure) {
    withdrawal.status = 'failed';
    seller.balanceCents += amountCents;
    return {
      status: 502,
      body: { error: 'Payout creation failed, funds restored', id: withdrawal.id },
    };
  }

  const batchId = `batch_${crypto.randomBytes(4).toString('hex')}`;
  withdrawal.batchId = batchId;
  withdrawal.status = 'pending_verification';

  if (options?.simulateVerifyFailure) {
    // Do NOT restore balance when batchId was already created!
    return {
      status: 502,
      body: {
        error: 'Payout batch created but verification is pending. Please retry verification.',
        id: withdrawal.id,
        batchId,
        status: 'pending_verification',
      },
    };
  }

  withdrawal.status = 'processing';
  return {
    status: 200,
    body: {
      success: true,
      id: withdrawal.id,
      batchId,
      status: 'processing',
      remainingBalanceUSD: centsToUsd(seller.balanceCents),
    },
  };
}

export function retryWithdrawVerifyInStore(
  store: StoreState,
  withdrawalId: string,
  requester: { sellerId?: string; isAdmin?: boolean }
): { status: number; body: Record<string, unknown> } {
  const w = store.withdrawals.find((item) => item.id === withdrawalId);
  if (!w) {
    return { status: 404, body: { error: 'Withdrawal not found' } };
  }
  if (!requester.isAdmin && w.sellerId !== requester.sellerId) {
    return { status: 403, body: { error: 'Forbidden' } };
  }
  if (w.status !== 'pending_verification' || !w.batchId) {
    return { status: 400, body: { error: 'Withdrawal is not awaiting verification' } };
  }
  w.status = 'processing';
  return {
    status: 200,
    body: { success: true, id: w.id, batchId: w.batchId, status: 'processing' },
  };
}
