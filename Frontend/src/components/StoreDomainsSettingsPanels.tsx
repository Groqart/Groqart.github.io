import React, { useState, useEffect } from 'react';
import {
  Globe,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CreditCard,
  Save,
  Sparkles,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import type { PaymentGatewayId } from '../types/marketplace';
import { isValidCryptoWallet, MARKETPLACE_DOMAIN } from '../utils/storefrontLogic';

export const StoreDomainsPanel: React.FC = () => {
  const {
    vendorStore,
    setIsCreateStoreOpen,
    updateVendorStore,
    verifyStoreDns,
    showToast,
  } = useMarketplace();

  const [domainInput, setDomainInput] = useState('');
  const [isSavingVisibility, setIsSavingVisibility] = useState(false);
  const [isSavingDomain, setIsSavingDomain] = useState(false);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (vendorStore) {
      setDomainInput(vendorStore.customDomain || '');
    }
  }, [vendorStore]);

  if (!vendorStore) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-4 dark:border-slate-800 dark:bg-[#111827]">
        <h2 className="font-display text-lg font-bold text-slate-900 dark:text-white">
          Visibility &amp; Custom Domains
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create your storefront first to manage marketplace feed visibility and attach a custom domain.
        </p>
        <button
          type="button"
          onClick={() => setIsCreateStoreOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
        >
          <Sparkles className="h-4 w-4" />
          <span>Create Store</span>
        </button>
      </div>
    );
  }

  const handleToggleFeedVisibility = async () => {
    setErrorMsg(null);
    setIsSavingVisibility(true);
    const res = await updateVendorStore({ isPublicInFeed: !vendorStore.isPublicInFeed });
    setIsSavingVisibility(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Failed to update catalog visibility');
      return;
    }
    showToast(
      !vendorStore.isPublicInFeed
        ? 'Store products listed in ZenxusBay Marketplace catalog'
        : 'Store switched to Private Standalone Only (hidden from main feed)'
    );
  };

  const handleSaveDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSavingDomain(true);
    const res = await updateVendorStore({ customDomain: domainInput.trim() || null });
    setIsSavingDomain(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Could not save domain');
    }
  };

  const handleCheckDns = async () => {
    setErrorMsg(null);
    setIsVerifyingDns(true);
    const res = await verifyStoreDns();
    setIsVerifyingDns(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'DNS check failed');
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Feed Visibility Toggle */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {vendorStore.isPublicInFeed ? (
                <Eye className="h-4 w-4 text-emerald-500" />
              ) : (
                <EyeOff className="h-4 w-4 text-amber-500" />
              )}
              <h2 className="font-display text-base font-bold text-slate-900 dark:text-white">
                List products in ZenxusBay Marketplace
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
              {vendorStore.isPublicInFeed
                ? 'On: Your products appear both in the public ZenxusBay catalog/search and on your private storefront.'
                : 'Off (Independent Brand Mode): Your products are hidden from ZenxusBay global search & catalog, while remaining live on your storefront links.'}
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={vendorStore.isPublicInFeed}
            disabled={isSavingVisibility}
            onClick={handleToggleFeedVisibility}
            className={`shrink-0 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition cursor-pointer ${
              vendorStore.isPublicInFeed
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
            }`}
          >
            {isSavingVisibility && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{vendorStore.isPublicInFeed ? 'Listed in Marketplace' : 'Private Standalone Only'}</span>
          </button>
        </div>
      </div>

      {/* Custom Domain & Canonical SEO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 dark:border-slate-800 dark:bg-[#111827]">
        <div>
          <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-4 w-4 text-cyan-500" />
            <span>Custom Domain &amp; SSL</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Point your personal domain to{' '}
            <code className="font-mono font-semibold text-cyan-700 dark:text-cyan-300">
              shops.{MARKETPLACE_DOMAIN}
            </code>{' '}
            for standalone Mode B hosting + automatic <code className="font-mono">rel=&quot;canonical&quot;</code> SEO.
          </p>
        </div>

        <form onSubmit={handleSaveDomain} className="flex flex-col sm:flex-row gap-2.5 text-xs">
          <input
            type="text"
            aria-label="Custom domain"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="cybercode.dev"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="submit"
            disabled={isSavingDomain}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 transition cursor-pointer"
          >
            {isSavingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Domain</span>
          </button>
          <button
            type="button"
            disabled={!vendorStore.customDomain || isVerifyingDns}
            onClick={handleCheckDns}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0EA5E9] px-4 py-2.5 font-bold text-white hover:bg-[#0284C7] disabled:opacity-45 transition cursor-pointer"
          >
            {isVerifyingDns ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            <span>Check DNS</span>
          </button>
        </form>

        {/* DNS Record Card */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">DNS CNAME Record</span>
            {vendorStore.dnsVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:border-emerald-500/30 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                DNS Verified · TLS 1.3 SSL Active
              </span>
            ) : vendorStore.customDomain ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:border-amber-500/30 dark:text-amber-300">
                Pending CNAME Verification
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Default Subdomain Active</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300 pt-1">
            <div>Type: CNAME</div>
            <div>Host: @ or shop</div>
            <div className="truncate">Target: shops.{MARKETPLACE_DOMAIN}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const StoreGatewaySettingsPanel: React.FC = () => {
  const { vendorStore, updateVendorStore, setIsCreateStoreOpen, showToast } = useMarketplace();
  const [gateway, setGateway] = useState<PaymentGatewayId>('nowpayments');
  const [wallet, setWallet] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [preferredCurrency, setPreferredCurrency] = useState<'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TON'>('USDT');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (vendorStore) {
      setGateway(vendorStore.paymentConfig.gateway);
      setWallet(vendorStore.paymentConfig.walletAddress);
      setPreferredCurrency(vendorStore.paymentConfig.preferredCurrency);
    }
  }, [vendorStore]);

  if (!vendorStore) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center space-y-3 dark:border-slate-800 dark:bg-[#111827]">
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Launch your store first to bind a store-specific crypto payment gateway.
        </p>
        <button
          type="button"
          onClick={() => setIsCreateStoreOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0EA5E9] px-4 py-2 text-xs font-bold text-white cursor-pointer"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Create Store</span>
        </button>
      </div>
    );
  }

  const handleSaveGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (wallet.trim() && !isValidCryptoWallet(wallet.trim())) {
      setErrorMsg('Enter a valid crypto wallet (EVM 0x..., TON, BTC, SOL, or 0xadmin).');
      return;
    }
    setIsSaving(true);
    const res = await updateVendorStore({
      gateway,
      walletAddress: wallet.trim() || undefined,
      apiKey: apiKey.trim() || undefined,
      preferredCurrency,
    });
    setIsSaving(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Failed to update gateway config');
      return;
    }
    setApiKey('');
    showToast('Storefront crypto gateway updated');
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-cyan-500" />
          <span>Storefront Direct Crypto Checkout</span>
        </h2>
        <span className="text-[11px] font-mono text-slate-500">
          {vendorStore.paymentConfig.hasApiKey ? `Key: ${vendorStore.paymentConfig.apiKeyMasked}` : 'Managed Gateway'}
        </span>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSaveGateway} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label htmlFor="gw-select" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gateway Provider
            </label>
            <select
              id="gw-select"
              value={gateway}
              onChange={(e) => setGateway(e.target.value as PaymentGatewayId)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="nowpayments">NOWPayments</option>
              <option value="cryptomus">Cryptomus</option>
              <option value="walletconnect">WalletConnect / Smart Contract</option>
            </select>
          </div>

          <div>
            <label htmlFor="gw-currency" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Default Payout Currency
            </label>
            <select
              id="gw-currency"
              value={preferredCurrency}
              onChange={(e) =>
                setPreferredCurrency(e.target.value as 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TON')
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="USDT">USDT</option>
              <option value="TON">TON</option>
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="SOL">SOL</option>
            </select>
          </div>

          <div>
            <label htmlFor="gw-apikey" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Update API Key (Optional)
            </label>
            <input
              id="gw-apikey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste new key..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="gw-wallet" className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Payout Wallet Address (USDT / TON / BTC / ETH or &quot;0xadmin&quot;)
          </label>
          <input
            id="gw-wallet"
            type="text"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 font-bold text-white hover:bg-[#0284C7] disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>Save Gateway Configuration</span>
        </button>
      </form>
    </div>
  );
};
