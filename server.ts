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

// Global In-Memory Database
const oxaConfig: OxaPayConfig = {
  merchantApiKey: process.env.OXAPAY_API_KEY || 'sandbox_merchant_key_demo',
  sandboxMode: true,
  webhookSecret: 'oxapay_webhook_secret_sandbox_key',
};

let products: Product[] = [
  {
    id: 'prod_hypersaas_next15',
    title: 'HyperSaaS - Next.js 15 Full-Stack AI Boilerplate',
    slug: 'hypersaas-next15',
    tagline: 'Ship production-ready SaaS in 48 hours with Auth, OxaPay & Stripe crypto billing',
    description:
      'The modern developer boilerplate built on Next.js 15 App Router, React 19, Tailwind CSS v4, Prisma ORM, Server Actions, OxaPay crypto checkout, and Stripe. Fully typed with TypeScript and production-grade security headers.',
    priceUSD: 89,
    category: 'SaaS Starters',
    deliveryType: 'both',
    licenseType: 'Commercial',
    version: 'v2.4.1',
    fileInfo: {
      fileName: 'hypersaas-v2.4.1-source.zip',
      fileSize: '14.8 MB',
      format: 'ZIP (Next.js Project)',
    },
    licenseKeysAvailable: 42,
    vendorId: 'vendor_alex_dev',
    vendorName: 'Alex Rivers (Vortex Labs)',
    vendorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    rating: 4.95,
    reviewsCount: 148,
    salesCount: 890,
    bannerGradient: 'from-blue-600 via-indigo-600 to-purple-700',
    tags: ['Next.js 15', 'TypeScript', 'Tailwind v4', 'OxaPay', 'Prisma', 'AI SDK'],
    features: [
      'Next.js 15 App Router with Turbopack & React 19 Server Components',
      'Plug-and-play OxaPay Crypto & Stripe Dual Payment System',
      'Role-based Access Control (RBAC) & Magic Link Authentication',
      'AI Text & Image streaming pipeline ready out-of-the-box',
      'Lifetime updates and private GitHub access included',
    ],
    changelog: [
      {
        version: 'v2.4.1',
        date: '2026-10-18',
        changes: ['Upgraded to React 19 stable', 'Added zero-fee USDT TRC20 instant OxaPay webhook'],
      },
      {
        version: 'v2.3.0',
        date: '2026-09-02',
        changes: ['New Tailwind CSS v4 styling architecture', 'Optimized database cold start times'],
      },
    ],
    codeSnippetPreview: {
      language: 'typescript',
      filename: 'lib/oxapay.ts',
      code: `import { OxaPayClient } from '@oxapay/sdk';

export const oxa = new OxaPayClient({
  merchantKey: process.env.OXAPAY_MERCHANT_KEY!,
});

export async function createCryptoCheckout(orderId: string, amountUSD: number) {
  return await oxa.createInvoice({
    amount: amountUSD,
    currency: 'USD',
    orderId,
    callbackUrl: 'https://yourdomain.com/api/oxapay/webhook',
  });
}`,
    },
    downloadContentSample: `=====================================================
HYPERSAAS v2.4.1 - SOURCE ARCHIVE & PRODUCTION ASSETS
=====================================================
Thank you for your purchase from NexusByte Marketplace!
License: Commercial Unlimited Deployment
Order ID: Assigned Upon Verified Payment
Security Checksum: SHA256-4b9e28f7c908

Included files:
- /app (Next.js 15 app router)
- /lib/oxapay.ts (Crypto payments bridge)
- /components (Tailwind UI blocks)
- .env.example
- package.json
- README.md (Setup instructions)`,
    createdAt: '2026-08-15',
  },
  {
    id: 'prod_telebot_sniper',
    title: 'TeleBot Sniper - Telegram Crypto & DEX Trading Engine',
    slug: 'telebot-sniper',
    tagline: 'High-frequency Telegram sniper bot in Python 3.12 with mempool monitoring',
    description:
      'Ultra-fast asynchronous Telegram bot for monitoring liquidity pools, token snipes, limit orders, and automated take-profit / stop-loss tracking across Uniswap, Raydium, and PancakeSwap.',
    priceUSD: 149,
    category: 'Bots & Automation',
    deliveryType: 'both',
    licenseType: 'Commercial',
    version: 'v3.2.0',
    fileInfo: {
      fileName: 'telebot-sniper-v3.2-py.tar.gz',
      fileSize: '8.4 MB',
      format: 'TAR.GZ (Python Source)',
    },
    licenseKeysAvailable: 19,
    vendorId: 'vendor_satoshi_forge',
    vendorName: 'SatoshiForge Systems',
    vendorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    rating: 4.88,
    reviewsCount: 92,
    salesCount: 420,
    bannerGradient: 'from-emerald-600 via-teal-600 to-cyan-700',
    tags: ['Python 3.12', 'Telegram API', 'WebSockets', 'Raydium', 'AsyncIO'],
    features: [
      'Sub-50ms mempool scanning with private RPC failover',
      'Multi-wallet management with encrypted keystore',
      'Interactive Telegram UI with custom inline keyboards & charts',
      'Anti-MEV sandwich protection and simulated gas bumping',
      'One-click Docker compose deployment included',
    ],
    changelog: [
      {
        version: 'v3.2.0',
        date: '2026-10-10',
        changes: ['Added Solana Raydium CPMM pool auto-detection', 'Refactored async websocket reconnect loop'],
      },
    ],
    codeSnippetPreview: {
      language: 'python',
      filename: 'engine/sniper.py',
      code: `import asyncio
from web3 import AsyncWeb3
from telebot.async_telebot import AsyncTeleBot

class SniperEngine:
    def __init__(self, rpc_url: str, bot_token: str):
        self.w3 = AsyncWeb3(AsyncWeb3.AsyncHTTPProvider(rpc_url))
        self.bot = AsyncTeleBot(bot_token)

    async def monitor_mempool(self, pair_address: str):
        print(f"[+] Monitoring pool: {pair_address}")
        # Sub-millisecond tx parsing`,
    },
    downloadContentSample: `=====================================================
TELEBOT SNIPER v3.2.0 - PYTHON SOURCE PACKAGE
=====================================================
License: Single Operator Commercial License
Includes:
- /engine (Async mempool listeners & tx signer)
- /tg_interface (Aiogram telegram handlers)
- Dockerfile & docker-compose.yml
- config.yaml.example
- documentation.pdf`,
    createdAt: '2026-09-01',
  },
  {
    id: 'prod_cybermech_3d',
    title: 'CyberMech 2099 - Rigged & Animated 3D Sci-Fi Asset Pack',
    slug: 'cybermech-2099',
    tagline: 'Game-ready AAA mech robot with 35 mocap animations and 4K PBR textures',
    description:
      'Modular sci-fi bipedal battle mech rigged for Unreal Engine 5, Unity, and Blender. Includes 4 distinct camouflage skins, modular weaponry (plasma cannon, railgun, shield), and 35 animations.',
    priceUSD: 45,
    category: '3D & Game Assets',
    deliveryType: 'file',
    licenseType: 'Commercial',
    version: 'v1.5.0',
    fileInfo: {
      fileName: 'cybermech-2099-fbx-blend.zip',
      fileSize: '412 MB',
      format: 'ZIP (FBX, OBJ, BLEND, 4K Textures)',
    },
    licenseKeysAvailable: 999,
    vendorId: 'vendor_polygon_studio',
    vendorName: 'PolygonArts Interactive',
    vendorAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=faces',
    rating: 4.97,
    reviewsCount: 215,
    salesCount: 1340,
    bannerGradient: 'from-amber-600 via-orange-600 to-rose-700',
    tags: ['Unreal Engine 5', 'Blender', 'Unity', 'FBX', '4K PBR', 'Mocap'],
    features: [
      'UE5 Control Rig and Unity Mecanim compatible skeleton',
      '4K UDIM textures (BaseColor, Metallic, Roughness, Normal, Emissive)',
      '3 LOD levels (LOD0: 48k tris, LOD1: 22k tris, LOD2: 8k tris)',
      'Custom sounds FX for footsteps, firing, and hydraulic servos included',
    ],
    changelog: [
      {
        version: 'v1.5.0',
        date: '2026-09-20',
        changes: ['Added UE 5.5 retargeter profiles', 'Added Arctic Camo texture preset'],
      },
    ],
    downloadContentSample: `=====================================================
CYBERMECH 2099 - 3D PRODUCTION ASSETS
=====================================================
Package Contents:
- CyberMech_LOD0.fbx / LOD1.fbx / LOD2.fbx
- CyberMech_Master.blend
- /Textures_4K_PBR (PNG & TGA)
- /Animations_FBX (Walk, Run, Jump, Shoot_Plasma, Death_01)
- License_Commercial_Royalty_Free.txt`,
    createdAt: '2026-07-22',
  },
  {
    id: 'prod_rust_arbitrage',
    title: 'Fintech Quantum - Rust High-Frequency DEX/CEX Arbitrageur',
    slug: 'fintech-quantum-rust',
    tagline: 'Sub-millisecond triangular & cross-exchange arbitrage pipeline in Rust',
    description:
      'Engineered in Rust with Tokio and zero-allocation parsing. Connects via direct WebSocket feeds to Binance, Bybit, OKX, and Raydium. Includes mathematical profit simulation and slippage guard.',
    priceUSD: 299,
    category: 'Scripts & Code',
    deliveryType: 'both',
    licenseType: 'Extended Multi-Client',
    version: 'v4.0.2',
    fileInfo: {
      fileName: 'quantum-arb-v4.0.2-rust.zip',
      fileSize: '5.2 MB',
      format: 'ZIP (Cargo Workspace)',
    },
    licenseKeysAvailable: 15,
    vendorId: 'vendor_satoshi_forge',
    vendorName: 'SatoshiForge Systems',
    vendorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    rating: 4.92,
    reviewsCount: 38,
    salesCount: 185,
    bannerGradient: 'from-violet-600 via-purple-600 to-indigo-800',
    tags: ['Rust', 'Tokio', 'HFT', 'Arbitrage', 'Zero-Allocation', 'WebSockets'],
    features: [
      'Microsecond execution times with lock-free ring buffers',
      'Triangular cross-pair pathfinding algorithm with graph theory',
      'Direct order book level 2 & level 3 delta reconstitution',
      'Configurable risk parameters and emergency stop triggers',
    ],
    changelog: [
      {
        version: 'v4.0.2',
        date: '2026-10-12',
        changes: ['Memory layout optimizations with SIMD parsing', 'Added Bybit V5 Unified Margin support'],
      },
    ],
    codeSnippetPreview: {
      language: 'rust',
      filename: 'src/orderbook/mod.rs',
      code: `use tokio::sync::mpsc;
use fast_float::parse;

pub struct OrderBookDelta {
    pub bid_price: f64,
    pub bid_qty: f64,
    pub ask_price: f64,
    pub ask_qty: f64,
}

#[inline(always)]
pub fn calculate_spread(best_bid: f64, best_ask: f64) -> f64 {
    best_ask - best_bid
}`,
    },
    downloadContentSample: `=====================================================
FINTECH QUANTUM v4.0.2 - RUST CARGO SOURCE & BINARIES
=====================================================
License: Extended Multi-Client Deployment
Contents:
- /src (Core engine, orderbook, websockets, risk)
- Cargo.toml & Cargo.lock
- /benchmarks (Criterion latency test results)
- config.toml.template
- Activation_Manual.md`,
    createdAt: '2026-06-10',
  },
  {
    id: 'prod_aura_ui_system',
    title: 'Aura UI Pro - Enterprise Figma System & React 19 Components',
    slug: 'aura-ui-pro',
    tagline: '1,400+ Figma components, tokens, and accessible React 19 Tailwind blocks',
    description:
      'The comprehensive UI kit for enterprise applications, Web3 dashboards, and developer portals. Auto-layout 5.0, variables token system, dark/light modes, WCAG AAA accessibility, and direct React source code.',
    priceUSD: 69,
    category: 'UI Kits & Design',
    deliveryType: 'file',
    licenseType: 'Commercial',
    version: 'v3.1.0',
    fileInfo: {
      fileName: 'aura-ui-pro-figma-react.zip',
      fileSize: '78 MB',
      format: 'ZIP (Figma Community File + React Code)',
    },
    licenseKeysAvailable: 999,
    vendorId: 'vendor_alex_dev',
    vendorName: 'Alex Rivers (Vortex Labs)',
    vendorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces',
    rating: 4.96,
    reviewsCount: 310,
    salesCount: 2450,
    bannerGradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    tags: ['Figma', 'React 19', 'Tailwind CSS', 'Design Tokens', 'Accessibility'],
    features: [
      '1,400+ auto-layout components with interactive states',
      'Semantic token system mapped 1:1 with Tailwind CSS v4 variables',
      '45 full-page responsive dashboard templates included',
      'Direct copy-paste React 19 + Framer Motion components',
    ],
    changelog: [
      {
        version: 'v3.1.0',
        date: '2026-10-05',
        changes: ['Integrated Tailwind v4 CSS theme variables', 'Added 8 crypto wallet connect dialog states'],
      },
    ],
    downloadContentSample: `=====================================================
AURA UI PRO v3.1.0 - FIGMA & REACT SOURCE PACKAGE
=====================================================
Contents:
- Aura_UI_Enterprise_v3.1.fig (Figma File with tokens)
- /components (React 19 TypeScript components)
- tailwind.config.ts token export
- documentation/guidelines.pdf`,
    createdAt: '2026-05-18',
  },
  {
    id: 'prod_omniscrape_cloud',
    title: 'OmniScrape Engine - Anti-Detect Scraping API & Headless Proxy',
    slug: 'omniscrape-engine',
    tagline: 'Distributed browser scraping microservice in Go with fingerprint spoofing',
    description:
      'High-throughput web scraping daemon built in Go. Emulates genuine Chrome canvas fingerprints, WebGL shaders, audio contexts, and bypasses Cloudflare, Datadome, and Akamai challenges.',
    priceUSD: 119,
    category: 'APIs & Microservices',
    deliveryType: 'both',
    licenseType: 'Commercial',
    version: 'v2.1.0',
    fileInfo: {
      fileName: 'omniscrape-v2.1-go-binary.zip',
      fileSize: '32.4 MB',
      format: 'ZIP (Go Source & Precompiled Binaries)',
    },
    licenseKeysAvailable: 28,
    vendorId: 'vendor_satoshi_forge',
    vendorName: 'SatoshiForge Systems',
    vendorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces',
    rating: 4.89,
    reviewsCount: 76,
    salesCount: 380,
    bannerGradient: 'from-sky-600 via-blue-600 to-cyan-700',
    tags: ['Go (Golang)', 'Playwright', 'Fingerprinting', 'Cloudflare Bypass', 'Microservice'],
    features: [
      'Dynamic WebGL & Canvas noise generation for zero fingerprint detection',
      'Rotating proxy pool manager with latency-based routing',
      'REST & gRPC endpoints with automatic retry backoff',
      'Resource saving mode: blocks images/fonts automatically for 5x speed',
    ],
    changelog: [
      {
        version: 'v2.1.0',
        date: '2026-09-28',
        changes: ['Updated to Chromium 130 fingerprint definitions', 'Added TLS client hello ja4 fingerprint emulation'],
      },
    ],
    downloadContentSample: `=====================================================
OMNISCRAPE ENGINE v2.1.0 - GO DISTRIBUTED SERVICE
=====================================================
Package Contents:
- /cmd/omniscrape (Main binary entrypoint)
- /pkg/fingerprint (WebGL, audio, TLS spoofer)
- /docker (Container definitions & compose)
- api_docs.swagger.json
- License_Commercial.txt`,
    createdAt: '2026-08-04',
  },
];

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
