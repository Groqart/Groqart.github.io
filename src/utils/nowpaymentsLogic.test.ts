import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCryptoAmount,
  generateSandboxAddress,
  formatCryptoPaymentURI,
  generateSignedDownloadToken,
  verifyDownloadToken,
  verifyNowPaymentsIpnSignature,
  generateLicenseKey,
  sortObject,
} from './nowpaymentsLogic';
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
  const key = generateLicenseKey('NEXUS');
  assert.ok(key.startsWith('NEXUS-'));
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

test('verifyNowPaymentsIpnSignature verifies sorted JSON HMAC-SHA512 header correctly', () => {
  const ipnSecret = 'bc2ziZ+I+Xa4lpmE9zv4aQBrmLbe1xVI';
  const notificationPayload = {
    payment_id: 5077125035,
    payment_status: 'finished',
    pay_address: '0x123abc456def',
    price_amount: 89,
    price_currency: 'usd',
    pay_amount: 89,
    actually_paid: 89,
    pay_currency: 'usdttrc20',
    order_id: 'ord_123',
  };

  const sorted = sortObject(notificationPayload);
  const correctSignature = crypto.createHmac('sha512', ipnSecret).update(JSON.stringify(sorted)).digest('hex');

  assert.equal(verifyNowPaymentsIpnSignature(notificationPayload, correctSignature, ipnSecret), true);
  assert.equal(verifyNowPaymentsIpnSignature(notificationPayload, 'invalid_sig_value', ipnSecret), false);
  assert.equal(verifyNowPaymentsIpnSignature(notificationPayload, undefined, ipnSecret), false);
});
