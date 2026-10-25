import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  ArrowRight,
  Code2,
  Terminal,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { ProductCard } from './components/ProductCard';
import { ProductDetailModal } from './components/ProductDetailModal';
import { OxaPayInvoiceModal } from './components/OxaPayInvoiceModal';
import { PurchasesVault } from './components/PurchasesVault';
import { VendorDashboard } from './components/VendorDashboard';
import { OxaPayDocsAndSimulator } from './components/OxaPayDocsAndSimulator';
import { CartDrawer } from './components/CartDrawer';
import {
  Product,
  ProductCategory,
  Order,
  UserRole,
  CryptoCurrency,
} from './types/marketplace';

const CATEGORIES: ProductCategory[] = [
  'All',
  'Scripts & Code',
  'SaaS Starters',
  'Bots & Automation',
  '3D & Game Assets',
  'UI Kits & Design',
  'APIs & Microservices',
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'marketplace' | 'purchases' | 'vendor' | 'oxapay'>('marketplace');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('buyer');

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales'>('newest');

  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch initial products
  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  // Fetch orders
  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/my');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders', err);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  // Filtered and sorted products
  const displayedProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== 'All') {
      result = result.filter((p) => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'price_asc') {
      result.sort((a, b) => a.priceUSD - b.priceUSD);
    } else if (sortBy === 'price_desc') {
      result.sort((a, b) => b.priceUSD - a.priceUSD);
    } else if (sortBy === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'sales') {
      result.sort((a, b) => b.salesCount - a.salesCount);
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Initiate OxaPay checkout
  const handleInitiateBuy = async (product: Product, cryptoCurrency: CryptoCurrency = 'USDT') => {
    try {
      const res = await fetch('/api/oxapay/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          buyerEmail: 'demo.buyer@nexusbyte.io',
          buyerName: 'Demo Buyer',
          cryptoCurrency,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveInvoiceOrder(data.order);
        setDetailProduct(null);
        setIsCartOpen(false);
      } else {
        showToast('Failed to generate OxaPay invoice.');
      }
    } catch (err) {
      console.error('Buy error', err);
    }
  };

  // Add to cart helper
  const handleAddToCart = (product: Product) => {
    if (!cart.some((item) => item.id === product.id)) {
      setCart([...cart, product]);
      showToast(`Added "${product.title}" to cart`);
    } else {
      showToast('Product already in your cart');
    }
  };

  // Payment completed callback
  const handlePaymentSuccess = (updatedOrder: Order) => {
    fetchOrders();
    fetchProducts();
    showToast(`Order for "${updatedOrder.productTitle}" confirmed! Assets ready.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-3 text-xs font-semibold text-white shadow-2xl backdrop-blur-md">
          <CheckCircle className="h-4 w-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cart.length}
        openCart={() => setIsCartOpen(true)}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        purchasesCount={orders.filter((o) => o.status === 'paid').length}
      />

      {/* TAB CONTENT */}
      <main className="flex-1">
        {/* TAB: MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div>
            {/* Hero Section */}
            <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950 px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
              {/* Background ambient glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-3xl pointer-events-none" />

              <div className="relative mx-auto max-w-5xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-medium text-cyan-300 backdrop-blur-md mb-6">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Powered by OxaPay Crypto Escrow Gateway • Zero Leak Guarantee</span>
                </div>

                <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
                  The Premier Marketplace for <br />
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    Digital Goods & Developer Tools
                  </span>
                </h1>

                <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed">
                  Buy and sell production-grade codebases, AI trading bots, SaaS boilerplates, 3D assets, and license keys with automated multi-chain cryptocurrency settlement.
                </p>

                {/* Quick features counter banner */}
                <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto text-xs">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm">
                    <span className="text-lg font-bold text-white block">1.2s</span>
                    <span className="text-slate-400">Avg Delivery Speed</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm">
                    <span className="text-lg font-bold text-cyan-400 block">5 Chains</span>
                    <span className="text-slate-400">USDT, BTC, ETH, LTC, SOL</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm">
                    <span className="text-lg font-bold text-emerald-400 block">24h Tokens</span>
                    <span className="text-slate-400">Cryptographic Signed Links</span>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm">
                    <span className="text-lg font-bold text-purple-400 block">5% Fee</span>
                    <span className="text-slate-400">Creator Friendly Payouts</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Catalog Controls: Categories, Search, Sort */}
            <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
              {/* Category Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                      selectedCategory === cat
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Search & Sort Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
                {/* Search */}
                <div className="relative w-full sm:w-96">
                  <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by keywords, tags (Next.js, Python, Rust)..."
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
                  <SlidersHorizontal className="h-4 w-4 text-slate-500" />
                  <span>Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="newest">Newest First</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="sales">Best Selling</option>
                  </select>
                </div>
              </div>

              {/* Products Grid */}
              {displayedProducts.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-center text-xs text-slate-400">
                  No products found matching &ldquo;{searchQuery}&rdquo; in {selectedCategory}. Try adjusting your search query!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedProducts.map((prod) => (
                    <ProductCard
                      key={prod.id}
                      product={prod}
                      onViewDetails={(p) => setDetailProduct(p)}
                      onQuickBuy={(p) => handleInitiateBuy(p, 'USDT')}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: PURCHASES / DOWNLOADS */}
        {activeTab === 'purchases' && (
          <PurchasesVault
            orders={orders}
            onBrowseMarketplace={() => setActiveTab('marketplace')}
            onRefreshOrders={fetchOrders}
          />
        )}

        {/* TAB: VENDOR DASHBOARD */}
        {activeTab === 'vendor' && (
          <VendorDashboard
            products={products}
            onProductDeleted={(id) => {
              setProducts(products.filter((p) => p.id !== id));
              showToast('Product removed from catalog');
            }}
            onProductCreated={(newProd) => {
              setProducts([newProd, ...products]);
              showToast(`Product "${newProd.title}" published!`);
            }}
            onViewProduct={(p) => setDetailProduct(p)}
          />
        )}

        {/* TAB: OXAPAY DOCS & SIMULATOR */}
        {activeTab === 'oxapay' && (
          <OxaPayDocsAndSimulator
            orders={orders}
            onOrderUpdated={() => {
              fetchOrders();
              fetchProducts();
            }}
          />
        )}
      </main>

      {/* Product Detail Modal */}
      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          onClose={() => setDetailProduct(null)}
          onBuy={(product, cryptoCurrency) => handleInitiateBuy(product, cryptoCurrency)}
        />
      )}

      {/* OxaPay Crypto Checkout Modal */}
      {activeInvoiceOrder && (
        <OxaPayInvoiceModal
          order={activeInvoiceOrder}
          onClose={() => setActiveInvoiceOrder(null)}
          onPaymentSuccess={handlePaymentSuccess}
          onViewLibrary={() => {
            setActiveInvoiceOrder(null);
            setActiveTab('purchases');
          }}
        />
      )}

      {/* Shopping Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cart={cart}
        onRemoveItem={(id) => setCart(cart.filter((item) => item.id !== id))}
        onCheckoutProduct={(product) => handleInitiateBuy(product, 'USDT')}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 px-4 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">NexusByte Marketplace</span>
            <span>&copy; {new Date().getFullYear()} • OxaPay V2 Integration</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button onClick={() => setActiveTab('marketplace')} className="hover:text-white">
              Marketplace
            </button>
            <button onClick={() => setActiveTab('oxapay')} className="hover:text-white">
              Gateway Specs
            </button>
            <button onClick={() => setActiveTab('vendor')} className="hover:text-white">
              Vendor Onboarding
            </button>
            <button onClick={() => setActiveTab('purchases')} className="hover:text-white">
              My Library
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
