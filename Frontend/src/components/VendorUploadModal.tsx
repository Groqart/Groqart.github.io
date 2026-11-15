import React, { useState, useEffect } from 'react';
import { X, Upload, Lock, FileArchive } from 'lucide-react';
import { ProductCategory, DeliveryType, LicenseType, Product } from '../types/marketplace';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface VendorUploadModalProps {
  onClose: () => void;
  onProductCreated: (newProduct: Product) => void;
}

export const VendorUploadModal: React.FC<VendorUploadModalProps> = ({
  onClose,
  onProductCreated,
}) => {
  const [vendorToken, setVendorToken] = useState('');
  const [sellerId, setSellerId] = useState('vendor_default');
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState(49);
  const [category, setCategory] = useState<ProductCategory>('Scripts & Code');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('both');
  const [licenseType] = useState<LicenseType>('Commercial');
  const [version, setVersion] = useState('v1.0.0');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setVendorToken(localStorage.getItem('nexusbyte_vendor_token') || '');
      setSellerId(localStorage.getItem('nexusbyte_vendor_id') || 'vendor_default');
    }
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!vendorToken.trim()) {
      setErrorMsg('Enter your MARKETPLACE_SECRET_TOKEN to authorize upload.');
      return;
    }
    if (!selectedFile) {
      setErrorMsg('Please attach a digital product file (.zip, .tar.gz, .pdf, etc.).');
      return;
    }
    if (!title.trim() || priceUSD <= 0) return;

    localStorage.setItem('nexusbyte_vendor_token', vendorToken.trim());
    localStorage.setItem('nexusbyte_vendor_id', sellerId.trim() || 'vendor_default');

    try {
      setIsSubmitting(true);

      // 1. Запрашиваем временную ссылку на загрузку в Backblaze B2
      setUploadProgress('1/3 Requesting Backblaze B2 upload link...');
      const urlRes = await fetch(`${API_BASE}/api/upload-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-marketplace-token': vendorToken.trim(),
        },
        body: JSON.stringify({ fileName: selectedFile.name }),
      });

      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData.uploadUrl || !urlData.fileKey) {
        throw new Error(urlData.error || 'Failed to get Backblaze B2 upload URL');
      }

      // 2. Загружаем файл напрямую в Backblaze B2
      setUploadProgress(`2/3 Uploading ${selectedFile.name} to Backblaze B2...`);
      const putRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
      });

      if (!putRes.ok) {
        throw new Error(`Backblaze B2 rejected upload (HTTP ${putRes.status}). Check B2 CORS settings.`);
      }

      // 3. Сохраняем метаданные товара в базу D1
      setUploadProgress('3/3 Saving product to Cloudflare D1...');
      const fileSizeStr = formatBytes(selectedFile.size);
      const createRes = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-marketplace-token': vendorToken.trim(),
        },
        body: JSON.stringify({
          seller_id: sellerId.trim() || 'vendor_default',
          title: title.trim(),
          tagline: tagline.trim() || 'Digital software package',
          description: description.trim() || title.trim(),
          priceUSD: Number(priceUSD),
          category,
          deliveryType,
          version,
          b2_file_key: urlData.fileKey,
          fileName: selectedFile.name,
          fileSize: fileSizeStr,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        throw new Error(createData.error || 'Failed to save product to D1 database');
      }

      const createdProduct: Product = {
        id: createData.id,
        slug: createData.id,
        title: title.trim(),
        tagline: tagline.trim() || 'Digital software package',
        description: description.trim() || title.trim(),
        priceUSD: Number(priceUSD),
        category,
        deliveryType,
        licenseType,
        version,
        fileInfo: {
          fileName: selectedFile.name,
          fileSize: fileSizeStr,
          format: 'Archive',
        },
        vendorId: sellerId.trim() || 'vendor_default',
        vendorName: sellerId.trim() || 'vendor_default',
        vendorAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
        rating: 5.0,
        reviewsCount: 1,
        salesCount: 0,
        bannerGradient: 'from-cyan-600 via-blue-600 to-indigo-700',
        tags: [category],
        features: ['Instant crypto checkout via NOWPayments', 'Protected Backblaze B2 delivery'],
        changelog: [],
        downloadContentSample: '',
        createdAt: new Date().toISOString(),
      };

      onProductCreated(createdProduct);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Upload failed');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload to Backblaze B2 & Publish</h3>
              <p className="text-xs text-slate-400">File goes directly to private B2 storage; metadata saved to D1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close upload modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 p-3 text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Авторизация продавца */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div>
              <label className="text-slate-300 font-semibold flex items-center gap-1 mb-1">
                <Lock className="h-3 w-3 text-cyan-400" />
                Vendor Secret Token *
              </label>
              <input
                type="password"
                required
                value={vendorToken}
                onChange={(e) => setVendorToken(e.target.value)}
                placeholder="MARKETPLACE_SECRET_TOKEN"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Seller ID</label>
              <input
                type="text"
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                placeholder="vendor_default"
                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Выбор файла */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Digital Product File *</label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-cyan-500/40 bg-slate-950 px-4 py-3 hover:border-cyan-400 transition">
              <div className="flex items-center gap-2.5">
                <FileArchive className="h-5 w-5 text-cyan-400" />
                <span className="text-slate-200">
                  {selectedFile
                    ? `${selectedFile.name} (${formatBytes(selectedFile.size)})`
                    : 'Click to select .zip / .tar.gz / .pdf file'}
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <span className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                Browse
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js 15 MicroSaaS Starter"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Scripts & Code">Scripts & Code</option>
                <option value="SaaS Starters">SaaS Starters</option>
                <option value="Bots & Automation">Bots & Automation</option>
                <option value="3D & Game Assets">3D & Game Assets</option>
                <option value="UI Kits & Design">UI Kits & Design</option>
                <option value="APIs & Microservices">APIs & Microservices</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Short Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Short summary for product card"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Price (USD) *</label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={priceUSD}
                onChange={(e) => setPriceUSD(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Delivery</label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="both">File + License Key</option>
                <option value="file">File Only</option>
                <option value="license_key">License Key</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-semibold block mb-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what's inside the archive..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {uploadProgress && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-3 text-cyan-300 font-mono">
              {uploadProgress}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 font-medium text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? 'Uploading...' : 'Upload & Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
