import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Clock,
  ShieldCheck,
  Zap,
  Download,
  Key,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import QRCode from 'qrcode';
import { Order } from '../types/marketplace';

interface OxaPayInvoiceModalProps {
  order: Order | null;
  onClose: () => void;
  onPaymentSuccess: (updatedOrder: Order) => void;
  onViewLibrary?: () => void;
}

export const OxaPayInvoiceModal: React.FC<OxaPayInvoiceModalProps> = ({
  order,
  onClose,
  onPaymentSuccess,
  onViewLibrary,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [timeLeftSec, setTimeLeftSec] = useState<number>(15 * 60);
  const [isSimulating, setIsSimulating] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(order);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    setCurrentOrder(order);
  }, [order]);

  // Generate real QR code image
  useEffect(() => {
    if (currentOrder?.oxaInvoice?.qrCodeData) {
      QRCode.toDataURL(currentOrder.oxaInvoice.qrCodeData, {
        width: 240,
        margin: 2,
        color: {
          dark: '#030712',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR code error', err));
    }
  }, [currentOrder?.oxaInvoice?.qrCodeData]);

  // 15-minute countdown timer
  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'paid') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((currentOrder.oxaInvoice.expiresAt - Date.now()) / 1000));
      setTimeLeftSec(remaining);
      if (remaining === 0 && currentOrder.status === 'pending') {
        setCurrentOrder((prev) => (prev ? { ...prev, status: 'expired' } : null));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentOrder]);

  // Periodic polling for payment confirmation
  useEffect(() => {
    if (!currentOrder || currentOrder.status === 'paid' || currentOrder.status === 'expired') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/oxapay/invoice/${currentOrder.oxaInvoice.trackId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'paid' && data.order) {
            setCurrentOrder(data.order);
            onPaymentSuccess(data.order);
          }
        }
      } catch (err) {
        console.error('Invoice polling error', err);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [currentOrder, onPaymentSuccess]);

  if (!currentOrder) return null;

  const copyToClipboard = (text: string, type: 'address' | 'amount' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'address') {
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } else if (type === 'amount') {
      setCopiedAmount(true);
      setTimeout(() => setCopiedAmount(false), 2000);
    } else if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSimulatePayment = async () => {
    try {
      setIsSimulating(true);
      const res = await fetch('/api/oxapay/simulate-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId: currentOrder.oxaInvoice.trackId }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentOrder(data.order);
        onPaymentSuccess(data.order);
      }
    } catch (err) {
      console.error('Simulate payment error', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isPaid = currentOrder.status === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">OxaPay Crypto Checkout</h3>
                <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300 border border-cyan-800">
                  SANDBOX READY
                </span>
              </div>
              <p className="text-xs text-slate-400">Track ID: {currentOrder.oxaInvoice.trackId}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close invoice modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* State: Pending / In Progress */}
        {!isPaid ? (
          <div className="mt-5 space-y-5">
            {/* Countdown and Status Header */}
            <div className="flex items-center justify-between rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                </span>
                <span className="font-medium text-slate-300">Awaiting blockchain deposit...</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono font-semibold text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span>{formatTimer(timeLeftSec)} remaining</span>
              </div>
            </div>

            {/* QR Code and Deposit Details */}
            <div className="flex flex-col sm:flex-row items-center gap-5 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              {/* QR Code */}
              <div className="relative flex items-center justify-center rounded-xl bg-white p-2 shrink-0 shadow-md">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Crypto Payment QR Code"
                    className="h-36 w-36 object-contain"
                  />
                ) : (
                  <div className="h-36 w-36 flex items-center justify-center text-slate-400 text-xs">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Amount and Address Info */}
              <div className="flex-1 w-full space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block mb-1">Payable Amount</span>
                  <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
                    <span className="font-mono font-bold text-white text-sm">
                      {currentOrder.oxaInvoice.cryptoAmount} {currentOrder.oxaInvoice.cryptoCurrency}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(String(currentOrder.oxaInvoice.cryptoAmount), 'amount')
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                      aria-label="Copy crypto amount"
                    >
                      {copiedAmount ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedAmount ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400">Deposit Address</span>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {currentOrder.oxaInvoice.network}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
                    <span className="font-mono text-slate-300 truncate max-w-[180px]">
                      {currentOrder.oxaInvoice.address}
                    </span>
                    <button
                      onClick={() => copyToClipboard(currentOrder.oxaInvoice.address, 'address')}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition shrink-0 ml-2"
                      aria-label="Copy crypto address"
                    >
                      {copiedAddress ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedAddress ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Sandbox Simulation Button */}
            <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4">
              <div className="flex items-start gap-2.5">
                <Zap className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-white">Testnet & Instant Sandbox Simulator</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                    Test the complete OxaPay flow without spending real crypto. Clicking below simulates the OxaPay node detecting blockchain block confirmations and fires the verified webhook.
                  </p>
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isSimulating}
                    className="mt-3 flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition disabled:opacity-50"
                  >
                    {isSimulating ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isSimulating ? 'Simulating Webhook...' : '⚡ Simulate OxaPay Payment Now'}
                  </button>
                </div>
              </div>
            </div>

            {/* Notice */}
            <p className="text-[11px] text-center text-slate-400">
              Files and license keys are released automatically the second payment is received.
            </p>
          </div>
        ) : (
          /* State: Paid / Completed! Instant Fulfillment */
          <div className="mt-5 space-y-5">
            <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 mb-2">
                <Check className="h-6 w-6 stroke-[3]" />
              </div>
              <h3 className="text-lg font-bold text-white">Payment Confirmed via OxaPay!</h3>
              <p className="text-xs text-emerald-300 mt-1">
                Blockchain transaction confirmed. Digital assets are cryptographically unlocked.
              </p>
            </div>

            {/* Revealed Assets */}
            <div className="space-y-3">
              {/* License Key (if applicable) */}
              {currentOrder.secureDelivery?.licenseKey && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-amber-400" />
                      Your Software License Key
                    </span>
                    <button
                      onClick={() => setIsRevealed(!isRevealed)}
                      className="text-[11px] text-cyan-400 hover:underline"
                    >
                      {isRevealed ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-900 border border-slate-800 px-3 py-2 text-xs">
                    <span className="font-mono font-bold text-amber-300">
                      {isRevealed
                        ? currentOrder.secureDelivery.licenseKey
                        : '••••-••••-••••-••••'}
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(currentOrder.secureDelivery?.licenseKey || '', 'key')
                      }
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition"
                      aria-label="Copy license key"
                    >
                      {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copiedKey ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Secure Download Link */}
              {currentOrder.secureDelivery?.downloadToken && (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Download className="h-3.5 w-3.5 text-cyan-400" />
                      Signed Time-Limited Download Token
                    </span>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800">
                      Valid for 24 Hours
                    </span>
                  </div>

                  <a
                    href={`/api/downloads/${currentOrder.secureDelivery.downloadToken}`}
                    download={currentOrder.secureDelivery.fileName}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 transition"
                  >
                    <Download className="h-4 w-4" />
                    Download {currentOrder.secureDelivery.fileName}
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (onViewLibrary) {
                  onViewLibrary();
                } else {
                  onClose();
                }
              }}
              className="w-full rounded-xl border border-slate-800 bg-slate-800/80 py-2.5 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              Done & View in My Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
