import React from 'react';
import { X, Trash2, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Product } from '../types/marketplace';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Product[];
  onRemoveItem: (id: string) => void;
  onCheckoutProduct: (product: Product) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemoveItem,
  onCheckoutProduct,
}) => {
  if (!isOpen) return null;

  const totalUSD = cart.reduce((sum, item) => sum + item.priceUSD, 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl">
        <div>
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Shopping Cart</span>
              <span className="rounded-full bg-cyan-950 px-2 py-0.5 text-xs text-cyan-400 font-semibold border border-cyan-800">
                {cart.length}
              </span>
            </h3>
            <button
              onClick={onClose}
              aria-label="Close cart drawer"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Your cart is empty. Pick a digital product from the catalog!
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-3.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="truncate">
                    <h4 className="font-semibold text-white truncate">{item.title}</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {item.version} • {item.category}
                    </span>
                    <div className="font-bold text-cyan-400 mt-1">${item.priceUSD} USD</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onCheckoutProduct(item)}
                      className="rounded-lg bg-cyan-500/20 px-2.5 py-1.5 font-semibold text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition text-[11px]"
                    >
                      Checkout
                    </button>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
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
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Total USD:</span>
              <span className="text-2xl font-extrabold text-white">${totalUSD}</span>
            </div>

            <button
              onClick={() => onCheckoutProduct(cart[0])}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition"
            >
              <ShieldCheck className="h-4 w-4" />
              Proceed to OxaPay Checkout ({cart[0].title.slice(0, 20)}...)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
