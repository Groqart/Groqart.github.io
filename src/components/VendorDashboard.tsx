import React, { useState, useEffect } from 'react';
import {
  Upload,
  DollarSign,
  Package,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Trash2,
  Eye,
  Wallet,
  Clock,
  CheckCircle2,
  X,
  Zap,
} from 'lucide-react';
import { Product, Order, VendorPayout, CryptoCurrency } from '../types/marketplace';
import { VendorUploadModal } from './VendorUploadModal';

interface VendorDashboardProps {
  products: Product[];
  onProductDeleted: (id: string) => void;
  onProductCreated: (p: Product) => void;
  onViewProduct: (p: Product) => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  products,
  onProductDeleted,
  onProductCreated,
  onViewProduct,
}) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState<number>(100);
  const [payoutCurrency, setPayoutCurrency] = useState<CryptoCurrency>('USDT');
  const [payoutAddress, setPayoutAddress] = useState('TYDzsYUEW6v18K9vC7mtestaddress999');
  const [payoutsList, setPayoutsList] = useState<VendorPayout[]>([]);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalSalesCount: 0,
    totalRevenueUSD: 0,
    netEarningsUSD: 0,
    availableBalanceUSD: 0,
    recentOrders: [] as Order[],
  });

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/vendor/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.payouts) setPayoutsList(data.payouts);
      }
    } catch (err) {
      console.error('Fetch stats error', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [products]);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutAddress || payoutAmount <= 0) return;

    try {
      const res = await fetch('/api/vendor/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUSD: payoutAmount,
          cryptoCurrency: payoutCurrency,
          cryptoAddress: payoutAddress,
        }),
      });
      if (res.ok) {
        setShowPayoutModal(false);
        fetchStats();
      }
    } catch (err) {
      console.error('Payout error', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onProductDeleted(id);
        fetchStats();
      }
    } catch (err) {
      console.error('Delete product error', err);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              Vendor Studio & Financials
            </h1>
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800">
              MERCHANT ACCOUNT
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage your digital assets, upload updates, and receive automated OxaPay crypto payouts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPayoutModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition shadow-sm"
          >
            <Wallet className="h-4 w-4 text-cyan-400" />
            Request Crypto Payout
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
          >
            <Upload className="h-4 w-4" />
            Upload Digital Good
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Gross Sales</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            ${stats.totalRevenueUSD.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">{stats.totalSalesCount} units</span> sold via OxaPay
          </p>
        </div>

        {/* Net Earnings */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Net Earnings (95%)</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            ${stats.netEarningsUSD.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            5% marketplace escrow & routing fee
          </p>
        </div>

        {/* Available Balance */}
        <div className="rounded-2xl border border-cyan-800/40 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-cyan-300 mb-2">
            <span className="font-semibold">Withdrawable Balance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-300">
            ${stats.availableBalanceUSD.toLocaleString()}
          </div>
          <p className="text-[11px] text-cyan-400/80 mt-1">
            Instant settlement to crypto wallet
          </p>
        </div>

        {/* Total Products */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Products</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Package className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            {products.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            All listed in public marketplace
          </p>
        </div>
      </div>

      {/* Main Table: Listed Products */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-400" />
            Your Digital Inventory ({products.length})
          </h2>
          <button
            onClick={() => setShowUploadModal(true)}
            className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
          >
            + Add New
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Product</th>
                <th className="pb-3 font-semibold">Category</th>
                <th className="pb-3 font-semibold">Version</th>
                <th className="pb-3 font-semibold">Price</th>
                <th className="pb-3 font-semibold">Delivery</th>
                <th className="pb-3 font-semibold">Sales</th>
                <th className="pb-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {products.map((prod) => (
                <tr key={prod.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3.5 pr-3 font-medium text-white max-w-[240px]">
                    <div className="truncate font-semibold">{prod.title}</div>
                    <div className="text-[11px] text-slate-400 truncate">{prod.fileInfo.fileName}</div>
                  </td>
                  <td className="py-3.5 pr-3 text-slate-300">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[11px]">
                      {prod.category}
                    </span>
                  </td>
                  <td className="py-3.5 pr-3 font-mono text-cyan-400">{prod.version}</td>
                  <td className="py-3.5 pr-3 font-bold text-white">${prod.priceUSD}</td>
                  <td className="py-3.5 pr-3 text-slate-400">
                    {prod.deliveryType === 'both'
                      ? 'File + Key'
                      : prod.deliveryType === 'license_key'
                      ? 'License Key'
                      : 'File Download'}
                  </td>
                  <td className="py-3.5 pr-3 font-semibold text-emerald-400">{prod.salesCount}</td>
                  <td className="py-3.5 text-right space-x-2">
                    <button
                      onClick={() => onViewProduct(prod)}
                      aria-label={`View ${prod.title}`}
                      className="rounded p-1 text-slate-400 hover:text-white transition"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(prod.id)}
                      aria-label={`Delete ${prod.title}`}
                      className="rounded p-1 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout History */}
      {payoutsList.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            Recent Crypto Payouts
          </h2>
          <div className="space-y-2">
            {payoutsList.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-xs border border-slate-800"
              >
                <div>
                  <div className="font-semibold text-white">
                    ${p.amountUSD} USD Payout ({p.cryptoCurrency})
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                    Sent to: {p.address}
                  </div>
                </div>
                <div className="text-right">
                  <span className="rounded bg-emerald-950 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-800">
                    COMPLETED
                  </span>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <VendorUploadModal
          onClose={() => setShowUploadModal(false)}
          onProductCreated={(p) => {
            onProductCreated(p);
            fetchStats();
          }}
        />
      )}

      {/* Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-cyan-400" />
                Request OxaPay Crypto Payout
              </h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Payout Amount (USD)
                </label>
                <input
                  type="number"
                  min="1"
                  max={Math.max(1, stats.availableBalanceUSD)}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Available: ${stats.availableBalanceUSD} USD
                </span>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Target Crypto Asset
                </label>
                <select
                  value={payoutCurrency}
                  onChange={(e) => setPayoutCurrency(e.target.value as CryptoCurrency)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                >
                  <option value="USDT">USDT (Tether TRC20 - Instant, Low Fee)</option>
                  <option value="BTC">Bitcoin (BTC)</option>
                  <option value="ETH">Ethereum (ETH)</option>
                  <option value="LTC">Litecoin (LTC)</option>
                  <option value="SOL">Solana (SOL)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Destination Wallet Address
                </label>
                <input
                  type="text"
                  required
                  value={payoutAddress}
                  onChange={(e) => setPayoutAddress(e.target.value)}
                  placeholder="Paste your recipient address..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="rounded-lg px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-400"
                >
                  Confirm Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
