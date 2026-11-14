// Frontend/src/utils/localStore.ts
import { Product, Order, VendorPayout } from '../types/marketplace';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

const PRODUCTS_KEY = 'nexusbyte_products_cache';
const ORDERS_KEY = 'nexusbyte_orders_cache';
const PAYOUTS_KEY = 'nexusbyte_payouts_cache';

const isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export function getLocalProducts(): Product[] {
  if (!isBrowser) return INITIAL_PRODUCTS;
  try {
    const raw = localStorage.getItem(PRODUCTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read local products', e);
  }
  saveLocalProducts(INITIAL_PRODUCTS);
  return INITIAL_PRODUCTS;
}

export function saveLocalProducts(products: Product[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {
    console.error('Failed to save local products', e);
  }
}

export function addLocalProduct(product: Product): Product[] {
  const current = getLocalProducts();
  const updated = [product, ...current.filter((p) => p.id !== product.id)];
  saveLocalProducts(updated);
  return updated;
}

export function deleteLocalProduct(productId: string): Product[] {
  const current = getLocalProducts();
  const updated = current.filter((p) => p.id !== productId);
  saveLocalProducts(updated);
  return updated;
}

export function getLocalOrders(): Order[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to read local orders', e);
  }
  return [];
}

export function saveLocalOrders(orders: Order[]): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error('Failed to save local orders', e);
  }
}

export function addLocalOrder(order: Order): Order[] {
  const current = getLocalOrders();
  const updated = [order, ...current.filter((o) => o.id !== order.id)];
  saveLocalOrders(updated);
  return updated;
}

export function updateLocalOrderStatus(orderId: string, status: Order['status']): Order[] {
  const current = getLocalOrders();
  const updated = current.map((o) => {
    if (o.id === orderId) {
      return {
        ...o,
        status,
        paidAt: status === 'paid' ? new Date().toISOString() : o.paidAt,
        secureDelivery: status === 'paid' ? {
          downloadToken: `dl_token_${Math.random().toString(36).substring(2, 10)}`,
          downloadExpiresAt: Date.now() + 24 * 3600 * 1000,
          downloadCount: 0,
          maxDownloads: 5,
          licenseKey: `NXBY-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-LIVE`,
          fileName: 'digital-product.zip',
        } : o.secureDelivery,
      };
    }
    return o;
  });
  saveLocalOrders(updated);
  return updated;
}

export function getLocalPayouts(): VendorPayout[] {
  if (!isBrowser) return [];
  try {
    const raw = localStorage.getItem(PAYOUTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read local payouts', e);
  }
  return [];
}

export function saveLocalPayout(payout: VendorPayout): VendorPayout[] {
  const current = getLocalPayouts();
  const updated = [payout, ...current];
  if (!isBrowser) return updated;
  try {
    localStorage.setItem(PAYOUTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save local payout', e);
  }
  return updated;
}
