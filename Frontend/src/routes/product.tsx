import React, { useState, useEffect, useCallback } from 'react';
import type { MetaFunction } from 'react-router';
import { useParams, useNavigate, Link } from 'react-router';
import {
  ChevronRight,
  Star,
  Download,
  Key,
  ShieldCheck,
  CheckCircle2,
  Code2,
  Copy,
  Check,
  Clock,
  Bookmark,
  Flag,
  BadgeCheck,
  History,
  FileArchive,
  Zap,
  Loader2,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import { SUPPORTED_CRYPTO } from '../utils/nowpaymentsLogic';
import { ReportProductModal } from '../components/ReportProductModal';
import type { CryptoCurrency, Product, ProductChangelog, ReviewRecord } from '../types/marketplace';
import { API_BASE } from '../utils/apiBase';

export const meta: MetaFunction = ({ params }) => {
  const prod = INITIAL_PRODUCTS.find((p) => p.id === params.id || p.slug === params.id);
  if (!prod) return [{ title: 'Product Not Found — NexusByte' }];

  return [
    { title: `${prod.title} — Buy with Crypto on NexusByte` },
    { name: 'description', content: prod.description },
    { property: 'og:title', content: prod.title },
    { property: 'og:description', content: prod.tagline },
  ];
};

function getInitials(name: string): string {
  const parts = String(name || 'NV').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function ProductRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, authToken, initiateBuy, addToCart } = useMarketplace();

  const contextProduct = products.find((p) => p.id === id || p.slug === id) || null;
  const [liveProduct, setLiveProduct] = useState<Product | null>(contextProduct);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [changelog, setChangelog] = useState<ProductChangelog[]>(contextProduct?.changelog || []);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedCrypto, setSelectedCrypto] = useState<CryptoCurrency>('USDT');
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const fetchProductDetail = useCallback(async () => {
    if (!id) return;
    setIsLoadingDetail(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(id)}`, { headers });
      if (res.status === 404) {
        setNotFound(true);
        setLiveProduct(null);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.product) {
          setLiveProduct(data.product);
          setChangelog(
            Array.isArray(data.changelog) ? data.changelog : data.product.changelog || []
          );
          setReviews(Array.isArray(data.reviews) ? data.reviews : []);
          setNotFound(false);
        }
      }
    } catch {
      // keep context fallback if offline
    } finally {
      setIsLoadingDetail(false);
    }
  }, [id, authToken]);

  useEffect(() => {
    fetchProductDetail();
  }, [fetchProductDetail]);

  const product = liveProduct || contextProduct;

  if (isLoadingDetail && !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400 mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading product specifications...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-white">Product Not Found</h1>
        <p className="text-xs text-slate-400">
          This listing does not exist, is pending review, or has been archived by the vendor.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="rounded-xl bg-cyan-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition cursor-pointer"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const displayChangelog = changelog.length > 0 ? changelog : product.changelog || [];

  const schemaOrgData: Record<string, unknown> = {
    '@context': 'https://schema.org/',
    '@type': 'SoftwareApplication',
    name: product.title,
    description: product.description,
    applicationCategory: product.category,
    operatingSystem: 'All',
    softwareVersion: product.version,
    offers: {
      '@type': 'Offer',
      price: product.priceUSD,
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };
  if (product.reviewsCount > 0) {
    schemaOrgData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.rating,
      reviewCount: product.reviewsCount,
    };
  }

  const copySnippet = () => {
    if (!product.codeSnippetPreview?.code) return;
    navigator.clipboard.writeText(product.codeSnippetPreview.code);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-6">
        <Link to="/" className="hover:text-cyan-600 dark:hover:text-cyan-300 transition">
          Marketplace
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <Link
          to={`/?category=${encodeURIComponent(product.category)}`}
          className="hover:text-cyan-600 dark:hover:text-cyan-300 transition"
        >
          {product.category}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600" />
        <span className="text-slate-900 dark:text-slate-200 font-medium truncate max-w-[260px]">{product.title}</span>
      </nav>

      {/* Non-published notice for owner/admin preview */}
      {product.status && product.status !== 'published' && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 text-xs text-amber-200">
          Listing status: <strong className="uppercase">{product.status.replace('_', ' ')}</strong>. Only you and platform moderators can view this preview.
        </div>
      )}

      {/* Hero Banner Card */}
      <div className={`relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br ${product.bannerGradient} p-6 sm:p-8 mb-8 shadow-xl`}>
        <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] opacity-15" />
        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-semibold text-white border border-white/10">
              {product.category}
            </span>
            <span className="rounded-full bg-slate-950/75 px-3 py-1 text-xs font-mono text-cyan-200 border border-cyan-400/30">
              {product.version}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-400/30">
              {product.deliveryType === 'license_key' ? (
                <>
                  <Key className="h-3.5 w-3.5" />
                  <span>License Key Delivery</span>
                </>
              ) : product.deliveryType === 'file' ? (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>Direct File Download</span>
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5" />
                  <span>File + License Key</span>
                </>
              )}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            {product.title}
          </h1>
          <p className="mt-2.5 text-sm sm:text-base text-slate-100/90 leading-relaxed max-w-3xl">
            {product.tagline}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-xs text-white/90 tabular-nums">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/60 px-2.5 py-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              {product.reviewsCount > 0 ? (
                <span>
                  <strong>{product.rating.toFixed(1)}</strong> ({product.reviewsCount}{' '}
                  {product.reviewsCount === 1 ? 'review' : 'reviews'})
                </span>
              ) : (
                <span>New release (no reviews yet)</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/60 px-2.5 py-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-cyan-300" />
              <span>{product.salesCount} verified sales</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950/60 px-2.5 py-1.5 font-mono">
              <FileArchive className="h-3.5 w-3.5 text-slate-300" />
              <span>
                {product.fileInfo.fileName} ({product.fileInfo.fileSize})
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Content + Sticky Checkout Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Overview */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">Overview</h2>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
              {product.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              {product.tags.join(' · ')}
            </div>
          </section>

          {/* Key Features */}
          {product.features && product.features.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
              <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">What&apos;s Included</h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700 dark:text-slate-300">
                {product.features.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{feat}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Code Snippet Preview */}
          {product.codeSnippetPreview?.code && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-5 py-3">
                <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                  <Code2 className="h-4 w-4 text-cyan-400" />
                  <span>{product.codeSnippetPreview.filename}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-cyan-300">
                    {product.codeSnippetPreview.language}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={copySnippet}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {copiedSnippet ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <pre className="p-5 overflow-x-auto text-xs font-mono text-cyan-100 leading-relaxed bg-slate-950/90">
                <code>{product.codeSnippetPreview.code}</code>
              </pre>
            </section>
          )}

          {/* Release Changelog */}
          {displayChangelog.length > 0 && (
            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <History className="h-4 w-4 text-cyan-400" />
                <span>Release Changelog</span>
              </h2>
              <div className="space-y-4">
                {displayChangelog.map((entry, idx) => (
                  <div
                    key={`${entry.version}-${idx}`}
                    className="border-l-2 border-cyan-500/40 pl-4 py-0.5"
                  >
                    <div className="flex items-center gap-2 text-xs mb-1">
                      <span className="font-mono font-bold text-cyan-300">{entry.version}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-slate-400">{entry.date}</span>
                    </div>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {entry.changes.map((c, cIdx) => (
                        <li key={cIdx}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Verified Buyer Reviews */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>Verified Buyer Reviews ({reviews.length})</span>
              </h2>
              {product.reviewsCount > 0 && (
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-300 tabular-nums">
                  {product.rating.toFixed(2)} / 5.00
                </span>
              )}
            </div>

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                No verified reviews yet. Verified buyers can submit a review directly from My Library after purchase.
              </p>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800/80 dark:bg-slate-950/60"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-200">
                          {rev.reviewerName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          Verified Buyer
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= rev.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Sticky Purchase Sidebar */}
        <aside className="lg:col-span-1 lg:sticky lg:top-24 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 dark:border-slate-800 dark:bg-[#111827]">
            <div>
              <div className="flex items-baseline justify-between">
                <div className="text-3xl font-black text-slate-950 dark:text-white tabular-nums">
                  ${product.priceUSD}
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-1.5">USD</span>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {product.licenseType}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                Exact crypto rate and network fee lock on the NOWPayments Hosted Invoice.
              </p>
            </div>

            {/* Preferred Crypto Selector */}
            <div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                Select Checkout Currency
              </span>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(SUPPORTED_CRYPTO).map((c) => {
                  const active = selectedCrypto === c.currency;
                  return (
                    <button
                      key={c.currency}
                      type="button"
                      onClick={() => setSelectedCrypto(c.currency)}
                      className={`rounded-xl border px-2.5 py-2 text-left transition cursor-pointer ${
                        active
                          ? 'border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-950/50 dark:text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{c.currency}</div>
                      <div className="text-[10px] opacity-80 truncate">{c.network}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary CTA */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => initiateBuy(product, selectedCrypto)}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#0284C7] transition cursor-pointer"
              >
                <Zap className="h-4 w-4 text-cyan-100" />
                <span>Buy Instantly with {selectedCrypto}</span>
              </button>

              <button
                type="button"
                onClick={() => addToCart(product)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white transition cursor-pointer"
              >
                <Bookmark className="h-3.5 w-3.5" />
                <span>Save for Later</span>
              </button>
            </div>

            {/* Trust & Delivery Specs */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Verified NOWPayments HMAC-SHA512 IPN settlement</span>
              </div>
              {product.deliveryType !== 'license_key' && (
                <div className="flex items-start gap-2.5">
                  <Clock className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                  <span>15-minute signed download link (regenerable anytime in My Library)</span>
                </div>
              )}
              {product.deliveryType !== 'file' && (
                <div className="flex items-start gap-2.5">
                  <Key className="h-4 w-4 text-amber-500 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>Unique commercial license key with API activation checks</span>
                </div>
              )}
            </div>
          </div>

          {/* Creator Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3 dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-xs font-bold text-cyan-700 dark:bg-slate-800 dark:border-slate-700 dark:text-cyan-300"
              >
                {getInitials(product.vendorName)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{product.vendorName}</span>
                  {product.isTrustedVendor && (
                    <BadgeCheck
                      className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0"
                      aria-label="Verified trusted creator"
                    />
                  )}
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {product.isTrustedVendor ? 'Verified Trusted Creator' : 'ZenxusBay Creator'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-medium text-slate-600 hover:border-rose-300 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-400 dark:hover:border-rose-500/40 dark:hover:text-rose-300 transition cursor-pointer"
            >
              <Flag className="h-3.5 w-3.5" />
              <span>Report this product</span>
            </button>
          </div>
        </aside>
      </div>

      {showReportModal && (
        <ReportProductModal
          productId={product.id}
          productTitle={product.title}
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
