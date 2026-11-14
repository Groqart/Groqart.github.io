import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Order, UserRole, CryptoCurrency } from '../types/marketplace';
import {
  getLocalProducts,
  saveLocalProducts,
  deleteLocalProduct,
  getLocalOrders,
  addLocalOrder,
  updateLocalOrderStatus,
} from '../utils/localStore';
import {
  calculateCryptoAmount,
  generateSandboxAddress,
  formatCryptoPaymentURI,
  SUPPORTED_CRYPTO,
} from '../utils/oxapayLogic';

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
  const [products, setProducts] = useState<Product[]>([]);
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
      const res = await fetch('/api/products');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setProducts(data.products);
        saveLocalProducts(data.products);
        return;
      }
    } catch (err) {
      console.warn('Backend API unreachable, using local storage products', err);
    }
    setProducts(getLocalProducts());
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders/my');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setOrders(data.orders);
        return;
      }
    } catch (err) {
      console.warn('Backend API unreachable, using local orders cache', err);
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

  const initiateBuy = async (product: Product, cryptoCurrency: CryptoCurrency = 'USDT') => {
    try {
      let createdOrder: Order | null = null;
      try {
        const res = await fetch('/api/oxapay/create-invoice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: product.id,
            buyerEmail: 'demo.buyer@nexusbyte.io',
            buyerName: 'Demo Buyer',
            cryptoCurrency,
          }),
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.ok && contentType.includes('application/json')) {
          const data = await res.json();
          createdOrder = data.order;
        }
      } catch (err) {
        console.warn('API invoice creation unavailable, generating client sandbox invoice', err);
      }

      if (!createdOrder) {
        const cur = (cryptoCurrency.toUpperCase() in SUPPORTED_CRYPTO
          ? cryptoCurrency.toUpperCase()
          : 'USDT') as CryptoCurrency;
        const trackId = `TRK_CF_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const cryptoAmount = calculateCryptoAmount(product.priceUSD, cur);
        const depositAddress = generateSandboxAddress(cur);
        const network = SUPPORTED_CRYPTO[cur]?.network || 'TRC20';
        const expiresAt = Date.now() + 15 * 60 * 1000;
        const qrCodeData = formatCryptoPaymentURI(cur, depositAddress, cryptoAmount);

        createdOrder = {
          id: `ord_local_${Date.now()}`,
          buyerEmail: 'demo.buyer@nexusbyte.io',
          buyerName: 'Demo Buyer',
          productId: product.id,
          productTitle: product.title,
          productCategory: product.category,
          productVersion: product.version,
          deliveryType: product.deliveryType,
          priceUSD: product.priceUSD,
          status: 'pending',
          oxaInvoice: {
            trackId,
            address: depositAddress,
            cryptoCurrency: cur,
            network,
            cryptoAmount,
            qrCodeData,
            expiresAt,
            payLink: `https://oxapay.com/pay/${trackId}`,
            isSandbox: true,
          },
          createdAt: new Date().toISOString(),
        };
        addLocalOrder(createdOrder);
        setOrders((prev) => [createdOrder!, ...prev]);
      }

      setActiveInvoiceOrder(createdOrder);
      setIsCartOpen(false);
    } catch (err) {
      console.error('Buy error', err);
      showToast('Checkout could not be initialized.');
    }
  };

  const handlePaymentSuccess = (updatedOrder: Order) => {
    updateLocalOrderStatus(updatedOrder.id, 'paid');
    fetchOrders();
    fetchProducts();
    showToast(`Order for "${updatedOrder.productTitle}" confirmed! Assets ready.`);
  };

  const addProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    showToast(`Product "${newProd.title}" published!`);
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
