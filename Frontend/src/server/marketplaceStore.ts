import crypto from 'node:crypto';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import type {
  AuthUser,
  DeliveryType,
  Order,
  Product,
  ProductCategory,
  SellerProfile,
  UserRole,
  WithdrawalRecord,
} from '../types/marketplace';

export interface MagicTokenRecord {
  tokenHash: string;
  email: string;
  expiresAt: number;
  usedAt: string | null;
}

export interface TransactionRecord {
  id: string;
  orderId: string;
  accessToken: string;
  productId: string;
  sellerId: string;
  buyerEmail: string;
  totalCents: number;
  sellerShareCents: number;
  platformShareCents: number;
  status: 'waiting' | 'finished' | 'expired' | 'failed';
  licenseKey?: string;
  downloadToken?: string;
  createdAt: string;
  paidAt?: string;
}

export interface SellerInternal {
  id: string;
  displayName: string;
  walletAddress: string;
  balanceCents: number;
  createdAt: string;
}

export interface UserInternal {
  id: string;
  email: string;
  role: UserRole;
  displayName: string;
  createdAt: string;
}

export interface StoreState {
  users: Map<string, UserInternal>;
  sellers: Map<string, SellerInternal>;
  products: Product[];
  transactions: Map<string, TransactionRecord>;
  withdrawals: WithdrawalRecord[];
  magicTokens: Map<string, MagicTokenRecord>;
  uploadedFiles: Map<string, { fileName: string; content: Buffer }>;
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function centsToUsd(cents: number): number {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

export function usdToCents(usd: number): number {
  return Math.round(Number(usd || 0) * 100);
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
        createdAt: now,
      });
    }
  }

  return {
    users,
    sellers,
    products: INITIAL_PRODUCTS.map((p) => ({ ...p })),
    transactions: new Map(),
    withdrawals: [],
    magicTokens: new Map(),
    uploadedFiles: new Map(),
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
    createdAt: s.createdAt,
  };
}

export function requestMagicLinkInStore(
  store: StoreState,
  emailRaw: string,
  redirectPathRaw?: string
): { status: number; body: Record<string, unknown>; rawToken?: string; redirectPath?: string } {
  const email = String(emailRaw || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { status: 400, body: { error: 'Valid email address is required' } };
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
  if (!EVM_ADDRESS_RE.test(walletAddress)) {
    return { status: 400, body: { error: 'Valid Base/EVM wallet address (0x...) is required' } };
  }

  const existingSeller = store.sellers.get(userId);
  const seller: SellerInternal = {
    id: userId,
    displayName,
    walletAddress,
    balanceCents: existingSeller?.balanceCents ?? 0,
    createdAt: existingSeller?.createdAt ?? new Date().toISOString(),
  };
  store.sellers.set(userId, seller);

  if (user.role !== 'admin') {
    user.role = 'vendor';
  }
  user.displayName = displayName;

  return {
    status: 200,
    body: {
      success: true,
      user: formatAuthUser(user),
      seller: formatSellerProfile(seller),
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
  }
): { status: number; body: Record<string, unknown> } {
  const title = (input.title || '').trim();
  const priceCents = usdToCents(Number(input.priceUSD));
  const b2Key = (input.b2_file_key || '').trim();

  if (!title || !Number.isFinite(priceCents) || priceCents <= 0 || !b2Key) {
    return {
      status: 400,
      body: { error: 'title, positive priceUSD, and b2_file_key are required' },
    };
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
    version: (input.version || '').trim() || 'v1.0.0',
    fileInfo: {
      fileName: input.fileName || 'package.zip',
      fileSize: input.fileSize || '1.0 MB',
      format: 'Archive',
    },
    vendorId: seller.id,
    vendorName: seller.displayName,
    vendorAvatar:
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
    rating: 5.0,
    reviewsCount: 1,
    salesCount: 0,
    bannerGradient: 'from-cyan-600 via-blue-600 to-indigo-700',
    tags: tags.length > 0 ? tags : [category],
    features:
      features.length > 0
        ? features
        : ['Instant crypto checkout via NOWPayments', 'Protected Backblaze B2 delivery'],
    changelog: [],
    downloadContentSample: `Package: ${title}\nFile: ${input.fileName || 'package.zip'}\nStorage Key: ${b2Key}`,
    createdAt: new Date().toISOString(),
  };

  store.products.unshift(product);
  return { status: 201, body: { success: true, id, product } };
}

export function deleteProductInStore(store: StoreState, id: string, sellerId: string): boolean {
  const target = store.products.find((p) => p.id === id);
  if (!target || target.vendorId !== sellerId) {
    return false;
  }
  store.products = store.products.filter((p) => p.id !== id);
  return true;
}

export function createPaymentInStore(
  store: StoreState,
  input: {
    product_id?: string;
    buyer_email?: string;
  }
): { status: number; body: Record<string, unknown> } {
  const product = store.products.find((p) => p.id === input.product_id || p.slug === input.product_id);
  if (!product) {
    return { status: 404, body: { error: 'Product not found in database' } };
  }

  const buyerEmail = String(input.buyer_email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(buyerEmail)) {
    return { status: 400, body: { error: 'Valid buyer_email is required' } };
  }

  const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const invoiceId = `${Math.floor(5000000000 + Math.random() * 900000000)}`;
  const accessToken = crypto.randomUUID();
  const totalCents = usdToCents(product.priceUSD);
  const sellerShareCents = Math.round(totalCents * 0.95);
  const platformShareCents = totalCents - sellerShareCents;

  const tx: TransactionRecord = {
    id: invoiceId,
    orderId,
    accessToken,
    productId: product.id,
    sellerId: product.vendorId,
    buyerEmail,
    totalCents,
    sellerShareCents,
    platformShareCents,
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
  nextStatus: 'finished' | 'confirmed' | 'expired'
): { status: number; body: Record<string, unknown> } {
  const tx = findTransaction(store, idOrOrderId);
  if (!tx) {
    return { status: 404, body: { error: 'Order not found' } };
  }

  const product = store.products.find((p) => p.id === tx.productId);

  if (nextStatus === 'expired') {
    if (tx.status !== 'finished') {
      tx.status = 'expired';
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
    tx.status = 'finished';
    tx.paidAt = new Date().toISOString();
    tx.licenseKey = `KEY-${seg()}-${seg()}-${seg()}`;
    tx.downloadToken = `dl_${crypto.randomBytes(8).toString('hex')}`;

    const seller = store.sellers.get(tx.sellerId);
    if (seller) {
      seller.balanceCents += tx.sellerShareCents;
    }
    if (product) {
      product.salesCount += 1;
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      order_id: tx.orderId,
      status: 'finished',
      license_key: tx.licenseKey,
      download_url: `/api/downloads/${tx.downloadToken}`,
    },
  };
}

export function toClientOrder(tx: TransactionRecord, product?: Product): Order {
  const statusMap: Record<TransactionRecord['status'], Order['status']> = {
    waiting: 'pending',
    finished: 'paid',
    expired: 'expired',
    failed: 'failed',
  };

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
    paymentMeta: {
      trackId: tx.id,
      cryptoCurrency: 'CRYPTO',
    },
    secureDelivery:
      tx.status === 'finished'
        ? {
            downloadUrl: tx.downloadToken ? `/api/downloads/${tx.downloadToken}` : undefined,
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

export function getVendorStatsFromStore(store: StoreState, seller: SellerInternal) {
  const vendorProducts = store.products.filter((p) => p.vendorId === seller.id);
  let totalSalesCount = 0;
  let grossCents = 0;
  let netCents = 0;

  for (const tx of store.transactions.values()) {
    if (tx.sellerId === seller.id && tx.status === 'finished') {
      totalSalesCount += 1;
      grossCents += tx.totalCents;
      netCents += tx.sellerShareCents;
    }
  }

  return {
    sellerId: seller.id,
    displayName: seller.displayName,
    walletAddress: seller.walletAddress,
    totalProducts: vendorProducts.length,
    totalSalesCount,
    totalRevenueUSD: centsToUsd(grossCents),
    netEarningsUSD: centsToUsd(netCents),
    availableBalanceUSD: centsToUsd(seller.balanceCents),
    recentWithdrawals: store.withdrawals.filter((w) => w.walletAddress && w.id.startsWith(`${seller.id}:`) || true).slice(0, 25),
  };
}

export function withdrawFromStore(
  store: StoreState,
  seller: SellerInternal,
  amountRaw: number
): { status: number; body: Record<string, unknown> } {
  if (!EVM_ADDRESS_RE.test(seller.walletAddress || '')) {
    return { status: 400, body: { error: 'Configure a valid USDC Base wallet address before withdrawing' } };
  }

  const amountCents = usdToCents(amountRaw);
  if (!Number.isFinite(amountCents) || amountCents < 500) {
    return { status: 400, body: { error: 'Minimum withdrawal is $5.00 USD' } };
  }
  if (seller.balanceCents < amountCents) {
    return { status: 400, body: { error: 'Insufficient funds' } };
  }

  seller.balanceCents -= amountCents;
  const batchId = `batch_${crypto.randomBytes(4).toString('hex')}`;
  const withdrawal: WithdrawalRecord = {
    id: `wd_${crypto.randomBytes(4).toString('hex')}`,
    amountUSD: centsToUsd(amountCents),
    walletAddress: seller.walletAddress,
    batchId,
    status: 'processing',
    createdAt: new Date().toISOString(),
  };
  store.withdrawals.unshift(withdrawal);

  return {
    status: 200,
    body: {
      success: true,
      batchId,
      status: 'processing',
      remainingBalanceUSD: centsToUsd(seller.balanceCents),
    },
  };
}
