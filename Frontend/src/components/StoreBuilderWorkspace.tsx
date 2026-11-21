import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  Store,
  Sparkles,
  Monitor,
  Smartphone,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Save,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import type {
  Product,
  StoreSectionId,
  StoreThemeConfig,
} from '../types/marketplace';
import { StorefrontRenderer } from './StorefrontRenderer';

const ACCENT_SWATCHES = ['#0EA5E9', '#06B6D4', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

interface StoreBuilderWorkspaceProps {
  vendorProducts: Product[];
}

export const StoreBuilderWorkspace: React.FC<StoreBuilderWorkspaceProps> = ({
  vendorProducts,
}) => {
  const {
    vendorStore,
    setIsCreateStoreOpen,
    updateVendorStore,
    initiateBuy,
    showToast,
  } = useMarketplace();

  const [storeName, setStoreName] = useState('');
  const [draftTheme, setDraftTheme] = useState<StoreThemeConfig | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState<'standalone' | 'embedded'>('standalone');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    if (vendorStore) {
      setStoreName(vendorStore.name);
      setDraftTheme(structuredClone(vendorStore.themeConfig));
    }
  }, [vendorStore]);

  if (!vendorStore || !draftTheme) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-600 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400">
          <Store className="h-7 w-7" />
        </div>
        <h2 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          Launch Your Branded Storefront
        </h2>
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">
          Reserve your custom handle (<code className="font-mono">/@yourstore</code>), standalone subdomain (
          <code className="font-mono">yourstore.nexusbyte.de5.net</code>), pick a template, and connect your crypto payout wallet in 3 steps.
        </p>
        <button
          type="button"
          onClick={() => setIsCreateStoreOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0284C7] transition cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Launch 3-Step Store Wizard</span>
        </button>
      </div>
    );
  }

  const moveSection = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= draftTheme.sections.length || fromIdx === toIdx) return;
    const next = [...draftTheme.sections];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDraftTheme({ ...draftTheme, sections: next });
  };

  const toggleSectionEnabled = (sectionId: StoreSectionId) => {
    setDraftTheme({
      ...draftTheme,
      sections: draftTheme.sections.map((s) =>
        s.id === sectionId ? { ...s, enabled: !s.enabled } : s
      ),
    });
  };

  const toggleFeaturedProduct = (prodId: string) => {
    const cur = draftTheme.featuredProductIds || [];
    const exists = cur.includes(prodId);
    const next = exists ? cur.filter((id) => id !== prodId) : [...cur, prodId].slice(0, 4);
    setDraftTheme({ ...draftTheme, featuredProductIds: next });
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const res = await updateVendorStore({
      name: storeName.trim() || vendorStore.name,
      themeConfig: draftTheme,
    });
    setIsPublishing(false);
    if (!res.ok) {
      showToast(res.error || 'Failed to publish storefront');
      return;
    }
    showToast('Storefront design published live!');
  };

  const previewStore = {
    ...vendorStore,
    name: storeName || vendorStore.name,
    themeConfig: draftTheme,
  };

  return (
    <div className="space-y-4">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Storefront Builder
          </span>
          <Link
            to={`/@${vendorStore.slug}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-cyan-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-cyan-300"
          >
            <span>/@{vendorStore.slug}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            to={`/s/${vendorStore.slug}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-emerald-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300"
          >
            <span>{vendorStore.slug}.nexusbyte.de5.net</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        <button
          type="button"
          onClick={handlePublish}
          disabled={isPublishing}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0284C7] transition disabled:opacity-50 cursor-pointer"
        >
          {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{isPublishing ? 'Publishing...' : 'Publish Changes'}</span>
        </button>
      </div>

      {/* Left Config Panel + Live Preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left Config Panel */}
        <div className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5 text-xs dark:border-slate-800 dark:bg-[#111827] max-h-[820px] overflow-y-auto">
          {/* Identity & Colors */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Brand &amp; Theme
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="builder-store-name" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Store Name
                </label>
                <input
                  id="builder-store-name"
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="builder-default-theme" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Standalone Theme
                </label>
                <select
                  id="builder-default-theme"
                  value={draftTheme.defaultTheme}
                  onChange={(e) =>
                    setDraftTheme({
                      ...draftTheme,
                      defaultTheme: e.target.value === 'light' ? 'light' : 'dark',
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="dark">Dark Mode</option>
                  <option value="light">Light Mode</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="builder-logo-url" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Logo Image URL
                </label>
                <input
                  id="builder-logo-url"
                  type="url"
                  value={draftTheme.logoUrl}
                  onChange={(e) => setDraftTheme({ ...draftTheme, logoUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
              <div>
                <label htmlFor="builder-favicon-url" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Favicon URL
                </label>
                <input
                  id="builder-favicon-url"
                  type="url"
                  value={draftTheme.faviconUrl}
                  onChange={(e) => setDraftTheme({ ...draftTheme, faviconUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Accent Color ({draftTheme.accentColor})
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {ACCENT_SWATCHES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Accent ${hex}`}
                    onClick={() => setDraftTheme({ ...draftTheme, accentColor: hex })}
                    className={`h-7 w-7 rounded-lg border-2 cursor-pointer ${
                      draftTheme.accentColor === hex ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom accent color"
                  value={draftTheme.accentColor}
                  onChange={(e) => setDraftTheme({ ...draftTheme, accentColor: e.target.value })}
                  className="h-7 w-10 rounded cursor-pointer border border-slate-300 dark:border-slate-700 bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Section Order (Drag & Drop + Up/Down + Visibility) */}
          <div className="space-y-2.5">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Sections &amp; Layout Order
            </h3>
            <div className="space-y-1.5">
              {draftTheme.sections.map((sec, idx) => (
                <div
                  key={sec.id}
                  draggable
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) {
                      moveSection(dragIndex, idx);
                      setDragIndex(null);
                    }
                  }}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/70"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <GripVertical className="h-4 w-4 text-slate-400 cursor-grab shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {sec.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveSection(idx, idx - 1)}
                      aria-label={`Move ${sec.label} up`}
                      className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === draftTheme.sections.length - 1}
                      onClick={() => moveSection(idx, idx + 1)}
                      aria-label={`Move ${sec.label} down`}
                      className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSectionEnabled(sec.id)}
                      aria-label={sec.enabled ? `Hide ${sec.label}` : `Show ${sec.label}`}
                      aria-pressed={sec.enabled}
                      className={`ml-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                        sec.enabled
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                    >
                      {sec.enabled ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      <span>{sec.enabled ? 'On' : 'Off'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero Banner Config */}
          <div className="space-y-3">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Hero Banner &amp; Media
            </h3>
            <div>
              <label htmlFor="builder-hero-title" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hero Headline
              </label>
              <input
                id="builder-hero-title"
                type="text"
                value={draftTheme.heroTitle}
                onChange={(e) => setDraftTheme({ ...draftTheme, heroTitle: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="builder-hero-sub" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hero Subtitle
              </label>
              <textarea
                id="builder-hero-sub"
                rows={2}
                value={draftTheme.heroSubtitle}
                onChange={(e) => setDraftTheme({ ...draftTheme, heroSubtitle: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="builder-hero-media-type" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Backdrop Media
                </label>
                <select
                  id="builder-hero-media-type"
                  value={draftTheme.heroMediaType}
                  onChange={(e) =>
                    setDraftTheme({
                      ...draftTheme,
                      heroMediaType: e.target.value as 'gradient' | 'image' | 'video',
                    })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="gradient">Brand Gradient</option>
                  <option value="image">Banner Image URL</option>
                  <option value="video">Looping Video (.mp4)</option>
                </select>
              </div>
              <div>
                <label htmlFor="builder-hero-cta" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CTA Button Label
                </label>
                <input
                  id="builder-hero-cta"
                  type="text"
                  value={draftTheme.heroCtaLabel}
                  onChange={(e) => setDraftTheme({ ...draftTheme, heroCtaLabel: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>
            {draftTheme.heroMediaType !== 'gradient' && (
              <div>
                <label htmlFor="builder-hero-url" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hero {draftTheme.heroMediaType === 'video' ? 'Video' : 'Image'} URL
                </label>
                <input
                  id="builder-hero-url"
                  type="url"
                  value={draftTheme.heroMediaUrl}
                  onChange={(e) => setDraftTheme({ ...draftTheme, heroMediaUrl: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            )}
          </div>

          {/* Featured Products */}
          {vendorProducts.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
                Featured Products (up to 4)
              </h3>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {vendorProducts.map((p) => {
                  const checked = draftTheme.featuredProductIds.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-1.5 cursor-pointer dark:border-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeaturedProduct(p.id)}
                        className="rounded text-cyan-600"
                      />
                      <span className="truncate flex-1 font-medium text-slate-800 dark:text-slate-200">
                        {p.title}
                      </span>
                      <span className="font-mono text-slate-500">${p.priceUSD}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Markdown About/Docs */}
          <div className="space-y-2">
            <label
              htmlFor="builder-about-md"
              className="font-display text-sm font-bold text-slate-900 dark:text-white block border-b border-slate-100 dark:border-slate-800 pb-2"
            >
              About / Docs / FAQ (Markdown)
            </label>
            <textarea
              id="builder-about-md"
              rows={5}
              value={draftTheme.aboutMarkdown}
              onChange={(e) => setDraftTheme({ ...draftTheme, aboutMarkdown: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {/* Socials & Contacts */}
          <div className="space-y-2.5">
            <h3 className="font-display text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Socials &amp; Support Contacts
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="url"
                aria-label="GitHub URL"
                placeholder="GitHub URL"
                value={draftTheme.socials.github}
                onChange={(e) =>
                  setDraftTheme({
                    ...draftTheme,
                    socials: { ...draftTheme.socials, github: e.target.value },
                  })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="url"
                aria-label="Telegram URL"
                placeholder="Telegram URL"
                value={draftTheme.socials.telegram}
                onChange={(e) =>
                  setDraftTheme({
                    ...draftTheme,
                    socials: { ...draftTheme.socials, telegram: e.target.value },
                  })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="url"
                aria-label="X Twitter URL"
                placeholder="X / Twitter URL"
                value={draftTheme.socials.twitter}
                onChange={(e) =>
                  setDraftTheme({
                    ...draftTheme,
                    socials: { ...draftTheme.socials, twitter: e.target.value },
                  })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <input
                type="email"
                aria-label="Support Contact Email"
                placeholder="Support Email"
                value={draftTheme.socials.contactEmail}
                onChange={(e) =>
                  setDraftTheme({
                    ...draftTheme,
                    socials: { ...draftTheme.socials, contactEmail: e.target.value },
                  })
                }
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Center Live Preview */}
        <div className="xl:col-span-7 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs dark:border-slate-800 dark:bg-[#111827]">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Live Preview</span>
            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setPreviewMode('standalone')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                    previewMode === 'standalone'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Standalone Site
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('embedded')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                    previewMode === 'embedded'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  Marketplace /@
                </button>
              </div>

              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
                <button
                  type="button"
                  aria-label="Desktop preview"
                  onClick={() => setPreviewViewport('desktop')}
                  className={`rounded-md p-1.5 cursor-pointer ${
                    previewViewport === 'desktop'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Mobile preview"
                  onClick={() => setPreviewViewport('mobile')}
                  className={`rounded-md p-1.5 cursor-pointer ${
                    previewViewport === 'mobile'
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                      : 'text-slate-500'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-slate-800 dark:bg-slate-950 flex justify-center overflow-hidden">
            <div
              className={`w-full overflow-y-auto max-h-[750px] rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg transition-all ${
                previewViewport === 'mobile' ? 'max-w-[390px]' : 'w-full'
              }`}
            >
              <StorefrontRenderer
                store={previewStore}
                products={vendorProducts}
                mode={previewMode}
                isPreview
                onQuickBuy={(prod, tier) =>
                  initiateBuy(prod, 'USDT', {
                    selectedTier: tier,
                    storeContext: {
                      storeName: previewStore.name,
                      storeSlug: previewStore.slug,
                      gateway: previewStore.paymentConfig.gateway,
                      isStandalone: previewMode === 'standalone',
                    },
                  })
                }
                onViewProduct={() => showToast('Preview product click')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
