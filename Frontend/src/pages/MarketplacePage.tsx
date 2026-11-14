import React, { useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { Search, SlidersHorizontal, ShieldCheck } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductCategory } from '../types/marketplace';
import { useMarketplace } from '../context/MarketplaceContext';

const CATEGORIES: ProductCategory[] = [
  'All',
  'Scripts & Code',
  'SaaS Starters',
  'Bots & Automation',
  '3D & Game Assets',
  'UI Kits & Design',
  'APIs & Microservices',
];

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, initiateBuy } = useMarketplace();

  const selectedCategory = (searchParams.get('category') as ProductCategory) || 'All';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = (searchParams.get('sort') as 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales') || 'newest';

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'All' || (key === 'sort' && val === 'newest')) {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next);
  };

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

  return (
    <div>
      {/* Hero Section */}
      <div className="relative border-b border-slate-800/80 bg-gradient-to-b from-slate-900/80 via-slate-950 to-slate-950 px-4 py-12 sm:px-6 lg:py-16 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3.5 py-1 text-xs font-medium text-cyan-300 backdrop-blur-md mb-6">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>NOWPayments Instant Crypto Settlement • Live IPN Verified</span>
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
              <span className="text-slate-400">Signed Download Links</span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 backdrop-blur-sm">
              <span className="text-lg font-bold text-purple-400 block">5% Fee</span>
              <span className="text-slate-400">Creator Friendly Payouts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Controls */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => updateParam('category', cat)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-semibold transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Search by keywords, tags (Next.js, Python, Rust)..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => updateParam('q', '')}
                className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-slate-400">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => updateParam('sort', e.target.value)}
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
                onViewDetails={(p) => navigate(`/product/${p.id}`)}
                onQuickBuy={(p) => initiateBuy(p, 'USDT')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
