import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterAndSortProducts,
  getCreatorInitials,
  getPriceBounds,
  resolveTheme,
} from './catalogLogic';
import {
  clampCatalogPrice,
  normalizePriceInputChange,
  stepCatalogPriceByWheel,
} from './priceInput';
import type { Product } from '../types/marketplace';

const SAMPLE_PRODUCTS: Product[] = [
  {
    id: 'p1',
    title: 'Alpha SaaS Kit',
    slug: 'alpha-saas-kit',
    tagline: 'Next.js boilerplate with billing',
    description: 'Full boilerplate',
    priceUSD: 89,
    category: 'SaaS Starters',
    version: 'v1.2.0',
    deliveryType: 'both',
    licenseType: 'Commercial',
    tags: ['Next.js', 'TypeScript'],
    rating: 4.9,
    reviewsCount: 12,
    salesCount: 40,
    bannerGradient: 'from-cyan-500 to-blue-600',
    vendorId: 'v1',
    vendorName: 'CyberLabs Studio',
    vendorAvatar: '',
    isTrustedVendor: true,
    createdAt: '2026-10-01T00:00:00Z',
    features: ['Feature A'],
    changelog: [],
    downloadContentSample: 'sample',
    fileInfo: { fileName: 'alpha.zip', fileSize: '12 MB', format: 'zip' },
  },
  {
    id: 'p2',
    title: 'Solana Sniper Bot',
    slug: 'solana-sniper-bot',
    tagline: 'Automated trading engine in Rust',
    description: 'Fast bot',
    priceUSD: 149,
    category: 'Bots & Automation',
    version: 'v2.0.0',
    deliveryType: 'file',
    licenseType: 'Personal',
    tags: ['Rust', 'Solana'],
    rating: 4.5,
    reviewsCount: 5,
    salesCount: 95,
    bannerGradient: 'from-indigo-500 to-purple-600',
    vendorId: 'v2',
    vendorName: 'QuantEdge',
    vendorAvatar: '',
    isTrustedVendor: false,
    createdAt: '2026-11-01T00:00:00Z',
    features: ['Feature B'],
    changelog: [],
    downloadContentSample: 'sample',
    fileInfo: { fileName: 'bot.zip', fileSize: '4 MB', format: 'zip' },
  },
  {
    id: 'p3',
    title: 'Minimal UI System',
    slug: 'minimal-ui-system',
    tagline: 'Tailwind components library',
    description: 'Clean UI',
    priceUSD: 39,
    category: 'UI Kits & Design',
    version: 'v1.0.0',
    deliveryType: 'file',
    licenseType: 'Commercial',
    tags: ['Tailwind', 'React'],
    rating: 5.0,
    reviewsCount: 2,
    salesCount: 18,
    bannerGradient: 'from-emerald-500 to-teal-600',
    vendorId: 'v1',
    vendorName: 'CyberLabs Studio',
    vendorAvatar: '',
    isTrustedVendor: true,
    createdAt: '2026-09-15T00:00:00Z',
    features: ['Feature C'],
    changelog: [],
    downloadContentSample: 'sample',
    fileInfo: { fileName: 'ui.zip', fileSize: '8 MB', format: 'zip' },
  },
];

test('filterAndSortProducts filters by category and search query', () => {
  const byCat = filterAndSortProducts(SAMPLE_PRODUCTS, { category: 'Bots & Automation' });
  assert.equal(byCat.length, 1);
  assert.equal(byCat[0].id, 'p2');

  const byTag = filterAndSortProducts(SAMPLE_PRODUCTS, { query: 'rust' });
  assert.equal(byTag.length, 1);
  assert.equal(byTag[0].id, 'p2');

  const byVendor = filterAndSortProducts(SAMPLE_PRODUCTS, { query: 'cyberlabs' });
  assert.equal(byVendor.length, 2);
});

test('filterAndSortProducts sorts by price, rating, sales, and newest', () => {
  const asc = filterAndSortProducts(SAMPLE_PRODUCTS, { sortBy: 'price_asc' });
  assert.deepEqual(asc.map((p) => p.id), ['p3', 'p1', 'p2']);

  const desc = filterAndSortProducts(SAMPLE_PRODUCTS, { sortBy: 'price_desc' });
  assert.deepEqual(desc.map((p) => p.id), ['p2', 'p1', 'p3']);

  const sales = filterAndSortProducts(SAMPLE_PRODUCTS, { sortBy: 'sales' });
  assert.deepEqual(sales.map((p) => p.id), ['p2', 'p1', 'p3']);

  const rating = filterAndSortProducts(SAMPLE_PRODUCTS, { sortBy: 'rating' });
  assert.deepEqual(rating.map((p) => p.id), ['p3', 'p1', 'p2']);

  const newest = filterAndSortProducts(SAMPLE_PRODUCTS, { sortBy: 'newest' });
  assert.deepEqual(newest.map((p) => p.id), ['p2', 'p1', 'p3']);
});

test('filterAndSortProducts filters by minPrice and maxPrice and computes bounds', () => {
  const bounds = getPriceBounds(SAMPLE_PRODUCTS);
  assert.deepEqual(bounds, { min: 39, max: 149 });

  const midOnly = filterAndSortProducts(SAMPLE_PRODUCTS, { minPrice: 50, maxPrice: 120 });
  assert.deepEqual(midOnly.map((p) => p.id), ['p1']);

  const above = filterAndSortProducts(SAMPLE_PRODUCTS, { minPrice: 89, sortBy: 'price_desc' });
  assert.deepEqual(above.map((p) => p.id), ['p2', 'p1']);
});

test('resolveTheme respects browser preference in system mode and overrides in explicit mode', () => {
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
  assert.equal(resolveTheme('dark', false), 'dark');
});

test('getCreatorInitials formats single and multi-word names', () => {
  assert.equal(getCreatorInitials('CyberLabs Studio'), 'CS');
  assert.equal(getCreatorInitials('QuantEdge'), 'QU');
  assert.equal(getCreatorInitials(''), 'ZB');
});

test('catalog price clamping, wheel stepping, and keyboard normalization respect [0..max] and [min..max]', () => {
  assert.equal(clampCatalogPrice(-25, 0, 299), 0);
  assert.equal(clampCatalogPrice(999, 0, 299), 299);
  assert.equal(clampCatalogPrice(20, 50, 299), 50);

  // Wheel up (deltaY < 0) increments, wheel down (deltaY > 0) decrements, clamped to bounds
  assert.equal(stepCatalogPriceByWheel(0, -100, 0, 0, 299), 1);
  assert.equal(stepCatalogPriceByWheel(0, 100, 0, 0, 299), 0);
  assert.equal(stepCatalogPriceByWheel(299, -100, 0, 50, 299), 299);
  assert.equal(stepCatalogPriceByWheel(50, 100, 0, 50, 299), 50);
  assert.equal(stepCatalogPriceByWheel(120, 100, 0, 50, 299), 119);

  // Min input clamps immediately above max and normalizes leading zeros
  assert.deepEqual(normalizePriceInputChange('999', 0, 299, true), {
    valid: true,
    draft: '299',
    committed: 299,
  });
  assert.deepEqual(normalizePriceInputChange('05', 0, 299, true), {
    valid: true,
    draft: '5',
    committed: 5,
  });

  // Max input clamps above product max immediately, but lets user type multi-digit numbers >= min
  assert.deepEqual(normalizePriceInputChange('500', 50, 299, false), {
    valid: true,
    draft: '299',
    committed: 299,
  });
  assert.deepEqual(normalizePriceInputChange('1', 50, 299, false), {
    valid: true,
    draft: '1',
  });
  assert.deepEqual(normalizePriceInputChange('120', 50, 299, false), {
    valid: true,
    draft: '120',
    committed: 120,
  });
});

