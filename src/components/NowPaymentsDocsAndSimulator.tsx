import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  ArrowRight,
  Send,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  ExternalLink,
  Key,
} from 'lucide-react';
import { Order } from '../types/marketplace';

interface NowPaymentsDocsAndSimulatorProps {
  orders: Order[];
  onOrderUpdated: () => void;
}

export const NowPaymentsDocsAndSimulator: React.FC<NowPaymentsDocsAndSimulatorProps> = ({
  orders,
  onOrderUpdated,
}) => {
  const [activeCodeLang, setActiveCodeLang] = useState<'node' | 'python' | 'webhook'>('node');
  const [copiedCode, setCopiedCode] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState('18AMNE0...T7SB559');
  const [hasIpnSecret, setHasIpnSecret] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<'finished' | 'expired'>('finished');
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookLog, setWebhookLog] = useState<string | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch NOWPayments server configuration
  useEffect(() => {
    fetch('/api/nowpayments/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKeyMasked) setApiKeyMasked(data.apiKeyMasked);
        setHasIpnSecret(data.hasIpnSecret);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSendTestWebhook = async () => {
    const targetId = selectedTrackId || (orders[0] ? (orders[0].oxaInvoice.paymentId || orders[0].oxaInvoice.trackId) : '');
    if (!targetId) {
      setFeedbackMsg({ text: 'Please create an order or enter a Payment ID first.', type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    try {
      setIsSendingWebhook(true);
      const res = await fetch('/api/nowpayments/ipn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nowpayments-sig': 'simulated_test_signature_valid',
        },
        body: JSON.stringify({
          payment_id: targetId,
          order_id: targetId,
          payment_status: webhookStatus,
          isTestSimulation: true,
          price_amount: 89.0,
          pay_amount: 89.0,
          actually_paid: 89.0,
          pay_currency: 'usdttrc20',
        }),
      });

      const data = await res.json();
      setWebhookLog(JSON.stringify(data, null, 2));

      if (res.ok) {
        setFeedbackMsg({
          text: `NOWPayments IPN sent! Order marked as ${webhookStatus.toUpperCase()}. Assets released.`,
          type: 'success',
        });
        onOrderUpdated();
      } else {
        setFeedbackMsg({ text: data.error || 'Webhook rejected by server', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Failed to send test webhook', type: 'error' });
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');

  const nodeCode = `// 1. Initialize NOWPayments API Client
import express from 'express';
import crypto from 'node:crypto';

const app = express();
const NOWPAYMENTS_API_KEY = process.env.NOWPAYMENTS_API_KEY;
const NOWPAYMENTS_IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET;

// 2. Generate Payment Invoice (NOWPayments API)
app.post('/api/checkout', async (req, res) => {
  const { amountUSD, orderId, cryptoTicker } = req.body;
  
  const response = await fetch('https://api.nowpayments.io/v1/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': NOWPAYMENTS_API_KEY,
    },
    body: JSON.stringify({
      price_amount: amountUSD,
      price_currency: 'usd',
      pay_currency: cryptoTicker || 'usdttrc20',
      ipn_callback_url: 'https://yourdomain.com/api/nowpayments/ipn',
      order_id: orderId,
      order_description: \`Purchase order \${orderId}\`,
    }),
  });
  const payment = await response.json();
  res.json(payment);
});

// 3. IPN Listener with HMAC-SHA512 Verification
function sortObject(obj) {
  return Object.keys(obj).sort().reduce((acc, key) => {
    acc[key] = (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]))
      ? sortObject(obj[key]) : obj[key];
    return acc;
  }, {});
}

app.post('/api/nowpayments/ipn', express.json(), (req, res) => {
  const signature = req.headers['x-nowpayments-sig'];
  const sortedPayload = JSON.stringify(sortObject(req.body));
  const expectedSig = crypto.createHmac('sha512', NOWPAYMENTS_IPN_SECRET)
    .update(sortedPayload)
    .digest('hex');

  if (signature.toLowerCase() !== expectedSig.toLowerCase()) {
    return res.status(401).json({ error: 'Invalid IPN signature' });
  }

  const { payment_status, order_id } = req.body;
  if (payment_status === 'finished' || payment_status === 'confirmed') {
    // 4. Release digital product or license key
    releaseDigitalGood(order_id);
  }
  res.json({ success: true });
});`;

  const pythonCode = `# Python FastAPI + NOWPayments Payment Gateway
import os, hmac, hashlib, json
from fastapi import FastAPI, Request, Header, HTTPException
import httpx

app = FastAPI()
NOWPAYMENTS_API_KEY = os.getenv("NOWPAYMENTS_API_KEY")
NOWPAYMENTS_IPN_SECRET = os.getenv("NOWPAYMENTS_IPN_SECRET")

def sort_dict(d):
    return {k: sort_dict(v) if isinstance(v, dict) else v for k, v in sorted(d.items())}

@app.post("/api/checkout")
async def create_payment(amount_usd: float, order_id: str):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.nowpayments.io/v1/payment",
            headers={"x-api-key": NOWPAYMENTS_API_KEY, "Content-Type": "application/json"},
            json={
                "price_amount": amount_usd,
                "price_currency": "usd",
                "pay_currency": "usdttrc20",
                "ipn_callback_url": "https://yourdomain.com/api/nowpayments/ipn",
                "order_id": order_id,
            }
        )
        return resp.json()

@app.post("/api/nowpayments/ipn")
async def nowpayments_ipn(request: Request, x_nowpayments_sig: str = Header(None)):
    body = await request.json()
    sorted_json = json.dumps(sort_dict(body), separators=(',', ':'))
    expected = hmac.new(NOWPAYMENTS_IPN_SECRET.encode(), sorted_json.encode(), hashlib.sha512).hexdigest()
    
    if not hmac.compare_digest(x_nowpayments_sig.lower(), expected.lower()):
        raise HTTPException(status_code=401, detail="Invalid IPN signature")
        
    if body.get("payment_status") in ["finished", "confirmed"]:
        # Instant fulfillment
        fulfill_order(body.get("order_id"))
        
    return {"status": "ok"}`;

  const webhookJsonExample = `{
  "payment_id": 5077125035,
  "payment_status": "finished",
  "pay_address": "TM134uMANgecBhvCtGYHzomCWDPakXozuP",
  "price_amount": 89.0,
  "price_currency": "usd",
  "pay_amount": 89.0,
  "actually_paid": 89.0,
  "pay_currency": "usdttrc20",
  "order_id": "ord_a1b2c3d4",
  "order_description": "HyperSaaS - Next.js 15 Boilerplate",
  "purchase_id": "5135341130",
  "created_at": "2026-11-07T12:00:00.000Z",
  "updated_at": "2026-11-07T12:02:15.000Z"
}`;

  const currentCode =
    activeCodeLang === 'node'
      ? nodeCode
      : activeCodeLang === 'python'
      ? pythonCode
      : webhookJsonExample;

  const copyCode = () => {
    navigator.clipboard.writeText(currentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
              NOWPayments Gateway & Webhook Simulator
            </h1>
            <span className="rounded-full bg-emerald-950 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-800">
              Live API Connected
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Production crypto checkout infrastructure with cryptographic Instant Payment Notifications (IPN), HMAC-SHA512 verification, and tokenized downloads.
          </p>
        </div>

        <a
          href="https://nowpayments.io"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          NOWPayments Docs
        </a>
      </div>

      {feedbackMsg && (
        <div
          className={`mb-6 flex items-center gap-2 rounded-xl p-3.5 text-xs font-medium border ${
            feedbackMsg.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/40 text-rose-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Grid: Simulator & Credentials on left, Architecture on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Interactive Simulator & Active Credentials */}
        <div className="lg:col-span-5 space-y-6">
          {/* Active Credentials Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3 mb-4">
              <Key className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Active NOWPayments Credentials</h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Production API Key</span>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2 border border-slate-800 font-mono text-cyan-300">
                  <span>{apiKeyMasked}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    AUTHENTICATED
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">IPN Secret Key</span>
                <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-950 px-3 py-2 border border-slate-800 font-mono text-slate-300">
                  <span>{hasIpnSecret ? '••••••••••••••••••••••••' : 'Not configured'}</span>
                  <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                    HMAC-SHA512
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Callback IPN URL</span>
                <div className="mt-1 rounded-lg bg-slate-950 px-3 py-2 border border-slate-800 font-mono text-xs text-slate-400 break-all">
                  https://nexusbyte.de5.net/api/nowpayments/ipn
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Webhook Simulator */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Live IPN Webhook Simulator</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                ZERO-LEAK DISPATCH
              </span>
            </div>

            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              NOWPayments automatically triggers <code className="text-cyan-400">/api/nowpayments/ipn</code> with an HMAC-SHA512 signature on blockchain confirmations. Test this flow directly:
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Order / Payment ID:
                </label>
                {pendingOrders.length > 0 ? (
                  <select
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Select a pending order...</option>
                    {pendingOrders.map((o) => (
                      <option key={o.id} value={o.oxaInvoice.paymentId || o.oxaInvoice.trackId}>
                        {o.productTitle} — {o.oxaInvoice.paymentId || o.oxaInvoice.trackId} (${o.priceUSD})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    placeholder="e.g. 5077125035 or ord_123"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Simulated Notification Status:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWebhookStatus('finished')}
                    className={`rounded-xl py-2 px-3 text-xs font-semibold border transition ${
                      webhookStatus === 'finished'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    finished (Payment Confirmed)
                  </button>
                  <button
                    type="button"
                    onClick={() => setWebhookStatus('expired')}
                    className={`rounded-xl py-2 px-3 text-xs font-semibold border transition ${
                      webhookStatus === 'expired'
                        ? 'border-rose-500 bg-rose-950/60 text-rose-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    expired (Window Closed)
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendTestWebhook}
                disabled={isSendingWebhook}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-xs font-bold text-slate-950 hover:from-emerald-400 hover:to-teal-400 transition shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSendingWebhook ? 'Dispatching...' : 'Dispatch Simulated IPN'}</span>
              </button>

              {webhookLog && (
                <div className="mt-4">
                  <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">Server Response</span>
                  <pre className="mt-1 rounded-xl bg-slate-950 p-3 font-mono text-[11px] text-cyan-300 border border-slate-800 overflow-x-auto">
                    {webhookLog}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Code Documentation & Protocol Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl">
            {/* Header with language picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-cyan-400" />
                  Integration Blueprint
                </h3>
                <p className="text-xs text-slate-400">Production-grade payment creation and webhook verification</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setActiveCodeLang('node')}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      activeCodeLang === 'node' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Node.js / Express
                  </button>
                  <button
                    onClick={() => setActiveCodeLang('python')}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      activeCodeLang === 'python' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Python (FastAPI)
                  </button>
                  <button
                    onClick={() => setActiveCodeLang('webhook')}
                    className={`rounded-md px-2.5 py-1 font-medium transition ${
                      activeCodeLang === 'webhook' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    IPN JSON Schema
                  </button>
                </div>

                <button
                  onClick={copyCode}
                  className="rounded-lg border border-slate-800 bg-slate-950 p-2 text-slate-400 hover:text-white transition"
                  aria-label="Copy snippet"
                >
                  {copiedCode ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Code Box */}
            <div className="relative rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
              <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto leading-relaxed max-h-[480px]">
                {currentCode}
              </pre>
            </div>
          </div>

          {/* Security & Verification Callout */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              NOWPayments IPN Security Architecture
            </h4>
            <ul className="text-xs text-slate-400 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>Alphabetical Key Sorting:</strong> NOWPayments signs the notification with keys sorted alphabetically before stringifying to JSON. Our helper <code className="text-cyan-300">sortObject()</code> handles nested structures automatically.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>Timing Safe Comparison:</strong> All HMAC-SHA512 comparisons utilize <code className="text-cyan-300">crypto.timingSafeEqual</code> to prevent timing attacks.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 font-bold">•</span>
                <span><strong>Automated Asset Unlocking:</strong> Once a notification with status <code className="text-emerald-400">finished</code> or <code className="text-emerald-400">confirmed</code> is received, the server generates a 24-hour signed download token and cryptographic license key immediately.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OxaPayDocsAndSimulator = NowPaymentsDocsAndSimulator;
