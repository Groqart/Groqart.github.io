import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router';
import { ShoppingBag, ShieldCheck, Cpu, Store, KeyRound, Terminal } from 'lucide-react';
import { UserRole } from '../types/marketplace';

interface NavbarProps {
  cartCount: number;
  openCart: () => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  purchasesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  cartCount,
  openCart,
  currentRole,
  setCurrentRole,
  purchasesCount,
}) => {
  const navigate = useNavigate();

  const getNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition ${
      isActive
        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
    }`;

  const getMobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium transition ${
      isActive
        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
        : 'text-slate-400 hover:text-white'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
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
                <span className="text-lg font-bold tracking-tight text-white">Nexus<span className="text-cyan-400">Byte</span></span>
                <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-800/60">
                  RR v8.5
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Digital Goods & Crypto Escrow</p>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1 text-sm shadow-inner">
          <NavLink to="/" end className={getNavLinkClass}>
            <Store className="h-4 w-4" />
            Marketplace
          </NavLink>

          <NavLink to="/purchases" className={getNavLinkClass}>
            <KeyRound className="h-4 w-4" />
            My Library
            {purchasesCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-slate-950">
                {purchasesCount}
              </span>
            )}
          </NavLink>

          <NavLink to="/vendor" className={getNavLinkClass}>
            <Terminal className="h-4 w-4" />
            Vendor Portal
          </NavLink>

          <NavLink to="/gateway" className={getNavLinkClass}>
            <ShieldCheck className="h-4 w-4" />
            NOWPayments Gateway
          </NavLink>
        </nav>

        {/* Right side: Role selector & Cart */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs">
            <span className="text-slate-400">View as:</span>
            <select
              value={currentRole}
              onChange={(e) => {
                const r = e.target.value as UserRole;
                setCurrentRole(r);
                if (r === 'vendor') navigate('/vendor');
              }}
              aria-label="Switch User Mode"
              className="bg-transparent font-semibold text-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value="buyer" className="bg-slate-900 text-slate-200">Buyer Mode</option>
              <option value="vendor" className="bg-slate-900 text-slate-200">Vendor Mode</option>
            </select>
          </div>

          <button
            onClick={openCart}
            aria-label="Shopping Cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="flex md:hidden border-t border-slate-800/80 px-2 py-2 overflow-x-auto gap-1 text-xs">
        <NavLink to="/" end className={getMobileNavLinkClass}>
          <Store className="h-3.5 w-3.5" />
          Marketplace
        </NavLink>
        <NavLink to="/purchases" className={getMobileNavLinkClass}>
          <KeyRound className="h-3.5 w-3.5" />
          Library ({purchasesCount})
        </NavLink>
        <NavLink to="/vendor" className={getMobileNavLinkClass}>
          <Terminal className="h-3.5 w-3.5" />
          Vendor
        </NavLink>
        <NavLink to="/gateway" className={getMobileNavLinkClass}>
          <ShieldCheck className="h-3.5 w-3.5" />
          NOWPayments
        </NavLink>
      </div>
    </header>
  );
};
