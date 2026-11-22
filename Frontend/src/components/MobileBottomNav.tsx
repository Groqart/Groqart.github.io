import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Home, Plus, ShoppingBag } from 'lucide-react';
import type { UserRole } from '../types/marketplace';

interface MobileBottomNavProps {
  cartCount: number;
  openCart: () => void;
  vendorStoreSlug?: string | null;
  setCurrentRole: (role: UserRole) => void;
  onOpenCreateStore: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  cartCount,
  openCart,
  vendorStoreSlug,
  setCurrentRole,
  onOpenCreateStore,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';

  const handleStoreAction = () => {
    if (vendorStoreSlug) {
      setCurrentRole('vendor');
      navigate('/vendor?tab=builder');
    } else {
      onOpenCreateStore();
    }
  };

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800/90 dark:bg-[#0D1320]/95 md:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-3 items-center h-16 px-3">
        {/* Left: Home Button */}
        <div className="flex justify-start">
          <button
            type="button"
            onClick={() => navigate('/')}
            aria-label="Home"
            aria-current={isHome ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-xl px-3 py-1.5 transition cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-500 ${
              isHome
                ? 'text-cyan-600 dark:text-cyan-400 font-semibold'
                : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] leading-tight">Home</span>
          </button>
        </div>

        {/* Center: Create Store (+) Button without "Store" text */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleStoreAction}
            aria-label={vendorStoreSlug ? 'Open Storefront Builder' : 'Create Store'}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0EA5E9] text-white shadow-md hover:bg-[#0284C7] active:scale-95 transition focus-visible:outline-2 focus-visible:outline-cyan-500 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Right: Saved Items Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCart}
            aria-label="Saved Items"
            className="relative flex flex-col items-center justify-center gap-0.5 min-w-[64px] min-h-[44px] rounded-xl px-3 py-1.5 text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <span className="relative inline-flex items-center justify-center">
              <ShoppingBag className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 text-[10px] font-bold text-white tabular-nums">
                  {cartCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-medium leading-tight whitespace-nowrap">
              Saved Items
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
};
