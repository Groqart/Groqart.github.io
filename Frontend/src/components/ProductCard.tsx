import React, { useState } from 'react';
import {
  Star,
  Download,
  Key,
  BadgeCheck,
  Bookmark,
  Eye,
  ShoppingBag,
  Forward,
  Check,
} from 'lucide-react';
import type { Product } from '../types/marketplace';
import { getCreatorInitials } from '../utils/catalogLogic';

interface ProductCardProps {
  product: Product;
  isSaved?: boolean;
  onViewDetails: (product: Product) => void;
  onQuickBuy: (product: Product) => void;
  onToggleSave?: (product: Product) => void;
  onShareLink?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSaved = false,
  onViewDetails,
  onQuickBuy,
  onToggleSave,
  onShareLink,
}) => {
  const [linkCopied, setLinkCopied] = useState(false);

  const deliveryLabel =
    product.deliveryType === 'both'
      ? 'File + License Key'
      : product.deliveryType === 'license_key'
      ? 'License Key'
      : 'Direct Download';

  const metadataLine = [product.category, ...product.tags.slice(0, 2)].join(' · ');

  const handleShare = () => {
    onShareLink?.(product);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-cyan-500/50 hover:shadow-lg dark:border-slate-800/90 dark:bg-[#111827] dark:hover:border-cyan-500/40">
      {/* 16:9 Visual Thumbnail Preview */}
      <button
        type="button"
        onClick={() => onViewDetails(product)}
        aria-label={`Inspect ${product.title}`}
        className={`relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br ${product.bannerGradient} p-4 text-left flex flex-col justify-between cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-500`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent" />

        <div className="relative z-10 flex items-center justify-between text-xs text-white/95">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-950/70 px-2.5 py-1 text-[11px] font-medium backdrop-blur-sm">
            {product.deliveryType === 'license_key' ? (
              <Key className="h-3 w-3 text-amber-300" />
            ) : (
              <Download className="h-3 w-3 text-cyan-300" />
            )}
            <span>{deliveryLabel}</span>
          </span>
          <span className="rounded-md bg-slate-950/70 px-2 py-1 font-mono text-[11px] text-slate-200 tabular-nums backdrop-blur-sm">
            {product.version}
          </span>
        </div>

        <div className="relative z-10 flex items-end justify-between gap-3">
          <span className="font-mono text-[11px] text-white/90 truncate">
            {product.fileInfo.fileName}
          </span>
          <span className="font-mono text-[11px] text-white/90 tabular-nums shrink-0">
            {product.fileInfo.fileSize}
          </span>
        </div>
      </button>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4">
        {/* Title */}
        <button
          type="button"
          onClick={() => onViewDetails(product)}
          className="text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-500 rounded"
        >
          <h2 className="font-display text-base font-semibold text-slate-900 group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-300 transition-colors line-clamp-1">
            {product.title}
          </h2>
        </button>

        {/* Quiet unboxed metadata line */}
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
          {metadataLine}
        </p>

        {/* Short description */}
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300/90 line-clamp-2 leading-relaxed">
          {product.tagline}
        </p>

        {/* Creator + Rating row */}
        <div className="mt-auto pt-4 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-cyan-300"
            >
              {getCreatorInitials(product.vendorName)}
            </div>
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
              {product.vendorName}
            </span>
            {product.isTrustedVendor && (
              <BadgeCheck
                className="h-3.5 w-3.5 shrink-0 text-cyan-600 dark:text-cyan-400"
                aria-label="Verified creator"
              />
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 tabular-nums text-slate-600 dark:text-slate-400">
            {product.reviewsCount > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                <span className="font-semibold text-slate-900 dark:text-white">
                  {product.rating.toFixed(1)}
                </span>
                <span>({product.reviewsCount})</span>
              </span>
            ) : (
              <span className="text-cyan-700 dark:text-cyan-300 font-medium">New</span>
            )}
            {product.salesCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span>{product.salesCount} sold</span>
              </>
            )}
          </div>
        </div>

        {/* Price & Action Row */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="shrink-0 text-lg font-bold text-slate-950 dark:text-white tabular-nums leading-none">
            ${product.priceUSD}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onQuickBuy(product)}
              aria-label={`Buy ${product.title}`}
              className="flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#0EA5E9] px-2.5 text-xs font-semibold text-white hover:bg-[#0284C7] transition cursor-pointer whitespace-nowrap"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Buy Now</span>
            </button>
            <button
              type="button"
              onClick={() => onViewDetails(product)}
              aria-label={`Details for ${product.title}`}
              className="flex h-9 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white transition cursor-pointer whitespace-nowrap"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Details</span>
            </button>
            {onShareLink && (
              <button
                type="button"
                onClick={handleShare}
                aria-label={`Share link to ${product.title}`}
                title="Share product link"
                className={`flex h-9 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
                  linkCopied
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                {linkCopied ? <Check className="h-4 w-4" /> : <Forward className="h-4 w-4" />}
              </button>
            )}
            {onToggleSave && (
              <button
                type="button"
                onClick={() => onToggleSave(product)}
                aria-label={isSaved ? `Remove ${product.title} from saved` : `Save ${product.title}`}
                aria-pressed={isSaved}
                title={isSaved ? 'Saved' : 'Save item'}
                className={`flex h-9 w-8 items-center justify-center rounded-xl border transition cursor-pointer ${
                  isSaved
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${isSaved ? 'fill-current' : ''}`} />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};
