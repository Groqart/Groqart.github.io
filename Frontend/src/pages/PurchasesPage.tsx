import React from 'react';
import { useNavigate } from 'react-router';
import { PurchasesVault } from '../components/PurchasesVault';
import { useMarketplace } from '../context/MarketplaceContext';

export const PurchasesPage: React.FC = () => {
  const navigate = useNavigate();
  const { orders, fetchOrders } = useMarketplace();

  return (
    <PurchasesVault
      orders={orders}
      onBrowseMarketplace={() => navigate('/')}
      onRefreshOrders={fetchOrders}
    />
  );
};
