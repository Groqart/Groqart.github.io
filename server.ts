import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'node:crypto';
import {
  Product,
  Order,
  VendorPayout,
  NowPaymentsConfig,
  CryptoCurrency,
} from './src/types/marketplace';
import {
  calculateCryptoAmount,
  generateSandboxAddress,
  formatCryptoPaymentURI,
  generateSignedDownloadToken,
  verifyDownloadToken,
  generateLicenseKey,
  verifyNowPaymentsIpnSignature,
  verifyOxaPayWebhookSignature,
  SUPPORTED_CRYPTO,
} from './src/utils/nowpaymentsLogic';

const app = express();
const PORT = 3000;
const DOWNLOAD_SECRET = process.env.DOWNLOAD_SECRET || 'nexus_secure_signing_secret_9941';

// Save raw body for webhook HMAC verification
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);

import { INITIAL_PRODUCTS } from './src/data/initialProducts';

// NOWPayments Gateway Configuration (Live Production Credentials)
const nowPaymentsConfig: NowPaymentsConfig = {
  apiKey: process.env.NOWPAYMENTS_API_KEY || '18AMNE0-FTRM0YT-PA99F79-T7SB559',
  ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET || 'bc2ziZ+I+Xa4lpmE9zv4aQBrmLbe1xVI',
  sandboxMode: false,
};

let products: Product[] = [...INITIAL_PRODUCTS];

let orders: Order[] = [];
let payouts: VendorPayout[] = [];

// Seed an initial completed demo order for buyer so "My Purchases" is not empty on first visit
const initialOrderId = 'ord_demo_seed_001';
const initialProd = products[0];
const initialDownload = generateSignedDownloadToken(initialOrderId, DOWNLOAD_SECRET, 24);
const initialLicense = generateLicenseKey('HYPER');

orders.push({
  id: initialOrderId,
  buyerEmail: 'demo.buyer@nexusbyte.io',
  buyerName: 'Demo Buyer',
  productId: initialProd.id,
  productTitle: initialProd.title,
  productCategory: initialProd.category,
  productVersion: initialProd.version,
  deliveryType: initialProd.deliveryType,
  priceUSD: initialProd.priceUSD,
  status: 'paid',
  oxaInvoice: {
    trackId: 'TRK_DEMO_SEED_001',
    address: 'bc1q9p82k8y4u2z119a7demoseed000000000',
    cryptoCurrency: 'USDT',
    network: 'TRC20',
    cryptoAmount: initialProd.priceUSD,
    qrCodeData: formatCryptoPaymentURI('USDT', 'bc1q9p82k8y4u2z119a7demoseed000000000', initialProd.priceUSD),
    expiresAt: Date.now() + 15 * 60 * 1000,
    isSandbox: true,
  },
  secureDelivery: {
    downloadToken: initialDownload.token,
    downloadExpiresAt: initialDownload.expiresAt,
    downloadCount: 1,
    maxDownloads: 5,
    licenseKey: initialLicense,
    fileName: initialProd.fileInfo.fileName,
  },
  createdAt: new Date(Date.now() - 3600 * 1000 * 4).toISOString(),
  paidAt: new Date(Date.now() - 3600 * 1000 * 4 + 45000).toISOString(),
});

// ==========================================
// API ROUTES
// ==========================================

// 1. Products List with filtering and search
app.get('/api/products', (req: Request, res: Response) => {
  const { category, search, sort, vendorId } = req.query;
  let results = [...products];

  if (category && category !== 'All') {
    results = results.filter((p) => p.category === category);
  }

  if (vendorId) {
    results = results.filter((p) => p.vendorId === vendorId);
  }

  if (search) {
    const q = String(search).toLowerCase();
    results = results.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
    );
  }

  if (sort === 'price_asc') {
    results.sort((a, b) => a.priceUSD - b.priceUSD);
  } else if (sort === 'price_desc') {
    results.sort((a, b) => b.priceUSD - a.priceUSD);
  } else if (sort === 'rating') {
    results.sort((a, b) => b.rating - a.rating);
  } else if (sort === 'sales') {
    results.sort((a, b) => b.salesCount - a.salesCount);
  } else {
    // Newest
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  res.json({ products: results });
});

// 2. Product Detail
app.get('/api/products/:id', (req: Request, res: Response) => {
  const prod = products.find((p) => p.id === req.params.id || p.slug === req.params.id);
  if (!prod) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ product: prod });
});

// 3. Create Product (Vendor upload)
app.post('/api/products', (req: Request, res: Response) => {
  const body = req.body;
  if (!body.title || !body.priceUSD || !body.category) {
    return res.status(400).json({ error: 'Title, price, and category are required' });
  }

  const newProduct: Product = {
    id: `prod_${crypto.randomBytes(6).toString('hex')}`,
    title: body.title,
    slug: body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    tagline: body.tagline || 'High-performance digital asset for modern developers',
    description: body.description || body.title,
    priceUSD: Number(body.priceUSD),
    category: body.category,
    deliveryType: body.deliveryType || 'both',
    licenseType: body.licenseType || 'Commercial',
    version: body.version || 'v1.0.0',
    fileInfo: {
      fileName: body.fileName || `${body.title.toLowerCase().replace(/\s+/g, '-')}-v1.0.zip`,
      fileSize: body.fileSize || '12.5 MB',
      format: body.fileFormat || 'ZIP Archive',
    },
    licenseKeysAvailable: body.deliveryType === 'file' ? undefined : (body.licenseKeysCount || 25),
    vendorId: body.vendorId || 'vendor_current_user',
    vendorName: body.vendorName || 'Your Studio',
    vendorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
    rating: 5.0,
    reviewsCount: 1,
    salesCount: 0,
    bannerGradient: body.bannerGradient || 'from-indigo-600 via-purple-600 to-pink-600',
    tags: body.tags || ['Digital Asset', 'Software'],
    features: body.features && body.features.length ? body.features : ['Instant secure digital delivery', 'Full source code & documentation'],
    changelog: [
      {
        version: body.version || 'v1.0.0',
        date: new Date().toISOString().split('T')[0],
        changes: ['Initial marketplace release'],
      },
    ],
    codeSnippetPreview: body.codeSnippetPreview,
    downloadContentSample:
      body.downloadContentSample ||
      `=====================================================\n${body.title.toUpperCase()}\n=====================================================\nPackaged digital distribution.\nChecksum: SHA256-${crypto.randomBytes(8).toString('hex')}\nLicense: ${body.licenseType || 'Commercial'}\n\nContents verified by NexusByte Gateway.`,
    createdAt: new Date().toISOString(),
  };

  products.unshift(newProduct);
  res.status(201).json({ product: newProduct });
});

// 4. Update Product
app.put('/api/products/:id', (req: Request, res: Response) => {
  const index = products.findIndex((p) => p.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const current = products[index];
  const updated: Product = {
    ...current,
    ...req.body,
    id: current.id, // prevent ID change
  };

  products[index] = updated;
  res.json({ product: updated });
});

// 5. Delete Product
app.delete('/api/products/:id', (req: Request, res: Response) => {
  const initialLen = products.length;
  products = products.filter((p) => p.id !== req.params.id);
  if (products.length === initialLen) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json({ success: true });
});

// ==========================================
// NOWPAYMENTS GATEWAY INTEGRATION
// ==========================================

// Create NOWPayments Invoice / Payment for a product purchase
app.post(['/api/nowpayments/create-invoice', '/api/oxapay/create-invoice', '/api/payments/create-invoice'], async (req: Request, res: Response) => {
  try {
    const { productId, buyerEmail, buyerName, cryptoCurrency = 'USDT' } = req.body;

    const product = products.find((p) => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cur = (cryptoCurrency.toUpperCase() in SUPPORTED_CRYPTO
      ? cryptoCurrency.toUpperCase()
      : 'USDT') as CryptoCurrency;

    const orderId = `ord_${crypto.randomBytes(8).toString('hex')}`;
    const trackId = `NP_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const meta = SUPPORTED_CRYPTO[cur] || SUPPORTED_CRYPTO.USDT;

    let paymentId: string | undefined = undefined;
    let depositAddress = generateSandboxAddress(cur);
    let cryptoAmount = calculateCryptoAmount(product.priceUSD, cur);
    let invoiceUrl = `https://nowpayments.io/payment/?order_id=${orderId}`;
    let isLiveNowPayments = false;

    // Call live NOWPayments API with user's credentials
    if (nowPaymentsConfig.apiKey) {
      try {
        const callbackUrl = `${req.protocol}://${req.get('host')}/api/nowpayments/ipn`;
        const nowRes = await fetch('https://api.nowpayments.io/v1/payment', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': nowPaymentsConfig.apiKey,
          },
          body: JSON.stringify({
            price_amount: product.priceUSD,
            price_currency: 'usd',
            pay_currency: meta.nowTicker,
            ipn_callback_url: callbackUrl,
            order_id: orderId,
            order_description: `${product.title} (${product.version})`,
          }),
        });

        if (nowRes.ok) {
          const nowData = await nowRes.json();
          paymentId = String(nowData.payment_id);
          depositAddress = nowData.pay_address || depositAddress;
          cryptoAmount = nowData.pay_amount || cryptoAmount;
          if (nowData.invoice_url) {
            invoiceUrl = nowData.invoice_url;
          }
          isLiveNowPayments = true;
          console.log(`[NOWPayments] Live payment created successfully: ID=${paymentId}, Address=${depositAddress}`);
        } else {
          const errData = await nowRes.json().catch(() => ({}));
          console.warn('[NOWPayments] Direct payment error, trying /v1/invoice:', errData);
          const invRes = await fetch('https://api.nowpayments.io/v1/invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': nowPaymentsConfig.apiKey,
            },
            body: JSON.stringify({
              price_amount: product.priceUSD,
              price_currency: 'usd',
              ipn_callback_url: callbackUrl,
              order_id: orderId,
              order_description: product.title,
            }),
          });
          if (invRes.ok) {
            const invData = await invRes.json();
            paymentId = String(invData.id);
            invoiceUrl = invData.invoice_url || invoiceUrl;
            isLiveNowPayments = true;
          }
        }
      } catch (apiErr) {
        console.warn('[NOWPayments] Network/API call error, using local fallback:', apiErr);
      }
    }

    const expiresAt = Date.now() + 20 * 60 * 1000; // 20-minute checkout window
    const qrCodeData = formatCryptoPaymentURI(cur, depositAddress, cryptoAmount);

    const nowInvoice = {
      paymentId: paymentId || trackId,
      trackId: paymentId || trackId,
      address: depositAddress,
      cryptoCurrency: cur,
      network: meta.network,
      cryptoAmount,
      qrCodeData,
      expiresAt,
      payLink: invoiceUrl,
      invoiceUrl,
      isSandbox: !isLiveNowPayments && nowPaymentsConfig.sandboxMode,
    };

    const newOrder: Order = {
      id: orderId,
      buyerEmail: buyerEmail || 'customer@nexusbyte.io',
      buyerName: buyerName || 'Valued Customer',
      productId: product.id,
      productTitle: product.title,
      productCategory: product.category,
      productVersion: product.version,
      deliveryType: product.deliveryType,
      priceUSD: product.priceUSD,
      status: 'pending',
      oxaInvoice: nowInvoice,
      paymentInvoice: nowInvoice,
      createdAt: new Date().toISOString(),
    };

    orders.unshift(newOrder);

    res.json({
      success: true,
      order: newOrder,
      invoice: nowInvoice,
    });
  } catch (err: any) {
    console.error('Create NOWPayments invoice error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment invoice' });
  }
});

// Poll payment status
app.get(['/api/nowpayments/payment/:trackId', '/api/oxapay/invoice/:trackId'], async (req: Request, res: Response) => {
  const trackId = req.params.trackId;
  const order = orders.find(
    (o) => o.oxaInvoice.trackId === trackId || o.oxaInvoice.paymentId === trackId || o.id === trackId
  );
  if (!order) {
    return res.status(404).json({ error: 'Invoice not found' });
  }

  // Poll live NOWPayments API if order is still pending and paymentId exists
  if (order.status === 'pending' && order.oxaInvoice.paymentId && nowPaymentsConfig.apiKey) {
    try {
      const checkRes = await fetch(`https://api.nowpayments.io/v1/payment/${order.oxaInvoice.paymentId}`, {
        headers: { 'x-api-key': nowPaymentsConfig.apiKey },
      });
      if (checkRes.ok) {
        const paymentData = await checkRes.json();
        const pStatus = String(paymentData.payment_status || '').toLowerCase();
        if (pStatus === 'finished' || pStatus === 'confirmed') {
          order.status = 'paid';
          order.paidAt = new Date().toISOString();
          const downloadSign = generateSignedDownloadToken(order.id, DOWNLOAD_SECRET, 24);
          let licenseKey: string | undefined = undefined;
          if (order.deliveryType === 'license_key' || order.deliveryType === 'both') {
            const prefix = (order.productTitle.split(' ')[0] || 'NEXUS').toUpperCase().slice(0, 5);
            licenseKey = generateLicenseKey(prefix);
          }
          const product = products.find((p) => p.id === order.productId);
          order.secureDelivery = {
            downloadToken: downloadSign.token,
            downloadExpiresAt: downloadSign.expiresAt,
            downloadCount: 0,
            maxDownloads: 5,
            licenseKey,
            fileName: product ? product.fileInfo.fileName : 'digital-package.zip',
          };
        } else if (pStatus === 'expired' || pStatus === 'failed') {
          order.status = 'expired';
        }
      }
    } catch {
      // ignore network errors during status poll
    }
  }

  // Check if pending has expired
  if (order.status === 'pending' && Date.now() > order.oxaInvoice.expiresAt) {
    order.status = 'expired';
  }

  res.json({
    status: order.status,
    order,
  });
});

// NOWPayments IPN Webhook Endpoint
// NOWPayments sends POST request upon confirmed blockchain transaction with x-nowpayments-sig HMAC-SHA512
app.post(['/api/nowpayments/ipn', '/api/oxapay/webhook'], (req: any, res: Response) => {
  try {
    const signature = req.headers['x-nowpayments-sig'] || req.headers['x-oxapay-signature'];
    const { payment_id, payment_status, order_id, trackId, status, isTestSimulation } = req.body;

    console.log(`[NOWPayments IPN] Notification received: payment_id=${payment_id}, status=${payment_status || status}, order_id=${order_id}`);

    const idToFind = String(order_id || trackId || payment_id);
    const order = orders.find(
      (o) =>
        o.id === idToFind ||
        o.oxaInvoice.trackId === idToFind ||
        o.oxaInvoice.paymentId === idToFind
    );

    if (!order) {
      console.warn(`[NOWPayments IPN] Order not found for ID: ${idToFind}`);
      return res.status(404).json({ error: 'Order not found for trackId' });
    }

    // Verify IPN HMAC-SHA512 signature using IPN Secret Key
    if (signature && nowPaymentsConfig.ipnSecret && !isTestSimulation) {
      const isValid = verifyNowPaymentsIpnSignature(req.body, signature, nowPaymentsConfig.ipnSecret);
      if (!isValid) {
        console.warn('[NOWPayments IPN] Invalid HMAC signature rejected');
        return res.status(401).json({ error: 'Invalid IPN HMAC signature' });
      }
    }

    const normalizedStatus = String(payment_status || status || '').toLowerCase();
    if (
      normalizedStatus === 'finished' ||
      normalizedStatus === 'confirmed' ||
      normalizedStatus === 'paid' ||
      normalizedStatus === 'complete'
    ) {
      order.status = 'paid';
      order.paidAt = new Date().toISOString();

      // Find product
      const product = products.find((p) => p.id === order.productId);
      if (product) {
        product.salesCount += 1;
        if (product.licenseKeysAvailable && product.licenseKeysAvailable > 0) {
          product.licenseKeysAvailable -= 1;
        }
      }

      // Generate signed, 24-hour time-limited download token
      const downloadSign = generateSignedDownloadToken(order.id, DOWNLOAD_SECRET, 24);

      // Generate license key if needed
      let licenseKey: string | undefined = undefined;
      if (order.deliveryType === 'license_key' || order.deliveryType === 'both') {
        const prefix = (order.productTitle.split(' ')[0] || 'NEXUS').toUpperCase().slice(0, 5);
        licenseKey = generateLicenseKey(prefix);
      }

      order.secureDelivery = {
        downloadToken: downloadSign.token,
        downloadExpiresAt: downloadSign.expiresAt,
        downloadCount: 0,
        maxDownloads: 5,
        licenseKey,
        fileName: product ? product.fileInfo.fileName : 'digital-package.zip',
      };

      console.log(`[NOWPayments IPN] Order ${order.id} marked as PAID. Secure token & license generated.`);
    } else if (normalizedStatus === 'expired' || normalizedStatus === 'failed') {
      order.status = 'expired';
    }

    res.json({
      success: true,
      message: 'IPN processed successfully',
      orderStatus: order.status,
      secureDeliveryReady: !!order.secureDelivery,
    });
  } catch (err: any) {
    console.error('[NOWPayments IPN Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Simulator Helper: Instant 1-click test payment
app.post(['/api/nowpayments/simulate-payment', '/api/oxapay/simulate-payment'], (req: Request, res: Response) => {
  const { trackId, payment_id } = req.body;
  const targetId = String(trackId || payment_id);
  const order = orders.find(
    (o) => o.oxaInvoice.trackId === targetId || o.oxaInvoice.paymentId === targetId || o.id === targetId
  );
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Trigger payment completion logic
  order.status = 'paid';
  order.paidAt = new Date().toISOString();

  const product = products.find((p) => p.id === order.productId);
  if (product) {
    product.salesCount += 1;
    if (product.licenseKeysAvailable && product.licenseKeysAvailable > 0) {
      product.licenseKeysAvailable -= 1;
    }
  }

  const downloadSign = generateSignedDownloadToken(order.id, DOWNLOAD_SECRET, 24);
  let licenseKey: string | undefined = undefined;
  if (order.deliveryType === 'license_key' || order.deliveryType === 'both') {
    const prefix = (order.productTitle.split(' ')[0] || 'NEXUS').toUpperCase().slice(0, 5);
    licenseKey = generateLicenseKey(prefix);
  }

  order.secureDelivery = {
    downloadToken: downloadSign.token,
    downloadExpiresAt: downloadSign.expiresAt,
    downloadCount: 0,
    maxDownloads: 5,
    licenseKey,
    fileName: product ? product.fileInfo.fileName : 'package.zip',
  };

  res.json({
    success: true,
    message: 'NOWPayments simulated payment completed! Assets unlocked.',
    order,
  });
});

// ==========================================
// SECURE DOWNLOAD VAULT
// ==========================================

// Token-protected file download
app.get('/api/downloads/:token', (req: Request, res: Response) => {
  const token = req.params.token;
  const verification = verifyDownloadToken(token, DOWNLOAD_SECRET);

  if (!verification.valid || !verification.orderId) {
    return res.status(403).json({
      error: verification.error || 'Access denied: Invalid or expired download token',
    });
  }

  const order = orders.find((o) => o.id === verification.orderId);
  if (!order) {
    return res.status(404).json({ error: 'Associated order not found' });
  }

  if (order.status !== 'paid') {
    return res.status(403).json({ error: 'Cannot download: Payment has not been confirmed' });
  }

  if (order.secureDelivery) {
    if (order.secureDelivery.downloadCount >= order.secureDelivery.maxDownloads) {
      return res.status(403).json({ error: 'Download limit exceeded (maximum 5 downloads reached)' });
    }
    order.secureDelivery.downloadCount += 1;
  }

  const product = products.find((p) => p.id === order.productId);
  const fileName = order.secureDelivery?.fileName || (product ? product.fileInfo.fileName : 'digital-asset.zip');

  const content = product
    ? `${product.downloadContentSample}\n\n[DELIVERY DETAILS]\nOrder: ${order.id}\nBuyer: ${order.buyerEmail}\nDelivery Timestamp: ${new Date().toISOString()}\nLicense Key: ${order.secureDelivery?.licenseKey || 'N/A'}`
    : `NexusByte Digital Asset Package\nOrder: ${order.id}`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.send(content);
});

// Buyer's Orders List
app.get('/api/orders/my', (req: Request, res: Response) => {
  const email = (req.query.email as string) || 'demo.buyer@nexusbyte.io';
  const buyerOrders = orders.filter((o) => !email || o.buyerEmail.toLowerCase() === email.toLowerCase());
  res.json({ orders: buyerOrders });
});

// Single Order Detail
app.get('/api/orders/:id', (req: Request, res: Response) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json({ order });
});

// ==========================================
// VENDOR STATS & PAYOUTS
// ==========================================
app.get('/api/vendor/stats', (req: Request, res: Response) => {
  const vendorId = (req.query.vendorId as string) || 'vendor_alex_dev';
  const vendorProducts = products.filter((p) => p.vendorId === vendorId);
  const vendorOrders = orders.filter((o) => {
    const prod = products.find((p) => p.id === o.productId);
    return prod && prod.vendorId === vendorId && o.status === 'paid';
  });

  const totalSalesUSD = vendorOrders.reduce((sum, o) => sum + o.priceUSD, 0);
  const netEarningsUSD = totalSalesUSD * 0.95; // 5% marketplace commission

  const paidOutUSD = payouts
    .filter((p) => p.vendorId === vendorId && p.status === 'completed')
    .reduce((sum, p) => sum + p.amountUSD, 0);

  const availableBalance = Math.max(0, netEarningsUSD - paidOutUSD);

  res.json({
    totalProducts: vendorProducts.length,
    totalSalesCount: vendorOrders.length,
    totalRevenueUSD: totalSalesUSD,
    netEarningsUSD,
    availableBalanceUSD: Math.round(availableBalance * 100) / 100,
    recentOrders: vendorOrders.slice(0, 10),
    payouts: payouts.filter((p) => p.vendorId === vendorId),
  });
});

app.post('/api/vendor/payout', (req: Request, res: Response) => {
  const { vendorId = 'vendor_alex_dev', amountUSD, cryptoAddress, cryptoCurrency = 'USDT' } = req.body;

  if (!amountUSD || amountUSD <= 0) {
    return res.status(400).json({ error: 'Valid payout amount required' });
  }
  if (!cryptoAddress) {
    return res.status(400).json({ error: 'Valid crypto destination address required' });
  }

  const payout: VendorPayout = {
    id: `pay_${crypto.randomBytes(6).toString('hex')}`,
    vendorId,
    amountUSD: Number(amountUSD),
    cryptoCurrency,
    address: cryptoAddress,
    status: 'completed', // instant simulated payout
    createdAt: new Date().toISOString(),
  };

  payouts.unshift(payout);
  res.status(201).json({ success: true, payout });
});

// Settings & NOWPayments Gateway Config
app.get(['/api/nowpayments/config', '/api/oxapay/config'], (_req: Request, res: Response) => {
  res.json({
    gateway: 'NOWPayments',
    apiKeyMasked: nowPaymentsConfig.apiKey ? `${nowPaymentsConfig.apiKey.slice(0, 7)}...${nowPaymentsConfig.apiKey.slice(-6)}` : '',
    hasApiKey: !!nowPaymentsConfig.apiKey,
    hasIpnSecret: !!nowPaymentsConfig.ipnSecret,
    sandboxMode: nowPaymentsConfig.sandboxMode,
    ipnCallbackUrl: '/api/nowpayments/ipn',
    webhookUrl: '/api/nowpayments/ipn',
    isApiKeyConfigured: !!nowPaymentsConfig.apiKey,
  });
});

app.post(['/api/nowpayments/config', '/api/oxapay/config'], (req: Request, res: Response) => {
  const { apiKey, ipnSecret, sandboxMode, merchantApiKey } = req.body;
  if (typeof sandboxMode === 'boolean') {
    nowPaymentsConfig.sandboxMode = sandboxMode;
  }
  if (apiKey !== undefined) {
    nowPaymentsConfig.apiKey = apiKey;
  } else if (merchantApiKey !== undefined) {
    nowPaymentsConfig.apiKey = merchantApiKey;
  }
  if (ipnSecret !== undefined) {
    nowPaymentsConfig.ipnSecret = ipnSecret;
  }
  res.json({ success: true, config: {
    gateway: 'NOWPayments',
    hasApiKey: !!nowPaymentsConfig.apiKey,
    hasIpnSecret: !!nowPaymentsConfig.ipnSecret,
    sandboxMode: nowPaymentsConfig.sandboxMode,
  } });
});

// ==========================================
// VITE SETUP (DEV vs PROD)
// ==========================================
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
