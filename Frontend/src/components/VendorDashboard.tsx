import React, { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  DollarSign,
  Package,
  TrendingUp,
  Trash2,
  Eye,
  Wallet,
  X,
  Zap,
  Settings,
  History,
  Loader2,
  Store,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import type { Product, VendorStats } from '../types/marketplace';
import { VendorUploadModal } from './VendorUploadModal';
import { AuthMagicLinkCard } from './AuthMagicLinkCard';
import { useMarketplace } from '../context/MarketplaceContext';

const API_BASE = import.meta.env.VITE_API_URL || '';
const EVM_REGEX = /^0x[a-fA-F0-9]{40}$/;

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
  const {
    user,
    seller,
    authToken,
    isAuthLoading,
    completeVendorOnboarding,
    showToast,
  } = useMarketplace();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [payoutAmount, setPayoutAmount] = useState<number>(10);
  const [payoutStatus, setPayoutStatus] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Onboarding & Payout Settings state
  const [displayName, setDisplayName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [isSavingSeller, setIsSavingSeller] = useState(false);

  const [stats, setStats] = useState<VendorStats>({
    sellerId: '',
    displayName: '',
    walletAddress: '',
    totalProducts: 0,
    totalSalesCount: 0,
    totalRevenueUSD: 0,
    netEarningsUSD: 0,
    availableBalanceUSD: 0,
    recentWithdrawals: [],
  });

  useEffect(() => {
    if (seller) {
      setDisplayName(seller.displayName);
      setWalletAddress(seller.walletAddress);
    } else if (user) {
      setDisplayName(user.displayName || user.email.split('@')[0]);
    }
  }, [seller, user]);

  const fetchStats = useCallback(async () => {
    if (!authToken || !seller) return;
    try {
      const res = await fetch(`${API_BASE}/api/vendor/stats`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore offline
    }
  }, [authToken, seller]);

  useEffect(() => {
    fetchStats();
  }, [products, seller, fetchStats]);

  const handleSaveSellerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setOnboardingError(null);

    const trimmedName = displayName.trim();
    const trimmedWallet = walletAddress.trim();
    if (trimmedName.length < 2) {
      setOnboardingError('Store display name must be at least 2 characters.');
      return;
    }
    if (!EVM_REGEX.test(trimmedWallet)) {
      setOnboardingError('Enter a valid Base/EVM USDC wallet address (0x followed by 40 hex chars).');
      return;
    }

    setIsSavingSeller(true);
    const res = await completeVendorOnboarding(trimmedName, trimmedWallet);
    setIsSavingSeller(false);

    if (!res.ok) {
      setOnboardingError(res.error || 'Failed to save vendor profile');
      return;
    }

    setShowSettingsModal(false);
    fetchStats();
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutStatus(null);
    if (!authToken) {
      setPayoutStatus('Authentication expired. Please sign in again.');
      return;
    }

    setIsWithdrawing(true);
    try {
      const res = await fetch(`${API_BASE}/api/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          amount_to_withdraw: payoutAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPayoutStatus(data.error || 'Withdrawal failed');
        return;
      }
      setShowPayoutModal(false);
      showToast(`USDC withdrawal submitted (Batch ${data.batchId})`);
      fetchStats();
    } catch {
      setPayoutStatus('Network error during payout request');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteTarget || !authToken) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(deleteTarget.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(data.error || 'Delete failed or access denied');
        return;
      }
      const deletedId = deleteTarget.id;
      setDeleteTarget(null);
      onProductDeleted(deletedId);
      fetchStats();
    } catch {
      setDeleteError('Network error deleting product');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-400 mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading vendor session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
            Vendor Portal
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sign in with a Magic Link to publish digital assets, track crypto sales, and withdraw USDC on Base.
          </p>
        </div>
        <AuthMagicLinkCard
          title="Vendor Portal Sign In"
          description="Use your creator email to sign in passwordlessly. New creators can complete store onboarding right after verifying."
          redirectPath="/vendor"
        />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6 sm:p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Complete Vendor Onboarding</h1>
              <p className="text-xs text-slate-400">Signed in as {user.email}</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-5">
            Set your public creator store name and your Base network USDC payout wallet address. You retain 95% of every crypto sale.
          </p>

          {onboardingError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{onboardingError}</span>
            </div>
          )}

          <form onSubmit={handleSaveSellerProfile} className="space-y-4 text-xs">
            <div>
              <label htmlFor="onboard-display-name" className="block font-semibold text-slate-300 mb-1.5">
                Creator / Studio Display Name *
              </label>
              <input
                id="onboard-display-name"
                type="text"
                required
                minLength={2}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. CyberLabs Studio"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="onboard-wallet" className="block font-semibold text-slate-300 mb-1.5">
                USDC Payout Wallet (Base / EVM 0x...) *
              </label>
              <input
                id="onboard-wallet"
                type="text"
                required
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingSeller}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition disabled:opacity-50 cursor-pointer"
            >
              {isSavingSeller ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>Activate Vendor Studio</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  const vendorProducts = products.filter((p) => p.vendorId === seller.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              Vendor Studio
            </h1>
            <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800">
              {seller.displayName}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Payout wallet:{' '}
            <span className="font-mono text-slate-300">{seller.walletAddress}</span> • Base USDC
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setOnboardingError(null);
              setShowSettingsModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-700 hover:text-white transition cursor-pointer"
          >
            <Settings className="h-4 w-4 text-slate-400" />
            <span>Payout Settings</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setPayoutStatus(null);
              setShowPayoutModal(true);
            }}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition cursor-pointer"
          >
            <Wallet className="h-4 w-4 text-cyan-400" />
            <span>Withdraw USDC</span>
          </button>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition cursor-pointer"
          >
            <Upload className="h-4 w-4" />
            <span>Upload Digital Good</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Gross Sales</span>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">${stats.totalRevenueUSD.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400 mt-1">{stats.totalSalesCount} paid orders</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Net Earnings (95%)</span>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">${stats.netEarningsUSD.toFixed(2)}</div>
          <p className="text-[11px] text-slate-400 mt-1">5% platform fee</p>
        </div>

        <div className="rounded-2xl border border-cyan-800/40 bg-gradient-to-br from-cyan-950/30 to-blue-950/30 p-5">
          <div className="flex items-center justify-between text-xs text-cyan-300 mb-2">
            <span className="font-semibold">Withdrawable Balance</span>
            <Zap className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-300">${stats.availableBalanceUSD.toFixed(2)}</div>
          <p className="text-[11px] text-cyan-400/80 mt-1">Min payout: $5.00 USDC</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>My Listings</span>
            <Package className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{vendorProducts.length}</div>
          <p className="text-[11px] text-slate-400 mt-1">Published in catalog</p>
        </div>
      </div>

      {/* Vendor Inventory */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="h-4 w-4 text-cyan-400" />
            <span>My Digital Inventory ({vendorProducts.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="text-xs text-cyan-400 hover:underline cursor-pointer"
          >
            + Add New
          </button>
        </div>

        {vendorProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-8 text-center text-xs text-slate-400">
            You have not published any digital products yet. Click &ldquo;Upload Digital Good&rdquo; to publish your first product.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Product</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Version</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {vendorProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 pr-3 font-medium text-white max-w-[260px]">
                      <div className="truncate font-semibold">{prod.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">{prod.fileInfo.fileName}</div>
                    </td>
                    <td className="py-3.5 pr-3 text-slate-300">{prod.category}</td>
                    <td className="py-3.5 pr-3 font-mono text-cyan-400">{prod.version}</td>
                    <td className="py-3.5 pr-3 font-bold text-white">${prod.priceUSD}</td>
                    <td className="py-3.5 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => onViewProduct(prod)}
                        aria-label={`View ${prod.title}`}
                        className="rounded p-1 text-slate-400 hover:text-white transition cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTarget(prod);
                        }}
                        aria-label={`Delete ${prod.title}`}
                        className="rounded p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Withdrawal History */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <History className="h-4 w-4 text-cyan-400" />
            <span>Withdrawal History ({stats.recentWithdrawals?.length || 0})</span>
          </h2>
        </div>

        {!stats.recentWithdrawals || stats.recentWithdrawals.length === 0 ? (
          <p className="text-xs text-slate-400">No USDC withdrawals requested yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold">Wallet (Base)</th>
                  <th className="pb-3 font-semibold">Batch ID</th>
                  <th className="pb-3 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {stats.recentWithdrawals.map((w) => (
                  <tr key={w.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 pr-3 text-slate-300">
                      {new Date(w.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 pr-3 font-bold text-white">${w.amountUSD.toFixed(2)} USDC</td>
                    <td className="py-3 pr-3 font-mono text-slate-400">
                      {w.walletAddress.slice(0, 8)}...{w.walletAddress.slice(-6)}
                    </td>
                    <td className="py-3 pr-3 font-mono text-cyan-300">{w.batchId || '—'}</td>
                    <td className="py-3 text-right">
                      <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300 border border-emerald-500/30">
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showUploadModal && (
        <VendorUploadModal
          onClose={() => setShowUploadModal(false)}
          onProductCreated={(p) => {
            onProductCreated(p);
            fetchStats();
          }}
        />
      )}

      {/* Withdraw USDC Modal */}
      {showPayoutModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdraw-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 id="withdraw-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <Wallet className="h-4 w-4 text-cyan-400" />
                <span>Withdraw USDC (Base Network)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowPayoutModal(false)}
                aria-label="Close withdraw dialog"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleRequestPayout} className="space-y-4 text-xs">
              {payoutStatus && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-2.5 text-rose-300">
                  {payoutStatus}
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <span className="text-slate-400 block mb-1">Destination Wallet (Base USDC)</span>
                <span className="font-mono text-cyan-300 break-all">{seller.walletAddress}</span>
              </div>

              <div>
                <label htmlFor="withdraw-amount" className="text-slate-300 font-semibold block mb-1">
                  Amount (USD)
                </label>
                <input
                  id="withdraw-amount"
                  type="number"
                  min="5"
                  step="0.01"
                  required
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Available: ${stats.availableBalanceUSD.toFixed(2)} USD
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawing}
                  className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 cursor-pointer"
                >
                  {isWithdrawing ? 'Processing...' : 'Confirm Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payout Settings Modal */}
      {showSettingsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 id="settings-modal-title" className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="h-4 w-4 text-cyan-400" />
                <span>Vendor Payout Settings</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                aria-label="Close payout settings dialog"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSellerProfile} className="space-y-4 text-xs">
              {onboardingError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-2.5 text-rose-300">
                  {onboardingError}
                </div>
              )}

              <div>
                <label htmlFor="settings-display-name" className="text-slate-300 font-semibold block mb-1">
                  Store Display Name
                </label>
                <input
                  id="settings-display-name"
                  type="text"
                  required
                  minLength={2}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
                />
              </div>

              <div>
                <label htmlFor="settings-wallet" className="text-slate-300 font-semibold block mb-1">
                  Base USDC Wallet Address (0x...)
                </label>
                <input
                  id="settings-wallet"
                  type="text"
                  required
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSeller}
                  className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSeller ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 id="delete-modal-title" className="text-base font-bold text-white">
                Delete Listing
              </h3>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                aria-label="Close delete dialog"
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 text-xs">
              {deleteError && (
                <div className="rounded-lg border border-rose-500/40 bg-rose-950/40 p-2.5 text-rose-300">
                  {deleteError}
                </div>
              )}
              <p className="text-slate-300 leading-relaxed">
                Are you sure you want to remove <strong className="text-white">{deleteTarget.title}</strong> from the catalog? Existing buyers will keep their past transactions.
              </p>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteProduct}
                  disabled={isDeleting}
                  className="rounded-lg bg-rose-500 px-4 py-2 font-bold text-white hover:bg-rose-400 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
