import React, { useState } from 'react';
import { Flag, X, Loader2, AlertCircle } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext';
import { API_BASE } from '../utils/apiBase';

interface ReportProductModalProps {
  productId: string;
  productTitle: string;
  onClose: () => void;
}

const REPORT_REASONS = [
  'Broken or corrupted archive',
  'Misleading description / features',
  'Malware or security concern',
  'Copyright / IP infringement',
  'Other issue',
];

export const ReportProductModal: React.FC<ReportProductModalProps> = ({
  productId,
  productTitle,
  onClose,
}) => {
  const { user, authToken, showToast } = useMarketplace();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [reporterEmail, setReporterEmail] = useState(user?.email || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          product_id: productId,
          reason,
          details: details.trim(),
          reporter_email: reporterEmail.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not submit report');
        return;
      }
      showToast('Report submitted to Trust & Safety team');
      onClose();
    } catch {
      setErrorMsg('Network error submitting report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-rose-400" />
            <h3 id="report-modal-title" className="text-base font-bold text-white">
              Report Listing
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Reporting <strong className="text-slate-200">{productTitle}</strong> to NexusByte moderation.
        </p>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label htmlFor="report-reason" className="font-semibold text-slate-300 block mb-1.5">
              Reason *
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
            >
              {REPORT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {!user && (
            <div>
              <label htmlFor="report-email" className="font-semibold text-slate-300 block mb-1.5">
                Your Email *
              </label>
              <input
                id="report-email"
                type="email"
                required
                value={reporterEmail}
                onChange={(e) => setReporterEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="report-details" className="font-semibold text-slate-300 block mb-1.5">
              Details
            </label>
            <textarea
              id="report-details"
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide context, order ID, or reproduction notes..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2 font-bold text-white hover:bg-rose-400 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Submit Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
