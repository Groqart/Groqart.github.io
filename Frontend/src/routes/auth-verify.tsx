import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

function sanitizeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/purchases';
  return raw;
}

// Share in-flight/completed verification promises per token so React 19 StrictMode
// double-mounts never send duplicate single-use token verification requests.
const verificationCache = new Map<string, Promise<{ ok: boolean; error?: string }>>();

export default function AuthVerifyRoute() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyMagicToken } = useMarketplace();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const token = searchParams.get('token') || '';
  const redirectTarget = sanitizeRedirect(searchParams.get('redirect'));

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setStatus('error');
      setErrorMsg('Missing verification token in link.');
      return;
    }

    let pending = verificationCache.get(token);
    if (!pending) {
      pending = verifyMagicToken(token);
      verificationCache.set(token, pending);
    }

    pending.then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setStatus('success');
        setTimeout(() => {
          if (!cancelled) navigate(redirectTarget, { replace: true });
        }, 500);
      } else {
        verificationCache.delete(token);
        setStatus('error');
        setErrorMsg(res.error || 'This magic link is invalid or has already expired.');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [token, redirectTarget, navigate, verifyMagicToken]);

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
        {status === 'verifying' && (
          <div className="space-y-3">
            <Loader2 className="h-10 w-10 text-cyan-400 animate-spin mx-auto" />
            <h1 className="text-lg font-bold text-white">Verifying Magic Link...</h1>
            <p className="text-xs text-slate-400">Issuing your secure session token.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h1 className="text-lg font-bold text-white">Signed In Successfully</h1>
            <p className="text-xs text-slate-400">Redirecting you to {redirectTarget}...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <AlertCircle className="h-10 w-10 text-rose-400 mx-auto" />
            <h1 className="text-lg font-bold text-white">Magic Link Invalid or Expired</h1>
            <p className="text-xs text-rose-300">{errorMsg}</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                to="/purchases"
                className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 transition"
              >
                Request New Link
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition"
              >
                Marketplace
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
