-- Migration 0002: Commerce, Product Lifecycle & Trust Layer
-- Run on an existing D1 database:
--   wrangler d1 execute nexusbyte-db --remote --file=migrations/0002_commerce_trust.sql

PRAGMA foreign_keys=OFF;

-- 1. Add trust flag to sellers
ALTER TABLE sellers ADD COLUMN is_trusted INTEGER NOT NULL DEFAULT 0;

-- 2. Rebuild products table with expanded status CHECK and customization columns
CREATE TABLE IF NOT EXISTS products_v2 (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price_cents INTEGER NOT NULL,
  b2_file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size TEXT NOT NULL,
  category TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT 'v1.0.0',
  delivery_type TEXT NOT NULL DEFAULT 'both',
  digital_content TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  features_json TEXT NOT NULL DEFAULT '[]',
  banner_gradient TEXT NOT NULL DEFAULT 'from-cyan-600 via-blue-600 to-indigo-700',
  preview_images_json TEXT NOT NULL DEFAULT '[]',
  code_snippet_json TEXT,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('draft', 'pending_review', 'published', 'rejected', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO products_v2 (
  id, seller_id, title, slug, price_cents, b2_file_key, file_name, file_size,
  category, tagline, description, version, delivery_type, digital_content,
  tags_json, features_json, status, created_at
)
SELECT
  id, seller_id, title, slug, price_cents, b2_file_key, file_name, file_size,
  category, tagline, description, version, delivery_type, digital_content,
  tags_json, features_json, status, created_at
FROM products;

DROP TABLE products;
ALTER TABLE products_v2 RENAME TO products;

-- 3. Rebuild transactions table with intermediate IPN statuses & pay_currency
CREATE TABLE IF NOT EXISTS transactions_v2 (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  product_id TEXT NOT NULL REFERENCES products(id),
  seller_id TEXT NOT NULL REFERENCES sellers(id),
  buyer_email TEXT NOT NULL,
  total_cents INTEGER NOT NULL,
  seller_share_cents INTEGER NOT NULL,
  platform_share_cents INTEGER NOT NULL,
  pay_currency TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'confirming', 'confirmed', 'sending', 'partially_paid', 'finished', 'expired', 'failed')),
  license_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TEXT
);

INSERT INTO transactions_v2 (
  id, order_id, access_token, product_id, seller_id, buyer_email,
  total_cents, seller_share_cents, platform_share_cents, status, license_key,
  created_at, paid_at
)
SELECT
  id, order_id, access_token, product_id, seller_id, buyer_email,
  total_cents, seller_share_cents, platform_share_cents, status, license_key,
  created_at, paid_at
FROM transactions;

DROP TABLE transactions;
ALTER TABLE transactions_v2 RENAME TO transactions;

-- 4. New tables: product_changelog, license_keys, reviews, reports
CREATE TABLE IF NOT EXISTS product_changelog (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  changes_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_keys (
  id TEXT PRIMARY KEY,
  license_key TEXT NOT NULL UNIQUE,
  product_id TEXT NOT NULL REFERENCES products(id),
  order_id TEXT NOT NULL REFERENCES transactions(order_id),
  buyer_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  activations_count INTEGER NOT NULL DEFAULT 0,
  max_activations INTEGER NOT NULL DEFAULT 3,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  order_id TEXT NOT NULL UNIQUE REFERENCES transactions(order_id),
  buyer_email TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  reporter_email TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_changelog_product_id ON product_changelog(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer_email ON transactions(buyer_email);
CREATE INDEX IF NOT EXISTS idx_transactions_seller_id ON transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_transactions_order_id ON transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product_id ON transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_license_keys_product_key ON license_keys(product_id, license_key);
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

PRAGMA foreign_keys=ON;
