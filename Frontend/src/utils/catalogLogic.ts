import type { Product, ProductCategory } from '../types/marketplace';

export type CatalogSortOption = 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales';
export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const MARKETPLACE_CATEGORIES: ProductCategory[] = [
  'All',
  'Scripts & Code',
  'SaaS Starters',
  'Bots & Automation',
  '3D & Game Assets',
  'UI Kits & Design',
  'APIs & Microservices',
];

export interface CatalogFilterOptions {
  category?: ProductCategory | string;
  query?: string;
  sortBy?: CatalogSortOption;
  minPrice?: number;
  maxPrice?: number;
}

export function getPriceBounds(products: Product[]): { min: number; max: number } {
  if (!products.length) return { min: 0, max: 300 };
  let min = Infinity;
  let max = 0;
  for (const p of products) {
    if (p.priceUSD < min) min = p.priceUSD;
    if (p.priceUSD > max) max = p.priceUSD;
  }
  return {
    min: Math.max(0, Math.floor(min === Infinity ? 0 : min)),
    max: Math.max(10, Math.ceil(max)),
  };
}

export function filterAndSortProducts(
  products: Product[],
  options: CatalogFilterOptions
): Product[] {
  const category = options.category && options.category !== 'All' ? options.category : null;
  const query = (options.query || '').trim().toLowerCase();
  const sortBy = options.sortBy || 'newest';
  const hasMin = typeof options.minPrice === 'number' && Number.isFinite(options.minPrice);
  const hasMax = typeof options.maxPrice === 'number' && Number.isFinite(options.maxPrice);

  let result = [...products];

  if (category) {
    result = result.filter((p) => p.category === category);
  }

  if (query) {
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.tagline.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.vendorName.toLowerCase().includes(query) ||
        p.tags.some((t) => t.toLowerCase().includes(query))
    );
  }

  if (hasMin) {
    result = result.filter((p) => p.priceUSD >= (options.minPrice as number));
  }

  if (hasMax) {
    result = result.filter((p) => p.priceUSD <= (options.maxPrice as number));
  }

  if (sortBy === 'price_asc') {
    result.sort((a, b) => a.priceUSD - b.priceUSD);
  } else if (sortBy === 'price_desc') {
    result.sort((a, b) => b.priceUSD - a.priceUSD);
  } else if (sortBy === 'rating') {
    result.sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount);
  } else if (sortBy === 'sales') {
    result.sort((a, b) => b.salesCount - a.salesCount);
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  return result;
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean
): ResolvedTheme {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return systemPrefersDark ? 'dark' : 'light';
}

export function getCreatorInitials(name: string): string {
  const parts = String(name || 'ZB')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'ZB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}
