import React, { useState } from 'react';
import {
  X,
  Star,
  Download,
  Key,
  ShieldCheck,
  CheckCircle2,
  FileCode,
  History,
  Lock,
  Cpu,
  Zap,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { Product, CryptoCurrency } from '../types/marketplace';
import { calculateCryptoAmount, SUPPORTED_CRYPTO } from '../utils/oxapayLogic';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onBuy: (product: Product, cryptoCurrency: CryptoCurrency) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onBuy,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'changelog' | 'security'>('overview');
  const [selectedCurrency, setSelectedCurrency] = useState<CryptoCurrency>('USDT');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  if (!product) return null;

  const cryptoAmount = calculateCryptoAmount(product.priceUSD, selectedCurrency);

  const copyCode = () => {
    if (product.codeSnippetPreview) {
      navigator.clipboard.writeText(product.codeSnippetPreview.code);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl my-8 overflow-hidden">
        {/* Banner header */}
        <div className={`relative h-44 w-full bg-gradient-to-r ${product.bannerGradient} p-6 flex flex-col justify-between`}>
          <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />

          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close product details modal"
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur-md hover:bg-slate-950 transition"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 flex items-center gap-2">
            <span className="rounded-full bg-slate-950/80 px-3 py-1 text-xs font-semibold text-white border border-white/20 backdrop-blur-md">
              {product.category}
            </span>
            <span className="rounded-full bg-cyan-400/20 px-2.5 py-1 text-xs font-mono font-semibold text-cyan-200 border border-cyan-400/30 backdrop-blur-md">
              {product.version}
            </span>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
              {product.licenseType}
            </span>
          </div>

          <div className="relative z-10">
            <h2 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              {product.title}
            </h2>
            <p className="text-sm text-white/90 line-clamp-1 mt-1 font-medium">
              {product.tagline}
            </p>
          </div>
        </div>

        {/* Modal Body: Split view (Content + Sticky Checkout Sidebar) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-5">
            {/* Nav Tabs */}
            <div className="flex border-b border-slate-800 gap-4 text-sm font-medium">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 transition flex items-center gap-1.5 ${
                  activeTab === 'overview'
                    ? 'border-b-2 border-cyan-400 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="h-4 w-4" />
                Overview
              </button>
              {product.codeSnippetPreview && (
                <button
                  onClick={() => setActiveTab('code')}
                  className={`pb-3 transition flex items-center gap-1.5 ${
                    activeTab === 'code'
                      ? 'border-b-2 border-cyan-400 text-cyan-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileCode className="h-4 w-4" />
                  Code Preview
                </button>
              )}
              <button
                onClick={() => setActiveTab('changelog')}
                className={`pb-3 transition flex items-center gap-1.5 ${
                  activeTab === 'changelog'
                    ? 'border-b-2 border-cyan-400 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="h-4 w-4" />
                Changelog ({product.changelog.length})
              </button>
              <button
                onClick={() => setActiveTab('security')}
                className={`pb-3 transition flex items-center gap-1.5 ${
                  activeTab === 'security'
                    ? 'border-b-2 border-cyan-400 text-cyan-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Escrow Guarantee
              </button>
            </div>

            {/* TAB: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Description</h4>
                  <p className="text-sm leading-relaxed text-slate-300">
                    {product.description}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Key Features</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {product.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-2.5 text-xs text-slate-200">
                        <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Package Specifications */}
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Delivery Specifications</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <span className="text-slate-400 block mb-1">Archive Format</span>
                      <span className="font-mono font-semibold text-white">{product.fileInfo.format}</span>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <span className="text-slate-400 block mb-1">Uncompressed Size</span>
                      <span className="font-mono font-semibold text-white">{product.fileInfo.fileSize}</span>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
                      <span className="text-slate-400 block mb-1">License Term</span>
                      <span className="font-semibold text-emerald-400">{product.licenseType}</span>
                    </div>
                  </div>
                </div>

                {/* Vendor Bio */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3.5">
                  <img
                    src={product.vendorAvatar}
                    alt={product.vendorName}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-cyan-500/40"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{product.vendorName}</span>
                      <span className="rounded bg-cyan-950 px-1.5 py-0.2 text-[10px] font-bold text-cyan-400 border border-cyan-800">
                        VERIFIED VENDOR
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {product.salesCount}+ units sold • {product.rating} average developer rating
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: Code Preview */}
            {activeTab === 'code' && product.codeSnippetPreview && (
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-t-lg bg-slate-950 px-4 py-2 text-xs font-mono border-t border-x border-slate-800 text-slate-400">
                  <span>{product.codeSnippetPreview.filename}</span>
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition"
                  >
                    {copiedSnippet ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedSnippet ? 'Copied' : 'Copy Snippet'}
                  </button>
                </div>
                <pre className="rounded-b-lg border border-slate-800 bg-slate-950/90 p-4 text-xs font-mono text-cyan-300 overflow-x-auto leading-relaxed">
                  <code>{product.codeSnippetPreview.code}</code>
                </pre>
              </div>
            )}

            {/* TAB: Changelog */}
            {activeTab === 'changelog' && (
              <div className="space-y-4">
                {product.changelog.map((log) => (
                  <div key={log.version} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-cyan-400 text-sm">{log.version}</span>
                      <span className="text-xs text-slate-400">{log.date}</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                      {log.changes.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* TAB: Security & Delivery */}
            {activeTab === 'security' && (
              <div className="space-y-4 text-xs text-slate-300">
                <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4">
                  <h4 className="font-bold text-cyan-300 text-sm mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4" />
                    OxaPay Payment Escrow & Cryptographic Zero-Leak Delivery
                  </h4>
                  <p className="leading-relaxed text-slate-300">
                    Your digital files and license keys remain locked in an encrypted vault until the OxaPay gateway receives confirmed blockchain block inclusion. Upon payment webhook receipt, an HMAC-SHA256 signed, time-limited download token is generated.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <span className="font-semibold text-white block mb-1">Time-Limited 24h Token</span>
                    <p className="text-slate-400">Download links expire automatically after 24 hours to prevent unauthorized hotlinking or piracy.</p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                    <span className="font-semibold text-white block mb-1">Unique License Allocation</span>
                    <p className="text-slate-400">Dedicated software license keys are uniquely allocated to your email address and permanently saved in your Library.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sticky Checkout Box */}
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-xs font-semibold uppercase text-slate-400">Total Price</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">${product.priceUSD}</span>
                <span className="text-sm font-medium text-slate-400">USD</span>
              </div>

              {/* Currency Selector */}
              <div className="mt-5">
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Select Crypto Payment Currency:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['USDT', 'BTC', 'ETH', 'LTC', 'SOL'] as CryptoCurrency[]).map((cur) => (
                    <button
                      key={cur}
                      onClick={() => setSelectedCurrency(cur)}
                      className={`rounded-lg py-2 text-xs font-semibold transition border ${
                        selectedCurrency === cur
                          ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 shadow-sm'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Converted Crypto Quote */}
              <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-900/60 p-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Payable Crypto:</span>
                  <span className="font-mono font-bold text-white text-sm">
                    {cryptoAmount} {selectedCurrency}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                  <span>Network:</span>
                  <span>{SUPPORTED_CRYPTO[selectedCurrency].network}</span>
                </div>
              </div>

              {/* Delivery info */}
              <div className="mt-4 space-y-2 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Instant delivery post-confirmation</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Permanent access in My Library</span>
                </div>
              </div>
            </div>

            {/* CTA Buy Button */}
            <div className="mt-6">
              <button
                onClick={() => onBuy(product, selectedCurrency)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-indigo-500 hover:shadow-cyan-500/40 transition active:scale-[0.99]"
              >
                <Zap className="h-4 w-4 fill-white" />
                Pay with OxaPay ({selectedCurrency})
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-2">
                Protected by OxaPay Multi-Chain Webhook Engine
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
