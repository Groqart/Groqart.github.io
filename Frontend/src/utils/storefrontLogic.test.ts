import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampPriceValue,
  detectStorefrontContext,
  isValidCryptoWallet,
  isValidCustomDomain,
  isValidStoreSlug,
  normalizeLoginIdentifier,
  sanitizePastedPriceText,
  slugifyStoreName,
} from './storefrontLogic';

test('normalizeLoginIdentifier maps admin shortcut and validates standard emails', () => {
  assert.deepEqual(normalizeLoginIdentifier('admin'), {
    valid: true,
    email: 'admin@nexusbyte.io',
    isAdminShortcut: true,
  });
  assert.deepEqual(normalizeLoginIdentifier(' ADMIN '), {
    valid: true,
    email: 'admin@nexusbyte.io',
    isAdminShortcut: true,
  });
  assert.equal(normalizeLoginIdentifier('alice@example.com').valid, true);
  assert.equal(normalizeLoginIdentifier('notanemail').valid, false);
});

test('isValidCryptoWallet accepts EVM, TON, BTC, SOL and 0xadmin shortcut', () => {
  assert.equal(isValidCryptoWallet('0xadmin'), true);
  assert.equal(isValidCryptoWallet('0xAbCdEf1234567890AbCdEf1234567890AbCdEf12'), true);
  assert.equal(isValidCryptoWallet('EQDtFpEwcFAEcRe5mLVh2N6C0x-_hJEM7W61_JLnSF74p4q2'), true);
  assert.equal(isValidCryptoWallet('bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'), true);
  assert.equal(isValidCryptoWallet('invalid-wallet'), false);
});

test('slugifyStoreName and isValidStoreSlug validate slugs and block reserved paths', () => {
  assert.equal(slugifyStoreName('CyberCode Studio!'), 'cybercode-studio');
  assert.equal(isValidStoreSlug('cybercode'), true);
  assert.equal(isValidStoreSlug('admin'), false);
  assert.equal(isValidStoreSlug('vendor'), false);
  assert.equal(isValidStoreSlug('ab'), false);
});

test('detectStorefrontContext distinguishes marketplace, /@slug embedded, /s/slug standalone, and subdomain/custom host', () => {
  assert.deepEqual(detectStorefrontContext('localhost', '/'), { mode: 'marketplace' });
  assert.deepEqual(detectStorefrontContext('nexusbyte.de5.net', '/'), { mode: 'marketplace' });
  assert.deepEqual(detectStorefrontContext('nexusbyte.de5.net', '/@cybercode'), {
    mode: 'embedded',
    slug: 'cybercode',
  });
  assert.deepEqual(detectStorefrontContext('localhost', '/s/cybercode'), {
    mode: 'standalone',
    slugOrHost: 'cybercode',
    isHostBased: false,
  });
  assert.deepEqual(detectStorefrontContext('cybercode.nexusbyte.de5.net', '/'), {
    mode: 'standalone',
    slugOrHost: 'cybercode',
    isHostBased: true,
  });
  assert.deepEqual(detectStorefrontContext('cybercode.dev', '/'), {
    mode: 'standalone',
    slugOrHost: 'cybercode.dev',
    isHostBased: true,
  });
});

test('price paste sanitization & domain validation harden numeric and host inputs', () => {
  assert.equal(sanitizePastedPriceText('-49.99 USD'), '49.99');
  assert.equal(sanitizePastedPriceText('1e10'), '110');
  assert.equal(sanitizePastedPriceText('abc'), '');
  assert.equal(clampPriceValue(-50, 0, 10000), 0);
  assert.equal(clampPriceValue(49.555, 0, 10000), 49.56);

  assert.equal(isValidCustomDomain('cybercode.dev'), true);
  assert.equal(isValidCustomDomain('localhost'), false);
  assert.equal(isValidCustomDomain('cybercode.nexusbyte.de5.net'), false);
});
