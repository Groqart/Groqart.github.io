// Frontend/src/components/Layout.tsx
import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router';
import { Cpu, CheckCircle } from 'lucide-react';
import { Navbar } from './Navbar';
import { CartDrawer } from './CartDrawer';
import { OxaPayInvoiceModal } from './OxaPayInvoiceModal';
import { useMarketplace } from '../context/MarketplaceContext';

export const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const {
    orders,
    cart,
    isCartOpen,
    currentRole,
    activeInvoiceOrder,
    toastMessage,
    setIsCartOpen,
    setCurrentRole,
    setActiveInvoiceOrder,
    removeFromCart,
    initiateBuy,
    handlePaymentSuccess,
  } = useMarketplace();

  const paidOrdersCount = orders.filter((o) => o.status === 'paid').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
          <CheckCircle className="h-4 w-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Global Navbar */}
      <Navbar
        cartCount={cart.length}
        openCart={() => setIsCartOpen(true)}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        purchasesCount={paidOrdersCount}
      />

      {/* Route Content: render children or Outlet */}
      <main className="flex-1">
        {children || <Outlet />}
      </main>

      {/* OxaPay / NOWPayments Modal */}
      {activeInvoiceOrder && (
        <OxaPayInvoiceModal
          order={activeInvoiceOrder}
          onClose={() => setActiveInvoiceOrder(null)}
          onPaymentSuccess={handlePaymentSuccess}
          onViewLibrary={() => {
            setActiveInvoiceOrder(null);
            navigate('/purchases');
          }}
        />
      )}

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={removeFromCart}
        onCheckoutProduct={(product) => initiateBuy(product, 'USDT')}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">NexusByte Marketplace</span>
            <span>&copy; {new Date().getFullYear()} • Powered by React Router v8.5</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/" className="hover:text-white transition">
              Marketplace
            </Link>
            <Link to="/gateway" className="hover:text-white transition">
              Gateway Specs
            </Link>
            <Link to="/vendor" className="hover:text-white transition">
              Vendor Onboarding
            </Link>
            <Link to="/purchases" className="hover:text-white transition">
              My Library
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
