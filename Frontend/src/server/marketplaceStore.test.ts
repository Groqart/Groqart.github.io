import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMarketplaceStore,
  createPaymentInStore,
  createProductInStore,
  deleteProductInStore,
  getVendorStatsFromStore,
  onboardSellerInStore,
  requestMagicLinkInStore,
  settleTransaction,
  signJwt,
  verifyJwt,
  verifyMagicTokenInStore,
  withdrawFromStore,
} from './marketplaceStore';

const TEST_SECRET = 'unit-test-jwt-secret-32-chars-minimum';

test('stateless JWT sign and verify round-trip and reject tampering', () => {
  const token = signJwt({ sub: 'usr_123', email: 'buyer@example.com', role: 'buyer' }, TEST_SECRET, 3600);
  const decoded = verifyJwt(token, TEST_SECRET);
  assert.ok(decoded);
  assert.equal(decoded.sub, 'usr_123');
  assert.equal(decoded.email, 'buyer@example.com');

  const tampered = `${token.slice(0, -4)}aaaa`;
  assert.equal(verifyJwt(tampered, TEST_SECRET), null);
  assert.equal(verifyJwt(token, 'wrong-secret'), null);
});

test('magic link token is single-use and issues JWT for user', () => {
  const store = createMarketplaceStore();
  const req = requestMagicLinkInStore(store, 'Alice@Example.com', '/purchases');
  assert.equal(req.status, 200);
  assert.ok(req.rawToken);

  const firstVerify = verifyMagicTokenInStore(store, req.rawToken!, TEST_SECRET);
  assert.equal(firstVerify.status, 200);
  assert.ok(typeof firstVerify.body.token === 'string');

  // Re-use must fail
  const replayVerify = verifyMagicTokenInStore(store, req.rawToken!, TEST_SECRET);
  assert.equal(replayVerify.status, 401);
});

test('vendor onboarding validates EVM address and isolates product ownership', () => {
  const store = createMarketplaceStore();
  const authReq = requestMagicLinkInStore(store, 'creator@studio.dev', '/vendor');
  const verified = verifyMagicTokenInStore(store, authReq.rawToken!, TEST_SECRET);
  const userId = (verified.body.user as { id: string }).id;

  const badWallet = onboardSellerInStore(store, userId, 'Studio One', 'invalid-address');
  assert.equal(badWallet.status, 400);

  const okOnboard = onboardSellerInStore(
    store,
    userId,
    'Studio One',
    '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'
  );
  assert.equal(okOnboard.status, 200);

  const seller = store.sellers.get(userId)!;
  const created = createProductInStore(store, seller, {
    title: 'Pro CLI Toolkit',
    priceUSD: 49,
    b2_file_key: 'products/cli.zip',
    fileName: 'cli.zip',
    tags: ['CLI', 'TypeScript'],
    features: ['Fast binary', 'Zero dependencies'],
  });
  assert.equal(created.status, 201);
  const prodId = String(created.body.id);

  // Different seller cannot delete this product
  assert.equal(deleteProductInStore(store, prodId, 'vendor_alex_dev'), false);
  // Owner can delete it
  assert.equal(deleteProductInStore(store, prodId, seller.id), true);
});

test('guest checkout creates access_token, IPN settlement is idempotent, and vendor withdrawal validates balance', () => {
  const store = createMarketplaceStore();
  const authReq = requestMagicLinkInStore(store, 'seller2@studio.dev', '/vendor');
  const verified = verifyMagicTokenInStore(store, authReq.rawToken!, TEST_SECRET);
  const sellerId = (verified.body.user as { id: string }).id;
  onboardSellerInStore(store, sellerId, 'Seller Two', '0x1234567890123456789012345678901234567890');
  const seller = store.sellers.get(sellerId)!;

  const prodRes = createProductInStore(store, seller, {
    title: 'Rust Webhook Engine',
    priceUSD: 100,
    b2_file_key: 'products/rust.zip',
    fileName: 'rust.zip',
  });
  const productId = String(prodRes.body.id);

  const payRes = createPaymentInStore(store, {
    product_id: productId,
    buyer_email: 'guest@buyer.io',
  });
  assert.equal(payRes.status, 200);
  const orderId = String(payRes.body.order_id);
  assert.ok(typeof payRes.body.access_token === 'string');

  // Settle twice — second call must NOT double-credit seller
  const s1 = settleTransaction(store, orderId, 'finished');
  assert.equal(s1.status, 200);
  const s2 = settleTransaction(store, orderId, 'finished');
  assert.equal(s2.status, 200);

  const stats = getVendorStatsFromStore(store, seller);
  assert.equal(stats.totalSalesCount, 1);
  assert.equal(stats.availableBalanceUSD, 95);

  const lowWd = withdrawFromStore(store, seller, 3);
  assert.equal(lowWd.status, 400);

  const okWd = withdrawFromStore(store, seller, 50);
  assert.equal(okWd.status, 200);
  assert.equal(okWd.body.remainingBalanceUSD, 45);
});
