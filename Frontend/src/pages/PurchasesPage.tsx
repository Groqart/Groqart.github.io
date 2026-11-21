import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  CheckCircle2,
  Clock,
  Download,
  Key,
  Loader2,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { PurchasesVault } from '../components/PurchasesVault';
import { AuthMagicLinkCard } from '../components/AuthMagicLinkCard';
import { useMarketplace } from '../context/MarketplaceContext';
import { API_BASE } from '../utils/apiBase';

interface OrderStatusPayload {
  status: string;
  order_id?: string;
  pay_currency?: string | null;
  product_title?: string;
  file_name?: string;
  delivery_type?: string;
  license_key?: string | null;
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
      if (data.status === 'finished' || data.status === 'expired' || data.status === 'failed') {
        if (data.status === 'finished') fetchOrders();
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

  const handleSandboxStatus = async (nextStatus: 'confirming' | 'partially_paid' | 'finished' = 'finished') => {
    if (!orderId || !accessToken) return;
    setIsConfirmingSandbox(true);
    setStatusError(null);
    try {
      const res = await fetch(`${API_BASE}/api/sandbox/confirm-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: orderId, token: accessToken, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusError(data.error || 'Sandbox confirmation failed');
      } else {
        showToast(
          nextStatus === 'finished'
            ? 'NOWPayments settlement confirmed!'
            : `Order updated to ${nextStatus}`
        );
        await checkOrderStatus();
      }
    } catch {
      setStatusError('Network error confirming sandbox order');
    } finally {
      setIsConfirmingSandbox(false);
    }
  };

  const renderOrderStatusBanner = () => {
    if (!orderId) return null;

    if (statusError) {
      return (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{statusError}</span>
        </div>
      );
    }

    const st = orderStatus?.status || 'waiting';

    if (st === 'finished') {
      return (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
              <CheckCircle2 className="h-5 w-5" />
              <span>Payment Confirmed: {orderStatus?.product_title}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Order <span className="font-mono text-white">{orderId}</span> is unlocked for immediate delivery (15-minute signed download link).
            </p>
            {orderStatus?.license_key && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-slate-950/80 px-3 py-1.5 text-xs font-mono text-amber-300">
                <Key className="h-3.5 w-3.5" />
                <span>License Key: {orderStatus.license_key}</span>
              </div>
            )}
          </div>
          {orderStatus?.download_url && orderStatus.delivery_type !== 'license_key' && (
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
      );
    }

    if (st === 'expired' || st === 'failed') {
      return (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 text-rose-200">
            <XCircle className="h-5 w-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-white">
                Order {orderId}: Payment {st}
              </p>
              <p className="text-rose-300/90 mt-0.5">
                This NOWPayments invoice is no longer active. Please start a fresh checkout from the marketplace.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition shrink-0 cursor-pointer"
          >
            Back to Marketplace
          </button>
        </div>
      );
    }

    const isPartial = st === 'partially_paid';
    const statusDescription =
      st === 'confirming'
        ? 'Transaction detected on blockchain — waiting for network confirmations...'
        : st === 'sending'
        ? 'Confirmations complete — finalizing settlement and delivery tokens...'
        : st === 'partially_paid'
        ? 'Partial payment received! Please send the remaining balance on the NOWPayments invoice or contact support with your Order ID.'
        : 'Waiting for NOWPayments IPN confirmation...';

    return (
      <div
        className={`rounded-2xl border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs ${
          isPartial
            ? 'border-amber-500/50 bg-amber-950/30'
            : 'border-cyan-500/30 bg-cyan-950/20'
        }`}
      >
        <div className={`flex items-start sm:items-center gap-3 ${isPartial ? 'text-amber-200' : 'text-cyan-200'}`}>
          {isPartial ? (
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <Clock className="h-4 w-4 animate-spin text-cyan-400 shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div>
            <span>
              Order <strong className="text-white">{orderId}</strong> status:{' '}
              <strong className={isPartial ? 'text-amber-300 uppercase' : 'text-cyan-300 uppercase'}>
                {st.replace('_', ' ')}
              </strong>
              {orderStatus?.pay_currency ? ` (${orderStatus.pay_currency.toUpperCase()})` : ''}.
            </span>
            <p className="text-[11px] opacity-90 mt-0.5">{statusDescription}</p>
          </div>
        </div>

        {isSandbox && accessToken && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleSandboxStatus('confirming')}
              disabled={isConfirmingSandbox}
              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-[11px] font-semibold text-slate-200 hover:text-white transition disabled:opacity-50 cursor-pointer"
            >
              Simulate Confirming
            </button>
            <button
              type="button"
              onClick={() => handleSandboxStatus('partially_paid')}
              disabled={isConfirmingSandbox}
              className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-3 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-900/50 transition disabled:opacity-50 cursor-pointer"
            >
              Simulate Partial
            </button>
            <button
              type="button"
              onClick={() => handleSandboxStatus('finished')}
              disabled={isConfirmingSandbox}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 shadow hover:from-emerald-400 hover:to-cyan-400 transition disabled:opacity-50 cursor-pointer"
            >
              {isConfirmingSandbox ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="h-3.5 w-3.5" />
              )}
              <span>Simulate NOWPayments Confirmation (Sandbox)</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-12">
      {orderId && (
        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          {renderOrderStatusBanner()}
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
            <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white tracking-tight sm:text-3xl">
              My Digital Library
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
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
