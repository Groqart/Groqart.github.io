# NexusByte — Digital Goods Marketplace

Multi-vendor digital marketplace for software, SaaS starters, bots, scripts, 3D assets, and license keys powered by **React 19 + React Router v8.5 + Tailwind CSS v4** on the frontend and **Cloudflare Workers + D1 + Backblaze B2 + NOWPayments + Resend** on the backend.

---

## Architecture

- **Frontend (`/Frontend`)**: React Router Framework Mode (`ssr: false` SPA), Tailwind CSS v4, Magic Link passwordless authentication with stateless HMAC-SHA256 JWT (`Authorization: Bearer <token>`), guest checkout & token-protected order tracking, and isolated multi-vendor studio.
- **Backend (`/Workers/nexusbyte-backend`)**: Zero-dependency Cloudflare Worker using WebCrypto (`crypto.subtle`), Cloudflare D1 (`schema.sql` / `seed.sql`), Backblaze B2 AWS SigV4 presigned PUT/GET URLs (with `response-content-disposition`), NOWPayments Hosted Invoices + HMAC-SHA512 IPN webhooks + USDC Base payouts, and Resend transactional emails.
- **Local Dev Sandbox (`Frontend/src/server/`)**: Vite middleware replicating D1 + Auth + B2 + NOWPayments workflows locally so checkout, magic links (`devVerifyUrl`), vendor onboarding, uploads, and withdrawals run end-to-end without external secrets.

---

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Unit Tests

```bash
npx --yes tsx --test Frontend/src/server/marketplaceStore.test.ts
```

### Typecheck & Build

```bash
npm run lint
npm run build
```

---

## Cloudflare D1 & Worker Deployment

1. Initialize and seed the D1 database (`Workers/nexusbyte-backend`):

```bash
cd Workers/nexusbyte-backend
npx wrangler d1 execute nexusbyte-db --remote --file=schema.sql
npx wrangler d1 execute nexusbyte-db --remote --file=seed.sql
```

2. Configure Worker secrets:

```bash
npx wrangler secret put JWT_SECRET
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put EMAIL_FROM
npx wrangler secret put NOWPAYMENTS_API_KEY
npx wrangler secret put NOWPAYMENTS_IPN_SECRET
npx wrangler secret put NOWPAYMENTS_EMAIL
npx wrangler secret put NOWPAYMENTS_PASSWORD
npx wrangler secret put NOWPAYMENTS_TOTP_SECRET
npx wrangler secret put B2_APP_KEY
```

3. Deploy the Worker and build the Frontend (`VITE_API_URL` set in `Frontend/.env`):

```bash
npx wrangler deploy
```
