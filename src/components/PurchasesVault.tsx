import React, { useState } from 'react';
import {
  Download,
  Key,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  ExternalLink,
  Archive,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { Order } from '../types/marketplace';

interface PurchasesVaultProps {
  orders: Order[];
  onBrowseMarketplace: () => void;
  onRefreshOrders: () => void;
}

export const PurchasesVault: React.FC<PurchasesVaultProps> = ({
  orders,
  onBrowseMarketplace,
  onRefreshOrders,
}) => {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [revealedKeyIds, setRevealedKeyIds] = useState<Record<string, boolean>>({});

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
    if (!expiresAt) return 'Active';
    const diffMs = expiresAt - Date.now();
    if (diffMs <= 0) return 'Expired';
    const hours = Math.floor(diffMs / (3600 * 1000));
    const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
    return `${hours}h ${mins}m remaining`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              Digital Assets Library
            </h1>
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800">
              {paidOrders.length} {paidOrders.length === 1 ? 'Product' : 'Products'}
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Access your time-limited download packages, active tokens, and cryptographic software license keys.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshOrders}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <button
            onClick={onBrowseMarketplace}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Browse More
          </button>
        </div>
      </div>

      {/* Orders List */}
      {paidOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-4">
            <Archive className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-white">No digital purchases found yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mt-1 mb-6">
            Pick a script, SaaS template, bot or 3D asset from the marketplace and pay with OxaPay crypto to see it here.
          </p>
          <button
            onClick={onBrowseMarketplace}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
          >
            Explore Developer Products
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {paidOrders.map((order) => {
            const isRevealed = !!revealedKeyIds[order.id];
            const isCopied = copiedKeyId === order.id;

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 sm:p-6 transition hover:border-slate-700"
              >
                {/* Header info */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-cyan-950 px-2 py-0.5 text-[11px] font-semibold text-cyan-300 border border-cyan-800/60">
                        {order.productCategory}
                      </span>
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-slate-300">
                        {order.productVersion}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                      {order.productTitle}
                    </h3>
                  </div>

                  <div className="flex sm:flex-col items-start sm:items-end justify-between text-xs text-slate-400">
                    <span className="font-mono text-emerald-400 font-semibold text-sm">
                      ${order.priceUSD} USD (Paid via {order.oxaInvoice.cryptoCurrency})
                    </span>
                    <span className="text-[11px]">
                      {new Date(order.createdAt).toLocaleDateString()} • Track ID: {order.oxaInvoice.trackId}
                    </span>
                  </div>
                </div>

                {/* Secure Asset Delivery Box */}
                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* File Download section */}
                  {order.secureDelivery?.downloadToken && (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Download className="h-4 w-4 text-cyan-400" />
                            Digital Source Package
                          </span>
                          <span className="flex items-center gap-1 rounded bg-slate-900 px-2 py-0.5 text-[11px] font-mono text-cyan-300 border border-slate-800">
                            <Clock className="h-3 w-3" />
                            {formatExpiresIn(order.secureDelivery.downloadExpiresAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mb-4">
                          File: <span className="font-mono text-white">{order.secureDelivery.fileName}</span>
                          <br />
                          Usage: {order.secureDelivery.downloadCount} of {order.secureDelivery.maxDownloads} downloads used
                        </p>
                      </div>

                      <a
                        href={`/api/downloads/${order.secureDelivery.downloadToken}`}
                        download={order.secureDelivery.fileName}
                        className="flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-xs font-bold text-slate-950 shadow hover:bg-cyan-400 transition"
                      >
                        <Download className="h-4 w-4" />
                        Download Asset ({order.secureDelivery.fileName})
                      </a>
                    </div>
                  )}

                  {/* License Key section */}
                  {order.secureDelivery?.licenseKey ? (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                            <Key className="h-4 w-4 text-amber-400" />
                            License Key
                          </span>
                          <button
                            onClick={() => toggleReveal(order.id)}
                            className="text-[11px] text-cyan-400 hover:underline"
                          >
                            {isRevealed ? 'Hide Key' : 'Reveal Key'}
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 mb-3">
                          Assigned exclusively to {order.buyerEmail} for commercial software activation.
                        </p>
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs">
                        <span className="font-mono font-bold text-amber-300">
                          {isRevealed ? order.secureDelivery.licenseKey : '••••-••••-••••-••••'}
                        </span>
                        <button
                          onClick={() => copyKey(order.secureDelivery?.licenseKey || '', order.id)}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition"
                          aria-label="Copy software license key"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block">Royalty-Free Standard License</span>
                        <p className="text-[11px] text-slate-400">Included with direct file download. No activation key required.</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
