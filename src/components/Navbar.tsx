import React from 'react';
import { ShoppingBag, ShieldCheck, Cpu, Store, KeyRound, Terminal, Sparkles } from 'lucide-react';
import { UserRole } from '../types/marketplace';

interface NavbarProps {
  activeTab: 'marketplace' | 'purchases' | 'vendor' | 'oxapay';
  setActiveTab: (tab: 'marketplace' | 'purchases' | 'vendor' | 'oxapay') => void;
  cartCount: number;
  openCart: () => void;
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  purchasesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
  openCart,
  currentRole,
  setCurrentRole,
  purchasesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('marketplace')}
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
                  OXAPAY V2
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Digital Goods & Crypto Escrow</p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 p-1 text-sm shadow-inner">
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition ${
              activeTab === 'marketplace'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Store className="h-4 w-4" />
            Marketplace
          </button>

          <button
            onClick={() => setActiveTab('purchases')}
            className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition ${
              activeTab === 'purchases'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            My Library
            {purchasesCount > 0 && (
              <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-400 px-1 text-[10px] font-bold text-slate-950">
                {purchasesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('vendor')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition ${
              activeTab === 'vendor'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="h-4 w-4" />
            Vendor Portal
          </button>

          <button
            onClick={() => setActiveTab('oxapay')}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 font-medium transition ${
              activeTab === 'oxapay'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            OxaPay Gateway
          </button>
        </nav>

        {/* Right side: Role selector, Cart & Simulator status */}
        <div className="flex items-center gap-3">
          {/* Quick role selector */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs">
            <span className="text-slate-400">View as:</span>
            <select
              value={currentRole}
              onChange={(e) => {
                const r = e.target.value as UserRole;
                setCurrentRole(r);
                if (r === 'vendor') setActiveTab('vendor');
              }}
              aria-label="Switch User Mode"
              className="bg-transparent font-semibold text-cyan-400 focus:outline-none cursor-pointer"
            >
              <option value="buyer" className="bg-slate-900 text-slate-200">Buyer Mode</option>
              <option value="vendor" className="bg-slate-900 text-slate-200">Vendor Mode</option>
            </select>
          </div>

          {/* Cart button */}
          <button
            onClick={openCart}
            aria-label="Shopping Cart"
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white transition"
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

      {/* Mobile navigation tab strip */}
      <div className="flex md:hidden border-t border-slate-800/80 px-2 py-2 overflow-x-auto gap-1 text-xs">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
            activeTab === 'marketplace' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
          }`}
        >
          <Store className="h-3.5 w-3.5" />
          Marketplace
        </button>
        <button
          onClick={() => setActiveTab('purchases')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
            activeTab === 'purchases' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
          }`}
        >
          <KeyRound className="h-3.5 w-3.5" />
          Library ({purchasesCount})
        </button>
        <button
          onClick={() => setActiveTab('vendor')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
            activeTab === 'vendor' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
          }`}
        >
          <Terminal className="h-3.5 w-3.5" />
          Vendor
        </button>
        <button
          onClick={() => setActiveTab('oxapay')}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
            activeTab === 'oxapay' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          OxaPay
        </button>
      </div>
    </header>
  );
};
