import React from 'react';
import { NowPaymentsDocsAndSimulator } from '../components/NowPaymentsDocsAndSimulator';
import { useMarketplace } from '../context/MarketplaceContext';

export const GatewayPage: React.FC = () => {
  const { orders, fetchOrders, fetchProducts } = useMarketplace();

  return (
    <NowPaymentsDocsAndSimulator
      orders={orders}
      onOrderUpdated={() => {
        fetchOrders();
        fetchProducts();
      }}
    />
  );
};
