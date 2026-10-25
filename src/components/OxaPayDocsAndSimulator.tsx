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
} from 'lucide-react';
import { Order } from '../types/marketplace';

interface OxaPayDocsAndSimulatorProps {
  orders: Order[];
  onOrderUpdated: () => void;
}

export const OxaPayDocsAndSimulator: React.FC<OxaPayDocsAndSimulatorProps> = ({
  orders,
  onOrderUpdated,
}) => {
  const [activeCodeLang, setActiveCodeLang] = useState<'node' | 'python' | 'webhook'>('node');
  const [copiedCode, setCopiedCode] = useState(false);
  const [sandboxMode, setSandboxMode] = useState(true);
  const [merchantKey, setMerchantKey] = useState('sandbox_merchant_key_demo');
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [webhookStatus, setWebhookStatus] = useState<'Paid' | 'Expired'>('Paid');
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const [webhookLog, setWebhookLog] = useState<string | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Fetch oxapay server configuration
  useEffect(() => {
    fetch('/api/oxapay/config')
      .then((res) => res.json())
      .then((data) => {
        setSandboxMode(data.sandboxMode);
      })
      .catch((err) => console.error(err));
  }, []);

  const handleSaveConfig = async () => {
    try {
      await fetch('/api/oxapay/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sandboxMode,
          merchantApiKey: merchantKey,
        }),
      });
      setFeedbackMsg({ text: 'OxaPay configuration saved successfully!', type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ text: 'Failed to save configuration', type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 3000);
    }
  };

  const handleSendTestWebhook = async () => {
    const targetId = selectedTrackId || (orders[0] ? orders[0].oxaInvoice.trackId : '');
    if (!targetId) {
      setFeedbackMsg({ text: 'Please create an order or enter a Track ID first.', type: 'error' });
      setTimeout(() => setFeedbackMsg(null), 3000);
      return;
    }

    try {
      setIsSendingWebhook(true);
      const res = await fetch('/api/oxapay/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-oxapay-signature': 'simulated_test_signature_valid',
        },
        body: JSON.stringify({
          trackId: targetId,
          status: webhookStatus,
          isTestSimulation: true,
          amount: 89.0,
          payAmount: 89.0,
          payCurrency: 'USDT',
        }),
      });

      const data = await res.json();
      setWebhookLog(JSON.stringify(data, null, 2));
      setFeedbackMsg({ text: `Webhook processed for ${targetId}! Order updated.`, type: 'success' });
      setTimeout(() => setFeedbackMsg(null), 3000);
      onOrderUpdated();
    } catch (err: any) {
      setWebhookLog(`Error: ${err.message}`);
    } finally {
      setIsSendingWebhook(false);
    }
  };

  const pendingOrders = orders.filter((o) => o.status === 'pending');

  const nodeCode = `// 1. Initialize OxaPay SDK / HTTP Client
import express from 'express';
import crypto from 'node:crypto';

const app = express();
const OXAPAY_MERCHANT_KEY = process.env.OXAPAY_MERCHANT_KEY;

// 2. Generate Payment Invoice (OxaPay API)
app.post('/api/checkout', async (req, res) => {
  const { amountUSD, orderId } = req.body;
  
  const response = await fetch('https://api.oxapay.com/merchants/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchant: OXAPAY_MERCHANT_KEY,
      amount: amountUSD,
      currency: 'USD',
      lifeTime: 15, // 15 minutes window
      feePaidByPayer: 1,
      callbackUrl: 'https://yourdomain.com/api/oxapay/webhook',
      orderId,
    }),
  });
  const invoice = await response.json();
  res.json(invoice);
});

// 3. Webhook Listener (Critical for zero-leak delivery)
app.post('/api/oxapay/webhook', express.raw({ type: '*/*' }), (req, res) => {
  const signature = req.headers['x-oxapay-signature'];
  const computed = crypto.createHmac('sha512', OXAPAY_MERCHANT_KEY)
    .update(req.body)
    .digest('hex');

  if (signature !== computed) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(req.body.toString());
  if (payload.status === 'Paid') {
    // Release digital files & issue license key
    fulfillDigitalOrder(payload.orderId);
  }
  res.send('OK');
});`;

  const pythonCode = `# Python / FastAPI OxaPay Gateway Integration
import hmac
import hashlib
import httpx
from fastapi import FastAPI, Header, HTTPException, Request

app = FastAPI()
OXAPAY_KEY = "your_oxapay_merchant_key"

@app.post("/api/checkout")
async def create_invoice(amount_usd: float, order_id: str):
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://api.oxapay.com/merchants/request", json={
            "merchant": OXAPAY_KEY,
            "amount": amount_usd,
            "currency": "USD",
            "callbackUrl": "https://yourdomain.com/api/oxapay/webhook",
            "orderId": order_id
        })
        return resp.json()

@app.post("/api/oxapay/webhook")
async def oxapay_webhook(request: Request, x_oxapay_signature: str = Header(None)):
    raw_body = await request.body()
    expected = hmac.new(OXAPAY_KEY.encode(), raw_body, hashlib.sha512).hexdigest()
    
    if x_oxapay_signature != expected:
        raise HTTPException(status_code=401, detail="Invalid HMAC signature")
        
    data = await request.json()
    if data.get("status") == "Paid":
        # Safe asset release: Generate temporary signed download link
        unlock_digital_goods(data.get("orderId"))
    return {"result": 100}`;

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Title */}
      <div className="border-b border-slate-800 pb-6 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-white tracking-tight sm:text-3xl">
            OxaPay Gateway Architecture & Testing Suite
          </h1>
          <span className="rounded-full bg-cyan-950 px-2.5 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-800">
            ENGINE V2
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Complete guide, sandbox webhook simulator, and cryptographic delivery architecture for developer digital marketplaces.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div
          className={`mb-6 rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2 border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* 4 Pillars Diagram */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-cyan-400" />
          The 4 Pillars of Secure OxaPay Digital Goods Delivery
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          {/* Step 1 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 font-bold mb-3 border border-cyan-500/20">
              1
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Invoice Generation</h3>
            <p className="text-slate-400 leading-relaxed">
              Buyer initiates checkout. Server calls OxaPay <code className="text-cyan-400">generateInvoice</code> to lock prices and reserve unique crypto addresses.
            </p>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400 font-bold mb-3 border border-blue-500/20">
              2
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Crypto Deposit</h3>
            <p className="text-slate-400 leading-relaxed">
              Customer transfers USDT, BTC, ETH, LTC or SOL via QR code. 15-minute countdown prevents rate slippage.
            </p>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 font-bold mb-3 border border-emerald-500/20">
              3
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Webhook Callback</h3>
            <p className="text-slate-400 leading-relaxed">
              OxaPay automatically pings <code className="text-cyan-400">/api/oxapay/webhook</code> with HMAC-SHA512. Never rely solely on client redirects!
            </p>
          </div>

          {/* Step 4 */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 relative">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 font-bold mb-3 border border-purple-500/20">
              4
            </div>
            <h3 className="font-bold text-white text-sm mb-1">Cryptographic Delivery</h3>
            <p className="text-slate-400 leading-relaxed">
              Server generates a 24-hour signed download token and assigns an unrevealed software license key from the vault.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Webhook Simulator */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" />
              Live OxaPay Webhook Simulator
            </h2>
            <p className="text-xs text-slate-400">
              Test sending real webhook events to your local server to verify that digital orders unlock seamlessly.
            </p>
          </div>
          <span className="rounded bg-emerald-950 px-2 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-800">
            ENDPOINT: /api/oxapay/webhook
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controls */}
          <div className="space-y-4 text-xs">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Select Target Order Track ID:
              </label>
              {pendingOrders.length > 0 ? (
                <select
                  value={selectedTrackId}
                  onChange={(e) => setSelectedTrackId(e.target.value)}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="">-- Choose Pending Order --</option>
                  {pendingOrders.map((o) => (
                    <option key={o.id} value={o.oxaInvoice.trackId}>
                      {o.oxaInvoice.trackId} - {o.productTitle} (${o.priceUSD})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selectedTrackId}
                    onChange={(e) => setSelectedTrackId(e.target.value)}
                    placeholder="Enter Track ID (e.g. TRK_99182)"
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                  />
                  {orders[0] && (
                    <button
                      type="button"
                      onClick={() => setSelectedTrackId(orders[0].oxaInvoice.trackId)}
                      className="rounded-lg bg-slate-800 px-3 py-2 text-[11px] text-slate-300 hover:text-white"
                    >
                      Use Latest
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">
                Webhook Event Status:
              </label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={webhookStatus === 'Paid'}
                    onChange={() => setWebhookStatus('Paid')}
                    className="accent-cyan-500"
                  />
                  <span className="text-emerald-400 font-semibold">Paid (Fulfill & Unlock)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={webhookStatus === 'Expired'}
                    onChange={() => setWebhookStatus('Expired')}
                    className="accent-cyan-500"
                  />
                  <span className="text-rose-400 font-semibold">Expired (Order Canceled)</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleSendTestWebhook}
              disabled={isSendingWebhook}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-5 py-2.5 font-bold text-slate-950 shadow-md hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 transition"
            >
              {isSendingWebhook ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {isSendingWebhook ? 'Triggering Webhook...' : 'Dispatch Webhook Event'}
            </button>
          </div>

          {/* Webhook Response Log */}
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Server Response Payload:</span>
              {webhookLog && (
                <button
                  onClick={() => setWebhookLog(null)}
                  className="text-[11px] text-cyan-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
            <pre className="h-40 rounded-xl border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-emerald-400 overflow-y-auto leading-relaxed">
              {webhookLog || '// Click "Dispatch Webhook Event" above to see the response...'}
            </pre>
          </div>
        </div>
      </div>

      {/* Gateway Configuration & Live API Keys */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sliders className="h-5 w-5 text-cyan-400" />
            Gateway Environment Settings
          </h2>
          <span className="text-xs text-slate-400">OxaPay V2 API Protocol</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Merchant API Key</label>
            <input
              type="text"
              value={merchantKey}
              onChange={(e) => setMerchantKey(e.target.value)}
              placeholder="e.g. sandbox_demo_key or oxapay_live_key"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1">Obtained from your OxaPay Merchant Dashboard</p>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Operational Mode</label>
            <div className="flex items-center gap-3 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sandboxMode}
                  onChange={(e) => setSandboxMode(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 accent-cyan-500"
                />
                <span className="text-slate-200 font-medium">Sandbox Mode (Testnet & Simulations Active)</span>
              </label>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Enables instantaneous testing without spending live coins.</p>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveConfig}
            className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-slate-950 hover:bg-cyan-400 transition text-xs"
          >
            Save Gateway Settings
          </button>
        </div>
      </div>

      {/* Developer Integration Code Reference */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-cyan-400" />
            Integration Code Snippets
          </h2>

          <div className="flex gap-2 text-xs">
            <button
              onClick={() => setActiveCodeLang('node')}
              className={`rounded px-2.5 py-1 font-mono transition ${
                activeCodeLang === 'node'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Node.js / Express
            </button>
            <button
              onClick={() => setActiveCodeLang('python')}
              className={`rounded px-2.5 py-1 font-mono transition ${
                activeCodeLang === 'python'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Python / FastAPI
            </button>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => copyCode(activeCodeLang === 'node' ? nodeCode : pythonCode)}
            className="absolute top-3 right-3 flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:text-white transition"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedCode ? 'Copied' : 'Copy'}
          </button>
          <pre className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto leading-relaxed">
            <code>{activeCodeLang === 'node' ? nodeCode : pythonCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};
