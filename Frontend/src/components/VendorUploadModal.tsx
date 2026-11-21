import React, { useState } from 'react';
import { X, Upload, FileArchive, ShieldAlert, Plus, Trash2, ShieldCheck } from 'lucide-react';
import type {
  ProductCategory,
  DeliveryType,
  LicenseType,
  Product,
  ProductLicenseTier,
} from '../types/marketplace';
import { useMarketplace } from '../context/MarketplaceContext';
import { API_BASE } from '../utils/apiBase';
import { getHardenedPriceHandlers } from '../utils/priceInput';

const BANNER_GRADIENTS = [
  { label: 'Cyan / Indigo', value: 'from-cyan-600 via-blue-600 to-indigo-700' },
  { label: 'Blue / Purple', value: 'from-blue-600 via-indigo-600 to-purple-700' },
  { label: 'Emerald / Teal', value: 'from-emerald-600 via-teal-600 to-cyan-700' },
  { label: 'Amber / Rose', value: 'from-amber-600 via-orange-600 to-rose-700' },
  { label: 'Violet / Purple', value: 'from-violet-600 via-purple-600 to-indigo-800' },
  { label: 'Fuchsia / Rose', value: 'from-fuchsia-600 via-pink-600 to-rose-600' },
];

interface VendorUploadModalProps {
  onClose: () => void;
  onProductCreated: (newProduct: Product) => void;
}

export const VendorUploadModal: React.FC<VendorUploadModalProps> = ({
  onClose,
  onProductCreated,
}) => {
  const { authToken, seller, user } = useMarketplace();
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [priceUSD, setPriceUSD] = useState(49);
  const [category, setCategory] = useState<ProductCategory>('Scripts & Code');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('both');
  const [licenseType] = useState<LicenseType>('Commercial');
  const [version, setVersion] = useState('v1.0.0');
  const [bannerGradient, setBannerGradient] = useState(BANNER_GRADIENTS[0].value);
  const [tagsInput, setTagsInput] = useState('');
  const [featuresInput, setFeaturesInput] = useState('');
  const [changelogNote, setChangelogNote] = useState('Initial public release');
  const [snippetLanguage, setSnippetLanguage] = useState('typescript');
  const [snippetFilename, setSnippetFilename] = useState('');
  const [snippetCode, setSnippetCode] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [previewMediaUrl, setPreviewMediaUrl] = useState('');
  const [licenseTiers, setLicenseTiers] = useState<ProductLicenseTier[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAutoPublished = Boolean(seller?.isTrusted || user?.role === 'admin');

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!authToken || !seller) {
      setErrorMsg('Authenticated vendor session required.');
      return;
    }
    if (!selectedFile && !repoUrl.trim()) {
      setErrorMsg('Attach a digital archive (.zip, .tar.gz, .pdf) OR provide a private GitHub repository URL.');
      return;
    }
    if (!title.trim() || priceUSD <= 0) {
      setErrorMsg('Product title and positive USD price are required.');
      return;
    }

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const parsedFeatures = featuresInput
      .split('\n')
      .map((f) => f.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);

      let uploadedFileKey = '';
      let fileSizeStr = 'GitHub Repo';

      if (selectedFile) {
        // 1. Request presigned Backblaze B2 PUT upload URL
        setUploadProgress('1/3 Requesting Backblaze B2 upload link...');
        const urlRes = await fetch(`${API_BASE}/api/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ fileName: selectedFile.name }),
        });

        const urlData = await urlRes.json();
        if (!urlRes.ok || !urlData.uploadUrl || !urlData.fileKey) {
          throw new Error(urlData.error || 'Failed to get Backblaze B2 upload URL');
        }

        // 2. Upload file directly to Backblaze B2
        setUploadProgress(`2/3 Scanning & uploading ${selectedFile.name} to Backblaze B2...`);
        const putRes = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          body: selectedFile,
        });

        if (!putRes.ok) {
          throw new Error(`Backblaze B2 rejected upload (HTTP ${putRes.status}). Check B2 CORS settings.`);
        }
        uploadedFileKey = urlData.fileKey;
        fileSizeStr = formatBytes(selectedFile.size);
      }

      // 3. Persist product metadata in D1
      setUploadProgress('3/3 Verifying package & saving product...');
      const createRes = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          tagline: tagline.trim() || 'Digital software package',
          description: description.trim() || title.trim(),
          priceUSD: Number(priceUSD),
          category,
          deliveryType,
          version: version.trim() || 'v1.0.0',
          b2_file_key: uploadedFileKey || undefined,
          fileName: selectedFile?.name || 'github-repo-access.txt',
          fileSize: fileSizeStr,
          bannerGradient,
          demoUrl: demoUrl.trim() || undefined,
          repoUrl: repoUrl.trim() || undefined,
          previewMediaUrl: previewMediaUrl.trim() || undefined,
          licenseTiers: licenseTiers.filter((t) => t.name.trim() && t.priceUSD > 0),
          tags: parsedTags,
          features: parsedFeatures,
          changelogNote: changelogNote.trim() || 'Initial release',
          codeSnippet: snippetCode.trim()
            ? {
                language: snippetLanguage.trim() || 'typescript',
                filename: snippetFilename.trim() || 'example.ts',
                code: snippetCode,
              }
            : undefined,
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || !createData.id) {
        throw new Error(createData.error || 'Failed to save product to database');
      }

      const createdProduct: Product = createData.product || {
        id: createData.id,
        slug: createData.id,
        title: title.trim(),
        tagline: tagline.trim() || 'Digital software package',
        description: description.trim() || title.trim(),
        priceUSD: Number(priceUSD),
        category,
        deliveryType,
        licenseType,
        version: version.trim() || 'v1.0.0',
        status: createData.status || (isAutoPublished ? 'published' : 'pending_review'),
        fileInfo: {
          fileName: selectedFile?.name || 'github-repo-access.txt',
          fileSize: createData.fileSize || 'GitHub Repo',
          format: repoUrl.trim() && !selectedFile ? 'GitHub Repo' : 'Archive',
        },
        vendorId: seller.id,
        vendorName: seller.displayName,
        vendorAvatar: '',
        isTrustedVendor: Boolean(seller.isTrusted),
        rating: 0,
        reviewsCount: 0,
        salesCount: 0,
        bannerGradient,
        tags: parsedTags.length > 0 ? parsedTags : [category],
        features:
          parsedFeatures.length > 0
            ? parsedFeatures
            : ['Instant crypto checkout via NOWPayments', 'Protected Backblaze B2 delivery'],
        changelog: [
          {
            version: version.trim() || 'v1.0.0',
            date: new Date().toISOString().slice(0, 10),
            changes: [changelogNote.trim() || 'Initial release'],
          },
        ],
        downloadContentSample: '',
        createdAt: new Date().toISOString(),
      };

      onProductCreated(createdProduct);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsSubmitting(false);
      setUploadProgress('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-upload-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h3 id="vendor-upload-title" className="text-base font-bold text-white">
                Upload to Backblaze B2 &amp; Publish
              </h3>
              <p className="text-xs text-slate-400">
                Publishing as <span className="text-cyan-300 font-semibold">{seller?.displayName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close upload modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          {!isAutoPublished && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/25 p-3 text-amber-200">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                New creator accounts start with manual trust review. Your upload will enter{' '}
                <strong>pending_review</strong> until approved by an admin.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 p-3 text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* File Selector or GitHub Repo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="vendor-file-input" className="text-slate-300 font-semibold">
                Digital Product Archive (.zip / .tar.gz / .pdf — max 500 MB)
              </label>
              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Auto Malware Check
              </span>
            </div>
            <label
              htmlFor="vendor-file-input"
              className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-cyan-500/40 bg-slate-950 px-4 py-3 hover:border-cyan-400 transition"
            >
              <div className="flex items-center gap-2.5">
                <FileArchive className="h-5 w-5 text-cyan-400" />
                <span className="text-slate-200">
                  {selectedFile
                    ? `${selectedFile.name} (${formatBytes(selectedFile.size)})`
                    : 'Click to select archive (or link a private GitHub repo below)'}
                </span>
              </div>
              <input
                id="vendor-file-input"
                type="file"
                className="sr-only"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <span className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                Browse
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="upload-title" className="text-slate-300 font-semibold block mb-1">
                Product Title *
              </label>
              <input
                id="upload-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Next.js 15 MicroSaaS Starter"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="upload-category" className="text-slate-300 font-semibold block mb-1">
                Category
              </label>
              <select
                id="upload-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Scripts & Code">Scripts &amp; Code</option>
                <option value="SaaS Starters">SaaS Starters</option>
                <option value="Bots & Automation">Bots &amp; Automation</option>
                <option value="3D & Game Assets">3D &amp; Game Assets</option>
                <option value="UI Kits & Design">UI Kits &amp; Design</option>
                <option value="APIs & Microservices">APIs &amp; Microservices</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="upload-tagline" className="text-slate-300 font-semibold block mb-1">
              Short Tagline
            </label>
            <input
              id="upload-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Short summary for product card"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="upload-price" className="text-slate-300 font-semibold block mb-1">
                Price (USD) *
              </label>
              <input
                id="upload-price"
                type="number"
                min="1"
                step="0.01"
                inputMode="decimal"
                required
                value={priceUSD}
                {...getHardenedPriceHandlers((cleaned) => setPriceUSD(Number(cleaned) || 0))}
                onChange={(e) => setPriceUSD(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="upload-version" className="text-slate-300 font-semibold block mb-1">
                Version
              </label>
              <input
                id="upload-version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="upload-delivery" className="text-slate-300 font-semibold block mb-1">
                Delivery
              </label>
              <select
                id="upload-delivery"
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

          {/* Banner Gradient Picker */}
          <div>
            <span className="text-slate-300 font-semibold block mb-1.5">Card Banner Theme</span>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BANNER_GRADIENTS.map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => setBannerGradient(bg.value)}
                  aria-label={`Banner theme ${bg.label}`}
                  className={`h-8 rounded-lg bg-gradient-to-br ${bg.value} border-2 transition cursor-pointer ${
                    bannerGradient === bg.value ? 'border-white scale-105' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="upload-tags" className="text-slate-300 font-semibold block mb-1">
                Tags (comma-separated)
              </label>
              <input
                id="upload-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="TypeScript, Cloudflare, SaaS"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="upload-changelog" className="text-slate-300 font-semibold block mb-1">
                Initial Changelog Note
              </label>
              <input
                id="upload-changelog"
                type="text"
                value={changelogNote}
                onChange={(e) => setChangelogNote(e.target.value)}
                placeholder="Initial public release"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="upload-features" className="text-slate-300 font-semibold block mb-1">
              Key Features (one per line)
            </label>
            <textarea
              id="upload-features"
              rows={2}
              value={featuresInput}
              onChange={(e) => setFeaturesInput(e.target.value)}
              placeholder={'Zero-dependency Worker\nFull TypeScript source'}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="upload-demo-url" className="text-slate-300 font-semibold block mb-1">
                Live Demo URL
              </label>
              <input
                id="upload-demo-url"
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://demo.yourapp.dev"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="upload-repo-url" className="text-slate-300 font-semibold block mb-1">
                Private GitHub Repo
              </label>
              <input
                id="upload-repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="upload-media-url" className="text-slate-300 font-semibold block mb-1">
                Cover Image / Media URL
              </label>
              <input
                id="upload-media-url"
                type="url"
                value={previewMediaUrl}
                onChange={(e) => setPreviewMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Multi-Tier License Pricing */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">
                License Tiers (Optional — e.g. Personal vs Commercial)
              </span>
              <button
                type="button"
                onClick={() =>
                  setLicenseTiers((prev) => [
                    ...prev,
                    {
                      id: `tier_${Date.now()}_${prev.length}`,
                      name: prev.length === 0 ? 'Personal' : 'Commercial',
                      priceUSD: prev.length === 0 ? priceUSD : Math.round(priceUSD * 2),
                    },
                  ])
                }
                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:bg-slate-700 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Tier
              </button>
            </div>
            {licenseTiers.map((tier, idx) => (
              <div key={tier.id} className="grid grid-cols-12 gap-2 items-center">
                <input
                  type="text"
                  value={tier.name}
                  placeholder="Tier name"
                  onChange={(e) =>
                    setLicenseTiers((prev) =>
                      prev.map((t, i) => (i === idx ? { ...t, name: e.target.value } : t))
                    )
                  }
                  className="col-span-6 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-white"
                />
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  value={tier.priceUSD}
                  {...getHardenedPriceHandlers((cleaned) =>
                    setLicenseTiers((prev) =>
                      prev.map((t, i) => (i === idx ? { ...t, priceUSD: Number(cleaned) || 0 } : t))
                    )
                  )}
                  onChange={(e) =>
                    setLicenseTiers((prev) =>
                      prev.map((t, i) => (i === idx ? { ...t, priceUSD: Number(e.target.value) } : t))
                    )
                  }
                  className="col-span-4 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 font-mono text-white"
                />
                <button
                  type="button"
                  aria-label={`Remove tier ${tier.name}`}
                  onClick={() => setLicenseTiers((prev) => prev.filter((_, i) => i !== idx))}
                  className="col-span-2 flex justify-center rounded-lg p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div>
            <label htmlFor="upload-description" className="text-slate-300 font-semibold block mb-1">
              Description (supports Markdown)
            </label>
            <textarea
              id="upload-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="### Features&#10;- Built with TypeScript..."
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Optional Code Preview */}
          <details className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <summary className="cursor-pointer font-semibold text-slate-300">
              Optional: Code Snippet Preview (for Developer Products)
            </summary>
            <div className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  aria-label="Snippet language"
                  value={snippetLanguage}
                  onChange={(e) => setSnippetLanguage(e.target.value)}
                  placeholder="typescript / python / rust"
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="text"
                  aria-label="Snippet filename"
                  value={snippetFilename}
                  onChange={(e) => setSnippetFilename(e.target.value)}
                  placeholder="src/client.ts"
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <textarea
                rows={3}
                aria-label="Snippet code"
                value={snippetCode}
                onChange={(e) => setSnippetCode(e.target.value)}
                placeholder="Paste a short code sample shown on the product page..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] text-cyan-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </details>

          {uploadProgress && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-3 text-cyan-300 font-mono">
              {uploadProgress}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 font-medium text-slate-400 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Uploading...' : isAutoPublished ? 'Upload & Publish' : 'Submit for Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
