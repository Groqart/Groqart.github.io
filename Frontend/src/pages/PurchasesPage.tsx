import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Clock, Download, Key, Loader2, ShieldCheck, AlertCircle } from 'lucide-react';
import { PurchasesVault } from '../components/PurchasesVault';
import { AuthMagicLinkCard } from '../components/AuthMagicLinkCard';
import { useMarketplace } from '../context/MarketplaceContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface OrderStatusPayload {
  status: string;
  order_id?: string;
  product_title?: string;
  file_name?: string;
  license_key?: string;
  download_url?: string | null;
  error?: string;
}

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orders, fetchOrders, user, authToken, isAuthLoading, showToast } = useMarketplace();

  const orderId = searchParams.get('order_id');
  const accessToken = searchParams.get('token');
  const isSandbox = searchParams.get('sandbox') === '1';

  const [orderStatus, setOrderStatus] = useState<OrderStatusPayload | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isConfirmingSandbox, setIsConfirmingSandbox] = useState(false);

  const checkOrderStatus = useCallback(async () => {
    if (!orderId) return false;
    try {
      const qs = new URLSearchParams({ order_id: orderId });
      if (accessToken) qs.set('token', accessToken);

      const headers: Record<string, string> = {};
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      const res = await fetch(`${API_BASE}/api/order-status?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error || 'Unable to access order status');
        return true;
      }

      setStatusError(null);
      setOrderStatus(data);
      if (data.status === 'finished') {
        fetchOrders();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [orderId, accessToken, authToken, fetchOrders]);

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;

    const runCheck = async () => {
      const done = await checkOrderStatus();
      return done;
    };

    runCheck();
    const timer = setInterval(async () => {
      if (stopped) return;
      const done = await runCheck();
      if (done) clearInterval(timer);
    }, 4000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId, checkOrderStatus]);

  const handleSandboxConfirm = async () => {
    if (!orderId || !accessToken) return;
    setIsConfirmingSandbox(true);
    setStatusError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sandbox/confirm-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, token: accessToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error || 'Sandbox confirmation failed');
      } else {
        showToast('NOWPayments settlement confirmed!');
        await checkOrderStatus();
      }
    } catch {
      setStatusError('Network error confirming sandbox order');
    } finally {
      setIsConfirmingSandbox(false);
    }
  };

  return (
    <div className="pb-12">
      {/* Guest or Authenticated Immediate Post-Checkout Banner */}
      {orderId && (
        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          {statusError ? (
            <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 flex items-center gap-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{statusError}</span>
            </div>
          ) : orderStatus?.status === 'finished' ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>Payment Confirmed: {orderStatus.product_title}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Order <span className="font-mono text-white">{orderId}</span> is unlocked for immediate download.
                </p>
                {orderStatus.license_key && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-slate-950/80 px-3 py-1.5 text-xs font-mono text-amber-300">
                    <Key className="h-3.5 w-3.5" />
                    <span>License Key: {orderStatus.license_key}</span>
                  </div>
                )}
              </div>
              {orderStatus.download_url && (
                <a
                  href={orderStatus.download_url}
                  download={orderStatus.file_name || 'archive.zip'}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition shrink-0"
                >
                  <Download className="h-4 w-4" />
                  <span>Download {orderStatus.file_name || 'Archive'}</span>
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 text-cyan-200">
                <Clock className="h-4 w-4 animate-spin text-cyan-400 shrink-0" />
                <span>
                  Order <strong className="text-white">{orderId}</strong> status:{' '}
                  <strong className="text-cyan-300">{orderStatus?.status || 'waiting'}</strong>. Waiting for NOWPayments IPN confirmation...
                </span>
              </div>

              {isSandbox && accessToken && (
                <button
                  type="button"
                  onClick={handleSandboxConfirm}
                  disabled={isConfirmingSandbox}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:from-emerald-400 hover:to-cyan-400 transition disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {isConfirmingSandbox ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  <span>Simulate NOWPayments Confirmation (Sandbox)</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Library Auth Gate */}
      {isAuthLoading ? (
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <Loader2 className="h-7 w-7 animate-spin text-cyan-400 mx-auto mb-2" />
          <p className="text-xs text-slate-400">Loading your library session...</p>
        </div>
      ) : user ? (
        <PurchasesVault
          orders={orders}
          userEmail={user.email}
          onBrowseMarketplace={() => navigate('/')}
          onRefreshOrders={fetchOrders}
        />
      ) : (
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              My Digital Library
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Sign in with a passwordless Magic Link to access all past purchases and regenerate signed download links.
            </p>
          </div>
          <AuthMagicLinkCard
            title="Sign In to My Library"
            description="Enter the email address you used at checkout. We will send a single-use Magic Link to unlock your downloads and license keys across any device."
            redirectPath="/purchases"
          />
        </div>
      )}
    </div>
  );
};
