import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { CheckCircle2, Clock, Download, Key } from 'lucide-react';
import { PurchasesVault } from '../components/PurchasesVault';
import { useMarketplace } from '../context/MarketplaceContext';

const API_BASE = import.meta.env.VITE_API_URL || '';

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { orders, fetchOrders } = useMarketplace();
  const orderId = searchParams.get('order_id');
  const [orderStatus, setOrderStatus] = useState<{
    status: string;
    product_title?: string;
    file_name?: string;
    license_key?: string;
    download_url?: string;
  } | null>(null);

  useEffect(() => {
    if (!orderId) return;

    let stopped = false;
    const check = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/order-status?order_id=${encodeURIComponent(orderId)}`);
        if (res.ok) {
          const data = await res.json();
          if (!stopped) {
            setOrderStatus(data);
            if (data.status === 'finished') {
              fetchOrders();
              return true;
            }
          }
        }
      } catch {
        // retry
      }
      return false;
    };

    check();
    const timer = setInterval(async () => {
      const done = await check();
      if (done) clearInterval(timer);
    }, 4000);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [orderId]);

  return (
    <div>
      {orderId && orderStatus && (
        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          {orderStatus.status === 'finished' ? (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-950/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  Payment Confirmed: {orderStatus.product_title}
                </div>
                {orderStatus.license_key && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-mono text-amber-300">
                    <Key className="h-3.5 w-3.5" />
                    License Key: {orderStatus.license_key}
                  </div>
                )}
              </div>
              {orderStatus.download_url && (
                <a
                  href={orderStatus.download_url}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition"
                >
                  <Download className="h-4 w-4" />
                  Download {orderStatus.file_name || 'Archive'}
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/20 p-4 flex items-center gap-3 text-xs text-cyan-200">
              <Clock className="h-4 w-4 animate-spin text-cyan-400" />
              <span>
                Order <strong>{orderId}</strong> status: <strong>{orderStatus.status}</strong>. Waiting for NOWPayments IPN confirmation...
              </span>
            </div>
          )}
        </div>
      )}

      <PurchasesVault
        orders={orders}
        onBrowseMarketplace={() => navigate('/')}
        onRefreshOrders={fetchOrders}
      />
    </div>
  );
};
