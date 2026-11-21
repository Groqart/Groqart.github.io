import React, { useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  Home,
  Flame,
  Star,
  Bookmark,
  KeyRound,
  Store,
  Shield,
  Code2,
  Rocket,
  Bot,
  Box,
  Palette,
  Webhook,
  X,
} from 'lucide-react';
import type { ProductCategory } from '../types/marketplace';
import { useMarketplace } from '../context/MarketplaceContext';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenSaved: () => void;
  savedCount: number;
  purchasesCount: number;
  isAdmin: boolean;
}

const CATEGORY_LINKS: { category: ProductCategory; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { category: 'Scripts & Code', label: 'Scripts & Code', icon: Code2 },
  { category: 'SaaS Starters', label: 'SaaS Starters', icon: Rocket },
  { category: 'Bots & Automation', label: 'Bots & Automation', icon: Bot },
  { category: '3D & Game Assets', label: '3D & Game Assets', icon: Box },
  { category: 'UI Kits & Design', label: 'UI Kits & Design', icon: Palette },
  { category: 'APIs & Microservices', label: 'APIs & Microservices', icon: Webhook },
];

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onCloseMobile,
  onOpenSaved,
  savedCount,
  purchasesCount,
  isAdmin,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const currentPath = location.pathname;
  const activeCategory = searchParams.get('category') || 'All';
  const activeSort = searchParams.get('sort') || 'newest';

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && window.innerWidth < 1024) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCloseMobile]);

  const goToCatalog = (opts: { category?: string; sort?: string }) => {
    const next = new URLSearchParams();
    const existingQuery = currentPath === '/' ? searchParams.get('q') : null;
    if (existingQuery) next.set('q', existingQuery);
    if (opts.category && opts.category !== 'All') next.set('category', opts.category);
    if (opts.sort && opts.sort !== 'newest') next.set('sort', opts.sort);
    const qs = next.toString();
    navigate(qs ? `/?${qs}` : '/');
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onCloseMobile();
    }
  };

  const goToRoute = (path: string) => {
    navigate(path);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      onCloseMobile();
    }
  };

  const isHomeDefault =
    currentPath === '/' && activeCategory === 'All' && activeSort === 'newest';
  const isBestSellers = currentPath === '/' && activeSort === 'sales';
  const isTopRated = currentPath === '/' && activeSort === 'rating';

  const navItemClass = (active: boolean) =>
    `w-full flex items-center gap-3.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 cursor-pointer whitespace-nowrap ${
      active
        ? 'bg-cyan-50 text-cyan-800 font-semibold dark:bg-cyan-500/15 dark:text-cyan-300'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-white'
    }`;

  const compactItemClass = (active: boolean) =>
    `w-full flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-[10px] font-medium transition-colors duration-150 cursor-pointer ${
      active
        ? 'bg-cyan-50 text-cyan-800 font-semibold dark:bg-cyan-500/15 dark:text-cyan-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
    }`;

  return (
    <>
      {/* Mobile / Tablet Backdrop */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={onCloseMobile}
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* Desktop Rail / Expanded Sidebar + Mobile Slide-Over Drawer */}
      <aside
        aria-label="Sidebar navigation"
        className={`fixed inset-y-0 left-0 z-50 h-screen shrink-0 border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] transition-transform duration-200 ease-out lg:sticky lg:top-16 lg:z-40 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
          isOpen
            ? 'translate-x-0 w-60 overflow-y-auto'
            : '-translate-x-full lg:translate-x-0 lg:w-[74px] overflow-y-auto'
        }`}
      >
        {/* Mobile drawer close header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 lg:hidden">
          <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
            Menu
          </span>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded Sidebar View (shown on mobile when open, and on desktop when isOpen) */}
        <div className={`p-3 space-y-4 ${isOpen ? 'block' : 'hidden'}`}>
          {/* Primary Discover Section */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => goToCatalog({ category: 'All', sort: 'newest' })}
              className={navItemClass(isHomeDefault)}
            >
              <Home className="h-4 w-4 shrink-0" />
              <span>Home</span>
            </button>
            <button
              type="button"
              onClick={() => goToCatalog({ category: activeCategory, sort: 'sales' })}
              className={navItemClass(isBestSellers)}
            >
              <Flame className="h-4 w-4 shrink-0" />
              <span>Best Sellers</span>
            </button>
            <button
              type="button"
              onClick={() => goToCatalog({ category: activeCategory, sort: 'rating' })}
              className={navItemClass(isTopRated)}
            >
              <Star className="h-4 w-4 shrink-0" />
              <span>Top Rated</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onOpenSaved();
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  onCloseMobile();
                }
              }}
              className={navItemClass(false)}
            >
              <Bookmark className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Saved Items</span>
              {savedCount > 0 && (
                <span className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                  {savedCount}
                </span>
              )}
            </button>
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Workspace / Account Section */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Workspace
            </div>
            <button
              type="button"
              onClick={() => goToRoute('/purchases')}
              className={navItemClass(currentPath === '/purchases')}
            >
              <KeyRound className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">My Library</span>
              {purchasesCount > 0 && (
                <span className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                  {purchasesCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => goToRoute('/vendor')}
              className={navItemClass(currentPath === '/vendor')}
            >
              <Store className="h-4 w-4 shrink-0" />
              <span>Vendor Portal</span>
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => goToRoute('/admin')}
                className={navItemClass(currentPath === '/admin')}
              >
                <Shield className="h-4 w-4 shrink-0" />
                <span>Admin Console</span>
              </button>
            )}
          </div>

          <hr className="border-slate-200 dark:border-slate-800" />

          {/* Categories Section */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              Categories
            </div>
            {CATEGORY_LINKS.map(({ category, label, icon: Icon }) => (
              <button
                key={category}
                type="button"
                onClick={() => goToCatalog({ category, sort: activeSort })}
                className={navItemClass(currentPath === '/' && activeCategory === category)}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Desktop Compact Mini-Rail View (when collapsed) */}
        <div className={`hidden ${!isOpen ? 'lg:flex' : ''} flex-col gap-1.5 p-1.5 pt-3`}>
          <button
            type="button"
            onClick={() => goToCatalog({ category: 'All', sort: 'newest' })}
            className={compactItemClass(isHomeDefault)}
            title="Home"
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
          </button>
          <button
            type="button"
            onClick={() => goToCatalog({ category: activeCategory, sort: 'sales' })}
            className={compactItemClass(isBestSellers)}
            title="Best Sellers"
          >
            <Flame className="h-5 w-5" />
            <span>Trending</span>
          </button>
          <button
            type="button"
            onClick={() => goToCatalog({ category: activeCategory, sort: 'rating' })}
            className={compactItemClass(isTopRated)}
            title="Top Rated"
          >
            <Star className="h-5 w-5" />
            <span>Top Rated</span>
          </button>
          <button
            type="button"
            onClick={onOpenSaved}
            className={compactItemClass(false)}
            title="Saved Items"
          >
            <Bookmark className="h-5 w-5" />
            <span>Saved</span>
          </button>
          <button
            type="button"
            onClick={() => goToRoute('/purchases')}
            className={compactItemClass(currentPath === '/purchases')}
            title="My Library"
          >
            <KeyRound className="h-5 w-5" />
            <span>Library</span>
          </button>
          <button
            type="button"
            onClick={() => goToRoute('/vendor')}
            className={compactItemClass(currentPath === '/vendor')}
            title="Vendor Portal"
          >
            <Store className="h-5 w-5" />
            <span>Vendor</span>
          </button>
        </div>
      </aside>
    </>
  );
};
