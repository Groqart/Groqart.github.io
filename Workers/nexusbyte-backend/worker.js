function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net';
  const isAllowed =
    origin === allowed ||
    origin.endsWith('.pages.dev') ||
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-marketplace-token',
  };
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const EVM_ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_DELIVERY_TYPES = new Set(['file', 'license_key', 'both']);
const ALLOWED_PAY_CURRENCIES = new Set(['usdttrc20', 'usdtbsc', 'usdcbase', 'btc', 'eth', 'ltc', 'sol']);
const MAX_UPLOAD_BYTES = 500 * 1024 * 1024; // 500 MB

function centsToUsd(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function usdToCents(usd) {
  return Math.round(Number(usd || 0) * 100);
}

function formatFileSize(bytes) {
  const num = Number(bytes || 0);
  if (!Number.isFinite(num) || num <= 0) return 'Unknown';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

function maskEmail(email) {
  const str = String(email || '').trim();
  const [local, domain] = str.split('@');
  if (!local || !domain) return '***';
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

function safeParseJsonArray(raw, fallback = []) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function safeParseJsonObject(raw, fallback = null) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function sanitizeRedirectPath(input) {
  if (typeof input !== 'string') return '/purchases';
  const trimmed = input.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/purchases';
  return trimmed;
}

function validateSellerB2Key(sellerId, key) {
  const k = String(key || '').trim();
  const expectedPrefix = `products/${sellerId}/`;
  if (!k.startsWith(expectedPrefix)) return false;
  if (k.includes('..') || k.includes('//') || k.includes('\\') || k.length <= expectedPrefix.length) {
    return false;
  }
  return true;
}

async function verifyTurnstileIfConfigured(request, body, env) {
  if (!env.CF_TURNSTILE_SECRET) return { ok: true };
  const token = String(body?.cf_turnstile_token || request.headers.get('cf-turnstile-response') || '').trim();
  if (!token) {
    return { ok: false, error: 'Human verification (Turnstile) token required' };
  }
  const form = new URLSearchParams({
    secret: env.CF_TURNSTILE_SECRET,
    response: token,
  });
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) return { ok: false, error: 'Turnstile verification service error' };
  const data = await res.json();
  if (!data.success) return { ok: false, error: 'Turnstile verification failed' };
  return { ok: true };
}

export default {
  async fetch(request, env) {
    const cors = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      // Dynamic SEO Sitemap
      if ((url.pathname === '/api/sitemap.xml' || url.pathname === '/sitemap.xml') && request.method === 'GET') {
        return await handleSitemap(env, cors);
      }

      // Auth (Magic Links + Stateless JWT)
      if (url.pathname === '/api/auth/request-link' && request.method === 'POST') {
        return await handleAuthRequestLink(request, env, cors);
      }
      if (url.pathname === '/api/auth/verify' && request.method === 'POST') {
        return await handleAuthVerify(request, env, cors);
      }
      if (url.pathname === '/api/auth/me' && request.method === 'GET') {
        return await handleAuthMe(request, env, cors);
      }

      // Public Catalog & Product Detail
      if (url.pathname === '/api/products' && request.method === 'GET') {
        return await handleGetProducts(env, cors);
      }
      if (url.pathname.startsWith('/api/products/') && request.method === 'GET') {
        const id = decodeURIComponent(url.pathname.replace('/api/products/', ''));
        return await handleGetProductById(id, request, env, cors);
      }
      if (url.pathname === '/api/products' && request.method === 'POST') {
        return await handleCreateProduct(request, env, cors);
      }
      if (url.pathname.startsWith('/api/products/') && request.method === 'PATCH') {
        const id = decodeURIComponent(url.pathname.replace('/api/products/', ''));
        return await handleUpdateProduct(id, request, env, cors);
      }
      if (url.pathname.startsWith('/api/products/') && request.method === 'DELETE') {
        const id = decodeURIComponent(url.pathname.replace('/api/products/', ''));
        return await handleDeleteProduct(id, request, env, cors);
      }

      // Direct B2 Presigned PUT Upload (Seller JWT required)
      if (url.pathname === '/api/upload-url' && request.method === 'POST') {
        return await handleGetUploadUrl(request, env, cors);
      }

      // NOWPayments Checkout & IPN
      if (url.pathname === '/api/create-payment' && request.method === 'POST') {
        return await handleCreatePayment(request, env, cors);
      }
      if (url.pathname === '/api/nowpayments-ipn' && request.method === 'POST') {
        return await handleIPN(request, env);
      }

      // Order Status & Buyer Library
      if (url.pathname === '/api/order-status' && request.method === 'GET') {
        return await handleOrderStatus(request, env, cors);
      }
      if (url.pathname === '/api/orders/my' && request.method === 'GET') {
        return await handleMyOrders(request, env, cors);
      }

      // Trust Layer: Licenses Verification, Reviews, Reports
      if (url.pathname === '/api/licenses/verify' && request.method === 'POST') {
        return await handleVerifyLicense(request, env, cors);
      }
      if (url.pathname === '/api/reviews' && request.method === 'POST') {
        return await handleCreateReview(request, env, cors);
      }
      if (url.pathname === '/api/reports' && request.method === 'POST') {
        return await handleCreateReport(request, env, cors);
      }

      // Multi-Vendor Onboarding, Inventory, Stats, Withdrawals
      if (url.pathname === '/api/vendor/onboarding' && request.method === 'POST') {
        return await handleVendorOnboarding(request, env, cors);
      }
      if (url.pathname === '/api/vendor/products' && request.method === 'GET') {
        return await handleVendorProducts(request, env, cors);
      }
      if (url.pathname === '/api/vendor/stats' && request.method === 'GET') {
        return await handleVendorStats(request, env, cors);
      }
      if (url.pathname === '/api/withdraw' && request.method === 'POST') {
        return await handleWithdraw(request, env, cors);
      }
      if (url.pathname.startsWith('/api/withdraw/') && url.pathname.endsWith('/retry-verify') && request.method === 'POST') {
        const id = decodeURIComponent(url.pathname.slice('/api/withdraw/'.length, -'/retry-verify'.length));
        return await handleRetryWithdrawVerify(id, request, env, cors);
      }

      // Admin Moderation & Trust Management
      if (url.pathname === '/api/admin/overview' && request.method === 'GET') {
        return await handleAdminOverview(request, env, cors);
      }
      if (url.pathname.startsWith('/api/admin/products/') && url.pathname.endsWith('/moderate') && request.method === 'POST') {
        const id = decodeURIComponent(url.pathname.slice('/api/admin/products/'.length, -'/moderate'.length));
        return await handleAdminModerateProduct(id, request, env, cors);
      }
      if (url.pathname.startsWith('/api/admin/sellers/') && url.pathname.endsWith('/trust') && request.method === 'POST') {
        const id = decodeURIComponent(url.pathname.slice('/api/admin/sellers/'.length, -'/trust'.length));
        return await handleAdminSetSellerTrust(id, request, env, cors);
      }
      if (url.pathname.startsWith('/api/admin/reports/') && url.pathname.endsWith('/resolve') && request.method === 'POST') {
        const id = decodeURIComponent(url.pathname.slice('/api/admin/reports/'.length, -'/resolve'.length));
        return await handleAdminResolveReport(id, request, env, cors);
      }

      return jsonResponse({ error: 'Endpoint Not Found' }, 404, cors);
    } catch (globalError) {
      return jsonResponse({ error: 'Internal Server Error', details: globalError.message }, 500, cors);
    }
  },
};

// ==========================================
// DYNAMIC SITEMAP
// ==========================================
async function handleSitemap(env, cors) {
  const siteBase = (env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net').replace(/\/$/, '');
  const { results } = await env.DB.prepare(
    "SELECT id, slug, created_at FROM products WHERE status = 'published' ORDER BY created_at DESC"
  ).all();

  const staticUrls = ['/', '/purchases', '/vendor'].map(
    (path) => `  <url><loc>${escapeXml(`${siteBase}${path}`)}</loc><changefreq>daily</changefreq><priority>${path === '/' ? '1.0' : '0.6'}</priority></url>`
  );

  const productUrls = (results || []).map((p) => {
    const lastmod = p.created_at ? `<lastmod>${escapeXml(String(p.created_at).slice(0, 10))}</lastmod>` : '';
    return `  <url><loc>${escapeXml(`${siteBase}/product/${encodeURIComponent(p.id)}`)}</loc>${lastmod}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticUrls, ...productUrls].join('\n')}\n</urlset>`;
  return new Response(xml, {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/xml; charset=utf-8' },
  });
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ==========================================
// AUTHENTICATION (MAGIC LINKS + STATELESS JWT)
// ==========================================
async function handleAuthRequestLink(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const turnstile = await verifyTurnstileIfConfigured(request, body, env);
  if (!turnstile.ok) {
    return jsonResponse({ error: turnstile.error }, 400, cors);
  }

  const email = String(body.email || '').trim().toLowerCase();
  const redirectPath = sanitizeRedirectPath(body.redirectPath);

  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Valid email address is required' }, 400, cors);
  }

  // Rate limit: max 3 magic links per email within 10 minutes
  const recentCountRow = await env.DB.prepare(
    "SELECT COUNT(*) AS cnt FROM magic_tokens WHERE email = ? AND created_at > datetime('now', '-10 minutes')"
  )
    .bind(email)
    .first();

  if (Number(recentCountRow?.cnt || 0) >= 3) {
    return jsonResponse(
      { error: 'Too many sign-in link requests. Please wait 10 minutes before trying again.' },
      429,
      cors
    );
  }

  const rawBytes = new Uint8Array(32);
  crypto.getRandomValues(rawBytes);
  const rawToken = base64UrlEncode(rawBytes);
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = Date.now() + 15 * 60 * 1000;

  await env.DB.prepare(
    'INSERT INTO magic_tokens (token_hash, email, purpose, expires_at) VALUES (?, ?, ?, ?)'
  )
    .bind(tokenHash, email, 'login', expiresAt)
    .run();

  const siteBase = (env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net').replace(/\/$/, '');
  const verifyUrl = `${siteBase}/auth/verify?token=${encodeURIComponent(rawToken)}&redirect=${encodeURIComponent(redirectPath)}`;

  if (env.RESEND_API_KEY) {
    await sendResendEmail(env, {
      to: email,
      subject: 'Your NexusByte Sign-In Link',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #22d3ee; margin-top: 0;">Sign in to NexusByte</h2>
          <p>Click the secure magic link below to access your purchases vault, vendor portal, or admin console. This link expires in 15 minutes and can only be used once.</p>
          <p style="margin: 24px 0;">
            <a href="${verifyUrl}" style="display: inline-block; background: #06b6d4; color: #020617; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Sign in to NexusByte</a>
          </p>
          <p style="font-size: 12px; color: #94a3b8;">If you did not request this email, you can safely ignore it.</p>
        </div>
      `,
    });
  } else {
    console.log(`[NexusByte Magic Link] ${email} -> ${verifyUrl}`);
  }

  return jsonResponse({ success: true, message: 'Magic sign-in link sent to your email' }, 200, cors);
}

async function handleAuthVerify(request, env, cors) {
  if (!env.JWT_SECRET) {
    return jsonResponse({ error: 'Server auth configuration missing (JWT_SECRET)' }, 500, cors);
  }

  const body = await request.json().catch(() => ({}));
  const rawToken = String(body.token || '').trim();
  if (!rawToken) {
    return jsonResponse({ error: 'Token is required' }, 400, cors);
  }

  const tokenHash = await sha256Hex(rawToken);
  const record = await env.DB.prepare(
    'SELECT token_hash, email, expires_at, used_at FROM magic_tokens WHERE token_hash = ?'
  )
    .bind(tokenHash)
    .first();

  if (!record || record.used_at || Number(record.expires_at) < Date.now()) {
    return jsonResponse({ error: 'Invalid or expired magic link token' }, 401, cors);
  }

  const markUsed = await env.DB.prepare(
    'UPDATE magic_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND used_at IS NULL'
  )
    .bind(tokenHash)
    .run();

  if (!markUsed.meta || markUsed.meta.changes !== 1) {
    return jsonResponse({ error: 'Magic link token has already been used' }, 401, cors);
  }

  let user = await env.DB.prepare('SELECT id, email, role, display_name, created_at FROM users WHERE email = ?')
    .bind(record.email)
    .first();

  if (!user) {
    const newId = `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const defaultName = record.email.split('@')[0];
    await env.DB.prepare('INSERT INTO users (id, email, role, display_name) VALUES (?, ?, ?, ?)')
      .bind(newId, record.email, 'buyer', defaultName)
      .run();

    user = await env.DB.prepare('SELECT id, email, role, display_name, created_at FROM users WHERE id = ?')
      .bind(newId)
      .first();
  }

  const sellerRow = await env.DB.prepare(
    'SELECT id, display_name, wallet_address, balance_cents, is_trusted, created_at FROM sellers WHERE id = ?'
  )
    .bind(user.id)
    .first();

  const jwt = await signJwt(
    { sub: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    7 * 24 * 3600
  );

  return jsonResponse(
    {
      token: jwt,
      user: formatUser(user),
      seller: sellerRow ? formatSeller(sellerRow) : null,
    },
    200,
    cors
  );
}

async function handleAuthMe(request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }
  return jsonResponse(
    {
      user: formatUser(auth.user),
      seller: auth.seller ? formatSeller(auth.seller) : null,
    },
    200,
    cors
  );
}

async function requireAuth(request, env) {
  if (!env.JWT_SECRET) return null;
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const payload = await verifyJwt(token, env.JWT_SECRET);
  if (!payload || !payload.sub) return null;

  const user = await env.DB.prepare('SELECT id, email, role, display_name, created_at FROM users WHERE id = ?')
    .bind(String(payload.sub))
    .first();
  if (!user) return null;

  const seller = await env.DB.prepare(
    'SELECT id, display_name, wallet_address, balance_cents, is_trusted, created_at FROM sellers WHERE id = ?'
  )
    .bind(user.id)
    .first();

  return { user, seller, jwtPayload: payload };
}

async function requireSeller(request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return { error: jsonResponse({ error: 'Unauthorized: authentication required' }, 401, cors) };
  }
  if (!auth.seller) {
    return { error: jsonResponse({ error: 'Forbidden: complete vendor onboarding first' }, 403, cors) };
  }
  return { auth };
}

async function requireAdmin(request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return { error: jsonResponse({ error: 'Unauthorized: authentication required' }, 401, cors) };
  }
  if (auth.user.role !== 'admin') {
    return { error: jsonResponse({ error: 'Forbidden: admin access required' }, 403, cors) };
  }
  return { auth };
}

function formatUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.display_name || user.email.split('@')[0],
    createdAt: user.created_at,
  };
}

function formatSeller(seller) {
  return {
    id: seller.id,
    displayName: seller.display_name,
    walletAddress: seller.wallet_address,
    balanceUSD: centsToUsd(seller.balance_cents),
    isTrusted: Boolean(seller.is_trusted),
    createdAt: seller.created_at,
  };
}

// ==========================================
// PRODUCTS (D1 + REAL STATS + LIFECYCLE)
// ==========================================
function mapProductRow(p, changelogEntries = [], includePrivate = false) {
  const tags = safeParseJsonArray(p.tags_json, [p.category || 'Software']);
  const features = safeParseJsonArray(p.features_json, [
    'Instant crypto checkout via NOWPayments',
    'Protected Backblaze B2 delivery',
  ]);
  const previewImages = safeParseJsonArray(p.preview_images_json, []);
  const codeSnippetPreview = safeParseJsonObject(p.code_snippet_json, undefined);
  const reviewsCount = Number(p.reviews_count || 0);
  const avgRating = reviewsCount > 0 ? Number(Number(p.avg_rating || 0).toFixed(2)) : 0;

  const base = {
    id: p.id,
    slug: p.slug || p.id,
    title: p.title,
    tagline: p.tagline || 'Digital software package',
    description: p.description || p.title,
    priceUSD: centsToUsd(p.price_cents),
    category: p.category || 'Scripts & Code',
    deliveryType: p.delivery_type || 'both',
    licenseType: 'Commercial',
    version: p.version || 'v1.0.0',
    status: p.status || 'published',
    rejectionReason: p.rejection_reason || undefined,
    fileInfo: {
      fileName: p.file_name || 'package.zip',
      fileSize: p.file_size || 'ZIP',
      format: 'Archive',
    },
    vendorId: p.seller_id,
    vendorName: p.seller_display_name || p.seller_id,
    isTrustedVendor: Boolean(p.seller_is_trusted),
    rating: avgRating,
    reviewsCount,
    salesCount: Number(p.sales_count || 0),
    bannerGradient: p.banner_gradient || 'from-cyan-600 via-blue-600 to-indigo-700',
    previewImages,
    tags,
    features,
    changelog: changelogEntries,
    codeSnippetPreview,
    downloadContentSample: '',
    createdAt: p.created_at || new Date().toISOString(),
  };

  if (includePrivate) {
    base.b2FileKey = p.b2_file_key;
  }

  return base;
}

async function fetchChangelogsMap(env, productIds) {
  const map = new Map();
  if (!productIds || productIds.length === 0) return map;
  const { results } = await env.DB.prepare(
    'SELECT product_id, version, changes_json, created_at FROM product_changelog ORDER BY created_at DESC'
  ).all();
  const idSet = new Set(productIds);
  for (const row of results || []) {
    if (!idSet.has(row.product_id)) continue;
    if (!map.has(row.product_id)) map.set(row.product_id, []);
    map.get(row.product_id).push({
      version: row.version,
      date: String(row.created_at || '').slice(0, 10),
      changes: safeParseJsonArray(row.changes_json, []),
    });
  }
  return map;
}

async function handleGetProducts(env, cors) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.seller_id, p.title, p.slug, p.price_cents, p.file_name, p.file_size,
            p.category, p.tagline, p.description, p.version, p.delivery_type,
            p.tags_json, p.features_json, p.banner_gradient, p.preview_images_json,
            p.code_snippet_json, p.status, p.created_at,
            s.display_name AS seller_display_name, s.is_trusted AS seller_is_trusted,
            (SELECT COUNT(*) FROM transactions t WHERE t.product_id = p.id AND t.status = 'finished') AS sales_count,
            (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS reviews_count,
            (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.product_id = p.id) AS avg_rating
     FROM products p
     LEFT JOIN sellers s ON p.seller_id = s.id
     WHERE p.status = 'published'
     ORDER BY p.created_at DESC`
  ).all();

  const ids = (results || []).map((r) => r.id);
  const changelogMap = await fetchChangelogsMap(env, ids);
  const mapped = (results || []).map((p) => mapProductRow(p, changelogMap.get(p.id) || []));

  return jsonResponse({ products: mapped }, 200, cors);
}

async function handleGetProductById(idOrSlug, request, env, cors) {
  const p = await env.DB.prepare(
    `SELECT p.*, s.display_name AS seller_display_name, s.is_trusted AS seller_is_trusted,
            (SELECT COUNT(*) FROM transactions t WHERE t.product_id = p.id AND t.status = 'finished') AS sales_count,
            (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS reviews_count,
            (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.product_id = p.id) AS avg_rating
     FROM products p
     LEFT JOIN sellers s ON p.seller_id = s.id
     WHERE p.id = ? OR p.slug = ?`
  )
    .bind(idOrSlug, idOrSlug)
    .first();

  if (!p) {
    return jsonResponse({ error: 'Product not found' }, 404, cors);
  }

  if (p.status !== 'published') {
    const auth = await requireAuth(request, env);
    const isOwner = Boolean(auth?.seller && auth.seller.id === p.seller_id);
    const isAdmin = Boolean(auth?.user?.role === 'admin');
    if (!isOwner && !isAdmin) {
      return jsonResponse({ error: 'Product not found' }, 404, cors);
    }
  }

  const changelogRes = await env.DB.prepare(
    'SELECT version, changes_json, created_at FROM product_changelog WHERE product_id = ? ORDER BY created_at DESC'
  )
    .bind(p.id)
    .all();

  const changelog = (changelogRes.results || []).map((row) => ({
    version: row.version,
    date: String(row.created_at || '').slice(0, 10),
    changes: safeParseJsonArray(row.changes_json, []),
  }));

  const reviewsRes = await env.DB.prepare(
    'SELECT id, product_id, order_id, buyer_email, rating, comment, created_at FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 50'
  )
    .bind(p.id)
    .all();

  const reviews = (reviewsRes.results || []).map((r) => ({
    id: r.id,
    productId: r.product_id,
    reviewerName: maskEmail(r.buyer_email),
    rating: Number(r.rating),
    comment: r.comment,
    verifiedPurchase: true,
    createdAt: r.created_at,
  }));

  return jsonResponse(
    {
      product: mapProductRow(p, changelog),
      changelog,
      reviews,
    },
    200,
    cors
  );
}

async function handleCreateProduct(request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const title = String(body.title || '').trim();
  const priceCents = usdToCents(body.priceUSD);
  const b2FileKey = String(body.b2_file_key || '').trim();

  if (!title || !Number.isFinite(priceCents) || priceCents <= 0 || !b2FileKey) {
    return jsonResponse({ error: 'title, positive priceUSD, and b2_file_key are required' }, 400, cors);
  }

  if (!validateSellerB2Key(auth.seller.id, b2FileKey)) {
    return jsonResponse(
      { error: 'Forbidden: b2_file_key must belong to your seller prefix' },
      403,
      cors
    );
  }

  const b2Check = await verifyB2ObjectAndSize(b2FileKey, env);
  if (!b2Check.ok) {
    return jsonResponse({ error: b2Check.error }, b2Check.status || 400, cors);
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map((t) => String(t).trim()).filter(Boolean)
    : String(body.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

  const features = Array.isArray(body.features)
    ? body.features.map((f) => String(f).trim()).filter(Boolean)
    : String(body.features || '')
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

  const previewImages = Array.isArray(body.previewImages)
    ? body.previewImages.map((u) => String(u).trim()).filter((u) => u.startsWith('https://'))
    : [];

  const codeSnippet =
    body.codeSnippet && typeof body.codeSnippet === 'object' && body.codeSnippet.code
      ? JSON.stringify({
          language: String(body.codeSnippet.language || 'typescript'),
          filename: String(body.codeSnippet.filename || 'index.ts'),
          code: String(body.codeSnippet.code),
        })
      : null;

  const productId = `prod_${crypto.randomUUID().slice(0, 8)}`;
  const category = String(body.category || 'Scripts & Code');
  const deliveryType = ALLOWED_DELIVERY_TYPES.has(body.deliveryType) ? body.deliveryType : 'both';
  const version = String(body.version || 'v1.0.0').trim() || 'v1.0.0';
  const bannerGradient = String(body.bannerGradient || 'from-cyan-600 via-blue-600 to-indigo-700').trim();
  const finalTags = tags.length > 0 ? tags : [category];
  const finalFeatures =
    features.length > 0
      ? features
      : ['Instant crypto checkout via NOWPayments', 'Protected Backblaze B2 delivery'];

  const initialStatus =
    auth.seller.is_trusted === 1 || auth.user.role === 'admin' ? 'published' : 'pending_review';
  const realFileSize = b2Check.formattedSize || String(body.fileSize || 'Unknown');

  await env.DB.prepare(
    `INSERT INTO products (
      id, seller_id, title, slug, price_cents, b2_file_key, file_name, file_size,
      category, tagline, description, version, delivery_type, tags_json, features_json,
      banner_gradient, preview_images_json, code_snippet_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      productId,
      auth.seller.id,
      title,
      productId,
      priceCents,
      b2FileKey,
      String(body.fileName || 'package.zip'),
      realFileSize,
      category,
      String(body.tagline || ''),
      String(body.description || ''),
      version,
      deliveryType,
      JSON.stringify(finalTags),
      JSON.stringify(finalFeatures),
      bannerGradient,
      JSON.stringify(previewImages),
      codeSnippet,
      initialStatus
    )
    .run();

  const initialNotes = Array.isArray(body.changelogNotes)
    ? body.changelogNotes.map((c) => String(c).trim()).filter(Boolean)
    : [String(body.changelogNote || 'Initial release').trim() || 'Initial release'];

  await env.DB.prepare(
    'INSERT INTO product_changelog (id, product_id, version, changes_json) VALUES (?, ?, ?, ?)'
  )
    .bind(`chg_${crypto.randomUUID().slice(0, 10)}`, productId, version, JSON.stringify(initialNotes))
    .run();

  return jsonResponse({ success: true, id: productId, status: initialStatus, fileSize: realFileSize }, 201, cors);
}

async function handleUpdateProduct(id, request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const existing = await env.DB.prepare(
    "SELECT * FROM products WHERE id = ? AND seller_id = ? AND status != 'archived'"
  )
    .bind(String(id), auth.seller.id)
    .first();

  if (!existing) {
    return jsonResponse({ error: 'Product not found or access denied' }, 404, cors);
  }

  const body = await request.json().catch(() => ({}));
  const title = body.title !== undefined ? String(body.title).trim() : existing.title;
  const priceCents = body.priceUSD !== undefined ? usdToCents(body.priceUSD) : existing.price_cents;

  if (!title || !Number.isFinite(priceCents) || priceCents <= 0) {
    return jsonResponse({ error: 'title and positive priceUSD are required' }, 400, cors);
  }

  let nextB2Key = existing.b2_file_key;
  let nextFileName = existing.file_name;
  let nextFileSize = existing.file_size;
  let fileUpdated = false;

  if (body.b2_file_key && String(body.b2_file_key).trim() !== existing.b2_file_key) {
    const candidateKey = String(body.b2_file_key).trim();
    if (!validateSellerB2Key(auth.seller.id, candidateKey)) {
      return jsonResponse({ error: 'Forbidden: b2_file_key must belong to your seller prefix' }, 403, cors);
    }
    const b2Check = await verifyB2ObjectAndSize(candidateKey, env);
    if (!b2Check.ok) {
      return jsonResponse({ error: b2Check.error }, b2Check.status || 400, cors);
    }
    nextB2Key = candidateKey;
    nextFileName = String(body.fileName || existing.file_name);
    nextFileSize = b2Check.formattedSize || String(body.fileSize || existing.file_size);
    fileUpdated = true;
  }

  const nextVersion = body.version !== undefined ? String(body.version).trim() || existing.version : existing.version;
  const versionChanged = nextVersion !== existing.version;
  const deliveryType =
    body.deliveryType && ALLOWED_DELIVERY_TYPES.has(body.deliveryType)
      ? body.deliveryType
      : existing.delivery_type;

  const tagsJson =
    body.tags !== undefined
      ? JSON.stringify(
          Array.isArray(body.tags)
            ? body.tags.map((t) => String(t).trim()).filter(Boolean)
            : String(body.tags)
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean)
        )
      : existing.tags_json;

  const featuresJson =
    body.features !== undefined
      ? JSON.stringify(
          Array.isArray(body.features)
            ? body.features.map((f) => String(f).trim()).filter(Boolean)
            : String(body.features)
                .split('\n')
                .map((f) => f.trim())
                .filter(Boolean)
        )
      : existing.features_json;

  const previewImagesJson =
    body.previewImages !== undefined
      ? JSON.stringify(
          Array.isArray(body.previewImages)
            ? body.previewImages.map((u) => String(u).trim()).filter((u) => u.startsWith('https://'))
            : []
        )
      : existing.preview_images_json;

  const codeSnippetJson =
    body.codeSnippet !== undefined
      ? body.codeSnippet && body.codeSnippet.code
        ? JSON.stringify({
            language: String(body.codeSnippet.language || 'typescript'),
            filename: String(body.codeSnippet.filename || 'index.ts'),
            code: String(body.codeSnippet.code),
          })
        : null
      : existing.code_snippet_json;

  // If previously rejected and updated, resubmit for review (or publish if trusted)
  let nextStatus = existing.status;
  let nextRejectionReason = existing.rejection_reason;
  if (existing.status === 'rejected') {
    nextStatus = auth.seller.is_trusted === 1 || auth.user.role === 'admin' ? 'published' : 'pending_review';
    nextRejectionReason = null;
  }

  await env.DB.prepare(
    `UPDATE products SET
       title = ?, tagline = ?, description = ?, price_cents = ?, category = ?,
       delivery_type = ?, version = ?, b2_file_key = ?, file_name = ?, file_size = ?,
       tags_json = ?, features_json = ?, banner_gradient = ?, preview_images_json = ?,
       code_snippet_json = ?, status = ?, rejection_reason = ?
     WHERE id = ? AND seller_id = ?`
  )
    .bind(
      title,
      body.tagline !== undefined ? String(body.tagline) : existing.tagline,
      body.description !== undefined ? String(body.description) : existing.description,
      priceCents,
      body.category !== undefined ? String(body.category) : existing.category,
      deliveryType,
      nextVersion,
      nextB2Key,
      nextFileName,
      nextFileSize,
      tagsJson,
      featuresJson,
      body.bannerGradient !== undefined ? String(body.bannerGradient) : existing.banner_gradient,
      previewImagesJson,
      codeSnippetJson,
      nextStatus,
      nextRejectionReason,
      existing.id,
      auth.seller.id
    )
    .run();

  const changelogNote = String(body.changelogNote || '').trim();
  if (versionChanged || fileUpdated || changelogNote) {
    const notes = changelogNote
      ? changelogNote.split('\n').map((s) => s.trim()).filter(Boolean)
      : [`Updated package to ${nextVersion}`];
    await env.DB.prepare(
      'INSERT INTO product_changelog (id, product_id, version, changes_json) VALUES (?, ?, ?, ?)'
    )
      .bind(`chg_${crypto.randomUUID().slice(0, 10)}`, existing.id, nextVersion, JSON.stringify(notes))
      .run();
  }

  if ((versionChanged || fileUpdated) && body.notifyBuyers !== false) {
    try {
      await notifyBuyersOfUpdate(env, existing.id, title, nextVersion, changelogNote);
    } catch (emailErr) {
      console.error('Update notification error (non-fatal):', emailErr);
    }
  }

  return jsonResponse(
    { success: true, id: existing.id, version: nextVersion, status: nextStatus, fileSize: nextFileSize },
    200,
    cors
  );
}

async function notifyBuyersOfUpdate(env, productId, title, version, changelogNote) {
  if (!env.RESEND_API_KEY) return;
  const { results } = await env.DB.prepare(
    "SELECT DISTINCT buyer_email FROM transactions WHERE product_id = ? AND status = 'finished'"
  )
    .bind(productId)
    .all();

  const siteBase = (env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net').replace(/\/$/, '');
  for (const row of results || []) {
    await sendResendEmail(env, {
      to: row.buyer_email,
      subject: `Update Available: ${title} (${version})`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
          <h2 style="color: #22d3ee; margin-top: 0;">New Release: ${escapeHtml(title)} ${escapeHtml(version)}</h2>
          <p>The creator has published an update for a digital product in your NexusByte Library.</p>
          ${changelogNote ? `<p style="background: #1e293b; padding: 12px; border-radius: 8px; font-size: 13px;">${escapeHtml(changelogNote)}</p>` : ''}
          <p style="margin: 24px 0;">
            <a href="${siteBase}/purchases" style="display: inline-block; background: #06b6d4; color: #020617; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Download Update in My Library</a>
          </p>
        </div>
      `,
    });
  }
}

async function handleDeleteProduct(id, request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const existing = await env.DB.prepare(
    "SELECT id, b2_file_key, status FROM products WHERE id = ? AND seller_id = ? AND status != 'archived'"
  )
    .bind(String(id), auth.seller.id)
    .first();

  if (!existing) {
    return jsonResponse({ error: 'Product not found or access denied' }, 404, cors);
  }

  const txCountRow = await env.DB.prepare(
    'SELECT COUNT(*) AS cnt FROM transactions WHERE product_id = ?'
  )
    .bind(existing.id)
    .first();

  if (Number(txCountRow?.cnt || 0) > 0) {
    await env.DB.prepare("UPDATE products SET status = 'archived' WHERE id = ? AND seller_id = ?")
      .bind(existing.id, auth.seller.id)
      .run();
    return jsonResponse({ success: true, archived: true }, 200, cors);
  }

  await env.DB.prepare('DELETE FROM products WHERE id = ? AND seller_id = ?')
    .bind(existing.id, auth.seller.id)
    .run();

  if (existing.b2_file_key && String(existing.b2_file_key).startsWith(`products/${auth.seller.id}/`)) {
    try {
      await deleteB2Object(existing.b2_file_key, env);
    } catch (b2Err) {
      console.error('B2 delete cleanup error (non-fatal):', b2Err);
    }
  }

  return jsonResponse({ success: true, deleted: true }, 200, cors);
}

// ==========================================
// DIRECT BACKBLAZE B2 UPLOAD & OBJECT CHECKS
// ==========================================
async function handleGetUploadUrl(request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const fileName = String(body.fileName || '').trim();
  if (!fileName) {
    return jsonResponse({ error: 'fileName is required' }, 400, cors);
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey = `products/${auth.seller.id}/${Date.now()}_${crypto.randomUUID().slice(0, 6)}_${safeName}`;

  const uploadUrl = await createB2PresignedUrl({
    method: 'PUT',
    key: fileKey,
    expiresIn: 900,
    env,
  });

  return jsonResponse({ uploadUrl, fileKey }, 200, cors);
}

async function verifyB2ObjectAndSize(key, env) {
  if (!env.B2_KEY_ID || !env.B2_APP_KEY || !env.B2_BUCKET_NAME || !env.B2_ENDPOINT || !env.B2_REGION) {
    return { ok: true, sizeBytes: 0, formattedSize: null };
  }
  const headUrl = await createB2PresignedUrl({
    method: 'HEAD',
    key,
    expiresIn: 120,
    env,
  });
  const res = await fetch(headUrl, { method: 'HEAD' });
  if (!res.ok) {
    return { ok: false, status: 400, error: 'Uploaded file not found in Backblaze B2 storage' };
  }
  const contentLength = Number(res.headers.get('content-length') || 0);
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return { ok: false, status: 400, error: 'Uploaded file cannot be empty' };
  }
  if (contentLength > MAX_UPLOAD_BYTES) {
    return { ok: false, status: 413, error: 'Uploaded file exceeds the 500 MB limit' };
  }
  return { ok: true, sizeBytes: contentLength, formattedSize: formatFileSize(contentLength) };
}

async function deleteB2Object(key, env) {
  if (!env.B2_KEY_ID || !env.B2_APP_KEY || !env.B2_BUCKET_NAME || !env.B2_ENDPOINT || !env.B2_REGION) {
    return;
  }
  const deleteUrl = await createB2PresignedUrl({
    method: 'DELETE',
    key,
    expiresIn: 120,
    env,
  });
  await fetch(deleteUrl, { method: 'DELETE' });
}

// ==========================================
// NOWPAYMENTS CHECKOUT
// ==========================================
async function handleCreatePayment(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const turnstile = await verifyTurnstileIfConfigured(request, body, env);
  if (!turnstile.ok) {
    return jsonResponse({ error: turnstile.error }, 400, cors);
  }

  const productId = String(body.product_id || '').trim();
  const buyerEmail = String(body.buyer_email || '').trim().toLowerCase();
  const rawPayCurrency = String(body.pay_currency || '').trim().toLowerCase();
  const payCurrency = ALLOWED_PAY_CURRENCIES.has(rawPayCurrency) ? rawPayCurrency : null;

  if (!productId) {
    return jsonResponse({ error: 'product_id is required' }, 400, cors);
  }
  if (!EMAIL_RE.test(buyerEmail)) {
    return jsonResponse({ error: 'Valid buyer_email is required' }, 400, cors);
  }

  const product = await env.DB.prepare(
    "SELECT id, seller_id, title, price_cents FROM products WHERE id = ? AND status = 'published'"
  )
    .bind(productId)
    .first();

  if (!product) {
    return jsonResponse({ error: 'Product not found in database' }, 404, cors);
  }

  const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const accessToken = crypto.randomUUID();
  const totalCents = Number(product.price_cents);
  const sellerShareCents = Math.round(totalCents * 0.95);
  const platformShareCents = totalCents - sellerShareCents;
  const totalAmount = centsToUsd(totalCents);
  const siteBase = (env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net').replace(/\/$/, '');

  let estimatedAmount = null;
  if (payCurrency && env.NOWPAYMENTS_API_KEY) {
    try {
      const estRes = await fetch(
        `https://api.nowpayments.io/v1/estimate?amount=${totalAmount}&currency_from=usd&currency_to=${encodeURIComponent(payCurrency)}`,
        { headers: { 'x-api-key': env.NOWPAYMENTS_API_KEY } }
      );
      if (estRes.ok) {
        const estData = await estRes.json();
        if (estData.estimated_amount) {
          estimatedAmount = Number(estData.estimated_amount);
        }
      }
    } catch {
      // non-fatal; exact rate locked on Hosted Invoice
    }
  }

  const invoicePayload = {
    price_amount: totalAmount,
    price_currency: 'usd',
    order_id: orderId,
    order_description: `Purchase: ${product.title}`,
    ipn_callback_url: `${new URL(request.url).origin}/api/nowpayments-ipn`,
    success_url: `${siteBase}/purchases?order_id=${encodeURIComponent(orderId)}&token=${encodeURIComponent(accessToken)}`,
    cancel_url: `${siteBase}/?canceled=1`,
  };
  if (payCurrency) {
    invoicePayload.pay_currency = payCurrency;
  }

  const invoiceRes = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': env.NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(invoicePayload),
  });

  if (!invoiceRes.ok) {
    const errorText = await invoiceRes.text();
    return jsonResponse({ error: `NOWPayments error: ${errorText}` }, invoiceRes.status, cors);
  }

  const invoiceData = await invoiceRes.json();
  const invoiceId = String(invoiceData.id);

  await env.DB.prepare(
    `INSERT INTO transactions (
      id, order_id, access_token, product_id, seller_id, buyer_email,
      total_cents, seller_share_cents, platform_share_cents, pay_currency, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting')`
  )
    .bind(
      invoiceId,
      orderId,
      accessToken,
      String(product.id),
      String(product.seller_id),
      buyerEmail,
      totalCents,
      sellerShareCents,
      platformShareCents,
      payCurrency
    )
    .run();

  return jsonResponse(
    {
      order_id: orderId,
      invoice_id: invoiceId,
      invoice_url: invoiceData.invoice_url,
      access_token: accessToken,
      amount: totalAmount,
      pay_currency: payCurrency,
      estimated_amount: estimatedAmount,
    },
    200,
    cors
  );
}

// ==========================================
// NOWPAYMENTS IPN WEBHOOK (ATOMIC + INTERMEDIATE + SMART LICENSES)
// ==========================================
async function handleIPN(request, env) {
  const signature = request.headers.get('x-nowpayments-sig');
  if (!signature) return new Response('Missing signature', { status: 401 });

  const rawPayload = await request.text();
  let event;
  try {
    event = JSON.parse(rawPayload);
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const sortedPayload = JSON.stringify(sortObjectDeep(event));
  const isValid = await verifySignature(sortedPayload, signature, env.NOWPAYMENTS_IPN_SECRET);
  if (!isValid) return new Response('Invalid signature', { status: 401 });

  const paymentId = String(event.payment_id || '');
  const invoiceId = String(event.invoice_id || '');
  const orderId = String(event.order_id || '');
  const status = String(event.payment_status || '').toLowerCase();

  const tx = await env.DB.prepare(
    'SELECT * FROM transactions WHERE id = ? OR id = ? OR order_id = ?'
  )
    .bind(invoiceId, paymentId, orderId)
    .first();

  if (!tx) {
    return new Response('OK', { status: 200 });
  }

  if (status === 'finished' || status === 'confirmed') {
    if (tx.status !== 'finished') {
      const expectedAmount = centsToUsd(tx.total_cents);
      const paidPriceAmount = parseFloat(event.price_amount || 0);
      const actuallyPaid = parseFloat(event.actually_paid || 0);
      const payAmount = parseFloat(event.pay_amount || 0);

      if (Math.abs(paidPriceAmount - expectedAmount) > 0.05) {
        return new Response('Price amount mismatch', { status: 400 });
      }
      if (payAmount > 0 && actuallyPaid < payAmount * 0.98) {
        return new Response('Underpaid transaction', { status: 400 });
      }

      const product = await env.DB.prepare('SELECT id, title, delivery_type FROM products WHERE id = ?')
        .bind(tx.product_id)
        .first();
      const needsLicenseKey = product?.delivery_type === 'license_key' || product?.delivery_type === 'both';

      const licenseKey = needsLicenseKey
        ? `KEY-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`
        : null;

      // Atomic conditional update to prevent double-credit race condition
      const updateRes = await env.DB.prepare(
        "UPDATE transactions SET status = 'finished', license_key = ?, pay_currency = COALESCE(?, pay_currency), paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'finished'"
      )
        .bind(licenseKey, event.pay_currency ? String(event.pay_currency).toLowerCase() : null, tx.id)
        .run();

      if (updateRes.meta && updateRes.meta.changes === 1) {
        await env.DB.prepare('UPDATE sellers SET balance_cents = balance_cents + ? WHERE id = ?')
          .bind(tx.seller_share_cents, tx.seller_id)
          .run();

        if (licenseKey) {
          await env.DB.prepare(
            `INSERT OR IGNORE INTO license_keys (
              id, license_key, product_id, order_id, buyer_email, status, activations_count, max_activations
            ) VALUES (?, ?, ?, ?, ?, 'active', 0, 3)`
          )
            .bind(`lic_${crypto.randomUUID().slice(0, 10)}`, licenseKey, tx.product_id, tx.order_id, tx.buyer_email)
            .run();
        }

        try {
          await sendOrderNotifications(env, tx, licenseKey, product);
        } catch (emailErr) {
          console.error('Transactional email error (ignored for IPN 200 OK):', emailErr);
        }
      }
    }
  } else if (status === 'confirming' || status === 'sending' || status === 'partially_paid') {
    await env.DB.prepare(
      "UPDATE transactions SET status = ?, pay_currency = COALESCE(?, pay_currency) WHERE id = ? AND status NOT IN ('finished', 'expired', 'failed')"
    )
      .bind(status, event.pay_currency ? String(event.pay_currency).toLowerCase() : null, tx.id)
      .run();
  } else if (status === 'expired' || status === 'failed') {
    await env.DB.prepare(
      "UPDATE transactions SET status = ? WHERE id = ? AND status NOT IN ('finished', 'expired', 'failed')"
    )
      .bind(status, tx.id)
      .run();
  }

  return new Response('OK', { status: 200 });
}

async function sendOrderNotifications(env, tx, licenseKey, product) {
  const sellerUser = await env.DB.prepare('SELECT email, display_name FROM users WHERE id = ?')
    .bind(tx.seller_id)
    .first();

  const siteBase = (env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net').replace(/\/$/, '');
  const vaultUrl = `${siteBase}/purchases?order_id=${encodeURIComponent(tx.order_id)}&token=${encodeURIComponent(tx.access_token)}`;
  const productTitle = product?.title || 'Digital Product';

  const buyerEmailHtml = `
    <div style="font-family: system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
      <h2 style="color: #22d3ee; margin-top: 0;">Order Confirmed: ${escapeHtml(productTitle)}</h2>
      <p>Thank you for your crypto purchase on NexusByte (Order <code>${escapeHtml(tx.order_id)}</code>).</p>
      ${licenseKey && product?.delivery_type !== 'file' ? `<p style="background: #1e293b; padding: 12px; border-radius: 8px; font-family: monospace; color: #fbbf24;">License Key: <strong>${escapeHtml(licenseKey)}</strong></p>` : ''}
      <p style="margin: 24px 0;">
        <a href="${vaultUrl}" style="display: inline-block; background: #10b981; color: #020617; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Download Your Digital Asset</a>
      </p>
      <p style="font-size: 12px; color: #94a3b8;">Your signed download link is valid for 15 minutes and can be regenerated anytime in ${siteBase}/purchases.</p>
    </div>
  `;

  if (env.RESEND_API_KEY) {
    await sendResendEmail(env, {
      to: tx.buyer_email,
      subject: `Your NexusByte Purchase: ${productTitle}`,
      html: buyerEmailHtml,
    });
  } else {
    console.log(`[NexusByte Buyer Email] ${tx.buyer_email} -> ${vaultUrl} (${licenseKey || 'no-key'})`);
  }

  if (sellerUser?.email) {
    const shareUsd = centsToUsd(tx.seller_share_cents).toFixed(2);
    const sellerHtml = `
      <div style="font-family: system-ui, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #0f172a; color: #e2e8f0; border-radius: 12px;">
        <h2 style="color: #34d399; margin-top: 0;">New Sale Completed!</h2>
        <p>Your product <strong>${escapeHtml(productTitle)}</strong> was purchased (Order <code>${escapeHtml(tx.order_id)}</code>).</p>
        <p style="font-size: 16px;">Net Earnings Credited (95%): <strong style="color: #22d3ee;">$${shareUsd} USD</strong></p>
        <p style="margin: 24px 0;">
          <a href="${siteBase}/vendor" style="display: inline-block; background: #06b6d4; color: #020617; font-weight: 700; padding: 12px 24px; border-radius: 8px; text-decoration: none;">Open Vendor Studio</a>
        </p>
      </div>
    `;
    if (env.RESEND_API_KEY) {
      await sendResendEmail(env, {
        to: sellerUser.email,
        subject: `New NexusByte Sale: +$${shareUsd} USD (${productTitle})`,
        html: sellerHtml,
      });
    } else {
      console.log(`[NexusByte Seller Email] ${sellerUser.email} -> +$${shareUsd} USD`);
    }
  }
}

// ==========================================
// SECURE ORDER STATUS & AUTHENTICATED LIBRARY
// ==========================================
async function handleOrderStatus(request, env, cors) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');
  const accessToken = url.searchParams.get('token');
  if (!orderId) return jsonResponse({ error: 'order_id is required' }, 400, cors);

  const tx = await env.DB.prepare('SELECT * FROM transactions WHERE order_id = ?')
    .bind(orderId)
    .first();
  if (!tx) return jsonResponse({ error: 'Order not found' }, 404, cors);

  const hasValidToken = Boolean(accessToken && accessToken === tx.access_token);
  let hasBuyerAuth = false;
  if (!hasValidToken) {
    const auth = await requireAuth(request, env);
    hasBuyerAuth = Boolean(auth && auth.user.email.toLowerCase() === tx.buyer_email.toLowerCase());
  }

  if (!hasValidToken && !hasBuyerAuth) {
    return jsonResponse({ error: 'Forbidden: valid access token or buyer authentication required' }, 403, cors);
  }

  if (tx.status === 'finished') {
    const product = await env.DB.prepare(
      'SELECT title, file_name, b2_file_key, digital_content, delivery_type FROM products WHERE id = ?'
    )
      .bind(tx.product_id)
      .first();

    let downloadUrl = null;
    if (product?.b2_file_key && product?.delivery_type !== 'license_key') {
      downloadUrl = await createB2PresignedUrl({
        method: 'GET',
        key: product.b2_file_key,
        expiresIn: 900,
        downloadFileName: product.file_name || 'archive.zip',
        env,
      });
    }

    return jsonResponse(
      {
        status: 'finished',
        order_id: tx.order_id,
        pay_currency: tx.pay_currency,
        product_id: tx.product_id,
        product_title: product?.title || 'Digital Asset',
        file_name: product?.file_name || 'archive.zip',
        delivery_type: product?.delivery_type || 'both',
        license_key: tx.license_key || null,
        download_url: downloadUrl,
        digital_content: product?.digital_content || null,
      },
      200,
      cors
    );
  }

  return jsonResponse(
    { status: tx.status, order_id: tx.order_id, pay_currency: tx.pay_currency },
    200,
    cors
  );
}

async function handleMyOrders(request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized: sign in to access your library' }, 401, cors);
  }

  const { results } = await env.DB.prepare(
    `SELECT t.*, p.title AS product_title, p.category AS product_category, p.version AS product_version,
            p.file_name, p.b2_file_key, p.delivery_type,
            r.id AS review_id, r.rating AS review_rating
     FROM transactions t
     LEFT JOIN products p ON t.product_id = p.id
     LEFT JOIN reviews r ON r.order_id = t.order_id
     WHERE t.buyer_email = ? AND t.status = 'finished'
     ORDER BY t.created_at DESC`
  )
    .bind(auth.user.email.toLowerCase())
    .all();

  const orders = await Promise.all(
    (results || []).map(async (row) => {
      let downloadUrl = null;
      if (row.b2_file_key && row.delivery_type !== 'license_key') {
        downloadUrl = await createB2PresignedUrl({
          method: 'GET',
          key: row.b2_file_key,
          expiresIn: 900,
          downloadFileName: row.file_name || 'package.zip',
          env,
        });
      }
      return {
        id: row.order_id,
        buyerEmail: row.buyer_email,
        buyerName: row.buyer_email,
        productId: row.product_id,
        productTitle: row.product_title || 'Digital Product',
        productCategory: row.product_category || 'Software',
        productVersion: row.product_version || 'v1.0.0',
        deliveryType: row.delivery_type || 'both',
        priceUSD: centsToUsd(row.total_cents),
        status: 'paid',
        hasReviewed: Boolean(row.review_id),
        reviewRating: row.review_rating ? Number(row.review_rating) : undefined,
        paymentMeta: {
          trackId: row.id,
          cryptoCurrency: (row.pay_currency || 'CRYPTO').toUpperCase(),
        },
        secureDelivery: {
          downloadUrl,
          downloadToken: row.order_id,
          downloadExpiresAt: Date.now() + 900 * 1000,
          downloadCount: 0,
          maxDownloads: 99,
          licenseKey: row.license_key || undefined,
          fileName: row.file_name || 'package.zip',
        },
        createdAt: row.created_at,
        paidAt: row.paid_at,
      };
    })
  );

  return jsonResponse({ orders }, 200, cors);
}

// ==========================================
// TRUST LAYER: LICENSES, REVIEWS, REPORTS
// ==========================================
async function handleVerifyLicense(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const productId = String(body.product_id || '').trim();
  const licenseKey = String(body.license_key || '').trim();
  const incrementActivation = Boolean(body.increment_activation);

  if (!productId || !licenseKey) {
    return jsonResponse({ valid: false, error: 'product_id and license_key are required' }, 400, cors);
  }

  const record = await env.DB.prepare(
    'SELECT * FROM license_keys WHERE product_id = ? AND license_key = ?'
  )
    .bind(productId, licenseKey)
    .first();

  if (!record) {
    return jsonResponse({ valid: false, error: 'License key not found for this product' }, 404, cors);
  }

  if (record.status !== 'active') {
    return jsonResponse(
      {
        valid: false,
        status: record.status,
        error: `License key is ${record.status}`,
      },
      200,
      cors
    );
  }

  let activationsCount = Number(record.activations_count || 0);
  const maxActivations = Number(record.max_activations || 3);

  if (incrementActivation) {
    const incRes = await env.DB.prepare(
      "UPDATE license_keys SET activations_count = activations_count + 1 WHERE id = ? AND status = 'active' AND activations_count < max_activations"
    )
      .bind(record.id)
      .run();

    if (!incRes.meta || incRes.meta.changes !== 1) {
      return jsonResponse(
        {
          valid: false,
          status: record.status,
          activationsCount,
          maxActivations,
          error: 'Maximum activation limit reached',
        },
        200,
        cors
      );
    }
    activationsCount += 1;
  }

  return jsonResponse(
    {
      valid: true,
      status: record.status,
      productId: record.product_id,
      orderId: record.order_id,
      activationsCount,
      maxActivations,
    },
    200,
    cors
  );
}

async function handleCreateReview(request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized: sign in to leave a verified review' }, 401, cors);
  }

  const body = await request.json().catch(() => ({}));
  const productId = String(body.product_id || '').trim();
  const orderId = body.order_id ? String(body.order_id).trim() : null;
  const rating = Number(body.rating);
  const comment = String(body.comment || '').trim();

  if (!productId || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return jsonResponse({ error: 'product_id and integer rating (1-5) are required' }, 400, cors);
  }
  if (comment.length < 5 || comment.length > 1000) {
    return jsonResponse({ error: 'Review comment must be between 5 and 1000 characters' }, 400, cors);
  }

  let tx;
  if (orderId) {
    tx = await env.DB.prepare(
      "SELECT order_id, product_id, buyer_email FROM transactions WHERE order_id = ? AND product_id = ? AND buyer_email = ? AND status = 'finished'"
    )
      .bind(orderId, productId, auth.user.email.toLowerCase())
      .first();
  } else {
    tx = await env.DB.prepare(
      `SELECT t.order_id, t.product_id, t.buyer_email
       FROM transactions t
       LEFT JOIN reviews r ON r.order_id = t.order_id
       WHERE t.product_id = ? AND t.buyer_email = ? AND t.status = 'finished' AND r.id IS NULL
       ORDER BY t.created_at DESC LIMIT 1`
    )
      .bind(productId, auth.user.email.toLowerCase())
      .first();
  }

  if (!tx) {
    return jsonResponse(
      { error: 'Verified purchase required: no eligible completed order found for this product' },
      403,
      cors
    );
  }

  const existingReview = await env.DB.prepare('SELECT id FROM reviews WHERE order_id = ?')
    .bind(tx.order_id)
    .first();
  if (existingReview) {
    return jsonResponse({ error: 'You have already reviewed this purchase' }, 409, cors);
  }

  const reviewId = `rev_${crypto.randomUUID().slice(0, 10)}`;
  await env.DB.prepare(
    'INSERT INTO reviews (id, product_id, order_id, buyer_email, rating, comment) VALUES (?, ?, ?, ?, ?, ?)'
  )
    .bind(reviewId, productId, tx.order_id, auth.user.email.toLowerCase(), rating, comment)
    .run();

  return jsonResponse(
    {
      success: true,
      review: {
        id: reviewId,
        productId,
        reviewerName: maskEmail(auth.user.email),
        rating,
        comment,
        verifiedPurchase: true,
        createdAt: new Date().toISOString(),
      },
    },
    201,
    cors
  );
}

async function handleCreateReport(request, env, cors) {
  const auth = await requireAuth(request, env);
  const body = await request.json().catch(() => ({}));
  const productId = String(body.product_id || '').trim();
  const reason = String(body.reason || '').trim();
  const details = String(body.details || '').trim();
  const reporterEmail = auth
    ? auth.user.email.toLowerCase()
    : String(body.reporter_email || '').trim().toLowerCase();

  if (!productId || reason.length < 3) {
    return jsonResponse({ error: 'product_id and reason are required' }, 400, cors);
  }
  if (!EMAIL_RE.test(reporterEmail)) {
    return jsonResponse({ error: 'Valid reporter_email is required' }, 400, cors);
  }

  const prod = await env.DB.prepare('SELECT id FROM products WHERE id = ?')
    .bind(productId)
    .first();
  if (!prod) {
    return jsonResponse({ error: 'Product not found' }, 404, cors);
  }

  const reportId = `rep_${crypto.randomUUID().slice(0, 10)}`;
  await env.DB.prepare(
    "INSERT INTO reports (id, product_id, reporter_email, reason, details, status) VALUES (?, ?, ?, ?, ?, 'open')"
  )
    .bind(reportId, productId, reporterEmail, reason.slice(0, 120), details.slice(0, 1000))
    .run();

  return jsonResponse({ success: true, id: reportId }, 201, cors);
}

// ==========================================
// MULTI-VENDOR ONBOARDING, INVENTORY, STATS & PAYOUTS
// ==========================================
async function handleVendorOnboarding(request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }

  const body = await request.json().catch(() => ({}));
  const displayName = String(body.display_name || '').trim();
  const walletAddress = String(body.wallet_address || '').trim();

  if (displayName.length < 2) {
    return jsonResponse({ error: 'display_name must be at least 2 characters' }, 400, cors);
  }
  if (!EVM_ADDRESS_RE.test(walletAddress)) {
    return jsonResponse({ error: 'Valid Base/EVM wallet address (0x...) is required' }, 400, cors);
  }

  await env.DB.prepare(
    `INSERT INTO sellers (id, display_name, wallet_address, balance_cents, is_trusted)
     VALUES (?, ?, ?, 0, 0)
     ON CONFLICT(id) DO UPDATE SET
       display_name = excluded.display_name,
       wallet_address = excluded.wallet_address`
  )
    .bind(auth.user.id, displayName, walletAddress)
    .run();

  if (auth.user.role !== 'admin') {
    await env.DB.prepare('UPDATE users SET role = ?, display_name = ? WHERE id = ?')
      .bind('vendor', displayName, auth.user.id)
      .run();
  }

  const updatedUser = await env.DB.prepare('SELECT id, email, role, display_name, created_at FROM users WHERE id = ?')
    .bind(auth.user.id)
    .first();
  const updatedSeller = await env.DB.prepare(
    'SELECT id, display_name, wallet_address, balance_cents, is_trusted, created_at FROM sellers WHERE id = ?'
  )
    .bind(auth.user.id)
    .first();

  return jsonResponse(
    {
      success: true,
      user: formatUser(updatedUser),
      seller: formatSeller(updatedSeller),
    },
    200,
    cors
  );
}

async function handleVendorProducts(request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const { results } = await env.DB.prepare(
    `SELECT p.*, s.display_name AS seller_display_name, s.is_trusted AS seller_is_trusted,
            (SELECT COUNT(*) FROM transactions t WHERE t.product_id = p.id AND t.status = 'finished') AS sales_count,
            (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS reviews_count,
            (SELECT COALESCE(AVG(r.rating), 0) FROM reviews r WHERE r.product_id = p.id) AS avg_rating
     FROM products p
     LEFT JOIN sellers s ON p.seller_id = s.id
     WHERE p.seller_id = ? AND p.status != 'archived'
     ORDER BY p.created_at DESC`
  )
    .bind(auth.seller.id)
    .all();

  const ids = (results || []).map((r) => r.id);
  const changelogMap = await fetchChangelogsMap(env, ids);
  const mapped = (results || []).map((p) => mapProductRow(p, changelogMap.get(p.id) || [], true));

  return jsonResponse({ products: mapped }, 200, cors);
}

async function handleVendorStats(request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const sellerId = auth.seller.id;

  const prodCount = await env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM products WHERE seller_id = ? AND status != 'archived'"
  )
    .bind(sellerId)
    .first();

  const sales = await env.DB.prepare(
    "SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents), 0) as gross_cents, COALESCE(SUM(seller_share_cents), 0) as net_cents FROM transactions WHERE seller_id = ? AND status = 'finished'"
  )
    .bind(sellerId)
    .first();

  const recentOrdersRes = await env.DB.prepare(
    `SELECT t.order_id, t.product_id, t.buyer_email, t.total_cents, t.seller_share_cents,
            t.status, t.pay_currency, t.created_at, t.paid_at, p.title AS product_title
     FROM transactions t
     LEFT JOIN products p ON t.product_id = p.id
     WHERE t.seller_id = ?
     ORDER BY t.created_at DESC
     LIMIT 25`
  )
    .bind(sellerId)
    .all();

  const recentOrders = (recentOrdersRes.results || []).map((o) => ({
    id: o.order_id,
    productId: o.product_id,
    productTitle: o.product_title || 'Digital Asset',
    totalUSD: centsToUsd(o.total_cents),
    sellerShareUSD: centsToUsd(o.seller_share_cents),
    status: o.status,
    payCurrency: o.pay_currency ? String(o.pay_currency).toUpperCase() : null,
    buyerEmailMasked: maskEmail(o.buyer_email),
    createdAt: o.created_at,
    paidAt: o.paid_at || null,
  }));

  const withdrawalsRes = await env.DB.prepare(
    'SELECT id, amount_cents, wallet_address, batch_id, status, created_at FROM withdrawals WHERE seller_id = ? ORDER BY created_at DESC LIMIT 25'
  )
    .bind(sellerId)
    .all();

  const recentWithdrawals = (withdrawalsRes.results || []).map((w) => ({
    id: w.id,
    amountUSD: centsToUsd(w.amount_cents),
    walletAddress: w.wallet_address,
    batchId: w.batch_id,
    status: w.status,
    createdAt: w.created_at,
  }));

  return jsonResponse(
    {
      sellerId,
      displayName: auth.seller.display_name,
      walletAddress: auth.seller.wallet_address,
      isTrusted: Boolean(auth.seller.is_trusted),
      totalProducts: Number(prodCount?.cnt || 0),
      totalSalesCount: Number(sales?.cnt || 0),
      totalRevenueUSD: centsToUsd(sales?.gross_cents || 0),
      netEarningsUSD: centsToUsd(sales?.net_cents || 0),
      availableBalanceUSD: centsToUsd(auth.seller.balance_cents || 0),
      recentOrders,
      recentWithdrawals,
    },
    200,
    cors
  );
}

async function handleWithdraw(request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const sellerId = auth.seller.id;
  if (!EVM_ADDRESS_RE.test(auth.seller.wallet_address || '')) {
    return jsonResponse({ error: 'Configure a valid USDC Base wallet address before withdrawing' }, 400, cors);
  }

  const body = await request.json().catch(() => ({}));
  const amountCents = usdToCents(body.amount_to_withdraw);

  if (!Number.isFinite(amountCents) || amountCents < 500) {
    return jsonResponse({ error: 'Minimum withdrawal is $5.00 USD' }, 400, cors);
  }

  const deduct = await env.DB.prepare(
    'UPDATE sellers SET balance_cents = balance_cents - ? WHERE id = ? AND balance_cents >= ?'
  )
    .bind(amountCents, sellerId, amountCents)
    .run();

  if (!deduct.meta || deduct.meta.changes === 0) {
    return jsonResponse({ error: 'Insufficient funds' }, 400, cors);
  }

  const withdrawalId = `wd_${crypto.randomUUID().slice(0, 12)}`;
  const amountUsd = centsToUsd(amountCents);

  // Record withdrawal as 'creating' BEFORE any external API call
  await env.DB.prepare(
    "INSERT INTO withdrawals (id, seller_id, amount_cents, wallet_address, batch_id, status) VALUES (?, ?, ?, ?, NULL, 'creating')"
  )
    .bind(withdrawalId, sellerId, amountCents, auth.seller.wallet_address)
    .run();

  let batchId = null;
  let token = null;

  try {
    const authRes = await fetch('https://api.nowpayments.io/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.NOWPAYMENTS_EMAIL, password: env.NOWPAYMENTS_PASSWORD }),
    });
    if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
    const authData = await authRes.json();
    token = authData.token;

    const payoutRes = await fetch('https://api.nowpayments.io/v1/payout', {
      method: 'POST',
      headers: {
        'x-api-key': env.NOWPAYMENTS_API_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        withdrawals: [{ address: auth.seller.wallet_address, amount: amountUsd, currency: 'usdc', network: 'base' }],
      }),
    });
    if (!payoutRes.ok) throw new Error(`Payout error: ${await payoutRes.text()}`);
    const payoutData = await payoutRes.json();
    batchId = String(payoutData.batch_withdrawal_id || payoutData.id);

    // Immediately persist batch_id and transition to pending_verification
    await env.DB.prepare(
      "UPDATE withdrawals SET batch_id = ?, status = 'pending_verification' WHERE id = ?"
    )
      .bind(batchId, withdrawalId)
      .run();
  } catch (createErr) {
    // Only restore seller balance when payout creation failed BEFORE obtaining batch_id
    await env.DB.prepare("UPDATE withdrawals SET status = 'failed' WHERE id = ?")
      .bind(withdrawalId)
      .run();
    await env.DB.prepare('UPDATE sellers SET balance_cents = balance_cents + ? WHERE id = ?')
      .bind(amountCents, sellerId)
      .run();
    return jsonResponse({ error: 'Payout creation failed, funds restored', details: createErr.message }, 502, cors);
  }

  try {
    const code = await generateTOTP(env.NOWPAYMENTS_TOTP_SECRET);
    const verifyRes = await fetch(`https://api.nowpayments.io/v1/payout/${batchId}/verify`, {
      method: 'POST',
      headers: {
        'x-api-key': env.NOWPAYMENTS_API_KEY,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verification_code: code }),
    });
    if (!verifyRes.ok) throw new Error(`Verification error: ${await verifyRes.text()}`);

    await env.DB.prepare("UPDATE withdrawals SET status = 'processing' WHERE id = ?")
      .bind(withdrawalId)
      .run();

    return jsonResponse({ success: true, id: withdrawalId, batchId, status: 'processing' }, 200, cors);
  } catch (verifyErr) {
    // Do NOT restore balance because batchId was already created in NOWPayments!
    return jsonResponse(
      {
        error: 'Payout batch created but verification is pending. Please retry verification.',
        id: withdrawalId,
        batchId,
        status: 'pending_verification',
        details: verifyErr.message,
      },
      502,
      cors
    );
  }
}

async function handleRetryWithdrawVerify(withdrawalId, request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) return jsonResponse({ error: 'Unauthorized' }, 401, cors);

  const w = await env.DB.prepare('SELECT * FROM withdrawals WHERE id = ?')
    .bind(withdrawalId)
    .first();
  if (!w) return jsonResponse({ error: 'Withdrawal not found' }, 404, cors);

  const isOwner = Boolean(auth.seller && auth.seller.id === w.seller_id);
  const isAdmin = auth.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return jsonResponse({ error: 'Forbidden' }, 403, cors);
  }
  if (w.status !== 'pending_verification' || !w.batch_id) {
    return jsonResponse({ error: 'Withdrawal is not awaiting verification' }, 400, cors);
  }

  try {
    const authRes = await fetch('https://api.nowpayments.io/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.NOWPAYMENTS_EMAIL, password: env.NOWPAYMENTS_PASSWORD }),
    });
    if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
    const authData = await authRes.json();

    const code = await generateTOTP(env.NOWPAYMENTS_TOTP_SECRET);
    const verifyRes = await fetch(`https://api.nowpayments.io/v1/payout/${w.batch_id}/verify`, {
      method: 'POST',
      headers: {
        'x-api-key': env.NOWPAYMENTS_API_KEY,
        Authorization: `Bearer ${authData.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verification_code: code }),
    });
    if (!verifyRes.ok) throw new Error(`Verification error: ${await verifyRes.text()}`);

    await env.DB.prepare("UPDATE withdrawals SET status = 'processing' WHERE id = ?")
      .bind(w.id)
      .run();

    return jsonResponse({ success: true, id: w.id, batchId: w.batch_id, status: 'processing' }, 200, cors);
  } catch (err) {
    return jsonResponse({ error: 'Retry verification failed', details: err.message }, 502, cors);
  }
}

// ==========================================
// ADMIN MODERATION & TRUST CONSOLE
// ==========================================
async function handleAdminOverview(request, env, cors) {
  const { error } = await requireAdmin(request, env, cors);
  if (error) return error;

  const statsRow = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM users) AS total_users,
       (SELECT COUNT(*) FROM sellers) AS total_sellers,
       (SELECT COUNT(*) FROM products WHERE status != 'archived') AS total_products,
       (SELECT COUNT(*) FROM products WHERE status = 'pending_review') AS pending_review_count,
       (SELECT COUNT(*) FROM transactions WHERE status = 'finished') AS finished_orders,
       (SELECT COALESCE(SUM(platform_share_cents), 0) FROM transactions WHERE status = 'finished') AS platform_revenue_cents,
       (SELECT COUNT(*) FROM reports WHERE status = 'open') AS open_reports_count`
  ).first();

  const moderationQueueRes = await env.DB.prepare(
    `SELECT p.*, s.display_name AS seller_display_name, s.is_trusted AS seller_is_trusted
     FROM products p
     LEFT JOIN sellers s ON p.seller_id = s.id
     WHERE p.status IN ('pending_review', 'rejected', 'published')
     ORDER BY CASE p.status WHEN 'pending_review' THEN 0 WHEN 'rejected' THEN 1 ELSE 2 END, p.created_at DESC
     LIMIT 50`
  ).all();

  const sellersRes = await env.DB.prepare(
    `SELECT s.*, u.email,
            (SELECT COUNT(*) FROM products p WHERE p.seller_id = s.id AND p.status != 'archived') AS product_count
     FROM sellers s
     LEFT JOIN users u ON s.id = u.id
     ORDER BY s.created_at DESC LIMIT 50`
  ).all();

  const disputedOrdersRes = await env.DB.prepare(
    `SELECT t.order_id, t.product_id, t.buyer_email, t.total_cents, t.status, t.pay_currency, t.created_at, p.title AS product_title
     FROM transactions t
     LEFT JOIN products p ON t.product_id = p.id
     WHERE t.status IN ('partially_paid', 'failed', 'expired', 'confirming', 'sending', 'finished')
     ORDER BY CASE t.status WHEN 'partially_paid' THEN 0 WHEN 'failed' THEN 1 ELSE 2 END, t.created_at DESC
     LIMIT 30`
  ).all();

  const pendingWithdrawalsRes = await env.DB.prepare(
    `SELECT w.*, s.display_name AS seller_name
     FROM withdrawals w
     LEFT JOIN sellers s ON w.seller_id = s.id
     WHERE w.status IN ('creating', 'pending_verification')
     ORDER BY w.created_at DESC`
  ).all();

  const reportsRes = await env.DB.prepare(
    `SELECT r.*, p.title AS product_title
     FROM reports r
     LEFT JOIN products p ON r.product_id = p.id
     ORDER BY CASE r.status WHEN 'open' THEN 0 ELSE 1 END, r.created_at DESC
     LIMIT 50`
  ).all();

  return jsonResponse(
    {
      stats: {
        totalUsers: Number(statsRow?.total_users || 0),
        totalSellers: Number(statsRow?.total_sellers || 0),
        totalProducts: Number(statsRow?.total_products || 0),
        pendingReviewCount: Number(statsRow?.pending_review_count || 0),
        finishedOrders: Number(statsRow?.finished_orders || 0),
        platformRevenueUSD: centsToUsd(statsRow?.platform_revenue_cents || 0),
        openReportsCount: Number(statsRow?.open_reports_count || 0),
      },
      moderationQueue: (moderationQueueRes.results || []).map((p) => mapProductRow(p, [], true)),
      sellers: (sellersRes.results || []).map((s) => ({
        id: s.id,
        email: s.email,
        displayName: s.display_name,
        walletAddress: s.wallet_address,
        balanceUSD: centsToUsd(s.balance_cents),
        isTrusted: Boolean(s.is_trusted),
        productCount: Number(s.product_count || 0),
        createdAt: s.created_at,
      })),
      orders: (disputedOrdersRes.results || []).map((o) => ({
        id: o.order_id,
        productId: o.product_id,
        productTitle: o.product_title || 'Digital Asset',
        buyerEmailMasked: maskEmail(o.buyer_email),
        totalUSD: centsToUsd(o.total_cents),
        status: o.status,
        payCurrency: o.pay_currency,
        createdAt: o.created_at,
      })),
      pendingWithdrawals: (pendingWithdrawalsRes.results || []).map((w) => ({
        id: w.id,
        sellerId: w.seller_id,
        sellerName: w.seller_name || w.seller_id,
        amountUSD: centsToUsd(w.amount_cents),
        walletAddress: w.wallet_address,
        batchId: w.batch_id,
        status: w.status,
        createdAt: w.created_at,
      })),
      reports: (reportsRes.results || []).map((r) => ({
        id: r.id,
        productId: r.product_id,
        productTitle: r.product_title || r.product_id,
        reporterEmailMasked: maskEmail(r.reporter_email),
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.created_at,
      })),
    },
    200,
    cors
  );
}

async function handleAdminModerateProduct(productId, request, env, cors) {
  const { error } = await requireAdmin(request, env, cors);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const action = String(body.action || '').trim().toLowerCase();
  const reason = String(body.reason || '').trim();

  if (action !== 'approve' && action !== 'reject') {
    return jsonResponse({ error: 'action must be "approve" or "reject"' }, 400, cors);
  }

  const nextStatus = action === 'approve' ? 'published' : 'rejected';
  const rejectionReason = action === 'reject' ? reason || 'Does not meet marketplace guidelines' : null;

  const res = await env.DB.prepare(
    "UPDATE products SET status = ?, rejection_reason = ? WHERE id = ? AND status != 'archived'"
  )
    .bind(nextStatus, rejectionReason, productId)
    .run();

  if (!res.meta || res.meta.changes === 0) {
    return jsonResponse({ error: 'Product not found' }, 404, cors);
  }

  return jsonResponse({ success: true, id: productId, status: nextStatus, rejectionReason }, 200, cors);
}

async function handleAdminSetSellerTrust(sellerId, request, env, cors) {
  const { error } = await requireAdmin(request, env, cors);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const isTrusted = body.is_trusted ? 1 : 0;

  const res = await env.DB.prepare('UPDATE sellers SET is_trusted = ? WHERE id = ?')
    .bind(isTrusted, sellerId)
    .run();

  if (!res.meta || res.meta.changes === 0) {
    return jsonResponse({ error: 'Seller not found' }, 404, cors);
  }

  return jsonResponse({ success: true, sellerId, isTrusted: Boolean(isTrusted) }, 200, cors);
}

async function handleAdminResolveReport(reportId, request, env, cors) {
  const { error } = await requireAdmin(request, env, cors);
  if (error) return error;

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '').trim().toLowerCase();
  if (status !== 'resolved' && status !== 'dismissed') {
    return jsonResponse({ error: 'status must be "resolved" or "dismissed"' }, 400, cors);
  }

  const res = await env.DB.prepare('UPDATE reports SET status = ? WHERE id = ?')
    .bind(status, reportId)
    .run();

  if (!res.meta || res.meta.changes === 0) {
    return jsonResponse({ error: 'Report not found' }, 404, cors);
  }

  return jsonResponse({ success: true, id: reportId, status }, 200, cors);
}

// ==========================================
// AWS SIGV4 PRESIGNED URL FOR BACKBLAZE B2
// ==========================================
async function createB2PresignedUrl({ method, key, expiresIn = 900, downloadFileName, env }) {
  const accessKeyId = env.B2_KEY_ID;
  const secretAccessKey = env.B2_APP_KEY;
  const bucket = env.B2_BUCKET_NAME;
  const endpoint = env.B2_ENDPOINT;
  const region = env.B2_REGION;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const encodedKey = key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const canonicalUri = `/${bucket}/${encodedKey}`;
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;

  const queryParams = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${accessKeyId}/${credentialScope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(expiresIn)],
    ['X-Amz-SignedHeaders', 'host'],
  ];

  if (method === 'GET' && downloadFileName) {
    const safeFileName = String(downloadFileName).replace(/["\r\n\\]/g, '_');
    queryParams.push([
      'response-content-disposition',
      `attachment; filename="${safeFileName}"`,
    ]);
  }

  queryParams.sort((a, b) => a[0].localeCompare(b[0]));

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${awsEncode(k)}=${awsEncode(v)}`)
    .join('&');

  const canonicalHeaders = `host:${endpoint}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQueryString,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const canonicalHash = await sha256Hex(canonicalRequest);
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, canonicalHash].join('\n');

  const kDate = await hmacRaw(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = await hmacRaw(kDate, region);
  const kService = await hmacRaw(kRegion, 's3');
  const kSigning = await hmacRaw(kService, 'aws4_request');
  const signature = await hmacHex(kSigning, stringToSign);

  return `https://${endpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

function awsEncode(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

// ==========================================
// WEBCRYPTO HELPERS (JWT, HASH, EMAIL, TOTP)
// ==========================================
async function sendResendEmail(env, { to, subject, html }) {
  const from = env.EMAIL_FROM || 'NexusByte <onboarding@resend.dev>';
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error (${res.status}): ${text}`);
  }
  return await res.json();
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function base64UrlEncode(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecodeBytes(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function signJwt(payload, secret, expiresInSec) {
  const now = Math.floor(Date.now() / 1000);
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await hmacRaw(secret, signingInput);
  return `${signingInput}.${base64UrlEncode(new Uint8Array(sig))}`;
}

async function verifyJwt(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = base64UrlDecodeBytes(sigB64);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(`${headerB64}.${payloadB64}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecodeBytes(payloadB64)));
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hmacRaw(key, data) {
  const rawKey = typeof key === 'string' ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey('raw', rawKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacHex(key, data) {
  const sig = await hmacRaw(key, data);
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sortObjectDeep(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      acc[key] = sortObjectDeep(obj[key]);
      return acc;
    }, {});
}

async function verifySignature(payload, signature, secret) {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['verify']
    );
    const matches = signature.trim().match(/.{1,2}/g);
    if (!matches) return false;
    const sigBytes = new Uint8Array(matches.map((byte) => parseInt(byte, 16)));
    return await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payload));
  } catch {
    return false;
  }
}

async function generateTOTP(secret) {
  const base32chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (let i = 0; i < secret.length; i++) {
    const val = base32chars.indexOf(secret.charAt(i).toUpperCase());
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  const time = Math.floor(Date.now() / 1000 / 30);
  const timeBuffer = new ArrayBuffer(8);
  const timeView = new DataView(timeBuffer);
  timeView.setUint32(4, time, false);

  const cryptoKey = await crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, timeBuffer);
  const sigBytes = new Uint8Array(signatureBuffer);
  const offset = sigBytes[sigBytes.length - 1] & 0xf;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);
  return (binary % 1000000).toString().padStart(6, '0');
}
