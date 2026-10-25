import React, { useState } from 'react';
import { X, Upload, Plus, Trash2, Code2, ShieldCheck, Key, Download } from 'lucide-react';
import { ProductCategory, DeliveryType, LicenseType, Product } from '../types/marketplace';

interface VendorUploadModalProps {
  onClose: () => void;
  onProductCreated: (newProduct: Product) => void;
}

export const VendorUploadModal: React.FC<VendorUploadModalProps> = ({
  onClose,
  onProductCreated,
}) => {
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState(49);
  const [category, setCategory] = useState<ProductCategory>('Scripts & Code');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('both');
  const [licenseType, setLicenseType] = useState<LicenseType>('Commercial');
  const [version, setVersion] = useState('v1.0.0');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('15.4 MB');
  const [fileFormat, setFileFormat] = useState('ZIP Source Archive');
  const [features, setFeatures] = useState<string[]>([
    'Clean modular architecture with full TypeScript types',
    'Instant OxaPay webhook payment verification',
  ]);
  const [newFeatureText, setNewFeatureText] = useState('');
  const [tagsInput, setTagsInput] = useState('TypeScript, Node.js, OxaPay');
  const [codeSnippet, setCodeSnippet] = useState(
    `export async function handlePayment(webhookPayload) {\n  console.log("Verified digital good delivery:", webhookPayload.trackId);\n}`
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddFeature = () => {
    if (newFeatureText.trim()) {
      setFeatures([...features, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || priceUSD <= 0) return;

    try {
      setIsSubmitting(true);
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const generatedFileName = fileName.trim() || `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${version}.zip`;

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          tagline,
          description,
          priceUSD: Number(priceUSD),
          category,
          deliveryType,
          licenseType,
          version,
          fileName: generatedFileName,
          fileSize,
          fileFormat,
          tags: tags.length ? tags : ['Software', 'Digital Good'],
          features,
          codeSnippetPreview: {
            language: 'typescript',
            filename: 'index.ts',
            code: codeSnippet,
          },
          downloadContentSample: `=====================================================\n${title.toUpperCase()} ${version}\n=====================================================\nDigital product delivered securely via NexusByte.\nLicense: ${licenseType}\nThank you for supporting independent software creators!`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onProductCreated(data.product);
        onClose();
      }
    } catch (err) {
      console.error('Failed to create product', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Publish New Digital Good</h3>
              <p className="text-xs text-slate-400">Configure file package, license keys, and OxaPay crypto pricing</p>
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
          {/* Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-slate-300 font-semibold block mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js 15 MicroSaaS Starter"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
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

          {/* Tagline */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Short Tagline</label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Production-ready boilerplate with automated crypto billing"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Price, Version & Delivery Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Price (USD) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400">$</span>
                <input
                  type="number"
                  min="1"
                  required
                  value={priceUSD}
                  onChange={(e) => setPriceUSD(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-7 pr-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Release Version</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="v1.0.0"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-semibold block mb-1">Delivery Mechanism</label>
              <select
                value={deliveryType}
                onChange={(e) => setDeliveryType(e.target.value as DeliveryType)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="both">File Download + License Key</option>
                <option value="file">File Download Only</option>
                <option value="license_key">License Key Only</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Product Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your software, features, tech stack, and what is inside the package..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* File Name & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-semibold block mb-1">Package File Name</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. app-source-v1.zip"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-slate-300 font-semibold block mb-1">File Size & Format</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                  placeholder="14.5 MB"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={fileFormat}
                  onChange={(e) => setFileFormat(e.target.value)}
                  placeholder="ZIP Archive"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Tags (comma separated)</label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="React, Next.js, Python, Crypto"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Features Bullets */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">Key Feature Highlights</label>
            <div className="space-y-1.5 mb-2">
              {features.map((feat, idx) => (
                <div key={idx} className="flex items-center justify-between rounded bg-slate-950 px-3 py-1.5 border border-slate-800">
                  <span className="text-slate-300">{feat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeatureText}
                onChange={(e) => setNewFeatureText(e.target.value)}
                placeholder="Add another feature bullet point..."
                className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="rounded-lg bg-slate-800 px-3 py-1.5 font-medium text-slate-200 hover:bg-slate-700"
              >
                Add
              </button>
            </div>
          </div>

          {/* Submit */}
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
              {isSubmitting ? 'Publishing...' : 'Publish to Marketplace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
