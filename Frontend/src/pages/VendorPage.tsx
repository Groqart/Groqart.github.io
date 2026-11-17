import React from 'react';
import { useNavigate } from 'react-router';
import { VendorDashboard } from '../components/VendorDashboard';
import { useMarketplace } from '../context/MarketplaceContext';

export const VendorPage: React.FC = () => {
  const navigate = useNavigate();
  const { products, removeProduct, addProduct, fetchProducts } = useMarketplace();

  return (
    <VendorDashboard
      products={products}
      onProductDeleted={(id) => removeProduct(id)}
      onProductCreated={(newProd) => addProduct(newProd)}
      onProductUpdated={() => {
        fetchProducts();
      }}
      onViewProduct={(p) => navigate(`/product/${p.id}`)}
    />
  );
};
