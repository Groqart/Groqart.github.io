import React, { useState } from 'react';
import { Link } from 'react-router';
import {
  Download,
  Key,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Archive,
  RefreshCw,
  ShoppingBag,
  Star,
  ExternalLink,
} from 'lucide-react';
import type { Order } from '../types/marketplace';
import { ReviewModal } from './ReviewModal';

interface PurchasesVaultProps {
  orders: Order[];
  userEmail: string;
  onBrowseMarketplace: () => void;
  onRefreshOrders: () => void;
}

export const PurchasesVault: React.FC<PurchasesVaultProps> = ({
  orders,
  userEmail,
  onBrowseMarketplace,
  onRefreshOrders,
}) => {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Order | null>(null);

  const copyKey = (key: string, orderId: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKeyId(orderId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const toggleReveal = (orderId: string) => {
    setRevealedKeyIds((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const paidOrders = orders.filter((o) => o.status === 'paid');

  const formatExpiresIn = (expiresAt?: number) => {
    if (!expiresAt) return '15-minute signed link';
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Expired — click Refresh Links';
    const mins = Math.floor(diffMs / (60 * 1000));
    if (mins < 60) return `${mins}m signed link`;
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m remaining`;
  };

  const getDownloadHref = (order: Order): string | null => {
    if (order.secureDelivery?.downloadUrl) {
      return order.secureDelivery.downloadUrl;
    }
    if (order.secureDelivery?.downloadToken) {
      return `/api/downloads/${encodeURIComponent(order.secureDelivery.downloadToken)}`;
    }
    return null;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {downloadNotice && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          {downloadNotice}
        </div>
      )}

      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-3xl">
              Digital Assets Library
            </h1>
            <span className="rounded-full bg-cyan-50 px-2.5 py-0.5 text-xs font-semibold text-cyan-700 border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800 tabular-nums">
              {paidOrders.length} {paidOrders.length === 1 ? 'Product' : 'Products'}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Verified purchases for <span className="text-slate-900 dark:text-slate-200 font-medium">{userEmail}</span> • 15-minute signed download links &amp; license keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setDownloadNotice(null);
              onRefreshOrders();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh Links</span>
          </button>
          <button
            type="button"
            onClick={onBrowseMarketplace}
            className="flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#0284C7] transition cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Browse More</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      {paidOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800/80 dark:bg-slate-900/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 mb-4">
            <Archive className="h-7 w-7" />
          </div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            No paid digital purchases yet for {userEmail}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mt-1 mb-6">
            Browse scripts, SaaS starters, automation bots, and 3D assets in the marketplace and settle instantly with NOWPayments crypto.
          </p>
          <button
            type="button"
            onClick={onBrowseMarketplace}
            className="rounded-xl bg-[#0EA5E9] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0284C7] transition cursor-pointer"
          >
            Explore Developer Products
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {paidOrders.map((order) => {
            const isRevealed = !!revealedKeyIds[order.id];
            const isCopied = copiedKeyId === order.id;
            const downloadHref = getDownloadHref(order);
            const showDownloadPanel = order.deliveryType !== 'license_key';
            const showLicensePanel =
              order.deliveryType !== 'file' && Boolean(order.secureDelivery?.licenseKey);

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800/60">
                        {order.productCategory}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {order.productVersion}
                      </span>
                      {order.hasReviewed ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300 border border-amber-500/30 tabular-nums">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          Reviewed ({order.reviewRating || 5}/5)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setReviewTarget(order)}
                          className="inline-flex items-center gap-1 rounded-md border border-cyan-500/40 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:hover:bg-cyan-500/20 transition cursor-pointer"
                        >
                          <Star className="h-3 w-3" />
                          <span>Leave Review</span>
                        </button>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {order.productTitle}
                      </h3>
                      <Link
                        to={`/product/${order.productId}`}
                        aria-label={`Open product page for ${order.productTitle}`}
                        className="text-slate-500 hover:text-cyan-600 dark:text-slate-400 dark:hover:text-cyan-300 transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold text-sm tabular-nums">
                      ${order.priceUSD} USD (Paid via {order.paymentMeta?.cryptoCurrency || 'NOWPayments'})
                    </span>
                    <span className="text-[11px]">
                      {new Date(order.createdAt).toLocaleDateString()} • Order: {order.id}
                    </span>
                  </div>
                </div>

                {/* Secure Asset Delivery Box */}
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Download section */}
                  {showDownloadPanel && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between dark:border-slate-800 dark:bg-slate-950/80">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                            <Download className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                            Digital Source Package
                          </span>
                          <span className="flex items-center gap-1 rounded bg-white px-2 py-0.5 text-[11px] font-mono text-cyan-700 border border-slate-200 dark:bg-slate-900 dark:text-cyan-300 dark:border-slate-800 tabular-nums">
                            <Clock className="h-3 w-3" />
                            {formatExpiresIn(order.secureDelivery?.downloadExpiresAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
                          File:{' '}
                          <span className="font-mono text-slate-900 dark:text-white">
                            {order.secureDelivery?.fileName || 'package.zip'}
                          </span>
                        </p>
                      </div>

                      {downloadHref ? (
                        <a
                          href={downloadHref}
                          download={order.secureDelivery?.fileName || 'package.zip'}
                          className="flex items-center justify-center gap-2 rounded-lg bg-[#0EA5E9] px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-[#0284C7] transition"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Asset ({order.secureDelivery?.fileName || 'Archive'})</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setDownloadNotice('Refreshing 15-minute signed download URL...');
                            onRefreshOrders();
                          }}
                          className="flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:text-white transition cursor-pointer"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Regenerate 15m Link</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* License Key section */}
                  {showLicensePanel && order.secureDelivery?.licenseKey ? (
                    <div className={`rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between dark:border-slate-800 dark:bg-slate-950/80 ${!showDownloadPanel ? 'md:col-span-2' : ''}`}>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                            <Key className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                            License Key
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleReveal(order.id)}
                            className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer"
                          >
                            {isRevealed ? 'Hide Key' : 'Reveal Key'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                          Assigned exclusively to {order.buyerEmail} for commercial software activation (up to 3 activations).
                        </p>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-white border border-slate-200 px-3 py-2 text-xs dark:bg-slate-900 dark:border-slate-800">
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-300">
                          {isRevealed ? order.secureDelivery.licenseKey : '••••-••••-••••-••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyKey(order.secureDelivery?.licenseKey || '', order.id)}
                          className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300 transition cursor-pointer"
                          aria-label={`Copy license key for ${order.productTitle}`}
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex items-center gap-3 dark:border-slate-800 dark:bg-slate-950/80">
                      <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">Royalty-Free Standard License</span>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">Included with direct file download. No activation key required.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {reviewTarget && (
        <ReviewModal
          order={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={onRefreshOrders}
        />
      )}
    </div>
  );
};
