import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Order, UserRole, CryptoCurrency } from '../types/marketplace';
import { INITIAL_PRODUCTS } from '../data/initialProducts';
import {
  getLocalProducts,
  saveLocalProducts,
  deleteLocalProduct,
  getLocalOrders,
} from '../utils/localStore';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface MarketplaceContextType {
  products: Product[];
  orders: Order[];
  cart: Product[];
  isCartOpen: boolean;
  currentRole: UserRole;
  activeInvoiceOrder: Order | null;
  toastMessage: string | null;
  setIsCartOpen: (open: boolean) => void;
  setCurrentRole: (role: UserRole) => void;
  setActiveInvoiceOrder: (order: Order | null) => void;
  showToast: (msg: string) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  initiateBuy: (product: Product, cryptoCurrency?: CryptoCurrency) => Promise<void>;
  handlePaymentSuccess: (order: Order) => void;
  addProduct: (product: Product) => void;
  removeProduct: (id: string) => void;
  fetchOrders: () => Promise<void>;
  fetchProducts: () => Promise<void>;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export const MarketplaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [orders, setOrders] = useState<Order[]>([]);
  const [cart, setCart] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<UserRole>('buyer');
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        // Когда в базе D1 появится хотя бы 1 реальный товар, переключаем витрину на базу D1
        if (Array.isArray(data.products) && data.products.length > 0) {
          setProducts(data.products);
          saveLocalProducts(data.products);
          return;
        }
      }
    } catch {
      // Fallback к кэшу/демо
    }
    setProducts(getLocalProducts());
  };

  const fetchOrders = async () => {
    const email =
      typeof window !== 'undefined'
        ? localStorage.getItem('nexusbyte_buyer_email') || ''
        : '';
    if (!email) {
      setOrders(getLocalOrders());
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/orders/my?email=${encodeURIComponent(email)}`
      );
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setOrders(data.orders || []);
        return;
      }
    } catch {
      // Fallback
    }
    setOrders(getLocalOrders());
  };

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const addToCart = (product: Product) => {
    if (!cart.some((item) => item.id === product.id)) {
      setCart((prev) => [...prev, product]);
      showToast(`Added "${product.title}" to cart`);
    } else {
      showToast('Product already in your cart');
    }
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const initiateBuy = async (product: Product, _cryptoCurrency?: CryptoCurrency) => {
    if (typeof window === 'undefined') return;
    const savedEmail = localStorage.getItem('nexusbyte_buyer_email') || 'buyer@example.com';
    const buyerEmail = window.prompt(
      'Enter your email to receive the download link & license key:',
      savedEmail
    );
    if (!buyerEmail || !buyerEmail.includes('@')) {
      showToast('Valid email is required for digital delivery');
      return;
    }
    localStorage.setItem('nexusbyte_buyer_email', buyerEmail.trim().toLowerCase());

    try {
      const res = await fetch(`${API_BASE}/api/create-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          buyer_email: buyerEmail.trim().toLowerCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.invoice_url) {
        showToast(data.error || 'Product not found in database or gateway error');
        return;
      }
      setIsCartOpen(false);
      window.location.href = data.invoice_url;
    } catch {
      showToast('Network error contacting payment gateway');
    }
  };

  const handlePaymentSuccess = (updatedOrder: Order) => {
    fetchOrders();
    fetchProducts();
    showToast(`Order for "${updatedOrder.productTitle}" confirmed! Assets ready.`);
  };

  const addProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);
    fetchProducts();
    showToast(`Product "${newProd.title}" published to Backblaze B2 & D1!`);
  };

  const removeProduct = (id: string) => {
    deleteLocalProduct(id);
    setProducts((prev) => prev.filter((p) => p.id !== id));
    showToast('Product removed from catalog');
  };

  return (
    <MarketplaceContext.Provider
      value={{
        products,
        orders,
        cart,
        isCartOpen,
        currentRole,
        activeInvoiceOrder,
        toastMessage,
        setIsCartOpen,
        setCurrentRole,
        setActiveInvoiceOrder,
        showToast,
        addToCart,
        removeFromCart,
        initiateBuy,
        handlePaymentSuccess,
        addProduct,
        removeProduct,
        fetchOrders,
        fetchProducts,
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
