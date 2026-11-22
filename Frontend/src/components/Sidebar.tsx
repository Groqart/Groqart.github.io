import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
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
  Plus,
  ExternalLink,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { ProductCategory } from '../types/marketplace';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  onOpenSaved: () => void;
  onOpenCreateStore: () => void;
  vendorStoreSlug?: string | null;
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
  onOpenCreateStore,
  vendorStoreSlug,
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
        className={`fixed inset-y-0 left-0 z-50 h-screen shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800/90 bg-white dark:bg-[#0D1320] transition-transform duration-200 ease-out lg:sticky lg:top-16 lg:z-40 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${
          isOpen
            ? 'translate-x-0 w-60 overflow-y-auto'
            : '-translate-x-full lg:translate-x-0 lg:w-[74px] overflow-y-auto'
        }`}
      >
        {/* Mobile drawer header with brand logo + site name */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 lg:hidden shrink-0">
          <Link
            to="/"
            onClick={onCloseMobile}
            aria-label="ZenxusBay Home"
            className="flex items-center gap-2 whitespace-nowrap shrink-0 rounded-lg py-0.5 focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <img
              src="/assets/aistudio/zenxusbay-logo-light_e6cff08a.svg"
              alt="ZenxusBay"
              className="h-7 w-7 shrink-0 dark:hidden"
              referrerPolicy="no-referrer"
            />
            <img
              src="/assets/aistudio/zenxusbay-logo-dark_dc96d39b.svg"
              alt="ZenxusBay"
              className="hidden h-7 w-7 shrink-0 dark:block"
              referrerPolicy="no-referrer"
            />
            <span
              translate="no"
              className="notranslate font-display text-[17px] tracking-tight leading-none whitespace-nowrap"
            >
              <span className="font-extrabold text-[#0B2242] dark:text-white">ZENXUS</span>
              <span className="font-medium text-[#1A8FD6] dark:text-[#45D4EC]">BAY</span>
            </span>
          </Link>
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
        <div className={`p-3 flex-1 flex flex-col justify-between gap-4 ${isOpen ? 'flex' : 'hidden'}`}>
          <div className="space-y-4">
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
            <button
              type="button"
              onClick={() => {
                onOpenCreateStore();
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  onCloseMobile();
                }
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-cyan-700 bg-cyan-50/90 hover:bg-cyan-100 border border-cyan-200/80 dark:text-cyan-300 dark:bg-cyan-500/10 dark:border-cyan-500/25 dark:hover:bg-cyan-500/20 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span>Create Store</span>
            </button>
            {vendorStoreSlug && (
              <button
                type="button"
                onClick={() => goToRoute(`/@${vendorStoreSlug}`)}
                className={navItemClass(currentPath === `/@${vendorStoreSlug}`)}
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate">@{vendorStoreSlug}</span>
              </button>
            )}
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

          {/* Bottom Legal Links (Expanded Menu - Mobile & Desktop) */}
          <div className="mt-auto pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1">
            <Link
              to="/privacy-policy"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  onCloseMobile();
                }
              }}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                currentPath === '/privacy-policy'
                  ? 'bg-cyan-50 text-cyan-800 font-semibold dark:bg-cyan-500/15 dark:text-cyan-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Privacy Policy</span>
            </Link>
            <Link
              to="/terms-of-service"
              onClick={() => {
                if (typeof window !== 'undefined' && window.innerWidth < 1024) {
                  onCloseMobile();
                }
              }}
              className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                currentPath === '/terms-of-service'
                  ? 'bg-cyan-50 text-cyan-800 font-semibold dark:bg-cyan-500/15 dark:text-cyan-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>Terms of Service</span>
            </Link>
          </div>
        </div>

        {/* Desktop Compact Mini-Rail View (when collapsed) */}
        <div className={`hidden ${!isOpen ? 'lg:flex' : ''} flex-1 flex-col justify-between p-1.5 pt-3`}>
          <div className="flex flex-col gap-1.5">
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
          <button
            type="button"
            onClick={onOpenCreateStore}
            className="w-full flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold text-cyan-700 bg-cyan-50 hover:bg-cyan-100 dark:text-cyan-300 dark:bg-cyan-500/15 dark:hover:bg-cyan-500/25 transition cursor-pointer"
            title="+ Create Store"
          >
            <Plus className="h-4 w-4" />
            <span>+ Store</span>
          </button>
          </div>

          {/* Bottom Legal Links (Desktop Collapsed Mini-Rail) */}
          <div className="mt-auto pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1">
            <Link
              to="/privacy-policy"
              title="Privacy Policy"
              className={`w-full flex flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[9px] leading-tight text-center font-medium transition-colors ${
                currentPath === '/privacy-policy'
                  ? 'bg-cyan-50 text-cyan-800 font-semibold dark:bg-cyan-500/15 dark:text-cyan-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
              }`}
            >
              <span>Privacy Policy</span>
            </Link>
            <Link
              to="/terms-of-service"
              title="Terms of Service"
              className={`w-full flex flex-col items-center justify-center rounded-xl px-1 py-1.5 text-[9px] leading-tight text-center font-medium transition-colors ${
                currentPath === '/terms-of-service'
                  ? 'bg-cyan-50 text-cyan-800 font-semibold dark:bg-cyan-500/15 dark:text-cyan-300'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-white'
              }`}
            >
              <span>Terms of Service</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};
