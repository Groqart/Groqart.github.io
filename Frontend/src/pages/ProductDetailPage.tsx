import React from 'react';
import { useParams, useNavigate } from 'react-router';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { useMarketplace } from '../context/MarketplaceContext';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, initiateBuy } = useMarketplace();

  const product = products.find((p) => p.id === id || p.slug === id);

  if (!product) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Product Not Found</h2>
        <p className="text-xs text-slate-400 mb-6">The product you requested does not exist or was removed.</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <ProductDetailModal
      product={product}
      onClose={() => navigate(-1)}
      onBuy={(p, cur) => initiateBuy(p, cur)}
    />
  );
};
