import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type {
  AuthUser,
  CryptoCurrency,
  Order,
  Product,
  SellerProfile,
  UserRole,
} from '../types/marketplace';

const API_BASE = import.meta.env.VITE_API_URL || '';
const AUTH_TOKEN_KEY = 'nexusbyte_auth_token';
const BUYER_EMAIL_KEY = 'nexusbyte_buyer_email';

export interface PendingCheckout {
  product: Product;
  cryptoCurrency: CryptoCurrency;
}

interface MarketplaceContextType {
  products: Product[];
  isProductsLoading: boolean;
  orders: Order[];
  cart: Product[];
  isCartOpen: boolean;
  currentRole: UserRole;
  pendingCheckout: PendingCheckout | null;
  toastMessage: string | null;
  authToken: string | null;
  user: AuthUser | null;
  seller: SellerProfile | null;
  isAuthLoading: boolean;
  setIsCartOpen: (open: boolean) => void;
  setCurrentRole: (role: UserRole) => void;
  setPendingCheckout: (checkout: PendingCheckout | null) => void;
  showToast: (msg: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  initiateBuy: (product: Product, cryptoCurrency?: CryptoCurrency) => void;
  createPaymentCheckout: (buyerEmail: string) => Promise<{ ok: boolean; error?: string; invoiceUrl?: string }>;
  requestMagicLink: (
    email: string,
    redirectPath?: string
  ) => Promise<{ ok: boolean; error?: string; devVerifyUrl?: string }>;
  verifyMagicToken: (token: string) => Promise<{ ok: boolean; error?: string }>;
  completeVendorOnboarding: (
    displayName: string,
    walletAddress: string
  ) => Promise<{ ok: boolean; error?: string }>;
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
  const [currentRole, setCurrentRole] = useState<UserRole>('buyer');
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

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
        setOrders([]);
        return;
      }
      const data = await res.json();
      setAuthToken(stored);
      setUser(data.user || null);
      setSeller(data.seller || null);
      if (data.seller) {
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

  const initiateBuy = (product: Product, cryptoCurrency: CryptoCurrency = 'USDT') => {
    if (typeof window === 'undefined') return;
    setIsCartOpen(false);
    setPendingCheckout({ product, cryptoCurrency });
  };

  const createPaymentCheckout = async (buyerEmailInput: string) => {
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

    try {
      const res = await fetch(`${API_BASE}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: pendingCheckout.product.id,
          buyer_email: email,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoice_url) {
        return {
          ok: false,
          error: data.error || 'Failed to initialize NOWPayments checkout',
        };
      }

      setPendingCheckout(null);
      return { ok: true, invoiceUrl: data.invoice_url };
    } catch {
      return { ok: false, error: 'Network error contacting payment gateway' };
    }
  };

  const requestMagicLink = async (emailInput: string, redirectPath = '/purchases') => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return { ok: false, error: 'Valid email address is required' };
    }
    try {
      const res = await fetch(`${API_BASE}/api/auth/request-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirectPath }),
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
      if (data.seller) {
        setCurrentRole('vendor');
      }
      await fetchOrdersWithToken(data.token);
      showToast(`Signed in as ${data.user?.email || 'user'}`);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Network error verifying magic link' };
    }
  };

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

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
    setAuthToken(null);
    setUser(null);
    setSeller(null);
    setOrders([]);
    setCurrentRole('buyer');
    showToast('Signed out');
  };

  const addProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
    fetchProducts();
    showToast(`Product "${newProd.title}" published!`);
  };

  const removeProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Product removed from catalog');
  };

  return (
    <MarketplaceContext.Provider
      value={{
        products,
        isProductsLoading,
        orders,
        cart,
        isCartOpen,
        currentRole,
        pendingCheckout,
        toastMessage,
        authToken,
        user,
        seller,
        isAuthLoading,
        setIsCartOpen,
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
