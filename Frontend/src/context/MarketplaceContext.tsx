import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type {
  AuthUser,
  CryptoCurrency,
  Order,
  PaymentGatewayId,
  Product,
  ProductLicenseTier,
  SellerProfile,
  StoreRecord,
  StoreTemplateId,
  StoreThemeConfig,
  UserRole,
} from '../types/marketplace';
import { getPayCurrencyTicker } from '../utils/nowpaymentsLogic';
import {
  resolveTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '../utils/catalogLogic';
import { normalizeLoginIdentifier } from '../utils/storefrontLogic';
import { API_BASE } from '../utils/apiBase';

const AUTH_TOKEN_KEY = 'nexusbyte_auth_token';
const BUYER_EMAIL_KEY = 'nexusbyte_buyer_email';
const THEME_STORAGE_KEY = 'zenxusbay_theme';

export interface PendingCheckout {
  product: Product;
  cryptoCurrency: CryptoCurrency;
  selectedTier?: ProductLicenseTier;
  storeContext?: {
    storeName: string;
    storeSlug: string;
    gateway: PaymentGatewayId;
    isStandalone: boolean;
  };
}

interface MarketplaceContextType {
  products: Product[];
  isProductsLoading: boolean;
  orders: Order[];
  cart: Product[];
  isCartOpen: boolean;
  isSidebarOpen: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  currentRole: UserRole;
  pendingCheckout: PendingCheckout | null;
  toastMessage: string | null;
  authToken: string | null;
  user: AuthUser | null;
  seller: SellerProfile | null;
  vendorStore: StoreRecord | null;
  isCreateStoreOpen: boolean;
  isAuthLoading: boolean;
  setIsCartOpen: (open: boolean) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setIsCreateStoreOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setThemePreference: (pref: ThemePreference) => void;
  setCurrentRole: (role: UserRole) => void;
  setPendingCheckout: (checkout: PendingCheckout | null) => void;
  showToast: (msg: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  initiateBuy: (
    product: Product,
    cryptoCurrency?: CryptoCurrency,
    options?: {
      selectedTier?: ProductLicenseTier;
      storeContext?: PendingCheckout['storeContext'];
    }
  ) => void;
  createPaymentCheckout: (
    buyerEmail: string,
    overrideCurrency?: CryptoCurrency
  ) => Promise<{ ok: boolean; error?: string; invoiceUrl?: string }>;
  requestMagicLink: (
    email: string,
    redirectPath?: string
  ) => Promise<{ ok: boolean; error?: string; devVerifyUrl?: string }>;
  verifyMagicToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  completeVendorOnboarding: (
    displayName: string,
    walletAddress: string
  ) => Promise<{ ok: boolean; error?: string }>;
  createStore: (input: {
    name: string;
    slug: string;
    template: StoreTemplateId;
    accentColor?: string;
    walletAddress?: string;
    gateway?: PaymentGatewayId;
    apiKey?: string;
  }) => Promise<{ ok: boolean; error?: string; store?: StoreRecord }>;
  updateVendorStore: (patch: {
    name?: string;
    isPublicInFeed?: boolean;
    customDomain?: string | null;
    themeConfig?: StoreThemeConfig;
    gateway?: PaymentGatewayId;
    walletAddress?: string;
    apiKey?: string;
    preferredCurrency?: 'USDT' | 'BTC' | 'ETH' | 'SOL' | 'TON';
  }) => Promise<{ ok: boolean; error?: string; store?: StoreRecord }>;
  verifyStoreDns: () => Promise<{ ok: boolean; error?: string; store?: StoreRecord }>;
  fetchVendorStore: () => Promise<void>;
  logout: () => void;
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  fetchOrders: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [systemPrefersDark, setSystemPrefersDark] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('buyer');
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [vendorStore, setVendorStore] = useState<StoreRecord | null>(null);
  const [isCreateStoreOpen, setIsCreateStoreOpen] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system') {
      setThemePreferenceState(storedTheme);
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemPrefersDark(mq.matches);
    const handleChange = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches);
    mq.addEventListener('change', handleChange);

    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme = resolveTheme(themePreference, systemPrefersDark);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setThemePreference = useCallback((pref: ThemePreference) => {
    setThemePreferenceState(pref);
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setIsProductsLoading(true);
      const res = await fetch(`${API_BASE}/api/products`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data.products)) {
          setProducts(data.products);
        }
      }
    } catch {
      // keep existing state on transient network error
    } finally {
      setIsProductsLoading(false);
    }
  }, []);

  const fetchOrdersWithToken = useCallback(async (token: string | null) => {
    if (!token) {
      setOrders([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        setOrders([]);
        return;
      }
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      }
    } catch {
      // ignore transient error
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!stored) {
      setAuthToken(null);
      setUser(null);
      setSeller(null);
      setVendorStore(null);
      setOrders([]);
      setIsAuthLoading(false);
      return;
    }

    try {
      setIsAuthLoading(true);
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${stored}` },
      });
      if (!res.ok) {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setAuthToken(null);
        setUser(null);
        setSeller(null);
        setVendorStore(null);
        setOrders([]);
        return;
      }
      const data = await res.json();
      setAuthToken(stored);
      setUser(data.user || null);
      setSeller(data.seller || null);
      setVendorStore(data.store || null);
      if (data.user?.role === 'admin') {
        setCurrentRole('admin');
      } else if (data.seller) {
        setCurrentRole('vendor');
      }
      await fetchOrdersWithToken(stored);
    } catch {
      // keep token if offline
    } finally {
      setIsAuthLoading(false);
    }
  }, [fetchOrdersWithToken]);

  useEffect(() => {
    fetchProducts();
    refreshAuth();
  }, [fetchProducts, refreshAuth]);

  const fetchOrders = useCallback(async () => {
    await fetchOrdersWithToken(authToken);
  }, [authToken, fetchOrdersWithToken]);

  const addToCart = (product: Product) => {
    if (!cart.some((item) => item.id === product.id)) {
      setCart((prev) => [...prev, product]);
      showToast(`Saved "${product.title}" for quick checkout`);
    } else {
      showToast('Product is already in your saved list');
    }
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const initiateBuy = (
    product: Product,
    cryptoCurrency: CryptoCurrency = 'USDT',
    options?: {
      selectedTier?: ProductLicenseTier;
      storeContext?: PendingCheckout['storeContext'];
    }
  ) => {
    if (typeof window === 'undefined') return;
    setIsCartOpen(false);
    setPendingCheckout({
      product,
      cryptoCurrency,
      selectedTier: options?.selectedTier,
      storeContext: options?.storeContext,
    });
  };

  const createPaymentCheckout = async (
    buyerEmailInput: string,
    overrideCurrency?: CryptoCurrency
  ) => {
    if (!pendingCheckout) {
      return { ok: false, error: 'No product selected for checkout' };
    }
    const email = buyerEmailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { ok: false, error: 'Please enter a valid email address' };
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(BUYER_EMAIL_KEY, email);
    }

    const chosenCurrency = overrideCurrency || pendingCheckout.cryptoCurrency;
    const payCurrency = getPayCurrencyTicker(chosenCurrency);

    try {
      const res = await fetch(`${API_BASE}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: pendingCheckout.product.id,
          buyer_email: email,
          pay_currency: payCurrency,
          tier_id: pendingCheckout.selectedTier?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoice_url) {
        return {
          ok: false,
          error: data.error || 'Failed to initialize crypto checkout',
        };
      }

      setPendingCheckout(null);
      return { ok: true, invoiceUrl: data.invoice_url };
    } catch {
      return { ok: false, error: 'Network error contacting payment gateway' };
    }
  };

  const requestMagicLink = async (emailInput: string, redirectPath = '/purchases') => {
    const normalized = normalizeLoginIdentifier(emailInput);
    if (!normalized.valid) {
      return { ok: false, error: 'Valid email address (or "admin") is required' };
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/request-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized.email, redirectPath }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Failed to send magic link' };
      }
      return { ok: true, devVerifyUrl: data.devVerifyUrl };
    } catch {
      return { ok: false, error: 'Network error sending magic link' };
    }
  };

  const verifyMagicToken = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) {
        return { ok: false, error: data.error || 'Invalid or expired magic link' };
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_TOKEN_KEY, data.token);
      }
      setAuthToken(data.token);
      setUser(data.user || null);
      setSeller(data.seller || null);
      if (data.user?.role === 'admin') {
        setCurrentRole('admin');
      } else if (data.seller) {
        setCurrentRole('vendor');
      }
      const meRes = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        setVendorStore(meData.store || null);
      }
      await fetchOrdersWithToken(data.token);
      showToast(`Signed in as ${data.user?.email || 'user'}`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error verifying magic link' };
    }
  };

  const fetchVendorStore = useCallback(async () => {
    if (!authToken) {
      setVendorStore(null);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/api/vendor/store`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVendorStore(data.store || null);
      }
    } catch {
      // ignore offline
    }
  }, [authToken]);

  const completeVendorOnboarding = async (displayName: string, walletAddress: string) => {
    if (!authToken) {
      return { ok: false, error: 'Please sign in first' };
    }
    try {
      const res = await fetch(`${API_BASE}/api/vendor/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          wallet_address: walletAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || 'Vendor onboarding failed' };
      }
      setUser(data.user || user);
      setSeller(data.seller || null);
      setCurrentRole('vendor');
      showToast('Vendor profile & payout wallet saved!');
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error saving vendor profile' };
    }
  };

  const createStore: MarketplaceContextType['createStore'] = async (input) => {
    if (!authToken) {
      return { ok: false, error: 'Please sign in first' };
    }
    try {
      const res = await fetch(`${API_BASE}/api/stores`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.store) {
        return { ok: false, error: data.error || 'Failed to launch storefront' };
      }
      setVendorStore(data.store);
      if (data.user) setUser(data.user);
      if (data.seller) setSeller(data.seller);
      setCurrentRole('vendor');
      showToast(`Store "${data.store.name}" launched!`);
      return { ok: true, store: data.store };
    } catch {
      return { ok: false, error: 'Network error creating store' };
    }
  };

  const updateVendorStore: MarketplaceContextType['updateVendorStore'] = async (patch) => {
    if (!authToken) {
      return { ok: false, error: 'Please sign in first' };
    }
    try {
      const res = await fetch(`${API_BASE}/api/vendor/store`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok || !data.store) {
        return { ok: false, error: data.error || 'Failed to save store configuration' };
      }
      setVendorStore(data.store);
      await fetchProducts();
      showToast('Storefront configuration saved');
      return { ok: true, store: data.store };
    } catch {
      return { ok: false, error: 'Network error updating store' };
    }
  };

  const verifyStoreDns: MarketplaceContextType['verifyStoreDns'] = async () => {
    if (!authToken) {
      return { ok: false, error: 'Please sign in first' };
    }
    try {
      const res = await fetch(`${API_BASE}/api/vendor/store/verify-dns`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (!res.ok || !data.store) {
        return { ok: false, error: data.error || 'DNS verification failed' };
      }
      setVendorStore(data.store);
      showToast(`DNS verified & SSL active for ${data.store.customDomain}`);
      return { ok: true, store: data.store };
    } catch {
      return { ok: false, error: 'Network error checking DNS' };
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    setAuthToken(null);
    setUser(null);
    setSeller(null);
    setVendorStore(null);
    setOrders([]);
    setCurrentRole('buyer');
    showToast('Signed out');
  };

  const addProduct = (newProd: Product) => {
    if (newProd.status === 'published' || !newProd.status) {
      setProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
      showToast(`Product "${newProd.title}" published!`);
    } else {
      showToast(`Product "${newProd.title}" submitted for moderation review`);
    }
    fetchProducts();
  };

  const removeProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Product removed from active catalog');
  };

  return (
    <MarketplaceContext.Provider
      value={{
        products,
        isProductsLoading,
        orders,
        cart,
        isCartOpen,
        isSidebarOpen,
        themePreference,
        resolvedTheme,
        currentRole,
        pendingCheckout,
        toastMessage,
        authToken,
        user,
        seller,
        vendorStore,
        isCreateStoreOpen,
        isAuthLoading,
        setIsCartOpen,
        setIsSidebarOpen,
        setIsCreateStoreOpen,
        toggleSidebar,
        setThemePreference,
        setCurrentRole,
        setPendingCheckout,
        showToast,
        addToCart,
        removeFromCart,
        clearCart,
        initiateBuy,
        createPaymentCheckout,
        requestMagicLink,
        verifyMagicToken,
        completeVendorOnboarding,
        createStore,
        updateVendorStore,
        verifyStoreDns,
        fetchVendorStore,
        logout,
        addProduct,
        removeProduct,
        fetchOrders,
        fetchProducts,
        refreshAuth,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => {
  const ctx = useContext(MarketplaceContext);
  if (!ctx) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return ctx;
};
