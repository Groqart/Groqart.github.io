import { Product } from '../types/marketplace';

export const INITIAL_PRODUCTS: Product[] = [
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
