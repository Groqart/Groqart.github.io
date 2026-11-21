import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Flag,
  Users,
  DollarSign,
  Loader2,
  BadgeCheck,
  RefreshCw,
} from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { AuthMagicLinkCard } from '../components/AuthMagicLinkCard';
import type { AdminOverviewData } from '../types/marketplace';
import { API_BASE } from '../utils/apiBase';

export const AdminPage: React.FC = () => {
  const { user, authToken, isAuthLoading, showToast, fetchProducts } = useMarketplace();
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    if (!authToken || user?.role !== 'admin') return;
    setLoadingData(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/admin/overview`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to load admin overview');
        return;
      }
      setOverview(data);
    } catch {
      setErrorMsg('Network error loading admin data');
    } finally {
      setLoadingData(false);
    }
  }, [authToken, user?.role]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleModerate = async (productId: string, action: 'approve' | 'reject') => {
    if (!authToken) return;
    setBusyKey(`mod:${productId}`);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/products/${encodeURIComponent(productId)}/moderate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            action,
            reason: action === 'reject' ? rejectReasons[productId] || '' : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Moderation failed');
        return;
      }
      showToast(action === 'approve' ? 'Product approved & published!' : 'Product rejected');
      fetchProducts();
      await loadOverview();
    } catch {
      showToast('Network error moderating product');
    } finally {
      setBusyKey(null);
    }
  };

  const handleToggleTrust = async (sellerId: string, nextTrusted: boolean) => {
    if (!authToken) return;
    setBusyKey(`trust:${sellerId}`);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/sellers/${encodeURIComponent(sellerId)}/trust`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ is_trusted: nextTrusted }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to update seller trust');
        return;
      }
      showToast(nextTrusted ? 'Seller marked as trusted' : 'Seller trust revoked');
      fetchProducts();
      await loadOverview();
    } catch {
      showToast('Network error updating seller trust');
    } finally {
      setBusyKey(null);
    }
  };

  const handleResolveReport = async (reportId: string, status: 'resolved' | 'dismissed') => {
    if (!authToken) return;
    setBusyKey(`rep:${reportId}`);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/reports/${encodeURIComponent(reportId)}/resolve`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ status }),
        }
      );
      if (res.ok) {
        showToast(`Report marked as ${status}`);
        await loadOverview();
      }
    } catch {
      showToast('Network error resolving report');
    } finally {
      setBusyKey(null);
    }
  };

  const handleRetryWithdraw = async (withdrawalId: string) => {
    if (!authToken) return;
    setBusyKey(`wd:${withdrawalId}`);
    try {
      const res = await fetch(
        `${API_BASE}/api/withdraw/${encodeURIComponent(withdrawalId)}/retry-verify`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      const data = await res.json();
      if (res.ok) {
        showToast(`Withdrawal ${withdrawalId} verified (${data.status})`);
        await loadOverview();
      } else {
        showToast(data.error || 'Verification failed');
      }
    } catch {
      showToast('Network error verifying withdrawal');
    } finally {
      setBusyKey(null);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <Loader2 className="h-7 w-7 animate-spin text-cyan-500 mx-auto mb-2" />
        <p className="text-xs text-slate-500 dark:text-slate-400">Checking admin credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-3xl">
            Platform Moderation &amp; Admin
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
            Sign in with your administrator Magic Link to manage product reviews, seller trust, and buyer reports.
          </p>
        </div>
        <AuthMagicLinkCard
          title="Administrator Sign In"
          description="Only accounts with role = 'admin' can access moderation queues and platform controls."
          redirectPath="/admin"
        />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">403 — Admin Access Required</h1>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          Signed in as <strong className="text-slate-900 dark:text-slate-200">{user.email}</strong> ({user.role}). This console is restricted to platform administrators.
        </p>
        <Link
          to="/"
          className="inline-block rounded-xl bg-slate-900 dark:bg-slate-800 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-3xl">
              Trust &amp; Moderation Console
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Operator: <span className="text-slate-900 dark:text-slate-200 font-medium">{user.email}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          disabled={loadingData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white transition cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loadingData ? 'animate-spin' : ''}`} />
          <span>Refresh Console</span>
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-50 p-4 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
          {errorMsg}
        </div>
      )}

      {overview && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Platform Revenue (5%)</span>
                <DollarSign className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                ${overview.stats.platformRevenueUSD.toFixed(2)}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {overview.stats.finishedOrders} settled orders
              </p>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 p-5 dark:bg-amber-950/15">
              <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 mb-2">
                <span>Pending Moderation</span>
                <ShieldAlert className="h-4 w-4 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {overview.stats.pendingReviewCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {overview.stats.totalProducts} active listings total
              </p>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-50/70 p-5 dark:bg-rose-950/15">
              <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300 mb-2">
                <span>Open Reports</span>
                <Flag className="h-4 w-4 text-rose-500 dark:text-rose-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {overview.stats.openReportsCount}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Buyer safety flags</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span>Creators &amp; Users</span>
                <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                {overview.stats.totalSellers} / {overview.stats.totalUsers}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Sellers / total users</p>
            </div>
          </div>

          {/* Product Moderation Queue */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Product Moderation Queue</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-semibold">Listing</th>
                    <th className="pb-3 font-semibold">Seller</th>
                    <th className="pb-3 font-semibold">Status</th>
                    <th className="pb-3 font-semibold">Price</th>
                    <th className="pb-3 font-semibold">Rejection Note</th>
                    <th className="pb-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {overview.moderationQueue.map((prod) => {
                    const st = prod.status || 'published';
                    return (
                      <tr key={prod.id} className="hover:bg-slate-800/25 transition">
                        <td className="py-3 pr-3 max-w-[240px]">
                          <div className="font-semibold text-white truncate">{prod.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {prod.fileInfo.fileName} • {prod.fileInfo.fileSize}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-slate-300">{prod.vendorName}</td>
                        <td className="py-3 pr-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              st === 'pending_review'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                : st === 'rejected'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            }`}
                          >
                            {st.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 pr-3 font-bold text-white">${prod.priceUSD}</td>
                        <td className="py-3 pr-3">
                          <input
                            type="text"
                            aria-label={`Rejection reason for ${prod.title}`}
                            value={rejectReasons[prod.id] ?? prod.rejectionReason ?? ''}
                            onChange={(e) =>
                              setRejectReasons((prev) => ({ ...prev, [prod.id]: e.target.value }))
                            }
                            placeholder="Optional reason..."
                            className="w-44 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-[11px] text-white"
                          />
                        </td>
                        <td className="py-3 text-right whitespace-nowrap space-x-2">
                          <button
                            type="button"
                            onClick={() => handleModerate(prod.id, 'approve')}
                            disabled={busyKey === `mod:${prod.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition cursor-pointer"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleModerate(prod.id, 'reject')}
                            disabled={busyKey === `mod:${prod.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-[11px] font-semibold text-rose-300 hover:bg-rose-500/30 transition cursor-pointer"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Reject</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sellers & Trust Verification */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <BadgeCheck className="h-4 w-4 text-cyan-400" />
              <span>Creators &amp; Trust Verification</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs tabular-nums">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Studio</th>
                    <th className="pb-3 font-semibold">Email</th>
                    <th className="pb-3 font-semibold">Listings</th>
                    <th className="pb-3 font-semibold">Balance</th>
                    <th className="pb-3 font-semibold text-right">Trust Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {overview.sellers.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/25 transition">
                      <td className="py-3 pr-3 font-semibold text-white">{s.displayName}</td>
                      <td className="py-3 pr-3 font-mono text-slate-300">{s.email}</td>
                      <td className="py-3 pr-3 text-slate-300">{s.productCount}</td>
                      <td className="py-3 pr-3 font-bold text-cyan-300">${s.balanceUSD.toFixed(2)}</td>
                      <td className="py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleTrust(s.id, !s.isTrusted)}
                          disabled={busyKey === `trust:${s.id}`}
                          className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-semibold transition cursor-pointer ${
                            s.isTrusted
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500/40'
                          }`}
                        >
                          <BadgeCheck className="h-3.5 w-3.5" />
                          <span>{s.isTrusted ? 'Trusted (Revoke)' : 'Grant Trust'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Buyer Safety Reports */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Flag className="h-4 w-4 text-rose-400" />
              <span>Buyer Reports ({overview.reports.length})</span>
            </h2>
            {overview.reports.length === 0 ? (
              <p className="text-xs text-slate-400">No product reports filed.</p>
            ) : (
              <div className="space-y-3">
                {overview.reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-white">{rep.productTitle}</span>
                        <span className="rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
                          {rep.reason}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] uppercase text-slate-300">
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-slate-300">{rep.details || 'No additional notes'}</p>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Reporter: {rep.reporterEmailMasked} • {new Date(rep.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {rep.status === 'open' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleResolveReport(rep.id, 'resolved')}
                          disabled={busyKey === `rep:${rep.id}`}
                          className="rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                        >
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveReport(rep.id, 'dismissed')}
                          disabled={busyKey === `rep:${rep.id}`}
                          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-slate-300 hover:text-white cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Pending Withdrawals */}
          {overview.pendingWithdrawals.length > 0 && (
            <section className="rounded-2xl border border-amber-500/30 bg-slate-900/60 p-6">
              <h2 className="text-base font-bold text-white mb-4">
                Pending Payout Verifications ({overview.pendingWithdrawals.length})
              </h2>
              <div className="space-y-2.5 text-xs">
                {overview.pendingWithdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5"
                  >
                    <div>
                      <span className="font-bold text-white">{w.sellerName}</span> •{' '}
                      <span className="font-mono text-cyan-300">${w.amountUSD.toFixed(2)} USDC</span> •{' '}
                      <span className="font-mono text-slate-400">Batch: {w.batchId || 'creating'}</span>
                    </div>
                    {w.status === 'pending_verification' && (
                      <button
                        type="button"
                        onClick={() => handleRetryWithdraw(w.id)}
                        disabled={busyKey === `wd:${w.id}`}
                        className="rounded-lg bg-cyan-500 px-3 py-1.5 font-bold text-slate-950 hover:bg-cyan-400 cursor-pointer"
                      >
                        Retry Verify
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
