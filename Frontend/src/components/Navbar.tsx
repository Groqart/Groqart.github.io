import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router';
import {
  Menu,
  Search,
  X,
  ShoppingBag,
  User,
  KeyRound,
  Store,
  Shield,
  LogIn,
  LogOut,
  Monitor,
  Sun,
  Moon,
  Plus,
  ExternalLink,
} from 'lucide-react';
import type { AuthUser, UserRole } from '../types/marketplace';
import type { ThemePreference } from '../utils/catalogLogic';
import { getCreatorInitials } from '../utils/catalogLogic';

interface NavbarProps {
  cartCount: number;
  openCart: () => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  themePreference: ThemePreference;
  onChangeTheme: (pref: ThemePreference) => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  purchasesCount: number;
  user: AuthUser | null;
  vendorStoreSlug?: string | null;
  onOpenCreateStore: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  openCart,
  isSidebarOpen,
  onToggleSidebar,
  themePreference,
  onChangeTheme,
  currentRole,
  setCurrentRole,
  purchasesCount,
  user,
  vendorStoreSlug,
  onOpenCreateStore,
  onLogout,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';

  const urlQuery = location.pathname === '/' ? searchParams.get('q') || '' : '';
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    if (!isProfileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isProfileOpen]);

  const applySearch = (value: string) => {
    const trimmed = value.trim();
    if (location.pathname === '/') {
      const next = new URLSearchParams(searchParams);
      if (trimmed) {
        next.set('q', trimmed);
      } else {
        next.delete('q');
      }
      setSearchParams(next);
    } else {
      navigate(trimmed ? `/?q=${encodeURIComponent(trimmed)}` : '/');
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchInput(val);
    if (location.pathname === '/') {
      const next = new URLSearchParams(searchParams);
      if (val.trim()) {
        next.set('q', val);
      } else {
        next.delete('q');
      }
      setSearchParams(next, { replace: true });
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applySearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    if (location.pathname === '/') {
      const next = new URLSearchParams(searchParams);
      next.delete('q');
      setSearchParams(next, { replace: true });
    }
  };

  const userInitials = user
    ? getCreatorInitials(user.displayName || user.email.split('@')[0])
    : null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800/90 dark:bg-[#0D1320]/95">
      <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 md:h-16 md:gap-6 md:px-5 md:py-0">
        {/* Left Zone: Drawer Toggle + ZenxusBay Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle navigation sidebar"
            aria-expanded={isSidebarOpen}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-cyan-500 dark:text-slate-200 dark:hover:bg-slate-800/80 transition cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/"
            onClick={() => {
              if (location.pathname === '/') {
                setSearchInput('');
              }
            }}
            aria-label="ZenxusBay Home"
            className="flex items-center gap-2.5 whitespace-nowrap shrink-0 rounded-lg py-1 pr-1 focus-visible:outline-2 focus-visible:outline-cyan-500"
          >
            <img
              src="/assets/aistudio/zenxusbay-logo-light_e6cff08a.svg"
              alt="ZenxusBay"
              className="h-8 w-8 shrink-0 dark:hidden"
              referrerPolicy="no-referrer"
            />
            <img
              src="/assets/aistudio/zenxusbay-logo-dark_dc96d39b.svg"
              alt="ZenxusBay"
              className="hidden h-8 w-8 shrink-0 dark:block"
              referrerPolicy="no-referrer"
            />
            <span
              translate="no"
              className="notranslate font-display text-[19px] sm:text-[21px] tracking-tight leading-none whitespace-nowrap"
            >
              <span className="font-extrabold text-[#0B2242] dark:text-white">ZENXUS</span>
              <span className="font-medium text-[#1A8FD6] dark:text-[#45D4EC]">BAY</span>
            </span>
          </Link>
        </div>

        {/* Center Zone: Prominent Search Bar (row 2 on mobile, centered on md+) */}
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="Catalog search"
          className="order-3 w-full min-w-0 md:order-none md:w-auto md:flex-1 md:max-w-xl md:mx-auto"
        >
          <div className="flex h-10 w-full items-center overflow-hidden rounded-full border border-slate-300 bg-slate-50 focus-within:border-cyan-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-500/20 dark:border-slate-700/80 dark:bg-[#090D16] dark:focus-within:border-cyan-400 dark:focus-within:bg-[#0B111E] transition">
            <div className="relative flex flex-1 min-w-0 items-center">
              <input
                type="search"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Search scripts, SaaS starters, bots, 3D assets..."
                aria-label="Search digital products"
                className="w-full min-w-0 bg-transparent pl-4 pr-8 py-2 text-sm text-slate-900 placeholder-slate-500 focus:outline-none dark:text-slate-100 dark:placeholder-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute right-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              aria-label="Search"
              className="flex h-full items-center justify-center border-l border-slate-300 bg-slate-100 px-4 text-slate-700 hover:bg-slate-200 hover:text-slate-950 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition cursor-pointer shrink-0"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>

        {/* Right Zone: + Store + Saved / Cart + User Profile Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (vendorStoreSlug) {
                setCurrentRole('vendor');
                navigate('/vendor?tab=builder');
              } else {
                onOpenCreateStore();
              }
            }}
            aria-label={vendorStoreSlug ? 'Open Storefront Builder' : 'Open Store Setup Wizard'}
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#0EA5E9] px-3 text-xs font-bold text-white shadow-sm hover:bg-[#0284C7] focus-visible:outline-2 focus-visible:outline-cyan-500 transition cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5 shrink-0" />
            <span>Store</span>
          </button>

          <button
            type="button"
            onClick={openCart}
            aria-label="Saved Items"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-cyan-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white transition cursor-pointer"
          >
            <ShoppingBag className="h-4.5 w-4.5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cyan-500 px-1 text-[11px] font-bold text-white tabular-nums">
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile Icon & Dropdown Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              aria-label="User profile menu"
              aria-expanded={isProfileOpen}
              aria-haspopup="menu"
              className={`flex h-10 w-10 items-center justify-center rounded-full border transition focus-visible:outline-2 focus-visible:outline-cyan-500 cursor-pointer ${
                user
                  ? 'border-cyan-500/50 bg-cyan-600 text-white font-bold text-xs shadow-sm'
                  : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {userInitials ? <span>{userInitials}</span> : <User className="h-5 w-5" />}
            </button>

            {isProfileOpen && (
              <div
                role="menu"
                aria-label="Account options"
                className="absolute right-0 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-[#111827] z-50"
              >
                {/* Identity Header */}
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                  {user ? (
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {user.displayName || user.email}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {user.email} · <span className="capitalize">{currentRole}</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Guest Account
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Sign in to sync purchases &amp; sell assets
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary Account Links */}
                <div className="py-1.5 space-y-0.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/purchases');
                    }}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <KeyRound className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span>My Library</span>
                    </span>
                    {purchasesCount > 0 && (
                      <span className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                        {purchasesCount}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setCurrentRole('vendor');
                      navigate('/vendor');
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <Store className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span>Vendor Portal</span>
                  </button>

                  {vendorStoreSlug && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate(`/@${vendorStoreSlug}`);
                      }}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5">
                        <ExternalLink className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                        <span>My Storefront</span>
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">/@{vendorStoreSlug}</span>
                    </button>
                  )}

                  {isAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setCurrentRole('admin');
                        navigate('/admin');
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                      <Shield className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Admin Console</span>
                    </button>
                  )}

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setIsProfileOpen(false);
                      openCart();
                    }}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <ShoppingBag className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      <span>Saved Items</span>
                    </span>
                    {cartCount > 0 && (
                      <span className="text-xs font-mono font-semibold text-cyan-600 dark:text-cyan-400 tabular-nums">
                        {cartCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* Theme Selector (defaults to Browser System) */}
                <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2.5">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    Appearance
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => onChangeTheme('system')}
                      className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition cursor-pointer ${
                        themePreference === 'system'
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Browser</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeTheme('light')}
                      className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition cursor-pointer ${
                        themePreference === 'light'
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Sun className="h-3.5 w-3.5" />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onChangeTheme('dark')}
                      className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium transition cursor-pointer ${
                        themePreference === 'dark'
                          ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                    >
                      <Moon className="h-3.5 w-3.5" />
                      <span>Dark</span>
                    </button>
                  </div>
                </div>

                {/* Sign In / Sign Out */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-1.5">
                  {user ? (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/purchases');
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-cyan-700 hover:bg-cyan-50 dark:text-cyan-300 dark:hover:bg-cyan-950/40 transition cursor-pointer"
                    >
                      <LogIn className="h-4 w-4" />
                      <span>Sign In with Magic Link</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
