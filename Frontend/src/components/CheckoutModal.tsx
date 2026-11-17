import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ShieldCheck, Mail, X, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { SUPPORTED_CRYPTO } from '../utils/nowpaymentsLogic';
import type { CryptoCurrency } from '../types/marketplace';

export const CheckoutModal: React.FC = () => {
  const navigate = useNavigate();
  const { pendingCheckout, setPendingCheckout, createPaymentCheckout, user } = useMarketplace();

  const [email, setEmail] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState<CryptoCurrency>('USDT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (pendingCheckout) {
      setErrorMsg(null);
      setSelectedCurrency(pendingCheckout.cryptoCurrency);
      if (user?.email) {
        setEmail(user.email);
      } else if (typeof window !== 'undefined') {
        setEmail(localStorage.getItem('nexusbyte_buyer_email') || '');
      }
    }
  }, [pendingCheckout, user?.email]);

  if (!pendingCheckout) return null;

  const { product } = pendingCheckout;
  const networkMeta = SUPPORTED_CRYPTO[selectedCurrency] || SUPPORTED_CRYPTO.USDT;

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="checkout-modal-title" className="text-base font-bold text-white">
                NOWPayments Crypto Checkout
              </h3>
              <p className="text-[11px] text-slate-400">Hosted Invoice • Instant Digital Delivery</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingCheckout(null)}
            aria-label="Close checkout modal"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Product Summary */}
        <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white truncate">{product.title}</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-cyan-300 shrink-0">
              {product.version}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>{product.category}</span>
            <span>{product.fileInfo.fileName}</span>
          </div>
          <div className="border-t border-slate-800 pt-2 flex items-center justify-between">
            <div>
              <span className="text-slate-400 block">Selected Asset</span>
              <span className="text-[11px] text-cyan-300">{selectedCurrency} • {networkMeta.network}</span>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-white tabular-nums">${product.priceUSD.toFixed(2)} USD</span>
              <span className="block text-[10px] text-slate-400">
                Exact rate locked on invoice
              </span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <span className="font-semibold text-slate-300 block mb-1.5">Preferred Crypto Asset</span>
            <div className="grid grid-cols-5 gap-1.5">
              {(['USDT', 'BTC', 'ETH', 'LTC', 'SOL'] as CryptoCurrency[]).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setSelectedCurrency(cur)}
                  className={`rounded-lg py-1.5 text-[11px] font-semibold transition border cursor-pointer ${
                    selectedCurrency === cur
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
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
              className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1.5"
            >
              <Mail className="h-3.5 w-3.5 text-cyan-400" />
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
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Exact crypto amount &amp; network fee are locked on the NOWPayments Hosted Invoice. Your 15-minute signed download link can be regenerated anytime in My Library.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setPendingCheckout(null)}
              className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 font-medium text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition disabled:opacity-50 cursor-pointer"
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
