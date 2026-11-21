import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  X,
  Store,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Globe,
  LayoutGrid,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Loader2,
  KeyRound,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  STORE_TEMPLATE_PRESETS,
  slugifyStoreName,
  isValidStoreSlug,
  isValidCryptoWallet,
  MARKETPLACE_DOMAIN,
} from '../utils/storefrontLogic';
import type { PaymentGatewayId, StoreTemplateId } from '../types/marketplace';
import { API_BASE } from '../utils/apiBase';

const ACCENT_SWATCHES = ['#0EA5E9', '#06B6D4', '#10B981', '#8B5CF6', '#F59E0B', '#EC4899'];

export const CreateStoreModal: React.FC = () => {
  const navigate = useNavigate();
  const {
    user,
    authToken,
    vendorStore,
    isCreateStoreOpen,
    setIsCreateStoreOpen,
    createStore,
    requestMagicLink,
    verifyMagicToken,
  } = useMarketplace();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    reason?: string;
  }>({ checking: false, available: null });

  const [template, setTemplate] = useState<StoreTemplateId>('featured_hero');
  const [accentColor, setAccentColor] = useState('#0EA5E9');

  const [gateway, setGateway] = useState<PaymentGatewayId>('nowpayments');
  const [walletAddress, setWalletAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Inline auth for guest clicking + Store
  const [loginInput, setLoginInput] = useState('');
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (isCreateStoreOpen) {
      setErrorMsg(null);
      setAuthError(null);
      setDevToken(null);
      setStep(1);
      if (vendorStore) {
        setName(vendorStore.name);
        setSlug(vendorStore.slug);
        setSlugTouched(true);
        setTemplate(vendorStore.themeConfig.template);
        setAccentColor(vendorStore.themeConfig.accentColor);
        setGateway(vendorStore.paymentConfig.gateway);
        setWalletAddress(vendorStore.paymentConfig.walletAddress);
      } else {
        setName('');
        setSlug('');
        setSlugTouched(false);
        setTemplate('featured_hero');
        setAccentColor('#0EA5E9');
        setGateway('nowpayments');
        setWalletAddress('');
        setApiKey('');
      }
    }
  }, [isCreateStoreOpen, vendorStore]);

  useEffect(() => {
    if (!isCreateStoreOpen) return;
    const cleaned = slug.trim().toLowerCase();
    if (!cleaned) {
      setSlugStatus({ checking: false, available: null });
      return;
    }
    if (!isValidStoreSlug(cleaned)) {
      setSlugStatus({
        checking: false,
        available: false,
        reason: 'Use 3–32 lowercase letters, numbers, or hyphens (cannot be reserved).',
      });
      return;
    }

    let cancelled = false;
    setSlugStatus({ checking: true, available: null });
    const timer = setTimeout(async () => {
      try {
        const headers: Record<string, string> = {};
        if (authToken) headers.Authorization = `Bearer ${authToken}`;
        const res = await fetch(
          `${API_BASE}/api/stores/check-slug?slug=${encodeURIComponent(cleaned)}`,
          { headers }
        );
        const data = await res.json();
        if (!cancelled) {
          setSlugStatus({
            checking: false,
            available: Boolean(data.available),
            reason: data.reason,
          });
        }
      } catch {
        if (!cancelled) {
          setSlugStatus({ checking: false, available: true });
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [slug, isCreateStoreOpen, authToken]);

  if (!isCreateStoreOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      setSlug(slugifyStoreName(val));
    }
  };

  const handleInlineAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSendingLink(true);
    const res = await requestMagicLink(loginInput, '/vendor?tab=builder');
    setIsSendingLink(false);
    if (!res.ok) {
      setAuthError(res.error || 'Could not start sign-in');
      return;
    }
    if (res.devVerifyUrl) {
      const m = res.devVerifyUrl.match(/token=([^&]+)/);
      if (m?.[1]) {
        setDevToken(decodeURIComponent(m[1]));
      }
    }
  };

  const handleInstantSandboxVerify = async () => {
    if (!devToken) return;
    setAuthError(null);
    setIsSendingLink(true);
    const res = await verifyMagicToken(devToken);
    setIsSendingLink(false);
    if (!res.ok) {
      setAuthError(res.error || 'Verification failed');
      return;
    }
    setDevToken(null);
  };

  const canGoStep2 =
    name.trim().length >= 2 &&
    isValidStoreSlug(slug.trim().toLowerCase()) &&
    slugStatus.available !== false &&
    !slugStatus.checking;

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const w = walletAddress.trim();
    const k = apiKey.trim();

    if (!w && !k) {
      setErrorMsg('Enter your crypto payout wallet (e.g. 0x... or 0xadmin) or gateway API key.');
      return;
    }
    if (w && !isValidCryptoWallet(w)) {
      setErrorMsg('Invalid crypto wallet format (supports EVM 0x..., TON, BTC, SOL, or 0xadmin).');
      return;
    }

    setIsLaunching(true);
    const res = await createStore({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      template,
      accentColor,
      walletAddress: w || undefined,
      gateway,
      apiKey: k || undefined,
    });
    setIsLaunching(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Failed to launch storefront');
      return;
    }

    setIsCreateStoreOpen(false);
    navigate('/vendor?tab=builder');
  };

  const previewSlug = slug.trim().toLowerCase() || 'cybercode';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-store-wizard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111827] my-8 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="create-store-wizard-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                {vendorStore ? 'Reconfigure Storefront' : 'Create Your Storefront'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Launch an embedded{' '}
                <span translate="no" className="notranslate font-medium">
                  ZenxusBay
                </span>{' '}
                shop + standalone website in 3 steps
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateStoreOpen(false)}
            aria-label="Close create store wizard"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Inline Auth Gate if unauthenticated */}
        {!user ? (
          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-500/30 dark:bg-cyan-950/30">
              <div className="flex items-center gap-2 font-bold text-cyan-900 dark:text-cyan-200 mb-1">
                <Sparkles className="h-4 w-4" />
                <span>Sign in first to reserve your store address</span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Enter your email or type <code className="font-mono font-bold">admin</code> for quick sandbox access.
              </p>
            </div>

            {authError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            {devToken ? (
              <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-3 dark:border-emerald-500/30 dark:bg-emerald-950/30">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Magic link generated in sandbox mode</span>
                </div>
                <button
                  type="button"
                  disabled={isSendingLink}
                  onClick={handleInstantSandboxVerify}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0284C7] cursor-pointer"
                >
                  {isSendingLink ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4" />
                  )}
                  <span>Sign In &amp; Continue Store Setup</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleInlineAuth} className="space-y-3">
                <div>
                  <label
                    htmlFor="wizard-login-input"
                    className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Email or Test Login (&quot;admin&quot;)
                  </label>
                  <input
                    id="wizard-login-input"
                    type="text"
                    required
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    placeholder="you@example.com or admin"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingLink}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] py-2.5 text-xs font-bold text-white hover:bg-[#0284C7] transition cursor-pointer"
                >
                  {isSendingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  <span>Continue</span>
                </button>
              </form>
            )}
          </div>
        ) : (
          <>
            {/* 3-Step Indicator */}
            <div className="grid grid-cols-3 gap-2 mb-6 text-xs">
              {[
                { num: 1 as const, label: '1. Name & Address', icon: Globe },
                { num: 2 as const, label: '2. Store Template', icon: LayoutGrid },
                { num: 3 as const, label: '3. Crypto Wallet', icon: Wallet },
              ].map((s) => {
                const Icon = s.icon;
                const active = step === s.num;
                const done = step > s.num;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < step || (s.num === 2 && canGoStep2)) {
                        setStep(s.num);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 font-semibold transition cursor-pointer ${
                      active
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300'
                        : done
                        ? 'border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{s.label}</span>
                  </button>
                );
              })}
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Name & Reserved Dual Addresses */}
            {step === 1 && (
              <div className="space-y-4 text-xs">
                <div>
                  <label
                    htmlFor="store-wizard-name"
                    className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Store Name *
                  </label>
                  <input
                    id="store-wizard-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. CyberCode"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="store-wizard-slug"
                      className="font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Store Handle / Slug *
                    </label>
                    {slugStatus.checking ? (
                      <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                      </span>
                    ) : slugStatus.available === true ? (
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Available
                      </span>
                    ) : slugStatus.available === false ? (
                      <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                        {slugStatus.reason || 'Unavailable'}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-cyan-500 dark:border-slate-800 dark:bg-slate-950">
                    <span className="pl-3.5 pr-1 font-mono text-sm text-slate-400">@</span>
                    <input
                      id="store-wizard-slug"
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      }}
                      placeholder="cybercode"
                      className="w-full bg-transparent py-2.5 pr-3.5 font-mono text-sm text-slate-900 focus:outline-none dark:text-white"
                    />
                  </div>
                </div>

                {/* Live Dual-Mode Address Reservation Card */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Reserved Storefront URLs
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">Marketplace Store:</span>
                    <code className="font-mono font-semibold text-cyan-700 dark:text-cyan-300">
                      {MARKETPLACE_DOMAIN}/@{previewSlug}
                    </code>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-600 dark:text-slate-300">Standalone Site:</span>
                    <code className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                      {previewSlug}.{MARKETPLACE_DOMAIN}
                    </code>
                  </div>
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    disabled={!canGoStep2}
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0284C7] transition disabled:opacity-45 cursor-pointer"
                  >
                    <span>Next: Choose Template</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: 3 Template Presets */}
            {step === 2 && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {STORE_TEMPLATE_PRESETS.map((preset) => {
                    const selected = template === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setTemplate(preset.id);
                          setAccentColor(preset.accentColor);
                        }}
                        className={`flex flex-col text-left rounded-xl border p-4 transition cursor-pointer ${
                          selected
                            ? 'border-cyan-500 bg-cyan-50/70 ring-2 ring-cyan-500/20 dark:bg-cyan-500/10'
                            : 'border-slate-200 bg-slate-50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="h-2.5 w-10 rounded-full mb-3"
                          style={{ backgroundColor: preset.accentColor }}
                        />
                        <div className="font-display text-sm font-bold text-slate-900 dark:text-white mb-1">
                          {preset.name}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {preset.tagline}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Brand Accent Color
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    {ACCENT_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-label={`Select accent color ${hex}`}
                        onClick={() => setAccentColor(hex)}
                        className={`h-8 w-8 rounded-lg border-2 transition cursor-pointer ${
                          accentColor === hex ? 'border-slate-900 dark:border-white scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#0284C7] transition cursor-pointer"
                  >
                    <span>Next: Connect Wallet</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Crypto Wallet / Gateway */}
            {step === 3 && (
              <form onSubmit={handleLaunch} className="space-y-4 text-xs">
                <div>
                  <span className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Direct Crypto Gateway
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'nowpayments' as const, label: 'NOWPayments', sub: 'USDT / BTC / ETH / SOL' },
                      { id: 'cryptomus' as const, label: 'Cryptomus', sub: 'USDT / TON / TRX' },
                      { id: 'walletconnect' as const, label: 'Smart Contract', sub: 'Direct WalletConnect' },
                    ].map((gw) => (
                      <button
                        key={gw.id}
                        type="button"
                        onClick={() => setGateway(gw.id)}
                        className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                          gateway === gw.id
                            ? 'border-cyan-500 bg-cyan-50 text-cyan-900 dark:bg-cyan-500/15 dark:text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'
                        }`}
                      >
                        <div className="font-bold">{gw.label}</div>
                        <div className="text-[10px] opacity-80">{gw.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="store-wizard-wallet"
                    className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Crypto Payout Wallet (USDT / TON / BTC / ETH or &quot;0xadmin&quot;) *
                  </label>
                  <input
                    id="store-wizard-wallet"
                    type="text"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e or 0xadmin"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label
                    htmlFor="store-wizard-apikey"
                    className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Payment Gateway API Key (Optional)
                  </label>
                  <input
                    id="store-wizard-apikey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Leave blank to use managed platform gateway"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isLaunching}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0284C7] transition disabled:opacity-50 cursor-pointer"
                  >
                    {isLaunching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Launching...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        <span>Launch Store</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
