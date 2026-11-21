import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import { ShieldCheck, Mail, X, ArrowRight, Loader2, AlertCircle, LogIn, CheckCircle2 } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { SUPPORTED_CRYPTO } from '../utils/nowpaymentsLogic';
import type { CryptoCurrency } from '../types/marketplace';

export const CheckoutModal: React.FC = () => {
  const navigate = useNavigate();
  const { pendingCheckout, setPendingCheckout, createPaymentCheckout, requestMagicLink, user } =
    useMarketplace();

  const [email, setEmail] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CryptoCurrency>('USDT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Optional "Sign in with ZenxusBay" inline prompt (for standalone storefronts & guests)
  const [showSignInBox, setShowSignInBox] = useState(false);
  const [signInIdentifier, setSignInIdentifier] = useState('');
  const [signInSending, setSignInSending] = useState(false);
  const [signInDevUrl, setSignInDevUrl] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingCheckout) {
      setErrorMsg(null);
      setShowSignInBox(false);
      setSignInDevUrl(null);
      setSignInError(null);
      setSelectedCurrency(pendingCheckout.cryptoCurrency);
      if (user?.email) {
        setEmail(user.email);
      } else if (typeof window !== 'undefined') {
        setEmail(localStorage.getItem('nexusbyte_buyer_email') || '');
      }
    }
  }, [pendingCheckout, user?.email]);

  if (!pendingCheckout) return null;

  const { product, selectedTier, storeContext } = pendingCheckout;
  const activePrice = selectedTier ? selectedTier.priceUSD : product.priceUSD;
  const networkMeta = SUPPORTED_CRYPTO[selectedCurrency] || SUPPORTED_CRYPTO.USDT;
  const gatewayTitle =
    storeContext?.gateway === 'cryptomus'
      ? 'Cryptomus Crypto Checkout'
      : storeContext?.gateway === 'walletconnect'
      ? 'Direct Smart Contract Checkout'
      : 'NOWPayments Crypto Checkout';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    const result = await createPaymentCheckout(email, selectedCurrency);
    setIsSubmitting(false);

    if (!result.ok || !result.invoiceUrl) {
      setErrorMsg(result.error || 'Unable to start crypto checkout');
      return;
    }

    if (result.invoiceUrl.startsWith('/')) {
      navigate(result.invoiceUrl);
    } else {
      window.location.href = result.invoiceUrl;
    }
  };

  const handleQuickSignIn = async () => {
    setSignInError(null);
    setSignInSending(true);
    const redirect =
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/purchases';
    const res = await requestMagicLink(signInIdentifier, redirect);
    setSignInSending(false);
    if (!res.ok) {
      setSignInError(res.error || 'Could not send ZenxusBay sign-in link');
      return;
    }
    setSignInDevUrl(res.devVerifyUrl || null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111827] max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="checkout-modal-title" className="text-base font-bold text-slate-900 dark:text-white">
                {storeContext ? `${storeContext.storeName} · Crypto Checkout` : gatewayTitle}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                1-Click Guest Invoice · Instant Digital Delivery
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingCheckout(null)}
            aria-label="Close checkout modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product Summary */}
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {product.title}
            </span>
            <span className="font-mono text-[11px] text-cyan-700 dark:text-cyan-300 shrink-0">
              {product.version}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span>{selectedTier ? `${selectedTier.name} License` : product.category}</span>
            <span>{product.fileInfo.fileName}</span>
          </div>
          <div className="border-t border-slate-200 pt-2 flex items-center justify-between dark:border-slate-800">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">Selected Asset</span>
              <span className="text-[11px] text-cyan-700 dark:text-cyan-300">
                {selectedCurrency} · {networkMeta.network}
              </span>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                ${activePrice.toFixed(2)} USD
              </span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                Exact rate locked on invoice
              </span>
            </div>
          </div>
        </div>

        {/* Optional Sign in with ZenxusBay for unauthenticated guests */}
        {!user && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-600 dark:text-slate-300">
                Checkout as guest or sync with{' '}
                <span translate="no" className="notranslate font-semibold">
                  ZenxusBay
                </span>
              </span>
              <button
                type="button"
                onClick={() => setShowSignInBox((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/40 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 dark:bg-cyan-500/15 dark:text-cyan-300 dark:hover:bg-cyan-500/25 transition cursor-pointer shrink-0"
              >
                <LogIn className="h-3 w-3" />
                <span translate="no" className="notranslate">
                  Sign in with ZenxusBay
                </span>
              </button>
            </div>

            {showSignInBox && (
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                {signInError && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">{signInError}</p>
                )}
                {signInDevUrl ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-2 dark:bg-emerald-950/30 dark:border-emerald-500/30">
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Magic link ready
                    </span>
                    <Link
                      to={signInDevUrl}
                      onClick={() => setPendingCheckout(null)}
                      className="rounded-md bg-[#0EA5E9] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#0284C7]"
                    >
                      Verify Sign In
                    </Link>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={signInIdentifier}
                      onChange={(e) => setSignInIdentifier(e.target.value)}
                      placeholder="you@example.com or admin"
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                    />
                    <button
                      type="button"
                      disabled={signInSending || !signInIdentifier.trim()}
                      onClick={handleQuickSignIn}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 disabled:opacity-50 cursor-pointer"
                    >
                      {signInSending ? 'Sending...' : 'Send Link'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Preferred Crypto Asset
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {(['USDT', 'BTC', 'ETH', 'LTC', 'SOL'] as CryptoCurrency[]).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setSelectedCurrency(cur)}
                  className={`rounded-lg py-1.5 text-[11px] font-semibold transition border cursor-pointer ${
                    selectedCurrency === cur
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:border-cyan-400 dark:bg-cyan-950/60 dark:text-cyan-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="checkout-buyer-email"
              className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              <Mail className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              Delivery Email Address
            </label>
            <input
              id="checkout-buyer-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
            />
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              Exact crypto amount &amp; network fee are locked on the Hosted Invoice.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setPendingCheckout(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-medium text-slate-600 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] px-5 py-2.5 font-bold text-white shadow-sm hover:bg-[#0284C7] transition disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Invoice...</span>
                </>
              ) : (
                <>
                  <span>Proceed to Crypto Checkout</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
