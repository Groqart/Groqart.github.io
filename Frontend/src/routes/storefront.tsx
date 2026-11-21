import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router';
import { Loader2, Store, ArrowLeft } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import type { Product, ProductLicenseTier, StoreRecord } from '../types/marketplace';
import { API_BASE } from '../utils/apiBase';
import { detectStorefrontContext, MARKETPLACE_DOMAIN } from '../utils/storefrontLogic';
import { StorefrontRenderer } from '../components/StorefrontRenderer';

interface StorefrontRouteProps {
  overrideSlugOrHost?: string;
  overrideMode?: 'embedded' | 'standalone';
}

export default function StorefrontRoute({
  overrideSlugOrHost,
  overrideMode,
}: StorefrontRouteProps = {}) {
  const { slug, handle } = useParams<{ slug?: string; handle?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { authToken, cart, addToCart, removeFromCart, initiateBuy, showToast } = useMarketplace();

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const detected = detectStorefrontContext(hostname, location.pathname);

  const isInvalidHandleRoute =
    Boolean(handle) && !handle!.startsWith('@') && detected.mode === 'marketplace';

  const mode: 'embedded' | 'standalone' =
    overrideMode || (detected.mode === 'standalone' ? 'standalone' : 'embedded');

  const slugOrHost =
    overrideSlugOrHost ||
    (slug
      ? slug.toLowerCase()
      : handle && handle.startsWith('@')
      ? handle.slice(1).toLowerCase()
      : detected.mode === 'standalone'
      ? detected.slugOrHost
      : detected.mode === 'embedded'
      ? detected.slug
      : '');

  const [storeRecord, setStoreRecord] = useState<StoreRecord | null>(null);
  const [storeProducts, setStoreProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const fetchStorefront = useCallback(async () => {
    if (!slugOrHost || isInvalidHandleRoute) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch(`${API_BASE}/api/stores/${encodeURIComponent(slugOrHost)}`, {
        headers,
      });
      if (!res.ok) {
        setNotFound(true);
        setStoreRecord(null);
        return;
      }
      const data = await res.json();
      setStoreRecord(data.store || null);
      setStoreProducts(Array.isArray(data.products) ? data.products : []);
      setNotFound(!data.store);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [slugOrHost, authToken, isInvalidHandleRoute]);

  useEffect(() => {
    fetchStorefront();
  }, [fetchStorefront]);

  // Dynamic Canonical SEO & Page Title for Storefront
  useEffect(() => {
    if (!storeRecord || typeof document === 'undefined') return;
    const prevTitle = document.title;
    document.title = `${storeRecord.name} — Digital Storefront`;

    const canonicalHref =
      storeRecord.dnsVerified && storeRecord.customDomain
        ? `https://${storeRecord.customDomain}`
        : `https://${storeRecord.slug}.${MARKETPLACE_DOMAIN}`;

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonicalEl;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    const prevHref = canonicalEl.getAttribute('href') || '';
    canonicalEl.setAttribute('href', canonicalHref);

    return () => {
      document.title = prevTitle;
      if (createdCanonical && canonicalEl?.parentNode) {
        canonicalEl.parentNode.removeChild(canonicalEl);
      } else if (canonicalEl) {
        canonicalEl.setAttribute('href', prevHref);
      }
    };
  }, [storeRecord]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500 mx-auto" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Loading storefront...</p>
      </div>
    );
  }

  if (notFound || !storeRecord) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
          Storefront Not Found
        </h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          The storefront <code className="font-mono">{slugOrHost || location.pathname}</code> could not be found.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0284C7] transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Marketplace</span>
        </Link>
      </div>
    );
  }

  const savedIds = new Set(cart.map((c) => c.id));

  const handleQuickBuy = (prod: Product, selectedTier?: ProductLicenseTier) => {
    initiateBuy(prod, 'USDT', {
      selectedTier,
      storeContext: {
        storeName: storeRecord.name,
        storeSlug: storeRecord.slug,
        gateway: storeRecord.paymentConfig.gateway,
        isStandalone: mode === 'standalone',
      },
    });
  };

  const handleShare = async (prod: Product) => {
    const shareUrl = `${window.location.origin}/product/${prod.id}`;
    try {
      await navigator.clipboard?.writeText(shareUrl);
      showToast(`Link copied for ${prod.title}`);
    } catch {
      showToast(shareUrl);
    }
  };

  const handleToggleSave = (prod: Product) => {
    if (savedIds.has(prod.id)) {
      removeFromCart(prod.id);
    } else {
      addToCart(prod);
    }
  };

  return (
    <StorefrontRenderer
      store={storeRecord}
      products={storeProducts}
      mode={mode}
      savedIds={savedIds}
      onQuickBuy={handleQuickBuy}
      onViewProduct={(prod) => navigate(`/product/${prod.id}`)}
      onShareProduct={handleShare}
      onToggleSave={handleToggleSave}
    />
  );
}
