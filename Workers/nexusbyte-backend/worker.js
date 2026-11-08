// Разрешенные источники для CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': 'https://nexusbyte.de5.net',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-marketplace-token',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      // 1. Создание инвойса (покупатель на сайте)
      if (url.pathname === '/api/create-payment' && request.method === 'POST') {
        return await handleCreatePayment(request, env);
      }

      // 2. Вебхук от NOWPayments (обработка платежа)
      if (url.pathname === '/api/nowpayments-ipn' && request.method === 'POST') {
        return await handleIPN(request, env);
      }

      // 3. Проверка статуса заказа (фронтенд проверяет, оплачен ли заказ)
      if (url.pathname === '/api/order-status' && request.method === 'GET') {
        return await handleOrderStatus(request, env);
      }

      // 4. Регистрация нового продавца
      if (url.pathname === '/api/register-seller' && request.method === 'POST') {
        return await handleRegisterSeller(request, env);
      }

      // 5. Запрос на вывод средств продавцом
      if (url.pathname === '/api/withdraw' && request.method === 'POST') {
        return await handleWithdraw(request, env);
      }

      return jsonResponse({ error: 'Endpoint Not Found' }, 404);
    } catch (globalError) {
      return jsonResponse({ error: 'Internal Server Error', details: globalError.message }, 500);
    }
  }
};

// ==========================================
// 1. СОЗДАНИЕ ПЛАТЕЖА (С защитой цены из БД)
// ==========================================
async function handleCreatePayment(request, env) {
  const body = await request.json();
  const { product_id } = body;

  if (!product_id) {
    return jsonResponse({ error: 'product_id is required' }, 400);
  }

  // БЕЗОПАСНОСТЬ: Берем цену и продавца из базы D1, а не из браузера!
  const product = await env.DB.prepare(
    'SELECT id, seller_id, title, price_usd FROM products WHERE id = ?'
  ).bind(String(product_id)).first();

  if (!product) {
    return jsonResponse({ error: 'Product not found' }, 404);
  }

  const orderId = `ORDER-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const totalAmount = Number(product.price_usd);
  const sellerShare = totalAmount * 0.95; // 95% продавцу
  const platformShare = totalAmount * 0.05; // 5% платформе

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
      order_description: `Покупка: ${product.title}`,
      ipn_callback_url: `${new URL(request.url).origin}/api/nowpayments-ipn`,
      success_url: `https://nexusbyte.de5.net/success.html?order_id=${orderId}`,
      cancel_url: `https://nexusbyte.de5.net/cancel.html`
    }),
  });

  if (!invoiceRes.ok) {
    const errorText = await invoiceRes.text();
    return jsonResponse({ error: `NOWPayments error: ${errorText}` }, invoiceRes.status);
  }

  const invoiceData = await invoiceRes.json();
  const invoiceId = String(invoiceData.id);

  // Сохраняем заказ в БД
  await env.DB.prepare(
    `INSERT INTO transactions (id, order_id, product_id, seller_id, total_amount, seller_share, platform_share, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, 'waiting')`
  ).bind(
    invoiceId, 
    orderId, 
    String(product.id), 
    String(product.seller_id), 
    totalAmount, 
    sellerShare, 
    platformShare
  ).run();

  return jsonResponse({
    order_id: orderId,
    invoice_url: invoiceData.invoice_url,
    amount: totalAmount
  });
}

// ==========================================
// 2. ВЕБХУК IPN (Зачисление средств)
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

  // Проверка HMAC SHA-512 подписи
  const sortedPayload = JSON.stringify(sortObjectDeep(event));
  const isValid = await verifySignature(sortedPayload, signature, env.NOWPAYMENTS_IPN_SECRET);
  if (!isValid) return new Response('Invalid signature', { status: 401 });

  if (event.payment_status === 'finished') {
    const paymentId = String(event.payment_id || '');
    const invoiceId = String(event.invoice_id || '');
    const orderId = String(event.order_id || '');

    // Ищем транзакцию по invoice_id или order_id
    const tx = await env.DB.prepare(
      'SELECT * FROM transactions WHERE id = ? OR id = ? OR order_id = ?'
    ).bind(invoiceId, paymentId, orderId).first();

    if (tx && tx.status !== 'finished') {
      const expectedAmount = Number(tx.total_amount);
      const paidAmount = parseFloat(event.price_amount || 0);

      // Сверяем сумму в долларах
      if (Math.abs(paidAmount - expectedAmount) > 0.05) {
        console.error(`Amount mismatch: expected ${expectedAmount}, got ${paidAmount}`);
        return new Response('Amount mismatch', { status: 400 });
      }

      // Начисляем баланс продавцу
      await env.DB.prepare(
        'UPDATE sellers SET balance_usd = balance_usd + ? WHERE id = ?'
      ).bind(tx.seller_share, tx.seller_id).run();

      // Закрываем транзакцию
      await env.DB.prepare("UPDATE transactions SET status = 'finished' WHERE id = ?").bind(tx.id).run();
    }
  }

  return new Response('OK', { status: 200 });
}

// ==========================================
// 3. ПРОВЕРКА СТАТУСА И ВЫДАЧА ТОВАРА
// ==========================================
async function handleOrderStatus(request, env) {
  const url = new URL(request.url);
  const orderId = url.searchParams.get('order_id');

  if (!orderId) return jsonResponse({ error: 'order_id is required' }, 400);

  const tx = await env.DB.prepare(
    'SELECT * FROM transactions WHERE order_id = ?'
  ).bind(orderId).first();

  if (!tx) return jsonResponse({ error: 'Order not found' }, 404);

  if (tx.status === 'finished') {
    // Получаем цифровой товар (ключ, ссылка и т.п.)
    const product = await env.DB.prepare(
      'SELECT digital_content FROM products WHERE id = ?'
    ).bind(tx.product_id).first();

    return jsonResponse({
      status: 'finished',
      message: 'Payment completed',
      digital_content: product ? product.digital_content : null
    });
  }

  return jsonResponse({ status: tx.status }); // 'waiting' или 'confirming'
}

// ==========================================
// 4. РЕГИСТРАЦИЯ ПРОДАВЦА
// ==========================================
async function handleRegisterSeller(request, env) {
  const authToken = request.headers.get('x-marketplace-token');
  if (authToken !== env.MARKETPLACE_SECRET_TOKEN) {
    return jsonResponse({ error: 'Unauthorized access' }, 401);
  }

  const { id, wallet_address } = await request.json();
  if (!id || !wallet_address) {
    return jsonResponse({ error: 'id and wallet_address are required' }, 400);
  }

  await env.DB.prepare(
    'INSERT OR REPLACE INTO sellers (id, wallet_address, balance_usd) VALUES (?, ?, COALESCE((SELECT balance_usd FROM sellers WHERE id = ?), 0.0))'
  ).bind(String(id), String(wallet_address), String(id)).run();

  return jsonResponse({ success: true, message: 'Seller registered' });
}

// ==========================================
// 5. ВЫВОД СРЕДСТВ (Payout с TOTP и защитой)
// ==========================================
async function handleWithdraw(request, env) {
  const authToken = request.headers.get('x-marketplace-token');
  if (authToken !== env.MARKETPLACE_SECRET_TOKEN) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const { seller_id, amount_to_withdraw } = await request.json();
  const amount = Number(amount_to_withdraw);
  const sellerId = String(seller_id);

  // Валидация
  if (isNaN(amount) || amount < 5.0) {
    return jsonResponse({ error: 'Minimum withdrawal is 5.00 USD' }, 400);
  }

  const seller = await env.DB.prepare('SELECT * FROM sellers WHERE id = ?').bind(sellerId).first();
  if (!seller) return jsonResponse({ error: 'Seller not found' }, 404);

  // 5.1. Атомарное списание баланса
  const deduct = await env.DB.prepare(
    'UPDATE sellers SET balance_usd = balance_usd - ? WHERE id = ? AND balance_usd >= ?'
  ).bind(amount, sellerId, amount).run();

  if (deduct.meta.changes === 0) {
    return jsonResponse({ error: 'Insufficient funds' }, 400);
  }

  let token = '';
  let batchId = '';

  try {
    // 5.2. Авторизация в NOWPayments
    const authRes = await fetch('https://api.nowpayments.io/v1/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: env.NOWPAYMENTS_EMAIL, password: env.NOWPAYMENTS_PASSWORD }),
    });
    if (!authRes.ok) throw new Error(`Auth failed: ${await authRes.text()}`);
    const authData = await authRes.json();
    token = authData.token;

    // 5.3. Создание заявки на выплату
    const payoutRes = await fetch('https://api.nowpayments.io/v1/payout', {
      method: 'POST',
      headers: {
        'x-api-key': env.NOWPAYMENTS_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        withdrawals: [{
          address: seller.wallet_address,
          amount: amount,
          currency: 'usdc',
          network: 'base'
        }]
      }),
    });
    if (!payoutRes.ok) throw new Error(`Payout error: ${await payoutRes.text()}`);
    const payoutData = await payoutRes.json();
    batchId = String(payoutData.batch_withdrawal_id || payoutData.id);

    // 5.4. TOTP-подтверждение
    const code = await generateTOTP(env.NOWPAYMENTS_TOTP_SECRET);
    const verifyRes = await fetch(`https://api.nowpayments.io/v1/payout/${batchId}/verify`, {
      method: 'POST',
      headers: {
        'x-api-key': env.NOWPAYMENTS_API_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ verification_code: code }),
    });
    if (!verifyRes.ok) throw new Error(`Verification error: ${await verifyRes.text()}`);

    // 5.5. Запись в таблицу истории выводов
    await env.DB.prepare(
      'INSERT INTO withdrawals (id, seller_id, amount, batch_id, status) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), sellerId, amount, batchId, 'processing').run();

    return jsonResponse({ success: true, batchId, status: 'processing' });

  } catch (err) {
    // Возврат средств на баланс при сбое
    await env.DB.prepare(
      'UPDATE sellers SET balance_usd = balance_usd + ? WHERE id = ?'
    ).bind(amount, sellerId).run();

    return jsonResponse({ error: 'Payout failed, funds restored', details: err.message }, 502);
  }
}

// ==========================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==========================================
function sortObjectDeep(obj) {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return obj;
  return Object.keys(obj).sort().reduce((acc, key) => {
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
    const sigBytes = new Uint8Array(matches.map(byte => parseInt(byte, 16)));
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

  // Используем Uint8Array вместо прямого чтения ArrayBuffer
  const sigBytes = new Uint8Array(signatureBuffer);
  const offset = sigBytes[sigBytes.length - 1] & 0xf;
  const binary = ((sigBytes[offset] & 0x7f) << 24) |
                 ((sigBytes[offset + 1] & 0xff) << 16) |
                 ((sigBytes[offset + 2] & 0xff) << 8) |
                 (sigBytes[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
}
