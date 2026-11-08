import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCryptoAmount,
  generateSandboxAddress,
  formatCryptoPaymentURI,
  generateSignedDownloadToken,
  verifyDownloadToken,
  verifyOxaPayWebhookSignature,
  generateLicenseKey,
} from './oxapayLogic';
import crypto from 'node:crypto';

test('calculateCryptoAmount converts USD to crypto accurately', () => {
  // $100 in USDT (rate 1.0) -> 100 USDT
  assert.equal(calculateCryptoAmount(100, 'USDT'), 100);

  // $100 in BTC at $68,500
  const btcAmount = calculateCryptoAmount(100, 'BTC');
  assert.ok(btcAmount > 0.001 && btcAmount < 0.002);

  // $100 in LTC at $72.5
  const ltcAmount = calculateCryptoAmount(100, 'LTC');
  assert.ok(ltcAmount > 1.3 && ltcAmount < 1.4);
});

test('generateSandboxAddress returns valid prefix by currency', () => {
  assert.ok(generateSandboxAddress('BTC').startsWith('bc1q'));
  assert.ok(generateSandboxAddress('ETH').startsWith('0x'));
  assert.ok(generateSandboxAddress('USDT').startsWith('T'));
  assert.ok(generateSandboxAddress('LTC').startsWith('ltc1q'));
});

test('formatCryptoPaymentURI formats correct deep link for wallets', () => {
  const uriBtc = formatCryptoPaymentURI('BTC', 'bc1qtestaddress123', 0.0025);
  assert.equal(uriBtc, 'bitcoin:bc1qtestaddress123?amount=0.0025');

  const uriEth = formatCryptoPaymentURI('ETH', '0xabcdef123', 0.05);
  assert.equal(uriEth, 'ethereum:0xabcdef123?value=0.05');
});

test('generateLicenseKey produces formatted license string', () => {
  const key = generateLicenseKey('TEST');
  assert.ok(key.startsWith('TEST-'));
  const segments = key.split('-');
  assert.equal(segments.length, 4);
});

test('signed download token roundtrip succeeds with matching secret', () => {
  const secret = 'my-super-secure-key-12345';
  const orderId = 'ord_live_8912';

  const { token, expiresAt } = generateSignedDownloadToken(orderId, secret, 24);
  assert.ok(expiresAt > Date.now());

  const verification = verifyDownloadToken(token, secret);
  assert.equal(verification.valid, true);
  assert.equal(verification.orderId, orderId);
});

test('signed download token fails with incorrect secret or tampered token', () => {
  const secret = 'secret-A';
  const wrongSecret = 'secret-B';
  const orderId = 'ord_hack_attempt';

  const { token } = generateSignedDownloadToken(orderId, secret, 24);
  const verification = verifyDownloadToken(token, wrongSecret);
  assert.equal(verification.valid, false);
  assert.match(verification.error || '', /Invalid token signature/);
});

test('signed download token fails when expired', () => {
  const secret = 'secret-A';
  const orderId = 'ord_expired_test';

  // Negative validity hours -> expired token
  const { token } = generateSignedDownloadToken(orderId, secret, -1);
  const verification = verifyDownloadToken(token, secret);
  assert.equal(verification.valid, false);
  assert.match(verification.error || '', /expired/i);
});

test('verifyOxaPayWebhookSignature verifies HMAC-SHA512 header correctly', () => {
  const secret = 'oxapay_secret_test_key_88';
  const rawBody = JSON.stringify({
    trackId: 'TRK_99182',
    status: 'Paid',
    amount: 49.99,
    payAmount: 49.99,
    payCurrency: 'USDT',
  });

  const correctSignature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');

  assert.equal(verifyOxaPayWebhookSignature(rawBody, correctSignature, secret), true);
  assert.equal(verifyOxaPayWebhookSignature(rawBody, 'invalid-signature-hex', secret), false);
  assert.equal(verifyOxaPayWebhookSignature(rawBody, undefined, secret), false);
});
