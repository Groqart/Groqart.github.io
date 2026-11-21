import React, { useState, useMemo } from 'react';
import {
  BadgeCheck,
  ShoppingBag,
  Eye,
  Forward,
  Bookmark,
  Check,
  Sparkles,
  Mail,
  ExternalLink,
  ShieldCheck,
  Sun,
  Moon,
  ArrowDown,
  Github,
  Send,
  Globe,
  MessageSquare,
} from 'lucide-react';
import type {
  Product,
  ProductLicenseTier,
  StoreRecord,
} from '../types/marketplace';
import { SafeMarkdown } from '../utils/markdown';
import { getCreatorInitials } from '../utils/catalogLogic';

interface StorefrontRendererProps {
  store: StoreRecord;
  products: Product[];
  mode: 'embedded' | 'standalone';
  isPreview?: boolean;
  savedIds?: Set<string>;
  onQuickBuy: (product: Product, selectedTier?: ProductLicenseTier) => void;
  onViewProduct: (product: Product) => void;
  onShareProduct?: (product: Product) => void;
  onToggleSave?: (product: Product) => void;
}

export const StorefrontRenderer: React.FC<StorefrontRendererProps> = ({
  store,
  products,
  mode,
  isPreview = false,
  savedIds = new Set(),
  onQuickBuy,
  onViewProduct,
  onShareProduct,
  onToggleSave,
}) => {
  const { themeConfig } = store;
  const accent = themeConfig.accentColor || '#0EA5E9';

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [standaloneTheme, setStandaloneTheme] = useState<'light' | 'dark'>(
    themeConfig.defaultTheme || 'dark'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedTiers, setSelectedTiers] = useState<Record<string, string>>({});

  const categories = useMemo(() => {
    const unique = Array.from(new Set(products.map((p) => p.category)));
    return ['All', ...unique];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const featuredProducts = useMemo(() => {
    if (themeConfig.featuredProductIds?.length > 0) {
      const idSet = new Set(themeConfig.featuredProductIds);
      const picked = products.filter((p) => idSet.has(p.id));
      if (picked.length > 0) return picked;
    }
    return products.slice(0, 2);
  }, [products, themeConfig.featuredProductIds]);

  const isDarkSurface = mode === 'standalone' ? standaloneTheme === 'dark' : undefined;

  const scrollToCatalog = () => {
    if (typeof document === 'undefined') return;
    document.getElementById(`store-catalog-${store.slug}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const getActiveTier = (prod: Product): ProductLicenseTier | undefined => {
    if (!prod.licenseTiers || prod.licenseTiers.length === 0) return undefined;
    const chosenId = selectedTiers[prod.id];
    return prod.licenseTiers.find((t) => t.id === chosenId) || prod.licenseTiers[0];
  };

  const handleCopy = (prod: Product) => {
    onShareProduct?.(prod);
    setCopiedId(prod.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const renderProductCard = (prod: Product, compact = false) => {
    const activeTier = getActiveTier(prod);
    const displayPrice = activeTier ? activeTier.priceUSD : prod.priceUSD;
    const isSaved = savedIds.has(prod.id);
    const copied = copiedId === prod.id;

    return (
      <article
        key={prod.id}
        className={`flex flex-col overflow-hidden rounded-2xl border transition hover:-translate-y-0.5 hover:shadow-lg ${
          isDarkSurface === true
            ? 'border-slate-800 bg-[#111827] text-slate-100'
            : isDarkSurface === false
            ? 'border-slate-200 bg-white text-slate-900'
            : 'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-100'
        }`}
      >
        <button
          type="button"
          onClick={() => onViewProduct(prod)}
          className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${prod.bannerGradient} p-4 text-left flex flex-col justify-between cursor-pointer`}
        >
          {prod.previewMediaUrl && (
            <img
              src={prod.previewMediaUrl}
              alt={prod.title}
              className="absolute inset-0 h-full w-full object-cover opacity-50"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-white">
            <span className="rounded-md bg-slate-950/75 px-2 py-0.5 font-medium backdrop-blur-sm">
              {prod.category}
            </span>
            <span className="rounded-md bg-slate-950/75 px-2 py-0.5 font-mono backdrop-blur-sm">
              {prod.version}
            </span>
          </div>
          <div className="relative z-10 flex items-center justify-between text-[11px] font-mono text-white/90">
            <span className="truncate">{prod.fileInfo.fileName}</span>
            {prod.virusScanStatus === 'clean' && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-950/80 px-1.5 py-0.5 text-[10px] text-emerald-300">
                <ShieldCheck className="h-3 w-3" /> Clean
              </span>
            )}
          </div>
        </button>

        <div className="flex flex-1 flex-col p-4">
          <button
            type="button"
            onClick={() => onViewProduct(prod)}
            className="text-left cursor-pointer"
          >
            <h3 className="font-display text-base font-bold line-clamp-1 hover:opacity-80">
              {prod.title}
            </h3>
          </button>
          <p className="mt-1 text-xs opacity-75 line-clamp-2 leading-relaxed">{prod.tagline}</p>

          {/* Optional License Tiers */}
          {!compact && prod.licenseTiers && prod.licenseTiers.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {prod.licenseTiers.map((tier) => {
                const isSelected = activeTier?.id === tier.id;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() =>
                      setSelectedTiers((prev) => ({ ...prev, [prod.id]: tier.id }))
                    }
                    className={`rounded-lg border px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                      isSelected
                        ? 'text-white border-transparent'
                        : 'border-slate-300 dark:border-slate-700 opacity-80 hover:opacity-100'
                    }`}
                    style={isSelected ? { backgroundColor: accent } : undefined}
                  >
                    {tier.name} · ${tier.priceUSD}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-auto pt-3 mt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between gap-2">
            <div className="text-lg font-extrabold tabular-nums">${displayPrice}</div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onQuickBuy(prod, activeTier)}
                style={{ backgroundColor: accent }}
                className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-white hover:opacity-90 transition cursor-pointer whitespace-nowrap"
              >
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Buy</span>
              </button>
              <button
                type="button"
                onClick={() => onViewProduct(prod)}
                aria-label={`Details for ${prod.title}`}
                className="flex h-9 items-center gap-1 rounded-xl border border-slate-300/70 dark:border-slate-700 px-2.5 text-xs font-medium hover:opacity-80 transition cursor-pointer"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Details</span>
              </button>
              {onShareProduct && (
                <button
                  type="button"
                  onClick={() => handleCopy(prod)}
                  aria-label={`Share link to ${prod.title}`}
                  className="flex h-9 w-8 items-center justify-center rounded-xl border border-slate-300/70 dark:border-slate-700 hover:opacity-80 cursor-pointer"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Forward className="h-3.5 w-3.5" />}
                </button>
              )}
              {mode === 'embedded' && onToggleSave && (
                <button
                  type="button"
                  onClick={() => onToggleSave(prod)}
                  aria-label={isSaved ? `Unsave ${prod.title}` : `Save ${prod.title}`}
                  className="flex h-9 w-8 items-center justify-center rounded-xl border border-slate-300/70 dark:border-slate-700 hover:opacity-80 cursor-pointer"
                >
                  <Bookmark className={`h-3.5 w-3.5 ${isSaved ? 'fill-current' : ''}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  };

  const renderSection = (sectionId: string) => {
    switch (sectionId) {
      case 'hero':
        return (
          <section
            key="hero"
            className="relative overflow-hidden rounded-2xl border border-slate-200/30 p-6 sm:p-10 text-white shadow-xl"
            style={{
              background: `linear-gradient(135deg, ${accent} 0%, #0F172A 85%)`,
            }}
          >
            {themeConfig.heroMediaType === 'video' && themeConfig.heroMediaUrl && (
              <video
                src={themeConfig.heroMediaUrl}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 h-full w-full object-cover opacity-35"
              />
            )}
            {themeConfig.heroMediaType === 'image' && themeConfig.heroMediaUrl && (
              <img
                src={themeConfig.heroMediaUrl}
                alt={store.name}
                className="absolute inset-0 h-full w-full object-cover opacity-35"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/60 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" style={{ color: accent }} />
                <span>@{store.slug} Official Storefront</span>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                {themeConfig.heroTitle || `${store.name} Storefront`}
              </h1>
              <p className="text-sm sm:text-base text-slate-100/90 leading-relaxed">
                {themeConfig.heroSubtitle}
              </p>
              <button
                type="button"
                onClick={scrollToCatalog}
                className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-slate-100 transition cursor-pointer"
              >
                <span>{themeConfig.heroCtaLabel || 'Explore Catalog'}</span>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        );

      case 'featured':
        if (featuredProducts.length === 0) return null;
        return (
          <section key="featured" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-4 w-4" style={{ color: accent }} />
                <span>Featured Releases</span>
              </h2>
              <span className="text-xs opacity-70">{featuredProducts.length} highlighted</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {featuredProducts.map((p) => renderProductCard(p, true))}
            </div>
          </section>
        );

      case 'catalog':
        return (
          <section key="catalog" id={`store-catalog-${store.slug}`} className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60 dark:border-slate-800 pb-3">
              <h2 className="font-display text-lg font-bold tracking-tight">
                Catalog ({filteredProducts.length})
              </h2>
              {categories.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {categories.map((cat) => {
                    const active = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        style={active ? { backgroundColor: accent, color: '#ffffff' } : undefined}
                        className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                          active
                            ? ''
                            : 'border border-slate-300/60 dark:border-slate-700 opacity-80 hover:opacity-100'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-10 text-center text-xs opacity-75">
                No products published in this store yet.
              </div>
            ) : (
              <div
                className={`grid gap-5 ${
                  isPreview
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                }`}
              >
                {filteredProducts.map((p) => renderProductCard(p))}
              </div>
            )}
          </section>
        );

      case 'about':
        if (!themeConfig.aboutMarkdown.trim()) return null;
        return (
          <section
            key="about"
            className={`rounded-2xl border p-6 ${
              isDarkSurface === true
                ? 'border-slate-800 bg-[#111827]'
                : isDarkSurface === false
                ? 'border-slate-200 bg-white'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]'
            }`}
          >
            <SafeMarkdown content={themeConfig.aboutMarkdown} />
          </section>
        );

      case 'socials': {
        const s = themeConfig.socials;
        const links = [
          s.github ? { label: 'GitHub', href: s.github, icon: Github } : null,
          s.telegram ? { label: 'Telegram', href: s.telegram, icon: Send } : null,
          s.twitter ? { label: 'X / Twitter', href: s.twitter, icon: Globe } : null,
          s.discord ? { label: 'Discord', href: s.discord, icon: MessageSquare } : null,
          s.contactEmail
            ? { label: s.contactEmail, href: `mailto:${s.contactEmail}`, icon: Mail }
            : null,
        ].filter(Boolean) as Array<{
          label: string;
          href: string;
          icon: React.ComponentType<{ className?: string }>;
        }>;

        return (
          <section
            key="socials"
            className={`rounded-2xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              isDarkSurface === true
                ? 'border-slate-800 bg-[#111827]'
                : isDarkSurface === false
                ? 'border-slate-200 bg-white'
                : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111827]'
            }`}
          >
            <div>
              <h3 className="font-display text-sm font-bold">{store.name} Support &amp; Links</h3>
              <p className="text-xs opacity-70">
                Direct creator communication &amp; crypto settlement support
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {links.length > 0 ? (
                links.map((item) => {
                  const Icon = item.icon;
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300/70 dark:border-slate-700 px-3 py-1.5 text-xs font-medium hover:opacity-80"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  );
                })
              ) : (
                <span className="text-xs opacity-65">Direct invoice receipt sent via email</span>
              )}
            </div>
          </section>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className={
        mode === 'standalone'
          ? `min-h-screen flex flex-col font-sans ${
              standaloneTheme === 'dark'
                ? 'dark bg-[#090D16] text-slate-100'
                : 'bg-[#F8FAFC] text-slate-900'
            }`
          : 'w-full'
      }
    >
      {/* Standalone Isolated Merchant Header (NO ZenxusBay logo, sidebar, or global search) */}
      {mode === 'standalone' && (
        <header
          className={`sticky top-0 z-40 border-b backdrop-blur-md ${
            standaloneTheme === 'dark'
              ? 'border-slate-800 bg-[#0D1320]/95'
              : 'border-slate-200 bg-white/95'
          }`}
        >
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-4 px-4 sm:px-6 h-16">
            <div className="flex items-center gap-3 min-w-0">
              {themeConfig.logoUrl ? (
                <img
                  src={themeConfig.logoUrl}
                  alt={store.name}
                  className="h-9 w-9 rounded-xl object-cover shrink-0 border border-slate-300/40"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs text-white"
                  style={{ backgroundColor: accent }}
                >
                  {getCreatorInitials(store.name)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-display text-base font-bold truncate">
                  <span>{store.name}</span>
                  <BadgeCheck className="h-4 w-4 shrink-0" style={{ color: accent }} />
                </div>
                <div className="text-[11px] font-mono opacity-65 truncate">
                  {store.customDomain && store.dnsVerified
                    ? store.customDomain
                    : `${store.slug}.nexusbyte.de5.net`}
                </div>
              </div>
            </div>

            <nav className="flex items-center gap-3">
              {categories.slice(0, 4).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    scrollToCatalog();
                  }}
                  className={`hidden md:inline-block rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                    selectedCategory === cat ? 'font-bold' : 'opacity-75 hover:opacity-100'
                  }`}
                  style={selectedCategory === cat ? { color: accent } : undefined}
                >
                  {cat}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setStandaloneTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
                aria-label="Toggle store theme"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-300/60 dark:border-slate-700 cursor-pointer"
              >
                {standaloneTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </nav>
          </div>
        </header>
      )}

      {/* Embedded Header Banner when viewed inside /@slug Marketplace Mode A */}
      {mode === 'embedded' && (
        <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111827] mb-6">
            <div className="flex items-center gap-3.5">
              {themeConfig.logoUrl ? (
                <img
                  src={themeConfig.logoUrl}
                  alt={store.name}
                  className="h-12 w-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: accent }}
                >
                  {getCreatorInitials(store.name)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
                    {store.name}
                  </h1>
                  <BadgeCheck className="h-4 w-4 text-cyan-500" />
                </div>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  /@{store.slug} · {products.length} {products.length === 1 ? 'product' : 'products'}
                </p>
              </div>
            </div>
            {!isPreview && (
              <a
                href={`/s/${store.slug}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Standalone View</span>
              </a>
            )}
          </div>
        </div>
      )}

      {/* Main Dynamic Storefront Sections */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 pb-10 space-y-8 pt-2">
        {themeConfig.sections
          .filter((s) => s.enabled)
          .map((s) => renderSection(s.id))}
      </div>

      {/* Standalone Footer: merchant identity & contacts only */}
      {mode === 'standalone' && (
        <footer
          className={`border-t py-6 px-4 text-xs ${
            standaloneTheme === 'dark'
              ? 'border-slate-800 bg-[#0B101B] text-slate-400'
              : 'border-slate-200 bg-white text-slate-500'
          }`}
        >
          <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="font-semibold">
              &copy; {new Date().getFullYear()} {store.name}. Direct Crypto Storefront.
            </div>
            <div className="flex items-center gap-4">
              {themeConfig.socials.contactEmail && (
                <a href={`mailto:${themeConfig.socials.contactEmail}`} className="hover:underline">
                  {themeConfig.socials.contactEmail}
                </a>
              )}
              <span>Gateway: {store.paymentConfig.gateway.toUpperCase()}</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
