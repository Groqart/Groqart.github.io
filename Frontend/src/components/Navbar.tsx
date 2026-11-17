import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router';
import { ShoppingBag, Cpu, Store, KeyRound, Terminal, LogOut, LogIn, Shield } from 'lucide-react';
import type { AuthUser, UserRole } from '../types/marketplace';

interface NavbarProps {
  cartCount: number;
  openCart: () => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  purchasesCount: number;
  user: AuthUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  openCart,
  currentRole,
  setCurrentRole,
  purchasesCount,
  user,
  onLogout,
}) => {
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 whitespace-nowrap shrink-0 rounded-full px-4 py-1.5 font-medium transition ${
      isActive
        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`;

  const getMobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2 py-1.5 font-medium transition ${
      isActive
        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
        : 'text-slate-400 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-left group focus:outline-none"
            aria-label="NexusByte Marketplace Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40 transition">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-slate-950">
                <Cpu className="h-5 w-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold tracking-tight text-white">
                  Nexus<span className="text-cyan-400">Byte</span>
                </span>
                <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-800/60">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Digital Goods &amp; Crypto Escrow</p>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1 text-sm shadow-inner">
          <NavLink to="/" end className={getNavLinkClass}>
            <Store className="h-4 w-4" />
            Marketplace
          </NavLink>

          <NavLink to="/purchases" className={getNavLinkClass}>
            <KeyRound className="h-4 w-4" />
            My Library
            {purchasesCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-slate-950 tabular-nums">
                {purchasesCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/vendor" className={getNavLinkClass}>
            <Terminal className="h-4 w-4" />
            Vendor Portal
          </NavLink>

          {isAdmin && (
            <NavLink to="/admin" className={getNavLinkClass}>
              <Shield className="h-4 w-4" />
              Admin
            </NavLink>
          )}
        </nav>

        {/* Right side: Auth status, Role selector & Saved Items */}
        <div className="flex items-center gap-2.5 shrink-0">
          {user ? (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1.5 text-xs">
              <span className="max-w-[140px] truncate text-slate-200 font-medium" title={user.email}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sign out"
                title="Sign out"
                className="flex items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-400 hover:bg-slate-800 hover:text-rose-300 transition cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/purchases"
              className="hidden sm:flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:border-cyan-500/40 hover:text-cyan-200 transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              <span>Sign In</span>
            </Link>
          )}

          <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs">
            <span className="text-slate-400">Mode:</span>
            <select
              value={currentRole}
              onChange={(e) => {
                const r = e.target.value as UserRole;
                setCurrentRole(r);
                if (r === 'vendor') navigate('/vendor');
                else if (r === 'admin') navigate('/admin');
              }}
              aria-label="Switch User Mode"
              className="bg-transparent font-semibold text-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value="buyer" className="bg-slate-900 text-slate-200">Buyer</option>
              <option value="vendor" className="bg-slate-900 text-slate-200">Vendor</option>
              {isAdmin && (
                <option value="admin" className="bg-slate-900 text-slate-200">Admin</option>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={openCart}
            aria-label="Saved Items"
            className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950 tabular-nums">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden items-center justify-between border-t border-slate-800/80 px-2 py-1.5 overflow-x-auto gap-1 text-[11px]">
        <div className="flex items-center gap-0.5 shrink-0">
          <NavLink to="/" end className={getMobileNavLinkClass}>
            <Store className="h-3.5 w-3.5 shrink-0" />
            Marketplace
          </NavLink>
          <NavLink to="/purchases" className={getMobileNavLinkClass}>
            <KeyRound className="h-3.5 w-3.5 shrink-0" />
            Library{purchasesCount > 0 ? ` (${purchasesCount})` : ''}
          </NavLink>
          <NavLink to="/vendor" className={getMobileNavLinkClass}>
            <Terminal className="h-3.5 w-3.5 shrink-0" />
            Vendor
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={getMobileNavLinkClass}>
              <Shield className="h-3.5 w-3.5 shrink-0" />
              Admin
            </NavLink>
          )}
        </div>
        {user ? (
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2 py-1.5 text-slate-400 hover:text-rose-300"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Sign Out</span>
          </button>
        ) : (
          <Link
            to="/purchases"
            className="flex items-center gap-1 whitespace-nowrap shrink-0 rounded-md px-2 py-1.5 font-semibold text-cyan-300"
          >
            <LogIn className="h-3.5 w-3.5 shrink-0" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
};
