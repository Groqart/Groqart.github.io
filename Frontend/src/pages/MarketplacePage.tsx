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
import {
  clampCatalogPrice,
  getHardenedPriceHandlers,
  normalizePriceInputChange,
  stepCatalogPriceByWheel,
} from '../utils/priceInput';

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

  const minRangeRef = useRef<HTMLInputElement>(null);
  const maxRangeRef = useRef<HTMLInputElement>(null);
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  const [minDraft, setMinDraft] = useState<string | null>(null);
  const [maxDraft, setMaxDraft] = useState<string | null>(null);

  const updatePriceParam = (bound: 'min' | 'max', value?: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (bound === 'min') {
          const currentMax =
            next.has('max') && Number.isFinite(Number(next.get('max')))
              ? clampCatalogPrice(Number(next.get('max')), 0, priceBounds.max)
              : priceBounds.max;
          if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
            const clamped = clampCatalogPrice(value, 0, currentMax);
            if (clamped > 0) {
              next.set('min', String(clamped));
            } else {
              next.delete('min');
            }
          } else {
            next.delete('min');
          }
        } else {
          const currentMin =
            next.has('min') && Number.isFinite(Number(next.get('min')))
              ? clampCatalogPrice(Number(next.get('min')), 0, priceBounds.max)
              : 0;
          if (typeof value === 'number' && Number.isFinite(value) && value < priceBounds.max) {
            const clamped = clampCatalogPrice(value, currentMin, priceBounds.max);
            if (clamped < priceBounds.max) {
              next.set('max', String(clamped));
            } else {
              next.delete('max');
            }
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

  const sliderMinValue = clampCatalogPrice(activeMinPrice ?? 0, 0, priceBounds.max);
  const sliderMaxValue = clampCatalogPrice(
    activeMaxPrice ?? priceBounds.max,
    sliderMinValue,
    priceBounds.max
  );

  const wheelStateRef = useRef({
    sliderMinValue,
    sliderMaxValue,
    maxBound: priceBounds.max,
    minDraft,
    maxDraft,
    updatePriceParam,
  });
  wheelStateRef.current = {
    sliderMinValue,
    sliderMaxValue,
    maxBound: priceBounds.max,
    minDraft,
    maxDraft,
    updatePriceParam,
  };

  useEffect(() => {
    if (!isFilterOpen) return;

    const handleMinWheel = (e: WheelEvent) => {
      e.preventDefault();
      const state = wheelStateRef.current;
      const step = e.shiftKey ? 10 : 1;
      const base =
        state.minDraft !== null &&
        state.minDraft !== '' &&
        Number.isFinite(Number(state.minDraft))
          ? Number(state.minDraft)
          : state.sliderMinValue;
      const next = stepCatalogPriceByWheel(
        base,
        e.deltaY,
        e.deltaX,
        0,
        state.sliderMaxValue,
        step
      );
      setMinDraft(null);
      state.updatePriceParam('min', next);
    };

    const handleMaxWheel = (e: WheelEvent) => {
      e.preventDefault();
      const state = wheelStateRef.current;
      const step = e.shiftKey ? 10 : 1;
      const base =
        state.maxDraft !== null &&
        state.maxDraft !== '' &&
        Number.isFinite(Number(state.maxDraft))
          ? Number(state.maxDraft)
          : state.sliderMaxValue;
      const next = stepCatalogPriceByWheel(
        base,
        e.deltaY,
        e.deltaX,
        state.sliderMinValue,
        state.maxBound,
        step
      );
      setMaxDraft(null);
      state.updatePriceParam('max', next);
    };

    const minEls = [minRangeRef.current, minInputRef.current].filter(
      (el): el is HTMLInputElement => Boolean(el)
    );
    const maxEls = [maxRangeRef.current, maxInputRef.current].filter(
      (el): el is HTMLInputElement => Boolean(el)
    );

    minEls.forEach((el) => el.addEventListener('wheel', handleMinWheel, { passive: false }));
    maxEls.forEach((el) => el.addEventListener('wheel', handleMaxWheel, { passive: false }));

    return () => {
      minEls.forEach((el) => el.removeEventListener('wheel', handleMinWheel));
      maxEls.forEach((el) => el.removeEventListener('wheel', handleMaxWheel));
    };
  }, [isFilterOpen]);

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
                      ref={minRangeRef}
                      id="price-min-range"
                      type="range"
                      min={0}
                      max={priceBounds.max}
                      step={1}
                      value={Math.min(sliderMinValue, sliderMaxValue)}
                      onChange={(e) => {
                        setMinDraft(null);
                        const val = clampCatalogPrice(
                          Number(e.target.value),
                          0,
                          sliderMaxValue
                        );
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
                      ref={maxRangeRef}
                      id="price-max-range"
                      type="range"
                      min={0}
                      max={priceBounds.max}
                      step={1}
                      value={Math.max(sliderMaxValue, sliderMinValue)}
                      onChange={(e) => {
                        setMaxDraft(null);
                        const val = clampCatalogPrice(
                          Number(e.target.value),
                          sliderMinValue,
                          priceBounds.max
                        );
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
                      ref={minInputRef}
                      id="price-min-input"
                      type="number"
                      min={0}
                      max={sliderMaxValue}
                      step="1"
                      inputMode="decimal"
                      value={minDraft !== null ? minDraft : String(sliderMinValue)}
                      {...(() => {
                        const hardened = getHardenedPriceHandlers(
                          (cleaned) => {
                            const parsed = Number(cleaned);
                            if (Number.isFinite(parsed)) {
                              const clamped = clampCatalogPrice(parsed, 0, sliderMaxValue);
                              setMinDraft(String(clamped));
                              updatePriceParam('min', clamped);
                            }
                          },
                          { allowWheel: true }
                        );
                        return {
                          ...hardened,
                          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                            hardened.onKeyDown(e);
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          },
                        };
                      })()}
                      onChange={(e) => {
                        const result = normalizePriceInputChange(
                          e.target.value,
                          0,
                          sliderMaxValue,
                          true
                        );
                        if (!result.valid) return;
                        setMinDraft(result.draft);
                        updatePriceParam('min', result.committed);
                      }}
                      onBlur={() => {
                        if (minDraft !== null && minDraft !== '') {
                          const parsed = Number(minDraft);
                          if (Number.isFinite(parsed)) {
                            updatePriceParam(
                              'min',
                              clampCatalogPrice(parsed, 0, sliderMaxValue)
                            );
                          }
                        }
                        setMinDraft(null);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white tabular-nums"
                    />
                  </div>
                  <div>
                    <label htmlFor="price-max-input" className="sr-only">
                      Maximum price
                    </label>
                    <input
                      ref={maxInputRef}
                      id="price-max-input"
                      type="number"
                      min={sliderMinValue}
                      max={priceBounds.max}
                      step="1"
                      inputMode="decimal"
                      value={maxDraft !== null ? maxDraft : String(sliderMaxValue)}
                      {...(() => {
                        const hardened = getHardenedPriceHandlers(
                          (cleaned) => {
                            const parsed = Number(cleaned);
                            if (Number.isFinite(parsed)) {
                              const clamped = clampCatalogPrice(
                                parsed,
                                sliderMinValue,
                                priceBounds.max
                              );
                              setMaxDraft(String(clamped));
                              updatePriceParam('max', clamped);
                            }
                          },
                          { allowWheel: true }
                        );
                        return {
                          ...hardened,
                          onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
                            hardened.onKeyDown(e);
                            if (e.key === 'Enter') {
                              e.currentTarget.blur();
                            }
                          },
                        };
                      })()}
                      onChange={(e) => {
                        const result = normalizePriceInputChange(
                          e.target.value,
                          sliderMinValue,
                          priceBounds.max,
                          false
                        );
                        if (!result.valid) return;
                        setMaxDraft(result.draft);
                        if (result.draft === '' || result.committed !== undefined) {
                          updatePriceParam('max', result.committed);
                        }
                      }}
                      onBlur={() => {
                        if (maxDraft === '') {
                          updatePriceParam('max', priceBounds.max);
                        } else if (maxDraft !== null) {
                          const parsed = Number(maxDraft);
                          if (Number.isFinite(parsed)) {
                            updatePriceParam(
                              'max',
                              clampCatalogPrice(parsed, sliderMinValue, priceBounds.max)
                            );
                          }
                        }
                        setMaxDraft(null);
                      }}
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
