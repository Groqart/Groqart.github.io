import React from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { MarketplaceProvider } from './context/MarketplaceContext';
import { Layout } from './components/Layout';
import { MarketplacePage } from './pages/MarketplacePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { VendorPage } from './pages/VendorPage';
import { GatewayPage } from './pages/GatewayPage';

export default function App() {
  return (
    <MarketplaceProvider>
      <Routes>
        <Route element={<Layout />}>
          {/* Главная страница каталога */}
          <Route path="/" element={<MarketplacePage />} />

          {/* Страница детального просмотра товара */}
          <Route path="/product/:id" element={<ProductDetailPage />} />

          {/* Библиотека покупок */}
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/library" element={<Navigate to="/purchases" replace />} />

          {/* Панель вендора */}
          <Route path="/vendor" element={<VendorPage />} />

          {/* Шлюз NOWPayments и симулятор */}
          <Route path="/gateway" element={<GatewayPage />} />
          <Route path="/nowpayments" element={<Navigate to="/gateway" replace />} />
          <Route path="/oxapay" element={<Navigate to="/gateway" replace />} />

          {/* Fallback 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </MarketplaceProvider>
  );
}
