import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {
  createMarketplaceStore,
  createPaymentInStore,
  createProductInStore,
  deleteProductInStore,
  findTransaction,
  formatAuthUser,
  formatSellerProfile,
  getVendorStatsFromStore,
  onboardSellerInStore,
  requestMagicLinkInStore,
  settleTransaction,
  toClientOrder,
  verifyJwt,
  verifyMagicTokenInStore,
  withdrawFromStore,
} from './marketplaceStore';

const store = createMarketplaceStore();
const DEV_JWT_SECRET = process.env.JWT_SECRET || 'nexusbyte-local-dev-jwt-secret-change-in-prod';

async function readRawBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const raw = (await readRawBody(req)).toString('utf8').trim();
  if (!raw) return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function authenticateRequest(req: IncomingMessage) {
  const header = String(req.headers.authorization || '');
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const payload = verifyJwt(token, DEV_JWT_SECRET);
  if (!payload || typeof payload.sub !== 'string') return null;
  const user = store.users.get(payload.sub);
  if (!user) return null;
  const seller = store.sellers.get(user.id) || null;
  return { user, seller };
}

export async function handleApiRequest(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const rawUrl = req.url || '/';
  const parsedUrl = new URL(rawUrl, 'http://localhost');
  const pathname = parsedUrl.pathname;
  const method = (req.method || 'GET').toUpperCase();

  if (!pathname.startsWith('/api/')) {
    return false;
  }

  try {
    // 1. Magic Link Request
    if (pathname === '/api/auth/request-link' && method === 'POST') {
      const body = await readJsonBody(req);
      const result = requestMagicLinkInStore(
        store,
        String(body.email || ''),
        typeof body.redirectPath === 'string' ? body.redirectPath : undefined
      );
      if (result.status === 200 && result.rawToken) {
        const devVerifyUrl = `/auth/verify?token=${encodeURIComponent(result.rawToken)}&redirect=${encodeURIComponent(result.redirectPath || '/purchases')}`;
        console.log(`[NexusByte Dev Magic Link] ${body.email} -> ${devVerifyUrl}`);
        sendJson(res, 200, { ...result.body, devVerifyUrl });
        return true;
      }
      sendJson(res, result.status, result.body);
      return true;
    }

    // 2. Magic Link Verify
    if (pathname === '/api/auth/verify' && method === 'POST') {
      const body = await readJsonBody(req);
      const result = verifyMagicTokenInStore(store, String(body.token || ''), DEV_JWT_SECRET);
      sendJson(res, result.status, result.body);
      return true;
    }

    // 3. Auth Me
    if (pathname === '/api/auth/me' && method === 'GET') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return true;
      }
      sendJson(res, 200, {
        user: formatAuthUser(auth.user),
        seller: auth.seller ? formatSellerProfile(auth.seller) : null,
      });
      return true;
    }

    // 4. Products list
    if (pathname === '/api/products' && method === 'GET') {
      sendJson(res, 200, { products: store.products });
      return true;
    }

    // 5. Create product (Seller JWT required)
    if (pathname === '/api/products' && method === 'POST') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized: sign in first' });
        return true;
      }
      if (!auth.seller) {
        sendJson(res, 403, { error: 'Forbidden: complete vendor onboarding first' });
        return true;
      }
      const body = await readJsonBody(req);
      const result = createProductInStore(
        store,
        auth.seller,
        body as Parameters<typeof createProductInStore>[2]
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // 6. Delete product (Seller JWT + ownership required)
    if (pathname.startsWith('/api/products/') && method === 'DELETE') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return true;
      }
      if (!auth.seller) {
        sendJson(res, 403, { error: 'Forbidden: vendor access required' });
        return true;
      }
      const id = decodeURIComponent(pathname.replace('/api/products/', ''));
      const deleted = deleteProductInStore(store, id, auth.seller.id);
      if (!deleted) {
        sendJson(res, 404, { error: 'Product not found or access denied' });
        return true;
      }
      sendJson(res, 200, { success: true });
      return true;
    }

    // 7. Upload URL (Seller JWT required)
    if (pathname === '/api/upload-url' && method === 'POST') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return true;
      }
      if (!auth.seller) {
        sendJson(res, 403, { error: 'Forbidden: complete vendor onboarding first' });
        return true;
      }
      const body = await readJsonBody(req);
      const fileName = String(body.fileName || 'package.zip');
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileKey = `products/${auth.seller.id}/${Date.now()}_${safeName}`;
      sendJson(res, 200, {
        uploadUrl: `/api/mock-b2-upload/${encodeURIComponent(fileKey)}`,
        fileKey,
      });
      return true;
    }

    // 7b. Mock B2 PUT upload receiver
    if (pathname.startsWith('/api/mock-b2-upload/') && method === 'PUT') {
      const fileKey = decodeURIComponent(pathname.replace('/api/mock-b2-upload/', ''));
      const buf = await readRawBody(req);
      const fileName = fileKey.split('/').pop() || 'package.zip';
      store.uploadedFiles.set(fileKey, { fileName, content: buf });
      res.statusCode = 200;
      res.end('OK');
      return true;
    }

    // 8. Create payment
    if (pathname === '/api/create-payment' && method === 'POST') {
      const body = await readJsonBody(req);
      const result = createPaymentInStore(
        store,
        body as Parameters<typeof createPaymentInStore>[1]
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // 9. Sandbox confirmation helper (Dev only: simulates NOWPayments IPN completion)
    if (pathname === '/api/sandbox/confirm-order' && method === 'POST') {
      const body = await readJsonBody(req);
      const orderId = String(body.order_id || '');
      const accessToken = String(body.token || '');
      const tx = findTransaction(store, orderId);
      if (!tx || tx.accessToken !== accessToken) {
        sendJson(res, 403, { error: 'Invalid order or access token' });
        return true;
      }
      const settled = settleTransaction(store, orderId, 'finished');
      sendJson(res, settled.status, settled.body);
      return true;
    }

    // 10. Order status (Requires guest access_token OR Buyer JWT matching buyer_email)
    if (pathname === '/api/order-status' && method === 'GET') {
      const orderId = parsedUrl.searchParams.get('order_id') || '';
      const accessToken = parsedUrl.searchParams.get('token') || '';
      if (!orderId) {
        sendJson(res, 400, { error: 'order_id is required' });
        return true;
      }
      const tx = findTransaction(store, orderId);
      if (!tx) {
        sendJson(res, 404, { error: 'Order not found' });
        return true;
      }

      const hasToken = Boolean(accessToken && accessToken === tx.accessToken);
      const auth = hasToken ? null : authenticateRequest(req);
      const hasJwtMatch = Boolean(auth && auth.user.email.toLowerCase() === tx.buyerEmail.toLowerCase());
      if (!hasToken && !hasJwtMatch) {
        sendJson(res, 403, { error: 'Forbidden: valid access token or buyer authentication required' });
        return true;
      }

      const product = store.products.find((p) => p.id === tx.productId);
      if (tx.status === 'finished') {
        sendJson(res, 200, {
          status: 'finished',
          order_id: tx.orderId,
          product_title: product?.title || 'Digital Asset',
          file_name: product?.fileInfo.fileName || 'archive.zip',
          license_key: tx.licenseKey,
          download_url: tx.downloadToken ? `/api/downloads/${tx.downloadToken}` : null,
        });
        return true;
      }
      sendJson(res, 200, { status: tx.status, order_id: tx.orderId });
      return true;
    }

    // 11. Authenticated Buyer Orders (JWT required, email strictly from JWT)
    if (pathname === '/api/orders/my' && method === 'GET') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized: sign in to view your purchases' });
        return true;
      }
      const orders: ReturnType<typeof toClientOrder>[] = [];
      for (const tx of store.transactions.values()) {
        if (tx.buyerEmail === auth.user.email.toLowerCase() && tx.status === 'finished') {
          const product = store.products.find((p) => p.id === tx.productId);
          orders.push(toClientOrder(tx, product));
        }
      }
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      sendJson(res, 200, { orders });
      return true;
    }

    // 12. Download asset
    if (pathname.startsWith('/api/downloads/') && method === 'GET') {
      const token = decodeURIComponent(pathname.replace('/api/downloads/', ''));
      const tx = findTransaction(store, token);
      if (!tx || tx.status !== 'finished') {
        sendJson(res, 403, { error: 'Download token invalid or order unpaid' });
        return true;
      }
      const product = store.products.find((p) => p.id === tx.productId);
      const fileName = product?.fileInfo.fileName || 'nexusbyte-package.txt';
      const content =
        product?.downloadContentSample ||
        `NexusByte Verified Digital Delivery\nOrder: ${tx.orderId}\nLicense Key: ${tx.licenseKey || 'N/A'}\n`;

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.end(content);
      return true;
    }

    // 13. Vendor onboarding
    if (pathname === '/api/vendor/onboarding' && method === 'POST') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return true;
      }
      const body = await readJsonBody(req);
      const result = onboardSellerInStore(
        store,
        auth.user.id,
        String(body.display_name || ''),
        String(body.wallet_address || '')
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    // 14. Vendor stats (JWT + Seller required)
    if (pathname === '/api/vendor/stats' && method === 'GET') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return true;
      }
      if (!auth.seller) {
        sendJson(res, 403, { error: 'Complete vendor onboarding first' });
        return true;
      }
      sendJson(res, 200, getVendorStatsFromStore(store, auth.seller));
      return true;
    }

    // 15. Withdraw (JWT + Seller required)
    if (pathname === '/api/withdraw' && method === 'POST') {
      const auth = authenticateRequest(req);
      if (!auth) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return true;
      }
      if (!auth.seller) {
        sendJson(res, 403, { error: 'Complete vendor onboarding first' });
        return true;
      }
      const body = await readJsonBody(req);
      const result = withdrawFromStore(
        store,
        auth.seller,
        Number(body.amount_to_withdraw)
      );
      sendJson(res, result.status, result.body);
      return true;
    }

    sendJson(res, 404, { error: 'Endpoint Not Found' });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    sendJson(res, 500, { error: 'Internal Server Error', details: message });
    return true;
  }
}

export function nexusbyteApiPlugin(): Plugin {
  return {
    name: 'nexusbyte-api-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next();
          return;
        }
        handleApiRequest(req, res).catch((err) => {
          sendJson(res, 500, {
            error: 'Internal Server Error',
            details: err instanceof Error ? err.message : String(err),
          });
        });
      });
    },
  };
}
