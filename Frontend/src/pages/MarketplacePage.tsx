import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import {
  SlidersHorizontal,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import type { Product, ProductCategory } from '../types/marketplace';
import { useMarketplace } from '../context/MarketplaceContext';
import {
  filterAndSortProducts,
  getPriceBounds,
  MARKETPLACE_CATEGORIES,
  type CatalogSortOption,
} from '../utils/catalogLogic';

export const MarketplacePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    products,
    isProductsLoading,
    cart,
    isSidebarOpen,
    initiateBuy,
    addToCart,
    removeFromCart,
    showToast,
  } = useMarketplace();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  const selectedCategory = (searchParams.get('category') as ProductCategory) || 'All';
  const searchQuery = searchParams.get('q') || '';
  const sortBy = (searchParams.get('sort') as CatalogSortOption) || 'newest';
  const minParam = searchParams.get('min');
  const maxParam = searchParams.get('max');

  const priceBounds = useMemo(() => getPriceBounds(products), [products]);

  const activeMinPrice =
    minParam !== null && minParam !== '' && Number.isFinite(Number(minParam))
      ? Number(minParam)
      : undefined;
  const activeMaxPrice =
    maxParam !== null && maxParam !== '' && Number.isFinite(Number(maxParam))
      ? Number(maxParam)
      : undefined;

  useEffect(() => {
    if (!isFilterOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(e.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFilterOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isFilterOpen]);

  const updateParam = (key: string, val: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!val || val === 'All' || (key === 'sort' && val === 'newest')) {
        next.delete(key);
      } else {
        next.set(key, val);
      }
      return next;
    });
  };

  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  const updatePriceParam = (bound: 'min' | 'max', value?: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (bound === 'min') {
          if (typeof value === 'number' && Number.isFinite(value) && value > priceBounds.min) {
            next.set('min', String(value));
          } else {
            next.delete('min');
          }
        } else {
          if (typeof value === 'number' && Number.isFinite(value) && value < priceBounds.max) {
            next.set('max', String(value));
          } else {
            next.delete('max');
          }
        }
        return next;
      },
      { replace: true }
    );
  };

  const resetFilters = () => {
    setMinDraft(null);
    setMaxDraft(null);
    setSearchParams(new URLSearchParams());
  };

  const displayedProducts = useMemo(
    () =>
      filterAndSortProducts(products, {
        category: selectedCategory,
        query: searchQuery,
        sortBy,
        minPrice: activeMinPrice,
        maxPrice: activeMaxPrice,
      }),
    [products, selectedCategory, searchQuery, sortBy, activeMinPrice, activeMaxPrice]
  );

  const hasPriceOrOrderFilter =
    activeMinPrice !== undefined ||
    activeMaxPrice !== undefined ||
    sortBy === 'price_asc' ||
    sortBy === 'price_desc';

  const hasActiveFilters =
    selectedCategory !== 'All' ||
    Boolean(searchQuery.trim()) ||
    sortBy !== 'newest' ||
    activeMinPrice !== undefined ||
    activeMaxPrice !== undefined;

  const gridColsClass = isSidebarOpen
    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  const sliderMinValue = activeMinPrice ?? priceBounds.min;
  const sliderMaxValue = activeMaxPrice ?? priceBounds.max;

  const handleShareProduct = async (product: Product) => {
    const url = `${window.location.origin}/product/${product.id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
      showToast(`Link copied for ${product.title}`);
    } catch {
      showToast(url);
    }
  };

  return (
    <div className="mx-auto max-w-[1540px] px-4 py-5 sm:px-6">
      {/* Category Filter Strip + Clickable Sliders Filter Popover */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 mb-6 dark:border-slate-800/80 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Product categories"
          className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 no-scrollbar"
        >
          {MARKETPLACE_CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => updateParam('category', cat)}
                className={`whitespace-nowrap shrink-0 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors duration-150 cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                    : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="relative flex items-center justify-between sm:justify-end gap-3 shrink-0 text-xs" ref={filterPopoverRef}>
          <span className="text-slate-500 dark:text-slate-400 tabular-nums">
            {displayedProducts.length}{' '}
            {displayedProducts.length === 1 ? 'listing' : 'listings'}
            {searchQuery.trim() ? ` for "${searchQuery.trim()}"` : ''}
          </span>

          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            aria-label="Filter by price and sort order"
            aria-expanded={isFilterOpen}
            className={`relative flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition cursor-pointer ${
              isFilterOpen || hasPriceOrOrderFilter
                ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/15 dark:text-cyan-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Price &amp; Order</span>
            <ArrowUpDown className="h-3.5 w-3.5 opacity-75" />
          </button>

          {isFilterOpen && (
            <div
              role="region"
              aria-label="Price range and order settings"
              className="absolute right-0 top-11 z-40 w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-[#111827]"
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2 font-display text-sm font-semibold text-slate-900 dark:text-white">
                  <ArrowUpDown className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <span>Price Range &amp; Order</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  aria-label="Close price filter"
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Price Range Sliders & Inputs */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700 dark:text-slate-300">
                  <span>Price range</span>
                  <span className="font-mono text-cyan-700 dark:text-cyan-300 tabular-nums">
                    ${sliderMinValue} – ${sliderMaxValue}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <label htmlFor="price-min-range">Min price</label>
                      <span className="font-mono tabular-nums">${sliderMinValue}</span>
                    </div>
                    <input
                      id="price-min-range"
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={Math.min(sliderMinValue, sliderMaxValue)}
                      onChange={(e) => {
                        setMinDraft(null);
                        const val = Math.min(Number(e.target.value), sliderMaxValue);
                        updatePriceParam('min', val);
                      }}
                      className="w-full accent-[#0EA5E9] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                      <label htmlFor="price-max-range">Max price</label>
                      <span className="font-mono tabular-nums">${sliderMaxValue}</span>
                    </div>
                    <input
                      id="price-max-range"
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={Math.max(sliderMaxValue, sliderMinValue)}
                      onChange={(e) => {
                        setMaxDraft(null);
                        const val = Math.max(Number(e.target.value), sliderMinValue);
                        updatePriceParam('max', val);
                      }}
                      className="w-full accent-[#0EA5E9] cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label htmlFor="price-min-input" className="sr-only">
                      Minimum price
                    </label>
                    <input
                      id="price-min-input"
                      type="number"
                      min={0}
                      value={minDraft !== null ? minDraft : String(sliderMinValue)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setMinDraft(raw);
                        if (raw === '') {
                          updatePriceParam('min', undefined);
                        } else {
                          const parsed = Number(raw);
                          if (Number.isFinite(parsed) && parsed >= 0) {
                            updatePriceParam('min', parsed);
                          }
                        }
                      }}
                      onBlur={() => setMinDraft(null)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="price-max-input" className="sr-only">
                      Maximum price
                    </label>
                    <input
                      id="price-max-input"
                      type="number"
                      min={0}
                      value={maxDraft !== null ? maxDraft : String(sliderMaxValue)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setMaxDraft(raw);
                        if (raw === '') {
                          updatePriceParam('max', undefined);
                        } else {
                          const parsed = Number(raw);
                          if (Number.isFinite(parsed) && parsed >= 0) {
                            updatePriceParam('max', parsed);
                          }
                        }
                      }}
                      onBlur={() => setMaxDraft(null)}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Sort Direction with Up/Down Arrows next to labels */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Sort direction
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateParam('sort', 'price_desc')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                      sortBy === 'price_desc'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ArrowDown className="h-3.5 w-3.5 shrink-0" />
                    <span>High to Low</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateParam('sort', 'price_asc')}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition cursor-pointer ${
                      sortBy === 'price_asc'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-300'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <ArrowUp className="h-3.5 w-3.5 shrink-0" />
                    <span>Low to High</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => updateParam('sort', 'newest')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition cursor-pointer ${
                      sortBy === 'newest'
                        ? 'text-cyan-700 dark:text-cyan-300 font-semibold'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    <span>Newest (Default)</span>
                  </button>

                  {hasPriceOrOrderFilter && (
                    <button
                      type="button"
                      onClick={() => {
                        setMinDraft(null);
                        setMaxDraft(null);
                        const next = new URLSearchParams(searchParams);
                        next.delete('min');
                        next.delete('max');
                        next.delete('sort');
                        setSearchParams(next);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {isProductsLoading ? (
        <div className={`grid ${gridColsClass} gap-5`}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div
              key={n}
              className="h-80 rounded-2xl border border-slate-200 bg-white/70 animate-pulse dark:border-slate-800 dark:bg-slate-900/50"
            />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 dark:border-slate-800 dark:bg-[#111827]">
          <h1 className="font-display text-lg font-bold text-slate-900 dark:text-white">
            Catalog Is Empty
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            No published digital goods are available yet. Publish your first listing in the Vendor Portal.
          </p>
          <div>
            <button
              type="button"
              onClick={() => navigate('/vendor')}
              className="rounded-xl bg-[#0EA5E9] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0284C7] transition cursor-pointer"
            >
              Open Vendor Portal
            </button>
          </div>
        </div>
      ) : displayedProducts.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 dark:border-slate-800 dark:bg-[#111827]">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No listings matched{' '}
            {searchQuery.trim() ? `"${searchQuery.trim()}"` : 'your active filters'}
            {selectedCategory !== 'All' ? ` in ${selectedCategory}` : ''}.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      ) : (
        <div className={`grid ${gridColsClass} gap-4 xl:gap-5`}>
          {displayedProducts.map((prod) => {
            const isSaved = cart.some((item) => item.id === prod.id);
            return (
              <ProductCard
                key={prod.id}
                product={prod}
                isSaved={isSaved}
                onViewDetails={(p) => navigate(`/product/${p.id}`)}
                onQuickBuy={(p) => initiateBuy(p, 'USDT')}
                onShareLink={handleShareProduct}
                onToggleSave={(p) =>
                  isSaved ? removeFromCart(p.id) : addToCart(p)
                }
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
