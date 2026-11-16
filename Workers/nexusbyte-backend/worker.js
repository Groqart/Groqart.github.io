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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

function centsToUsd(cents) {
  return Number((Number(cents || 0) / 100).toFixed(2));
}

function usdToCents(usd) {
  return Math.round(Number(usd || 0) * 100);
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

function sanitizeRedirectPath(input) {
  if (typeof input !== 'string') return '/purchases';
  const trimmed = input.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return '/purchases';
  return trimmed;
}

export default {
  async fetch(request, env) {
    const cors = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
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

      // Catalog & Vendor Product Management
      if (url.pathname === '/api/products' && request.method === 'GET') {
        return await handleGetProducts(env, cors);
      }
      if (url.pathname === '/api/products' && request.method === 'POST') {
        return await handleCreateProduct(request, env, cors);
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

      // Order Status (Guest access_token OR Buyer JWT) & Buyer Library (JWT only)
      if (url.pathname === '/api/order-status' && request.method === 'GET') {
        return await handleOrderStatus(request, env, cors);
      }
      if (url.pathname === '/api/orders/my' && request.method === 'GET') {
        return await handleMyOrders(request, env, cors);
      }

      // Multi-Vendor Onboarding, Stats, Withdrawals (JWT + Seller required)
      if (url.pathname === '/api/vendor/onboarding' && request.method === 'POST') {
        return await handleVendorOnboarding(request, env, cors);
      }
      if (url.pathname === '/api/vendor/stats' && request.method === 'GET') {
        return await handleVendorStats(request, env, cors);
      }
      if (url.pathname === '/api/withdraw' && request.method === 'POST') {
        return await handleWithdraw(request, env, cors);
      }

      return jsonResponse({ error: 'Endpoint Not Found' }, 404, cors);
    } catch (globalError) {
      return jsonResponse({ error: 'Internal Server Error', details: globalError.message }, 500, cors);
    }
  },
};

// ==========================================
// AUTHENTICATION (MAGIC LINKS + STATELESS JWT)
// ==========================================
async function handleAuthRequestLink(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || '').trim().toLowerCase();
  const redirectPath = sanitizeRedirectPath(body.redirectPath);

  if (!EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Valid email address is required' }, 400, cors);
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
          <p>Click the secure magic link below to access your purchases vault or vendor portal. This link expires in 15 minutes and can only be used once.</p>
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
    await env.DB.prepare(
      'INSERT INTO users (id, email, role, display_name) VALUES (?, ?, ?, ?)'
    )
      .bind(newId, record.email, 'buyer', defaultName)
      .run();

    user = await env.DB.prepare('SELECT id, email, role, display_name, created_at FROM users WHERE id = ?')
      .bind(newId)
      .first();
  }

  const sellerRow = await env.DB.prepare(
    'SELECT id, display_name, wallet_address, balance_cents, created_at FROM sellers WHERE id = ?'
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
    'SELECT id, display_name, wallet_address, balance_cents, created_at FROM sellers WHERE id = ?'
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
    createdAt: seller.created_at,
  };
}

// ==========================================
// PRODUCTS (D1)
// ==========================================
async function handleGetProducts(env, cors) {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.seller_id, p.title, p.slug, p.price_cents, p.file_name, p.file_size,
            p.category, p.tagline, p.description, p.version, p.delivery_type,
            p.tags_json, p.features_json, p.created_at,
            s.display_name AS seller_display_name
     FROM products p
     LEFT JOIN sellers s ON p.seller_id = s.id
     WHERE p.status = 'published'
     ORDER BY p.created_at DESC`
  ).all();

  const mapped = (results || []).map((p) => {
    const tags = safeParseJsonArray(p.tags_json, [p.category || 'Software']);
    const features = safeParseJsonArray(p.features_json, [
      'Instant crypto checkout via NOWPayments',
      'Protected Backblaze B2 delivery',
    ]);
    return {
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
      fileInfo: {
        fileName: p.file_name || 'package.zip',
        fileSize: p.file_size || 'ZIP',
        format: 'Archive',
      },
      vendorId: p.seller_id,
      vendorName: p.seller_display_name || p.seller_id,
      vendorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      rating: 5.0,
      reviewsCount: 1,
      salesCount: 0,
      bannerGradient: 'from-cyan-600 via-blue-600 to-indigo-700',
      tags,
      features,
      changelog: [],
      downloadContentSample: '',
      createdAt: p.created_at || new Date().toISOString(),
    };
  });

  return jsonResponse({ products: mapped }, 200, cors);
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

  const productId = `prod_${crypto.randomUUID().slice(0, 8)}`;
  const category = String(body.category || 'Scripts & Code');
  const finalTags = tags.length > 0 ? tags : [category];
  const finalFeatures =
    features.length > 0
      ? features
      : ['Instant crypto checkout via NOWPayments', 'Protected Backblaze B2 delivery'];

  await env.DB.prepare(
    `INSERT INTO products (
      id, seller_id, title, slug, price_cents, b2_file_key, file_name, file_size,
      category, tagline, description, version, delivery_type, tags_json, features_json, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`
  )
    .bind(
      productId,
      auth.seller.id,
      title,
      productId,
      priceCents,
      b2FileKey,
      String(body.fileName || 'package.zip'),
      String(body.fileSize || 'Unknown'),
      category,
      String(body.tagline || ''),
      String(body.description || ''),
      String(body.version || 'v1.0.0'),
      String(body.deliveryType || 'both'),
      JSON.stringify(finalTags),
      JSON.stringify(finalFeatures)
    )
    .run();

  return jsonResponse({ success: true, id: productId }, 201, cors);
}

async function handleDeleteProduct(id, request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const res = await env.DB.prepare('DELETE FROM products WHERE id = ? AND seller_id = ?')
    .bind(String(id), auth.seller.id)
    .run();

  if (!res.meta || res.meta.changes === 0) {
    return jsonResponse({ error: 'Product not found or access denied' }, 404, cors);
  }

  return jsonResponse({ success: true }, 200, cors);
}

// ==========================================
// DIRECT BACKBLAZE B2 UPLOAD (Presigned PUT)
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

// ==========================================
// NOWPAYMENTS CHECKOUT
// ==========================================
async function handleCreatePayment(request, env, cors) {
  const body = await request.json().catch(() => ({}));
  const productId = String(body.product_id || '').trim();
  const buyerEmail = String(body.buyer_email || '').trim().toLowerCase();

  if (!productId) {
    return jsonResponse({ error: 'product_id is required' }, 400, cors);
  }
  if (!EMAIL_RE.test(buyerEmail)) {
    return jsonResponse({ error: 'Valid buyer_email is required' }, 400, cors);
  }

  const product = await env.DB.prepare(
    'SELECT id, seller_id, title, price_cents FROM products WHERE id = ? AND status = ?'
  )
    .bind(productId, 'published')
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

  const invoiceRes = await fetch('https://api.nowpayments.io/v1/invoice', {
    method: 'POST',
    headers: {
      'x-api-key': env.NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      price_amount: totalAmount,
      price_currency: 'usd',
      order_id: orderId,
      order_description: `Purchase: ${product.title}`,
      ipn_callback_url: `${new URL(request.url).origin}/api/nowpayments-ipn`,
      success_url: `${siteBase}/purchases?order_id=${encodeURIComponent(orderId)}&token=${encodeURIComponent(accessToken)}`,
      cancel_url: `${siteBase}/?canceled=1`,
    }),
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
      total_cents, seller_share_cents, platform_share_cents, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'waiting')`
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
      platformShareCents
    )
    .run();

  return jsonResponse(
    {
      order_id: orderId,
      invoice_id: invoiceId,
      invoice_url: invoiceData.invoice_url,
      access_token: accessToken,
      amount: totalAmount,
    },
    200,
    cors
  );
}

// ==========================================
// NOWPAYMENTS IPN WEBHOOK (ATOMIC + EMAILS)
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

  if (event.payment_status === 'finished' || event.payment_status === 'confirmed') {
    const paymentId = String(event.payment_id || '');
    const invoiceId = String(event.invoice_id || '');
    const orderId = String(event.order_id || '');

    const tx = await env.DB.prepare(
      'SELECT * FROM transactions WHERE id = ? OR id = ? OR order_id = ?'
    )
      .bind(invoiceId, paymentId, orderId)
      .first();

    if (tx && tx.status !== 'finished') {
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

      const licenseKey = `KEY-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      // Atomic conditional update to prevent double-credit race condition
      const updateRes = await env.DB.prepare(
        "UPDATE transactions SET status = 'finished', license_key = ?, paid_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'finished'"
      )
        .bind(licenseKey, tx.id)
        .run();

      if (updateRes.meta && updateRes.meta.changes === 1) {
        await env.DB.prepare('UPDATE sellers SET balance_cents = balance_cents + ? WHERE id = ?')
          .bind(tx.seller_share_cents, tx.seller_id)
          .run();

        try {
          await sendOrderNotifications(env, tx, licenseKey);
        } catch (emailErr) {
          console.error('Transactional email error (ignored for IPN 200 OK):', emailErr);
        }
      }
    }
  } else if (event.payment_status === 'expired' || event.payment_status === 'failed') {
    const invoiceId = String(event.invoice_id || '');
    const orderId = String(event.order_id || '');
    await env.DB.prepare(
      "UPDATE transactions SET status = ? WHERE (id = ? OR order_id = ?) AND status = 'waiting'"
    )
      .bind(String(event.payment_status), invoiceId, orderId)
      .run();
  }

  return new Response('OK', { status: 200 });
}

async function sendOrderNotifications(env, tx, licenseKey) {
  const product = await env.DB.prepare('SELECT title, delivery_type FROM products WHERE id = ?')
    .bind(tx.product_id)
    .first();
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
      <p style="font-size: 12px; color: #94a3b8;">You can also sign in anytime at ${siteBase}/purchases using this email address.</p>
    </div>
  `;

  if (env.RESEND_API_KEY) {
    await sendResendEmail(env, {
      to: tx.buyer_email,
      subject: `Your NexusByte Purchase: ${productTitle}`,
      html: buyerEmailHtml,
    });
  } else {
    console.log(`[NexusByte Buyer Email] ${tx.buyer_email} -> ${vaultUrl} (${licenseKey})`);
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
      'SELECT title, file_name, b2_file_key, digital_content FROM products WHERE id = ?'
    )
      .bind(tx.product_id)
      .first();

    let downloadUrl = null;
    if (product?.b2_file_key) {
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
        product_title: product?.title || 'Digital Asset',
        file_name: product?.file_name || 'archive.zip',
        license_key: tx.license_key,
        download_url: downloadUrl,
        digital_content: product?.digital_content || null,
      },
      200,
      cors
    );
  }

  return jsonResponse({ status: tx.status, order_id: tx.order_id }, 200, cors);
}

async function handleMyOrders(request, env, cors) {
  const auth = await requireAuth(request, env);
  if (!auth) {
    return jsonResponse({ error: 'Unauthorized: sign in to access your library' }, 401, cors);
  }

  const { results } = await env.DB.prepare(
    `SELECT t.*, p.title AS product_title, p.category AS product_category, p.version AS product_version,
            p.file_name, p.b2_file_key, p.delivery_type
     FROM transactions t
     LEFT JOIN products p ON t.product_id = p.id
     WHERE t.buyer_email = ? AND t.status = 'finished'
     ORDER BY t.created_at DESC`
  )
    .bind(auth.user.email.toLowerCase())
    .all();

  const orders = await Promise.all(
    (results || []).map(async (row) => {
      let downloadUrl = null;
      if (row.b2_file_key) {
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
        productVersion: row.product_version || 'v1.0',
        deliveryType: row.delivery_type || 'both',
        priceUSD: centsToUsd(row.total_cents),
        status: 'paid',
        paymentMeta: {
          trackId: row.id,
          cryptoCurrency: 'CRYPTO',
        },
        secureDelivery: {
          downloadUrl,
          downloadToken: row.order_id,
          downloadExpiresAt: Date.now() + 900 * 1000,
          downloadCount: 0,
          maxDownloads: 99,
          licenseKey: row.license_key,
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
// MULTI-VENDOR ONBOARDING, STATS & PAYOUTS
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
    `INSERT INTO sellers (id, display_name, wallet_address, balance_cents)
     VALUES (?, ?, ?, 0)
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
    'SELECT id, display_name, wallet_address, balance_cents, created_at FROM sellers WHERE id = ?'
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

async function handleVendorStats(request, env, cors) {
  const { auth, error } = await requireSeller(request, env, cors);
  if (error) return error;

  const sellerId = auth.seller.id;

  const prodCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM products WHERE seller_id = ?')
    .bind(sellerId)
    .first();

  const sales = await env.DB.prepare(
    "SELECT COUNT(*) as cnt, COALESCE(SUM(total_cents), 0) as gross_cents, COALESCE(SUM(seller_share_cents), 0) as net_cents FROM transactions WHERE seller_id = ? AND status = 'finished'"
  )
    .bind(sellerId)
    .first();

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
      totalProducts: Number(prodCount?.cnt || 0),
      totalSalesCount: Number(sales?.cnt || 0),
      totalRevenueUSD: centsToUsd(sales?.gross_cents || 0),
      netEarningsUSD: centsToUsd(sales?.net_cents || 0),
      availableBalanceUSD: centsToUsd(auth.seller.balance_cents || 0),
      recentOrders: [],
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

  const amountUsd = centsToUsd(amountCents);

  try {
    const authRes = await fetch('https://api.nowpayments.io/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.NOWPAYMENTS_EMAIL, password: env.NOWPAYMENTS_PASSWORD }),
    });
    if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
    const authData = await authRes.json();
    const token = authData.token;

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
    const batchId = String(payoutData.batch_withdrawal_id || payoutData.id);

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

    await env.DB.prepare(
      'INSERT INTO withdrawals (id, seller_id, amount_cents, wallet_address, batch_id, status) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), sellerId, amountCents, auth.seller.wallet_address, batchId, 'processing')
      .run();

    return jsonResponse({ success: true, batchId, status: 'processing' }, 200, cors);
  } catch (err) {
    await env.DB.prepare('UPDATE sellers SET balance_cents = balance_cents + ? WHERE id = ?')
      .bind(amountCents, sellerId)
      .run();
    return jsonResponse({ error: 'Payout failed, funds restored', details: err.message }, 502, cors);
  }
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

  // Canonical query string parameters must be sorted alphabetically by encoded key
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
