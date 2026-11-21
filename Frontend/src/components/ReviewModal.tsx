import React, { useState } from 'react';
import { Star, X, Loader2, AlertCircle } from 'lucide-react';
import type { Order } from '../types/marketplace';
import { useMarketplace } from '../context/MarketplaceContext';
import { API_BASE } from '../utils/apiBase';

interface ReviewModalProps {
  order: Order;
  onClose: () => void;
  onSubmitted: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ order, onClose, onSubmitted }) => {
  const { authToken, showToast } = useMarketplace();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setErrorMsg('Please sign in first.');
      return;
    }
    if (comment.trim().length < 5) {
      setErrorMsg('Please write at least 5 characters about your experience.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          product_id: order.productId,
          order_id: order.id,
          rating,
          comment: comment.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not submit review');
        return;
      }
      showToast('Verified review published!');
      onSubmitted();
      onClose();
    } catch {
      setErrorMsg('Network error publishing review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 id="review-modal-title" className="text-base font-bold text-white">
              Leave Verified Review
            </h3>
            <p className="text-[11px] text-slate-400 truncate max-w-[300px]">{order.productTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close review modal"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <span className="font-semibold text-slate-300 block mb-2">Rating</span>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} out of 5`}
                  className="p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <Star
                    className={`h-6 w-6 ${
                      star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-mono text-slate-300 tabular-nums">{rating} / 5</span>
            </div>
          </div>

          <div>
            <label htmlFor="review-comment" className="font-semibold text-slate-300 block mb-1.5">
              Your Review *
            </label>
            <textarea
              id="review-comment"
              rows={4}
              required
              minLength={5}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share code quality, setup experience, or documentation feedback..."
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
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
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-5 py-2 font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Submit Review</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
