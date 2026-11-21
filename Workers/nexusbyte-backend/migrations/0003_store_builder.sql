-- Migration 0003: ZenxusBay Dual-Mode Storefront Builder & Independent Merchant Domains

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  custom_domain TEXT UNIQUE,
  dns_verified INTEGER NOT NULL DEFAULT 0,
  ssl_status TEXT NOT NULL DEFAULT 'none' CHECK (ssl_status IN ('none', 'pending', 'active')),
  is_public_in_feed INTEGER NOT NULL DEFAULT 1,
  theme_config TEXT NOT NULL DEFAULT '{}',
  gateway TEXT NOT NULL DEFAULT 'nowpayments',
  wallet_address TEXT NOT NULL,
  preferred_currency TEXT NOT NULL DEFAULT 'USDT',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN store_id TEXT REFERENCES stores(id);
ALTER TABLE products ADD COLUMN demo_url TEXT;
ALTER TABLE products ADD COLUMN repo_url TEXT;
ALTER TABLE products ADD COLUMN preview_media_url TEXT;
ALTER TABLE products ADD COLUMN license_tiers_json TEXT;
ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

ALTER TABLE transactions ADD COLUMN store_id TEXT REFERENCES stores(id);
ALTER TABLE transactions ADD COLUMN tx_hash TEXT;
ALTER TABLE transactions ADD COLUMN buyer_id TEXT REFERENCES users(id);

CREATE INDEX IF NOT EXISTS idx_stores_owner_id ON stores(owner_id);
CREATE INDEX IF NOT EXISTS idx_stores_slug ON stores(slug);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON stores(custom_domain);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);
