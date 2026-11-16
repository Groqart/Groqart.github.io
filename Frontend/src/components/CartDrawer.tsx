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
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h3 id="saved-items-title" className="text-base font-bold text-white flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-cyan-400" />
              <span>Saved Items</span>
              <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-xs text-cyan-400 font-semibold border border-cyan-800">
                {cart.length}
              </span>
            </h3>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close saved items drawer"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No saved items yet. Save any digital product from the catalog for quick checkout.
            </div>
          ) : (
            <div className="space-y-3 max-h-[68vh] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <h4 className="font-semibold text-white truncate">{item.title}</h4>
                    <span className="text-[11px] text-slate-400 font-mono block truncate">
                      {item.version} • {item.category}
                    </span>
                    <div className="font-bold text-cyan-400 mt-1">${item.priceUSD} USD</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onCheckoutProduct(item)}
                      className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3 py-1.5 font-semibold text-white hover:from-cyan-400 hover:to-blue-500 transition text-[11px] cursor-pointer"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Checkout (${item.priceUSD})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
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
          <div className="border-t border-slate-800 pt-4 space-y-3">
            <p className="text-[11px] text-slate-400">
              Each digital asset settles individually via a dedicated NOWPayments hosted invoice.
            </p>

            <button
              type="button"
              onClick={onClearCart}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 py-2.5 text-xs font-semibold text-slate-300 hover:border-rose-500/40 hover:text-rose-300 transition cursor-pointer"
            >
              Clear Saved Items
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
