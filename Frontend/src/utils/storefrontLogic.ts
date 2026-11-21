import type {
  StoreSectionConfig,
  StoreTemplateId,
  StoreThemeConfig,
} from '../types/marketplace';

export const MARKETPLACE_DOMAIN = 'nexusbyte.de5.net';

export const RESERVED_STORE_SLUGS = new Set([
  'admin',
  'api',
  'auth',
  'buy',
  'cart',
  'checkout',
  'explore',
  'feed',
  'home',
  'login',
  'marketplace',
  'nexusbyte',
  'pricing',
  'product',
  'products',
  'purchases',
  's',
  'search',
  'settings',
  'shop',
  'shops',
  'store',
  'stores',
  'support',
  'vendor',
  'vendors',
  'www',
  'zenxusbay',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVM_RE = /^0x[a-fA-F0-9]{40}$/;
const TON_RE = /^(EQ|UQ)[A-Za-z0-9_-]{46}$/;
const BTC_RE = /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
const SOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;
const DOMAIN_RE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function normalizeLoginIdentifier(raw: string): {
  valid: boolean;
  email: string;
  isAdminShortcut: boolean;
} {
  const trimmed = String(raw || '').trim().toLowerCase();
  if (trimmed === 'admin') {
    return { valid: true, email: 'admin@nexusbyte.io', isAdminShortcut: true };
  }
  if (EMAIL_RE.test(trimmed)) {
    return {
      valid: true,
      email: trimmed,
      isAdminShortcut: trimmed === 'admin@nexusbyte.io',
    };
  }
  return { valid: false, email: trimmed, isAdminShortcut: false };
}

export function isValidCryptoWallet(raw: string): boolean {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return false;
  if (trimmed.toLowerCase() === '0xadmin') return true;
  return (
    EVM_RE.test(trimmed) ||
    TON_RE.test(trimmed) ||
    BTC_RE.test(trimmed) ||
    SOL_RE.test(trimmed)
  );
}

export function slugifyStoreName(name: string): string {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function isValidStoreSlug(slug: string): boolean {
  const s = String(slug || '').trim().toLowerCase();
  if (!SLUG_RE.test(s)) return false;
  if (RESERVED_STORE_SLUGS.has(s)) return false;
  return true;
}

export function isValidCustomDomain(domain: string): boolean {
  const d = String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
  if (!d) return false;
  if (d === MARKETPLACE_DOMAIN || d.endsWith(`.${MARKETPLACE_DOMAIN}`)) return false;
  if (d === 'localhost' || d.endsWith('.local')) return false;
  return DOMAIN_RE.test(d);
}

export function sanitizeDomainInput(domain: string): string {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '');
}

export interface StoreTemplatePreset {
  id: StoreTemplateId;
  name: string;
  tagline: string;
  accentColor: string;
  defaultTheme: 'light' | 'dark';
  sections: StoreSectionConfig[];
}

export const STORE_TEMPLATE_PRESETS: StoreTemplatePreset[] = [
  {
    id: 'minimal_grid',
    name: 'Minimal Grid',
    tagline: 'Clean product-first grid with compact header and fast checkout.',
    accentColor: '#0EA5E9',
    defaultTheme: 'dark',
    sections: [
      { id: 'hero', label: 'Hero Banner', enabled: false },
      { id: 'featured', label: 'Featured Products', enabled: true },
      { id: 'catalog', label: 'Product Catalog', enabled: true },
      { id: 'about', label: 'About / Docs / FAQ', enabled: true },
      { id: 'socials', label: 'Socials & Contacts', enabled: true },
    ],
  },
  {
    id: 'featured_hero',
    name: 'Featured Hero',
    tagline: 'Full-width hero banner with video/image backdrop and spotlight release.',
    accentColor: '#06B6D4',
    defaultTheme: 'dark',
    sections: [
      { id: 'hero', label: 'Hero Banner', enabled: true },
      { id: 'featured', label: 'Featured Products', enabled: true },
      { id: 'catalog', label: 'Product Catalog', enabled: true },
      { id: 'about', label: 'About / Docs / FAQ', enabled: true },
      { id: 'socials', label: 'Socials & Contacts', enabled: true },
    ],
  },
  {
    id: 'developer_portfolio',
    name: 'Developer Portfolio',
    tagline: 'Documentation-forward storefront ideal for SaaS kits, CLIs & scripts.',
    accentColor: '#10B981',
    defaultTheme: 'light',
    sections: [
      { id: 'hero', label: 'Hero Banner', enabled: true },
      { id: 'about', label: 'About / Docs / FAQ', enabled: true },
      { id: 'featured', label: 'Featured Products', enabled: true },
      { id: 'catalog', label: 'Product Catalog', enabled: true },
      { id: 'socials', label: 'Socials & Contacts', enabled: true },
    ],
  },
];

export function createDefaultThemeConfig(
  storeName: string,
  templateId: StoreTemplateId = 'featured_hero',
  accentOverride?: string
): StoreThemeConfig {
  const preset =
    STORE_TEMPLATE_PRESETS.find((p) => p.id === templateId) || STORE_TEMPLATE_PRESETS[1];
  const cleanName = String(storeName || 'Creator Studio').trim();
  return {
    template: preset.id,
    logoUrl: '',
    faviconUrl: '',
    accentColor: accentOverride || preset.accentColor,
    defaultTheme: preset.defaultTheme,
    heroTitle: `${cleanName} — Digital Software & Tools`,
    heroSubtitle:
      'Production-ready codebases, scripts, and automation kits with instant crypto delivery.',
    heroCtaLabel: 'Explore Catalog',
    heroMediaType: 'gradient',
    heroMediaUrl: '',
    featuredProductIds: [],
    aboutMarkdown: `### About ${cleanName}\n\nAll releases include instant automated delivery, checksum verification, and cryptographic license keys.\n\n- Instant **USDT / BTC / ETH / TON** checkout\n- Lifetime updates for current major version\n- Direct technical support via Telegram or GitHub`,
    socials: {
      github: '',
      telegram: '',
      twitter: '',
      discord: '',
      contactEmail: '',
    },
    sections: preset.sections.map((s) => ({ ...s })),
  };
}

export type StorefrontViewContext =
  | { mode: 'marketplace' }
  | { mode: 'embedded'; slug: string }
  | { mode: 'standalone'; slugOrHost: string; isHostBased: boolean };

const PLATFORM_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  MARKETPLACE_DOMAIN,
  `www.${MARKETPLACE_DOMAIN}`,
  'zenxusbay.com',
  'www.zenxusbay.com',
]);

export function detectStorefrontContext(
  hostnameRaw: string,
  pathnameRaw: string
): StorefrontViewContext {
  const hostname = String(hostnameRaw || '')
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
  const pathname = String(pathnameRaw || '/').trim();

  // Preview standalone path (/s/:slug) always enters standalone Mode B
  const standalonePathMatch = pathname.match(/^\/s\/([a-z0-9-]+)\/?$/i);
  if (standalonePathMatch) {
    return {
      mode: 'standalone',
      slugOrHost: standalonePathMatch[1].toLowerCase(),
      isHostBased: false,
    };
  }

  // Host-based detection for subdomains (*.nexusbyte.de5.net) or custom domains
  if (
    hostname &&
    !PLATFORM_HOSTS.has(hostname) &&
    !hostname.endsWith('.run.app') &&
    !hostname.endsWith('.googleusercontent.com') &&
    !hostname.endsWith('.pages.dev') &&
    !hostname.endsWith('.web.app')
  ) {
    if (hostname.endsWith(`.${MARKETPLACE_DOMAIN}`)) {
      const sub = hostname.slice(0, -`.${MARKETPLACE_DOMAIN}`.length);
      if (sub && sub !== 'www' && isValidStoreSlug(sub)) {
        return { mode: 'standalone', slugOrHost: sub, isHostBased: true };
      }
    } else if (hostname.includes('.')) {
      return { mode: 'standalone', slugOrHost: hostname, isHostBased: true };
    }
  }

  // Embedded marketplace storefront (/ @slug)
  const embeddedMatch = pathname.match(/^\/@([a-z0-9-]+)\/?$/i);
  if (embeddedMatch) {
    return { mode: 'embedded', slug: embeddedMatch[1].toLowerCase() };
  }

  return { mode: 'marketplace' };
}

export function sanitizePastedPriceText(text: string): string {
  const cleaned = String(text || '')
    .replace(/[^0-9.]/g, '')
    .replace(/^(\d*\.?\d*).*$/, '$1');
  return cleaned;
}

export function clampPriceValue(raw: string | number, min = 0, max = 1000000): number | null {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num)) return null;
  if (num < min) return min;
  if (num > max) return max;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}
