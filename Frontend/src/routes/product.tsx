import React from 'react';
import type { MetaFunction } from "react-router";
import { useParams, useNavigate } from 'react-router';
import { ProductDetailModal } from '../components/ProductDetailModal';
import { useMarketplace } from '../context/MarketplaceContext';
import { INITIAL_PRODUCTS } from '../data/initialProducts';

// Мета-теги для поисковиков генерируются прямо при сборке в HTML:
export const meta: MetaFunction = ({ params }) => {
  const prod = INITIAL_PRODUCTS.find((p) => p.id === params.id);
  if (!prod) return [{ title: "Product Not Found" }];

  return [
    { title: `${prod.title} — Buy with Crypto on NexusByte` },
    { name: "description", content: prod.description },
    { property: "og:title", content: prod.title },
    { property: "og:description", content: prod.tagline },
  ];
};

export default function ProductRoute() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, initiateBuy } = useMarketplace();

  const product = products.find((p) => p.id === id || p.slug === id);

  if (!product) {
    return (
      <div className="py-20 text-center text-xs text-slate-400">
        Product not found. <button onClick={() => navigate('/')} className="text-cyan-400 underline">Return</button>
      </div>
    );
  }

  // Данные для ИИ-краулеров (GEO)
  const schemaOrgData = {
    "@context": "https://schema.org/",
    "@type": "SoftwareApplication",
    "name": product.title,
    "description": product.description,
    "applicationCategory": product.category,
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": product.priceUSD,
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock",
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": product.rating,
      "reviewCount": product.reviewsCount,
    },
  };

  return (
    <>
      {/* ИИ (GPTBot, Perplexity) прочитает этот тег прямо из готового HTML без выполнения JS */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrgData) }}
      />
      <ProductDetailModal
        product={product}
        onClose={() => navigate(-1)}
        onBuy={(p, cur) => initiateBuy(p, cur)}
      />
    </>
  );
}
