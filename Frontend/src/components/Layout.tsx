import React from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { CheckCircle } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { CartDrawer } from './CartDrawer';
import { CheckoutModal } from './CheckoutModal';
import { CreateStoreModal } from './CreateStoreModal';
import { useMarketplace } from '../context/MarketplaceContext';
import { detectStorefrontContext } from '../utils/storefrontLogic';
import StorefrontRoute from '../routes/storefront';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const {
    orders,
    cart,
    isCartOpen,
    isSidebarOpen,
    themePreference,
    currentRole,
    toastMessage,
    user,
    vendorStore,
    setIsCartOpen,
    setIsSidebarOpen,
    setIsCreateStoreOpen,
    toggleSidebar,
    setThemePreference,
    setCurrentRole,
    removeFromCart,
    clearCart,
    initiateBuy,
    logout,
  } = useMarketplace();

  const paidOrdersCount = orders.filter((o) => o.status === 'paid').length;
  const isAdmin = user?.role === 'admin';

  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const storefrontCtx = detectStorefrontContext(hostname, location.pathname);
  const isStandaloneStore = storefrontCtx.mode === 'standalone';

  // Mode B: Isolated Merchant Storefront (strips ZenxusBay Navbar, Sidebar, Logo, Global Search)
  if (isStandaloneStore) {
    return (
      <div className="min-h-screen flex flex-col font-sans">
        {toastMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-white px-4 py-3 text-xs font-semibold text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white"
          >
            <CheckCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        <main className="flex-1 min-w-0">
          {storefrontCtx.isHostBased && location.pathname === '/' ? (
            <StorefrontRoute
              overrideSlugOrHost={storefrontCtx.slugOrHost}
              overrideMode="standalone"
            />
          ) : (
            children || <Outlet />
          )}
        </main>

        <CheckoutModal />
        <CreateStoreModal />
      </div>
    );
  }

  // Mode A / Standard ZenxusBay Marketplace Shell
  return (
    <div className="min-h-screen bg-[#F7F9FC] text-slate-900 dark:bg-[#090D16] dark:text-slate-100 flex flex-col font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-white px-4 py-3 text-xs font-semibold text-slate-900 shadow-2xl dark:bg-slate-900 dark:text-white"
        >
          <CheckCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Top Header */}
      <Navbar
        cartCount={cart.length}
        openCart={() => setIsCartOpen(true)}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
        themePreference={themePreference}
        onChangeTheme={setThemePreference}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        purchasesCount={paidOrdersCount}
        user={user}
        vendorStoreSlug={vendorStore?.slug || null}
        onOpenCreateStore={() => setIsCreateStoreOpen(true)}
        onLogout={logout}
      />

      {/* Shell: Left Collapsible Sidebar + Main Content */}
      <div className="flex flex-1 min-w-0">
        <Sidebar
          isOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
          onOpenSaved={() => setIsCartOpen(true)}
          onOpenCreateStore={() => setIsCreateStoreOpen(true)}
          vendorStoreSlug={vendorStore?.slug || null}
          savedCount={cart.length}
          purchasesCount={paidOrdersCount}
          isAdmin={isAdmin}
        />

        <div className="flex flex-1 flex-col min-w-0 pb-16 md:pb-0">
          <main className="flex-1 min-w-0">
            {children || <Outlet />}
          </main>

          {/* Clean Footer */}
          <footer className="border-t border-slate-200 bg-white py-6 px-4 text-xs text-slate-500 dark:border-slate-800/80 dark:bg-[#0B101B] dark:text-slate-400">
            <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span
                  translate="no"
                  className="notranslate font-display font-bold text-slate-800 dark:text-slate-200"
                >
                  ZenxusBay
                </span>
                <span>&copy; {new Date().getFullYear()} · Digital Goods &amp; Crypto Checkout</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-5">
                <Link to="/" className="hover:text-slate-900 dark:hover:text-white transition">
                  Marketplace
                </Link>
                <Link to="/vendor" className="hover:text-slate-900 dark:hover:text-white transition">
                  Vendor Portal
                </Link>
                <Link to="/purchases" className="hover:text-slate-900 dark:hover:text-white transition">
                  My Library
                </Link>
                <Link to="/privacy-policy" className="hover:text-slate-900 dark:hover:text-white transition">
                  Privacy Policy
                </Link>
                <Link to="/terms-of-service" className="hover:text-slate-900 dark:hover:text-white transition">
                  Terms of Service
                </Link>
              </div>
            </div>
          </footer>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        cartCount={cart.length}
        openCart={() => setIsCartOpen(true)}
        vendorStoreSlug={vendorStore?.slug || null}
        setCurrentRole={setCurrentRole}
        onOpenCreateStore={() => setIsCreateStoreOpen(true)}
      />

      {/* Create Store Wizard */}
      <CreateStoreModal />

      {/* Checkout Modal */}
      <CheckoutModal />

      {/* Saved Items / Quick Checkout Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={removeFromCart}
        onClearCart={clearCart}
        onCheckoutProduct={(product) => initiateBuy(product, 'USDT')}
      />
    </div>
  );
};
