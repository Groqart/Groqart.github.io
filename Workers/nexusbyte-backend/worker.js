function getCorsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net';
  const isAllowed =
    origin === allowed ||
    origin.endsWith('.pages.dev') ||
    origin.startsWith('http://localhost:');

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowed,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-marketplace-token',
  };
}

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const cors = getCorsHeaders(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    try {
      // 1. Список товаров для витрины
      if (url.pathname === '/api/products' && request.method === 'GET') {
        return await handleGetProducts(env, cors);
      }

      // 2. Создание товара продавцом (в D1)
      if (url.pathname === '/api/products' && request.method === 'POST') {
        return await handleCreateProduct(request, env, cors);
      }

      // 3. Удаление товара продавцом
      if (url.pathname.startsWith('/api/products/') && request.method === 'DELETE') {
        const id = url.pathname.replace('/api/products/', '');
        return await handleDeleteProduct(id, request, env, cors);
      }

      // 4. Выдача временной ссылки (Presigned PUT) для прямой загрузки файла в Backblaze B2
      if (url.pathname === '/api/upload-url' && request.method === 'POST') {
        return await handleGetUploadUrl(request, env, cors);
      }

      // 5. Создание платежа NOWPayments (покупка)
      if (url.pathname === '/api/create-payment' && request.method === 'POST') {
        return await handleCreatePayment(request, env, cors);
      }

      // 6. Вебхук от NOWPayments (IPN)
      if (url.pathname === '/api/nowpayments-ipn' && request.method === 'POST') {
        return await handleIPN(request, env);
      }

      // 7. Проверка статуса заказа + получение ссылки на скачивание из B2
      if (url.pathname === '/api/order-status' && request.method === 'GET') {
        return await handleOrderStatus(request, env, cors);
      }

      // 8. Библиотека покупок по email
      if (url.pathname === '/api/orders/my' && request.method === 'GET') {
        return await handleMyOrders(request, env, cors);
      }

      // 9. Регистрация продавца
      if (url.pathname === '/api/register-seller' && request.method === 'POST') {
        return await handleRegisterSeller(request, env, cors);
      }

      // 10. Статистика продавца
      if (url.pathname === '/api/vendor/stats' && request.method === 'GET') {
        return await handleVendorStats(request, env, cors);
      }

      // 11. Вывод средств продавцом
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
// ТОВАРЫ (D1)
// ==========================================
async function handleGetProducts(env, cors) {
  const { results } = await env.DB.prepare(
    'SELECT id, seller_id, title, price_usd, file_name, file_size, category, tagline, description, version, delivery_type, created_at FROM products ORDER BY created_at DESC'
  ).all();

  const mapped = (results || []).map((p) => ({
    id: p.id,
    slug: p.id,
    title: p.title,
    tagline: p.tagline || 'Digital software package',
    description: p.description || p.title,
    priceUSD: Number(p.price_usd),
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
    vendorName: p.seller_id,
    vendorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    rating: 5.0,
    reviewsCount: 1,
    salesCount: 0,
    bannerGradient: 'from-cyan-600 via-blue-600 to-indigo-700',
    tags: [p.category || 'Software'],
    features: ['Instant crypto checkout via NOWPayments', 'Protected Backblaze B2 delivery'],
    changelog: [],
    downloadContentSample: '',
    createdAt: p.created_at || new Date().toISOString(),
  }));

  return jsonResponse({ products: mapped }, 200, cors);
}

async function handleCreateProduct(request, env, cors) {
  const authToken = request.headers.get('x-marketplace-token');
  if (!env.MARKETPLACE_SECRET_TOKEN || authToken !== env.MARKETPLACE_SECRET_TOKEN) {
    return jsonResponse({ error: 'Unauthorized: invalid vendor token' }, 401, cors);
  }

  const body = await request.json();
  const {
    seller_id = 'vendor_default',
    title,
    priceUSD,
    b2_file_key,
    fileName,
    fileSize,
    category = 'Scripts & Code',
    tagline = '',
    description = '',
    version = 'v1.0.0',
    deliveryType = 'both',
  } = body;

  if (!title || !priceUSD || !b2_file_key) {
    return jsonResponse({ error: 'title, priceUSD, and b2_file_key are required' }, 400, cors);
  }

  const productId = `prod_${crypto.randomUUID().slice(0, 8)}`;

  await env.DB.prepare(
    `INSERT INTO products (id, seller_id, title, price_usd, b2_file_key, file_name, file_size, category, tagline, description, version, delivery_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      productId,
      String(seller_id),
      String(title),
      Number(priceUSD),
      String(b2_file_key),
      String(fileName || 'package.zip'),
      String(fileSize || 'Unknown'),
      String(category),
      String(tagline),
      String(description),
      String(version),
      String(deliveryType)
    )
    .run();

  return jsonResponse({ success: true, id: productId }, 201, cors);
}

async function handleDeleteProduct(id, request, env, cors) {
  const authToken = request.headers.get('x-marketplace-token');
  if (!env.MARKETPLACE_SECRET_TOKEN || authToken !== env.MARKETPLACE_SECRET_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }

  await env.DB.prepare('DELETE FROM products WHERE id = ?').bind(String(id)).run();
  return jsonResponse({ success: true }, 200, cors);
}

// ==========================================
// ЗАГРУЗКА ФАЙЛОВ В BACKBLAZE B2 (Presigned PUT)
// ==========================================
async function handleGetUploadUrl(request, env, cors) {
  const authToken = request.headers.get('x-marketplace-token');
  if (!env.MARKETPLACE_SECRET_TOKEN || authToken !== env.MARKETPLACE_SECRET_TOKEN) {
    return jsonResponse({ error: 'Unauthorized: vendor token required to upload files' }, 401, cors);
  }

  const { fileName } = await request.json();
  if (!fileName) {
    return jsonResponse({ error: 'fileName is required' }, 400, cors);
  }

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileKey = `products/${Date.now()}_${crypto.randomUUID().slice(0, 6)}_${safeName}`;

  const uploadUrl = await createB2PresignedUrl({
    method: 'PUT',
    key: fileKey,
    expiresIn: 900, // 15 минут на загрузку
    env,
  });

  return jsonResponse({ uploadUrl, fileKey }, 200, cors);
}

// ==========================================
// ОПЛАТА NOWPAYMENTS
// ==========================================
async function handleCreatePayment(request, env, cors) {
  const body = await request.json();
  const { product_id, buyer_email = 'customer@nexusbyte.io' } = body;

  if (!product_id) {
    return jsonResponse({ error: 'product_id is required' }, 400, cors);
  }

  const product = await env.DB.prepare(
    'SELECT id, seller_id, title, price_usd FROM products WHERE id = ?'
  )
    .bind(String(product_id))
    .first();

  if (!product) {
    return jsonResponse({ error: 'Product not found in database' }, 404, cors);
  }

  const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const totalAmount = Number(product.price_usd);
  const sellerShare = totalAmount * 0.95;
  const platformShare = totalAmount * 0.05;
  const siteBase = env.ALLOWED_ORIGIN || 'https://nexusbyte.de5.net';

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
      success_url: `${siteBase}/purchases?order_id=${orderId}`,
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
    `INSERT INTO transactions (id, order_id, product_id, seller_id, buyer_email, total_amount, seller_share, platform_share, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting')`
  )
    .bind(
      invoiceId,
      orderId,
      String(product.id),
      String(product.seller_id),
      String(buyer_email).toLowerCase(),
      totalAmount,
      sellerShare,
      platformShare
    )
    .run();

  return jsonResponse(
    {
      order_id: orderId,
      invoice_id: invoiceId,
      invoice_url: invoiceData.invoice_url,
      amount: totalAmount,
    },
    200,
    cors
  );
}

// ==========================================
// ВЕБХУК IPN (ЗАЧИСЛЕНИЕ + ВЫДАЧА КЛЮЧА)
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
      const expectedAmount = Number(tx.total_amount);
      const paidPriceAmount = parseFloat(event.price_amount || 0);
      const actuallyPaid = parseFloat(event.actually_paid || 0);
      const payAmount = parseFloat(event.pay_amount || 0);

      // Защита от подмены суммы и недоплаты
      if (Math.abs(paidPriceAmount - expectedAmount) > 0.05) {
        return new Response('Price amount mismatch', { status: 400 });
      }
      if (payAmount > 0 && actuallyPaid < payAmount * 0.98) {
        return new Response('Underpaid transaction', { status: 400 });
      }

      const licenseKey = `KEY-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      await env.DB.prepare('UPDATE sellers SET balance_usd = balance_usd + ? WHERE id = ?')
        .bind(tx.seller_share, tx.seller_id)
        .run();

      await env.DB.prepare("UPDATE transactions SET status = 'finished', license_key = ? WHERE id = ?")
        .bind(licenseKey, tx.id)
        .run();
    }
  }

  return new Response('OK', { status: 200 });
}

// ==========================================
// СТАТУС ЗАКАЗА + PRESIGNED GET НА BACKBLAZE B2
// ==========================================
async function handleOrderStatus(request, env, cors) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');
  if (!orderId) return jsonResponse({ error: 'order_id is required' }, 400, cors);

  const tx = await env.DB.prepare('SELECT * FROM transactions WHERE order_id = ?').bind(orderId).first();
  if (!tx) return jsonResponse({ error: 'Order not found' }, 404, cors);

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
        expiresIn: 900, // ссылка работает 15 минут
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

  return jsonResponse({ status: tx.status }, 200, cors);
}

async function handleMyOrders(request, env, cors) {
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').toLowerCase();
  if (!email) return jsonResponse({ orders: [] }, 200, cors);

  const { results } = await env.DB.prepare(
    `SELECT t.*, p.title AS product_title, p.category AS product_category, p.version AS product_version, p.file_name, p.b2_file_key, p.delivery_type
     FROM transactions t
     LEFT JOIN products p ON t.product_id = p.id
     WHERE t.buyer_email = ? AND t.status = 'finished'
     ORDER BY t.created_at DESC`
  )
    .bind(email)
    .all();

  const orders = await Promise.all(
    (results || []).map(async (row) => {
      let downloadUrl = null;
      if (row.b2_file_key) {
        downloadUrl = await createB2PresignedUrl({
          method: 'GET',
          key: row.b2_file_key,
          expiresIn: 900,
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
        priceUSD: Number(row.total_amount),
        status: 'paid',
        oxaInvoice: {
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
      };
    })
  );

  return jsonResponse({ orders }, 200, cors);
}

// ==========================================
// ПРОДАВЕЦ: РЕГИСТРАЦИЯ, СТАТИСТИКА, ВЫВОД
// ==========================================
async function handleRegisterSeller(request, env, cors) {
  const authToken = request.headers.get('x-marketplace-token');
  if (authToken !== env.MARKETPLACE_SECRET_TOKEN) {
    return jsonResponse({ error: 'Unauthorized access' }, 401, cors);
  }

  const { id, wallet_address } = await request.json();
  if (!id || !wallet_address) {
    return jsonResponse({ error: 'id and wallet_address are required' }, 400, cors);
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO sellers (id, wallet_address, balance_usd) VALUES (?, ?, COALESCE((SELECT balance_usd FROM sellers WHERE id = ?), 0.0))'
  )
    .bind(String(id), String(wallet_address), String(id))
    .run();

  return jsonResponse({ success: true, message: 'Seller registered' }, 200, cors);
}

async function handleVendorStats(request, env, cors) {
  const url = new URL(request.url);
  const sellerId = url.searchParams.get('vendorId') || 'vendor_default';

  const seller = await env.DB.prepare('SELECT balance_usd FROM sellers WHERE id = ?').bind(sellerId).first();
  const prodCount = await env.DB.prepare('SELECT COUNT(*) as cnt FROM products WHERE seller_id = ?').bind(sellerId).first();
  const sales = await env.DB.prepare(
    "SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount), 0) as gross, COALESCE(SUM(seller_share), 0) as net FROM transactions WHERE seller_id = ? AND status = 'finished'"
  )
    .bind(sellerId)
    .first();

  return jsonResponse(
    {
      totalProducts: prodCount?.cnt || 0,
      totalSalesCount: sales?.cnt || 0,
      totalRevenueUSD: Number(sales?.gross || 0),
      netEarningsUSD: Number(sales?.net || 0),
      availableBalanceUSD: Number(seller?.balance_usd || 0),
      recentOrders: [],
    },
    200,
    cors
  );
}

async function handleWithdraw(request, env, cors) {
  const authToken = request.headers.get('x-marketplace-token');
  if (authToken !== env.MARKETPLACE_SECRET_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors);
  }

  const { seller_id, amount_to_withdraw } = await request.json();
  const amount = Number(amount_to_withdraw);
  const sellerId = String(seller_id);

  if (isNaN(amount) || amount < 5.0) {
    return jsonResponse({ error: 'Minimum withdrawal is 5.00 USD' }, 400, cors);
  }

  const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ?').bind(sellerId).first();
  if (!seller) return jsonResponse({ error: 'Seller not found' }, 404, cors);

  const deduct = await env.DB.prepare(
    'UPDATE sellers SET balance_usd = balance_usd - ? WHERE id = ? AND balance_usd >= ?'
  )
    .bind(amount, sellerId, amount)
    .run();

  if (deduct.meta.changes === 0) {
    return jsonResponse({ error: 'Insufficient funds' }, 400, cors);
  }

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
        withdrawals: [{ address: seller.wallet_address, amount, currency: 'usdc', network: 'base' }],
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
      'INSERT INTO withdrawals (id, seller_id, amount, batch_id, status) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(crypto.randomUUID(), sellerId, amount, batchId, 'processing')
      .run();

    return jsonResponse({ success: true, batchId, status: 'processing' }, 200, cors);
  } catch (err) {
    await env.DB.prepare('UPDATE sellers SET balance_usd = balance_usd + ? WHERE id = ?')
      .bind(amount, sellerId)
      .run();
    return jsonResponse({ error: 'Payout failed, funds restored', details: err.message }, 502, cors);
  }
}

// ==========================================
// AWS SIGV4 PRESIGNED URL ДЛЯ BACKBLAZE B2 (БЕЗ NPM-ПАКЕТОВ)
// ==========================================
async function createB2PresignedUrl({ method, key, expiresIn = 900, env }) {
  const accessKeyId = env.B2_KEY_ID;
  const secretAccessKey = env.B2_APP_KEY;
  const bucket = env.B2_BUCKET_NAME;
  const endpoint = env.B2_ENDPOINT; // например s3.eu-central-003.backblazeb2.com
  const region = env.B2_REGION;     // например eu-central-003

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

  const canonicalQueryString = queryParams
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
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

// ==========================================
// УТИЛИТЫ NOWPAYMENTS (IPN + TOTP)
// ==========================================
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
