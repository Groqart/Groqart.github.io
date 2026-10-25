import React from 'react';
import { Star, Download, Key, ShieldCheck, Zap, ArrowRight, Eye, Code2 } from 'lucide-react';
import { Product } from '../types/marketplace';

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewDetails,
  onQuickBuy,
}) => {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/90 hover:shadow-xl hover:shadow-cyan-500/5">
      {/* Visual Header / Banner */}
      <div className={`relative mb-4 h-36 w-full overflow-hidden rounded-xl bg-gradient-to-br ${product.bannerGradient} p-4 flex flex-col justify-between shadow-inner`}>
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />

        <div className="relative z-10 flex items-center justify-between">
          <span className="rounded-full bg-slate-950/70 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-md border border-white/10">
            {product.category}
          </span>
          <span className="rounded-full bg-cyan-400/20 px-2 py-0.5 text-[11px] font-mono font-medium text-cyan-200 backdrop-blur-md border border-cyan-400/30">
            {product.version}
          </span>
        </div>

        <div className="relative z-10 flex items-end justify-between">
          <div className="flex items-center gap-1.5">
            {product.deliveryType === 'both' ? (
              <span className="inline-flex items-center gap-1 rounded bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                <Download className="h-3 w-3" /> + <Key className="h-3 w-3" /> File & License
              </span>
            ) : product.deliveryType === 'license_key' ? (
              <span className="inline-flex items-center gap-1 rounded bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-amber-300 border border-amber-500/30 backdrop-blur-md">
                <Key className="h-3 w-3" /> License Key
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded bg-slate-950/80 px-2 py-0.5 text-[11px] font-medium text-blue-300 border border-blue-500/30 backdrop-blur-md">
                <Download className="h-3 w-3" /> Direct Download
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-white/80 bg-slate-950/50 px-2 py-0.5 rounded">
            {product.fileInfo.fileSize}
          </span>
        </div>
      </div>

      {/* Title & Tagline */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1">
            {product.title}
          </h3>
        </div>
        <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
          {product.tagline}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {product.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/50"
            >
              {tag}
            </span>
          ))}
          {product.tags.length > 3 && (
            <span className="rounded bg-slate-800/40 px-1.5 py-0.5 text-[10px] text-slate-400">
              +{product.tags.length - 3}
            </span>
          )}
        </div>
      </div>

      {/* Vendor & Rating */}
      <div className="border-t border-slate-800/80 pt-3 pb-3 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <img
            src={product.vendorAvatar}
            alt={product.vendorName}
            className="h-5 w-5 rounded-full object-cover ring-1 ring-slate-700"
          />
          <span className="truncate max-w-[110px] font-medium text-slate-300">
            {product.vendorName}
          </span>
        </div>
        <div className="flex items-center gap-1 text-amber-400">
          <Star className="h-3.5 w-3.5 fill-amber-400" />
          <span className="font-semibold text-white">{product.rating}</span>
          <span className="text-[11px] text-slate-400">({product.reviewsCount})</span>
        </div>
      </div>

      {/* Pricing & Actions */}
      <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-800/60">
        <div>
          <div className="text-lg font-bold text-white tracking-tight">
            ${product.priceUSD}
            <span className="text-[11px] font-normal text-slate-400 ml-1">USD</span>
          </div>
          <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
            <Zap className="h-2.5 w-2.5" />
            {product.priceUSD} USDT
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewDetails(product)}
            aria-label={`View details for ${product.title}`}
            className="flex h-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs font-medium text-slate-300 hover:border-slate-600 hover:text-white transition"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Details
          </button>
          <button
            onClick={() => onQuickBuy(product)}
            aria-label={`Buy ${product.title} with OxaPay`}
            className="flex h-9 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/25 transition"
          >
            <ShieldCheck className="h-3.5 w-3.5 mr-1 text-cyan-200" />
            Buy
          </button>
        </div>
      </div>
    </div>
  );
};
