import React from 'react';
import { X, Trash2, ShieldCheck, Bookmark } from 'lucide-react';
import type { Product } from '../types/marketplace';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Product[];
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onCheckoutProduct: (product: Product) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onClearCart,
  onCheckoutProduct,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="saved-items-title"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md h-full bg-white border-l border-slate-200 p-6 flex flex-col justify-between shadow-2xl dark:bg-[#111827] dark:border-slate-800">
        <div>
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4 dark:border-slate-800">
            <h3
              id="saved-items-title"
              className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2"
            >
              <Bookmark className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Saved Items</span>
              <span className="rounded-md bg-cyan-50 px-2 py-0.5 text-xs text-cyan-700 font-semibold border border-cyan-200 dark:bg-cyan-950 dark:text-cyan-400 dark:border-cyan-800 tabular-nums">
                {cart.length}
              </span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close saved items drawer"
              className="text-slate-500 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 text-xs">
              No saved items yet. Save any digital product from the catalog for quick checkout.
            </div>
          ) : (
            <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-3 text-xs dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono block truncate">
                      {item.version} · {item.category}
                    </span>
                    <div className="font-bold text-cyan-700 dark:text-cyan-400 mt-1 tabular-nums">
                      ${item.priceUSD} USD
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onCheckoutProduct(item)}
                      className="flex items-center gap-1 rounded-lg bg-[#0EA5E9] px-3 py-1.5 font-semibold text-white hover:bg-[#0284C7] transition text-[11px] cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Checkout (${item.priceUSD})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="border-t border-slate-200 pt-4 space-y-3 dark:border-slate-800">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Each digital asset settles individually via a dedicated NOWPayments hosted invoice.
            </p>

            <button
              type="button"
              onClick={onClearCart}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:border-rose-300 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-rose-500/40 dark:hover:text-rose-300 transition cursor-pointer"
            >
              Clear Saved Items
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
