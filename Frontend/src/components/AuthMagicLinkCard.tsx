import React, { useState } from 'react';
import { Link } from 'react-router';
import { Mail, Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';

interface AuthMagicLinkCardProps {
  title: string;
  description: string;
  redirectPath: string;
}

export const AuthMagicLinkCard: React.FC<AuthMagicLinkCardProps> = ({
  title,
  description,
  redirectPath,
}) => {
  const { requestMagicLink } = useMarketplace();
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devVerifyUrl, setDevVerifyUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSending(true);
    const res = await requestMagicLink(email, redirectPath);
    setIsSending(false);

    if (!res.ok) {
      setErrorMsg(res.error || 'Could not send magic link');
      return;
    }

    setSentTo(email.trim().toLowerCase());
    setDevVerifyUrl(res.devVerifyUrl || null);
  };

  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-600 dark:bg-cyan-500/10 dark:border-cyan-500/30 dark:text-cyan-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Passwordless Magic Link Authentication</p>
        </div>
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-5">{description}</p>

      {errorMsg && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {sentTo ? (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 space-y-3 text-xs dark:border-emerald-500/40 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Magic link sent to {sentTo}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Check your inbox and click the single-use sign-in link (valid for 15 minutes).
          </p>

          {devVerifyUrl && (
            <div className="rounded-lg border border-cyan-200 bg-white p-3 space-y-2 dark:border-cyan-500/30 dark:bg-slate-950/80">
              <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300 block">
                Local Sandbox Mode (Resend API key not set):
              </span>
              <Link
                to={devVerifyUrl}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0EA5E9] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#0284C7] transition"
              >
                <span>Open Magic Sign-In Link</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setDevVerifyUrl(null);
            }}
            className="text-[11px] text-cyan-700 dark:text-cyan-400 hover:underline cursor-pointer"
          >
            Use a different email address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label htmlFor="magic-link-email" className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              <Mail className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              Email or Test Login (&quot;admin&quot;)
            </label>
            <input
              id="magic-link-email"
              type="text"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com or admin"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#0EA5E9] py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#0284C7] transition disabled:opacity-50 cursor-pointer"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending Magic Link...</span>
              </>
            ) : (
              <>
                <span>Send Magic Sign-In Link</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
