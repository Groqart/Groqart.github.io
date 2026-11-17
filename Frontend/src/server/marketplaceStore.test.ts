import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMarketplaceStore,
  createPaymentInStore,
  createProductInStore,
  createReportInStore,
  createReviewInStore,
  deleteProductInStore,
  getAdminOverviewFromStore,
  getProductDetailFromStore,
  getPublishedProductsFromStore,
  getVendorProductsFromStore,
  getVendorStatsFromStore,
  maskEmail,
  moderateProductInStore,
  onboardSellerInStore,
  requestMagicLinkInStore,
  resolveReportInStore,
  retryWithdrawVerifyInStore,
  setSellerTrustInStore,
  settleTransaction,
  signJwt,
  toClientOrder,
  updateProductInStore,
  verifyJwt,
  verifyLicenseKeyInStore,
  verifyMagicTokenInStore,
  withdrawFromStore,
} from './marketplaceStore';

const TEST_SECRET = 'unit-test-jwt-secret-32-chars-minimum';

function setupVendor(store: ReturnType<typeof createMarketplaceStore>, email: string, name: string, trusted = false) {
  const authReq = requestMagicLinkInStore(store, email, '/vendor');
  const verified = verifyMagicTokenInStore(store, authReq.rawToken!, TEST_SECRET);
  const userId = (verified.body.user as { id: string }).id;
  onboardSellerInStore(store, userId, name, '0xAbCdEf1234567890AbCdEf1234567890AbCdEf12');
  const seller = store.sellers.get(userId)!;
  if (trusted) seller.isTrusted = true;
  return seller;
}

function uploadFakeFile(
  store: ReturnType<typeof createMarketplaceStore>,
  sellerId: string,
  fileName: string,
  sizeBytes = 2048
): string {
  const key = `products/${sellerId}/${Date.now()}_${fileName}`;
  store.uploadedFiles.set(key, { fileName, content: Buffer.alloc(sizeBytes, 65) });
  return key;
}

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

test('magic link token is single-use and enforces rate limit (max 3 per 10m)', () => {
  const store = createMarketplaceStore();
  const r1 = requestMagicLinkInStore(store, 'Alice@Example.com', '/purchases');
  const r2 = requestMagicLinkInStore(store, 'Alice@Example.com', '/purchases');
  const r3 = requestMagicLinkInStore(store, 'Alice@Example.com', '/purchases');
  const r4 = requestMagicLinkInStore(store, 'Alice@Example.com', '/purchases');

  assert.equal(r1.status, 200);
  assert.equal(r2.status, 200);
  assert.equal(r3.status, 200);
  assert.equal(r4.status, 429);

  const firstVerify = verifyMagicTokenInStore(store, r1.rawToken!, TEST_SECRET);
  assert.equal(firstVerify.status, 200);
  assert.ok(typeof firstVerify.body.token === 'string');

  const replayVerify = verifyMagicTokenInStore(store, r1.rawToken!, TEST_SECRET);
  assert.equal(replayVerify.status, 401);
});

test('b2_file_key spoofing & missing upload protection on create and update', () => {
  const store = createMarketplaceStore();
  const sellerA = setupVendor(store, 'sellera@studio.dev', 'Studio A', true);
  const sellerB = setupVendor(store, 'sellerb@studio.dev', 'Studio B', true);

  const keyB = uploadFakeFile(store, sellerB.id, 'secret-b.zip');

  // Seller A cannot reference Seller B's b2_file_key or path traversal
  const spoofRes = createProductInStore(store, sellerA, {
    title: 'Spoofed Asset',
    priceUSD: 50,
    b2_file_key: keyB,
  });
  assert.equal(spoofRes.status, 403);

  const traversalRes = createProductInStore(store, sellerA, {
    title: 'Traversal Asset',
    priceUSD: 50,
    b2_file_key: `products/${sellerA.id}/../${sellerB.id}/secret.zip`,
  });
  assert.equal(traversalRes.status, 403);

  // Missing file in B2 must fail
  const missingFileRes = createProductInStore(store, sellerA, {
    title: 'Ghost Asset',
    priceUSD: 50,
    b2_file_key: `products/${sellerA.id}/never-uploaded.zip`,
  });
  assert.equal(missingFileRes.status, 400);

  // Valid upload succeeds with real computed size
  const keyA = uploadFakeFile(store, sellerA.id, 'cli.zip', 4096);
  const okRes = createProductInStore(store, sellerA, {
    title: 'Pro CLI Toolkit',
    priceUSD: 49,
    b2_file_key: keyA,
    fileName: 'cli.zip',
  });
  assert.equal(okRes.status, 201);
  assert.equal(okRes.body.fileSize, '4.0 KB');
});

test('soft delete archives purchased products while hard-deleting unpurchased products', () => {
  const store = createMarketplaceStore();
  const seller = setupVendor(store, 'lifecycle@studio.dev', 'Lifecycle Studio', true);

  const key1 = uploadFakeFile(store, seller.id, 'unpurchased.zip');
  const p1 = createProductInStore(store, seller, {
    title: 'Unpurchased Kit',
    priceUSD: 25,
    b2_file_key: key1,
    fileName: 'unpurchased.zip',
  });
  const p1Id = String(p1.body.id);

  // Other seller cannot delete
  assert.equal(deleteProductInStore(store, p1Id, 'vendor_alex_dev').ok, false);

  // Owner hard-deletes unpurchased product & B2 file is removed
  const del1 = deleteProductInStore(store, p1Id, seller.id);
  assert.equal(del1.ok, true);
  assert.equal(del1.deleted, true);
  assert.equal(store.uploadedFiles.has(key1), false);

  // Purchased product must soft-delete (archive) so transaction integrity holds
  const key2 = uploadFakeFile(store, seller.id, 'purchased.zip');
  const p2 = createProductInStore(store, seller, {
    title: 'Purchased Kit',
    priceUSD: 60,
    b2_file_key: key2,
    fileName: 'purchased.zip',
  });
  const p2Id = String(p2.body.id);

  const pay = createPaymentInStore(store, { product_id: p2Id, buyer_email: 'buyer@test.dev' });
  settleTransaction(store, String(pay.body.order_id), 'finished');

  const del2 = deleteProductInStore(store, p2Id, seller.id);
  assert.equal(del2.ok, true);
  assert.equal(del2.archived, true);

  // Excluded from public catalog & vendor active list, but transaction still resolves
  assert.equal(getPublishedProductsFromStore(store).some((p) => p.id === p2Id), false);
  assert.equal(getVendorProductsFromStore(store, seller.id).some((p) => p.id === p2Id), false);
  assert.ok(store.products.find((p) => p.id === p2Id && p.status === 'archived'));
});

test('product update releases new version with changelog and updates buyer downloads', () => {
  const store = createMarketplaceStore();
  const seller = setupVendor(store, 'updater@studio.dev', 'Updater Studio', true);
  const keyV1 = uploadFakeFile(store, seller.id, 'app-v1.zip', 2048);

  const created = createProductInStore(store, seller, {
    title: 'SaaS Engine',
    priceUSD: 79,
    b2_file_key: keyV1,
    fileName: 'app-v1.zip',
    version: 'v1.0.0',
  });
  const prodId = String(created.body.id);

  const pay = createPaymentInStore(store, { product_id: prodId, buyer_email: 'owner@client.io' });
  settleTransaction(store, String(pay.body.order_id), 'finished');

  const keyV2 = uploadFakeFile(store, seller.id, 'app-v1.1.0.zip', 8192);
  const updated = updateProductInStore(store, prodId, seller, {
    version: 'v1.1.0',
    b2_file_key: keyV2,
    fileName: 'app-v1.1.0.zip',
    changelogNote: 'Added multi-tenant RBAC support',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.version, 'v1.1.0');
  assert.equal(updated.body.fileSize, '8.0 KB');

  const detail = getProductDetailFromStore(store, prodId);
  const changelog = detail.body.changelog as Array<{ version: string; changes: string[] }>;
  assert.equal(changelog[0].version, 'v1.1.0');
  assert.equal(changelog[0].changes[0], 'Added multi-tenant RBAC support');

  // Existing buyer automatically receives updated version & filename
  const tx = store.transactions.get(String(pay.body.order_id))!;
  const prod = store.products.find((p) => p.id === prodId)!;
  const clientOrder = toClientOrder(store, tx, prod);
  assert.equal(clientOrder.productVersion, 'v1.1.0');
  assert.equal(clientOrder.secureDelivery?.fileName, 'app-v1.1.0.zip');
});

test('smart license generation & public license verification endpoint', () => {
  const store = createMarketplaceStore();
  const seller = setupVendor(store, 'lic@studio.dev', 'License Studio', true);

  const keyFileOnly = uploadFakeFile(store, seller.id, 'textures.zip');
  const pFile = createProductInStore(store, seller, {
    title: 'Textures Pack',
    priceUSD: 30,
    deliveryType: 'file',
    b2_file_key: keyFileOnly,
    fileName: 'textures.zip',
  });
  const payFile = createPaymentInStore(store, { product_id: String(pFile.body.id), buyer_email: 'art@buy.io' });
  const settledFile = settleTransaction(store, String(payFile.body.order_id), 'finished');
  assert.equal(settledFile.body.license_key, null);

  const keyLicensed = uploadFakeFile(store, seller.id, 'bot.zip');
  const pLic = createProductInStore(store, seller, {
    title: 'Trading Bot',
    priceUSD: 99,
    deliveryType: 'both',
    b2_file_key: keyLicensed,
    fileName: 'bot.zip',
  });
  const licProdId = String(pLic.body.id);
  const payLic = createPaymentInStore(store, { product_id: licProdId, buyer_email: 'trader@buy.io' });
  const settledLic = settleTransaction(store, String(payLic.body.order_id), 'finished');
  const licenseKey = String(settledLic.body.license_key);
  assert.ok(licenseKey.startsWith('KEY-'));

  // Public verification & activation tracking (max 3)
  const v1 = verifyLicenseKeyInStore(store, { product_id: licProdId, license_key: licenseKey, increment_activation: true });
  assert.equal(v1.body.valid, true);
  assert.equal(v1.body.activationsCount, 1);

  verifyLicenseKeyInStore(store, { product_id: licProdId, license_key: licenseKey, increment_activation: true });
  verifyLicenseKeyInStore(store, { product_id: licProdId, license_key: licenseKey, increment_activation: true });
  const v4 = verifyLicenseKeyInStore(store, { product_id: licProdId, license_key: licenseKey, increment_activation: true });
  assert.equal(v4.body.valid, false);
});

test('verified buyer reviews require finished purchase and compute real product rating', () => {
  const store = createMarketplaceStore();
  const seller = setupVendor(store, 'rev@studio.dev', 'Review Studio', true);
  const key = uploadFakeFile(store, seller.id, 'kit.zip');
  const created = createProductInStore(store, seller, {
    title: 'Reviewable Kit',
    priceUSD: 40,
    b2_file_key: key,
    fileName: 'kit.zip',
  });
  const prodId = String(created.body.id);

  // Non-buyer cannot review
  const denied = createReviewInStore(store, 'stranger@nowhere.dev', {
    product_id: prodId,
    rating: 5,
    comment: 'Fake review attempt',
  });
  assert.equal(denied.status, 403);

  // Buyer with waiting order cannot review yet
  const pay = createPaymentInStore(store, { product_id: prodId, buyer_email: 'realbuyer@gmail.com' });
  const pendingReview = createReviewInStore(store, 'realbuyer@gmail.com', {
    product_id: prodId,
    rating: 5,
    comment: 'Trying before paying',
  });
  assert.equal(pendingReview.status, 403);

  // After settlement, buyer can review once
  settleTransaction(store, String(pay.body.order_id), 'finished');
  const okReview = createReviewInStore(store, 'realbuyer@gmail.com', {
    product_id: prodId,
    rating: 4,
    comment: 'Very clean TypeScript codebase and great docs!',
  });
  assert.equal(okReview.status, 201);

  // Second review for same purchase is rejected
  const dupReview = createReviewInStore(store, 'realbuyer@gmail.com', {
    product_id: prodId,
    rating: 5,
    comment: 'Trying to double review',
  });
  assert.equal(dupReview.status, 403);

  const detail = getProductDetailFromStore(store, prodId);
  const hydrated = detail.body.product as { rating: number; reviewsCount: number; salesCount: number };
  assert.equal(hydrated.rating, 4);
  assert.equal(hydrated.reviewsCount, 1);
  assert.equal(hydrated.salesCount, 1);
});

test('untrusted vendor products enter pending_review until admin approves, and reports reach admin overview', () => {
  const store = createMarketplaceStore();
  const newSeller = setupVendor(store, 'newbie@dev.io', 'Newbie Dev', false);
  const key = uploadFakeFile(store, newSeller.id, 'newbie.zip');

  const created = createProductInStore(store, newSeller, {
    title: 'Pending Widget',
    priceUSD: 19,
    b2_file_key: key,
    fileName: 'newbie.zip',
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, 'pending_review');
  const prodId = String(created.body.id);

  // Not visible in public catalog yet
  assert.equal(getPublishedProductsFromStore(store).some((p) => p.id === prodId), false);
  // Visible in vendor inventory
  assert.equal(getVendorProductsFromStore(store, newSeller.id).some((p) => p.id === prodId), true);

  // Admin approves
  const mod = moderateProductInStore(store, prodId, 'approve');
  assert.equal(mod.status, 200);
  assert.equal(getPublishedProductsFromStore(store).some((p) => p.id === prodId), true);

  // Admin promotes seller to trusted
  const trust = setSellerTrustInStore(store, newSeller.id, true);
  assert.equal(trust.status, 200);
  assert.equal(store.sellers.get(newSeller.id)?.isTrusted, true);

  // Report product & resolve in admin
  const rep = createReportInStore(store, {
    product_id: prodId,
    reason: 'Broken archive',
    details: 'Missing build script',
    reporter_email: 'user@check.io',
  });
  assert.equal(rep.status, 201);

  const overview = getAdminOverviewFromStore(store);
  assert.equal(overview.stats.openReportsCount, 1);
  const resRep = resolveReportInStore(store, String(rep.body.id), 'resolved');
  assert.equal(resRep.status, 200);
  assert.equal(getAdminOverviewFromStore(store).stats.openReportsCount, 0);
});

test('intermediate IPN statuses, idempotent withdrawals with retry-verify, and masked vendor recentOrders', () => {
  const store = createMarketplaceStore();
  const seller = setupVendor(store, 'ipn@studio.dev', 'IPN Studio', true);
  const key = uploadFakeFile(store, seller.id, 'engine.zip');
  const created = createProductInStore(store, seller, {
    title: 'IPN Engine',
    priceUSD: 100,
    b2_file_key: key,
    fileName: 'engine.zip',
  });
  const prodId = String(created.body.id);

  const payRes = createPaymentInStore(store, {
    product_id: prodId,
    buyer_email: 'alex.morgan@gmail.com',
    pay_currency: 'usdttrc20',
  });
  const orderId = String(payRes.body.order_id);

  // Intermediate statuses
  const confirming = settleTransaction(store, orderId, 'confirming');
  assert.equal(confirming.body.status, 'confirming');
  const partiallyPaid = settleTransaction(store, orderId, 'partially_paid');
  assert.equal(partiallyPaid.body.status, 'partially_paid');

  // Settle twice — second call must NOT double-credit seller
  const s1 = settleTransaction(store, orderId, 'finished');
  assert.equal(s1.status, 200);
  const s2 = settleTransaction(store, orderId, 'finished');
  assert.equal(s2.status, 200);

  const stats = getVendorStatsFromStore(store, seller);
  assert.equal(stats.totalSalesCount, 1);
  assert.equal(stats.availableBalanceUSD, 95);
  assert.equal(stats.recentOrders.length, 1);
  assert.equal(stats.recentOrders[0].buyerEmailMasked, maskEmail('alex.morgan@gmail.com'));

  // Withdrawal verify failure MUST NOT refund balance because batch_id exists!
  const verifyFail = withdrawFromStore(store, seller, 50, { simulateVerifyFailure: true });
  assert.equal(verifyFail.status, 502);
  assert.equal(verifyFail.body.status, 'pending_verification');
  assert.equal(getVendorStatsFromStore(store, seller).availableBalanceUSD, 45);

  // Retry verify transitions to processing without deducting again
  const retry = retryWithdrawVerifyInStore(store, String(verifyFail.body.id), { sellerId: seller.id });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.status, 'processing');
  assert.equal(getVendorStatsFromStore(store, seller).availableBalanceUSD, 45);

  // Creation failure before batch_id DOES restore balance
  const createFail = withdrawFromStore(store, seller, 20, { simulateCreateFailure: true });
  assert.equal(createFail.status, 502);
  assert.equal(getVendorStatsFromStore(store, seller).availableBalanceUSD, 45);
});
