import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'node:crypto';
import {
  Product,
  Order,
  VendorPayout,
  OxaPayConfig,
  CryptoCurrency,
} from './src/types/marketplace';
import {
  calculateCryptoAmount,
  generateSandboxAddress,
  formatCryptoPaymentURI,
  generateSignedDownloadToken,
  verifyDownloadToken,
  generateLicenseKey,
  verifyOxaPayWebhookSignature,
  SUPPORTED_CRYPTO,
} from './src/utils/oxapayLogic';

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

// Global In-Memory Database
const oxaConfig: OxaPayConfig = {
  merchantApiKey: process.env.OXAPAY_API_KEY || 'sandbox_merchant_key_demo',
  sandboxMode: true,
  webhookSecret: 'oxapay_webhook_secret_sandbox_key',
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
// OXAPAY PAYMENT INTEGRATION
// ==========================================

// Create OxaPay Invoice for a product purchase
app.post('/api/oxapay/create-invoice', async (req: Request, res: Response) => {
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
    const trackId = `TRK_${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    const cryptoAmount = calculateCryptoAmount(product.priceUSD, cur);
    const depositAddress = generateSandboxAddress(cur);
    const network = SUPPORTED_CRYPTO[cur].network;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15-minute checkout window

    const qrCodeData = formatCryptoPaymentURI(cur, depositAddress, cryptoAmount);

    const oxaInvoice = {
      trackId,
      address: depositAddress,
      cryptoCurrency: cur,
      network,
      cryptoAmount,
      qrCodeData,
      expiresAt,
      payLink: `https://oxapay.com/pay/${trackId}`,
      isSandbox: oxaConfig.sandboxMode,
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
      oxaInvoice,
      createdAt: new Date().toISOString(),
    };

    orders.unshift(newOrder);

    res.json({
      success: true,
      order: newOrder,
      invoice: oxaInvoice,
    });
  } catch (err: any) {
    console.error('Create invoice error:', err);
    res.status(500).json({ error: err.message || 'Failed to create payment invoice' });
  }
});

// Poll invoice status
app.get('/api/oxapay/invoice/:trackId', (req: Request, res: Response) => {
  const order = orders.find((o) => o.oxaInvoice.trackId === req.params.trackId);
  if (!order) {
    return res.status(404).json({ error: 'Invoice not found' });
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

// OxaPay Webhook Endpoint
// OxaPay sends POST request upon confirmed blockchain transaction
app.post('/api/oxapay/webhook', (req: any, res: Response) => {
  try {
    const signature = req.headers['x-oxapay-signature'] || req.headers['hmac'];
    const { trackId, status, isTestSimulation } = req.body;

    console.log(`[OxaPay Webhook] Received webhook for trackId: ${trackId}, status: ${status}`);

    const order = orders.find((o) => o.oxaInvoice.trackId === trackId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found for trackId' });
    }

    // In live mode, verify signature. In sandbox or UI simulation, allow verified simulation
    if (!oxaConfig.sandboxMode && !isTestSimulation) {
      const isValid = verifyOxaPayWebhookSignature(req.rawBody || '', signature, oxaConfig.webhookSecret);
      if (!isValid) {
        console.warn('[OxaPay Webhook] Invalid signature rejected');
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    if (status === 'Paid' || status === 'paid' || status === 'Complete') {
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

      // Generate or retrieve license key if needed
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

      console.log(`[OxaPay Webhook] Order ${order.id} marked as PAID. Secure token & license generated.`);
    } else if (status === 'Expired' || status === 'expired') {
      order.status = 'expired';
    }

    res.json({
      result: 100,
      message: 'Webhook processed successfully',
      orderStatus: order.status,
      secureDeliveryReady: !!order.secureDelivery,
    });
  } catch (err: any) {
    console.error('[OxaPay Webhook Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// Sandbox Simulator Helper: Instant 1-click test payment
app.post('/api/oxapay/simulate-payment', (req: Request, res: Response) => {
  const { trackId } = req.body;
  const order = orders.find((o) => o.oxaInvoice.trackId === trackId);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Trigger internal webhook processing logic
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
    message: 'Payment simulation completed! Webhook dispatched and order released.',
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

// Settings & OxaPay Gateway Config
app.get('/api/oxapay/config', (_req: Request, res: Response) => {
  res.json({
    sandboxMode: oxaConfig.sandboxMode,
    isApiKeyConfigured: !!oxaConfig.merchantApiKey,
    webhookUrl: '/api/oxapay/webhook',
  });
});

app.post('/api/oxapay/config', (req: Request, res: Response) => {
  const { merchantApiKey, sandboxMode } = req.body;
  if (typeof sandboxMode === 'boolean') {
    oxaConfig.sandboxMode = sandboxMode;
  }
  if (merchantApiKey !== undefined) {
    oxaConfig.merchantApiKey = merchantApiKey;
  }
  res.json({ success: true, config: oxaConfig });
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
