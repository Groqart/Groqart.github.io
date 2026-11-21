import React, { useState } from 'react';
import { X, Pencil, FileArchive, Loader2, Plus, Trash2 } from 'lucide-react';
import type {
  Product,
  ProductCategory,
  DeliveryType,
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

interface VendorEditProductModalProps {
  product: Product;
  onClose: () => void;
  onProductUpdated: (updated: Product) => void;
}

export const VendorEditProductModal: React.FC<VendorEditProductModalProps> = ({
  product,
  onClose,
  onProductUpdated,
}) => {
  const { authToken, showToast } = useMarketplace();
  const [title, setTitle] = useState(product.title);
  const [tagline, setTagline] = useState(product.tagline);
  const [description, setDescription] = useState(product.description);
  const [priceUSD, setPriceUSD] = useState(product.priceUSD);
  const [category, setCategory] = useState<ProductCategory>(product.category);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>(product.deliveryType);
  const [version, setVersion] = useState(product.version);
  const [bannerGradient, setBannerGradient] = useState(product.bannerGradient);
  const [tagsInput, setTagsInput] = useState(product.tags.join(', '));
  const [featuresInput, setFeaturesInput] = useState(product.features.join('\n'));
  const [changelogNote, setChangelogNote] = useState('');
  const [notifyBuyers, setNotifyBuyers] = useState(false);
  const [snippetLanguage, setSnippetLanguage] = useState(
    product.codeSnippetPreview?.language || 'typescript'
  );
  const [snippetFilename, setSnippetFilename] = useState(
    product.codeSnippetPreview?.filename || ''
  );
  const [snippetCode, setSnippetCode] = useState(product.codeSnippetPreview?.code || '');
  const [demoUrl, setDemoUrl] = useState(product.demoUrl || '');
  const [repoUrl, setRepoUrl] = useState(product.repoUrl || '');
  const [previewMediaUrl, setPreviewMediaUrl] = useState(product.previewMediaUrl || '');
  const [licenseTiers, setLicenseTiers] = useState<ProductLicenseTier[]>(product.licenseTiers || []);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authToken) {
      setErrorMsg('Authenticated vendor session required.');
      return;
    }
    if (!title.trim() || priceUSD <= 0) {
      setErrorMsg('Title and positive USD price are required.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      let nextB2Key: string | undefined;
      let nextFileName: string | undefined;

      if (newFile) {
        setProgressMsg('1/2 Uploading new release archive to Backblaze B2...');
        const urlRes = await fetch(`${API_BASE}/api/upload-url`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ fileName: newFile.name }),
        });
        const urlData = await urlRes.json();
        if (!urlRes.ok || !urlData.uploadUrl || !urlData.fileKey) {
          throw new Error(urlData.error || 'Failed to get Backblaze B2 upload link');
        }

        const putRes = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          body: newFile,
        });
        if (!putRes.ok) {
          throw new Error(`Backblaze B2 rejected upload (HTTP ${putRes.status})`);
        }
        nextB2Key = urlData.fileKey;
        nextFileName = newFile.name;
      }

      setProgressMsg(newFile ? '2/2 Updating listing & changelog...' : 'Saving changes...');

      const patchBody: Record<string, unknown> = {
        title: title.trim(),
        tagline: tagline.trim(),
        description: description.trim(),
        priceUSD: Number(priceUSD),
        category,
        deliveryType,
        version: version.trim() || product.version,
        bannerGradient,
        tags: tagsInput
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        features: featuresInput
          .split('\n')
          .map((f) => f.trim())
          .filter(Boolean),
        changelogNote: changelogNote.trim() || undefined,
        notifyBuyers,
        demoUrl: demoUrl.trim() || '',
        repoUrl: repoUrl.trim() || '',
        previewMediaUrl: previewMediaUrl.trim() || '',
        licenseTiers: licenseTiers.filter((t) => t.name.trim() && t.priceUSD > 0),
        codeSnippet: snippetCode.trim()
          ? {
              language: snippetLanguage.trim() || 'typescript',
              filename: snippetFilename.trim() || 'index.ts',
              code: snippetCode,
            }
          : null,
      };

      if (nextB2Key) {
        patchBody.b2_file_key = nextB2Key;
        patchBody.fileName = nextFileName;
      }

      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(patchBody),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update product');
      }

      showToast(
        newFile || version.trim() !== product.version
          ? `Released ${version.trim()} for "${title.trim()}"`
          : `Updated "${title.trim()}"`
      );
      if (data.product) {
        onProductUpdated(data.product);
      }
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setIsSubmitting(false);
      setProgressMsg('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vendor-edit-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Pencil className="h-4 w-4" />
            </div>
            <div>
              <h3 id="vendor-edit-title" className="text-base font-bold text-white">
                Edit Product &amp; Release Update
              </h3>
              <p className="text-xs text-slate-400 truncate max-w-[380px]">
                {product.title} • Current {product.version}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit product modal"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
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

          {/* Optional New Archive File */}
          <div>
            <label htmlFor="edit-file-input" className="text-slate-300 font-semibold block mb-1">
              Release New Archive (optional — current: {product.fileInfo.fileName})
            </label>
            <label
              htmlFor="edit-file-input"
              className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-slate-700 bg-slate-950 px-4 py-2.5 hover:border-cyan-500/50 transition"
            >
              <div className="flex items-center gap-2.5">
                <FileArchive className="h-4 w-4 text-cyan-400" />
                <span className="text-slate-200">
                  {newFile ? `${newFile.name} (ready to upload)` : 'Keep existing file or choose new .zip/.tar.gz'}
                </span>
              </div>
              <input
                id="edit-file-input"
                type="file"
                className="sr-only"
                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              />
              <span className="rounded bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                Replace File
              </span>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label htmlFor="edit-title" className="text-slate-300 font-semibold block mb-1">
                Product Title *
              </label>
              <input
                id="edit-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-category" className="text-slate-300 font-semibold block mb-1">
                Category
              </label>
              <select
                id="edit-category"
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
            <label htmlFor="edit-tagline" className="text-slate-300 font-semibold block mb-1">
              Short Tagline
            </label>
            <input
              id="edit-tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="edit-price" className="text-slate-300 font-semibold block mb-1">
                Price (USD) *
              </label>
              <input
                id="edit-price"
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
              <label htmlFor="edit-version" className="text-slate-300 font-semibold block mb-1">
                Version Tag
              </label>
              <input
                id="edit-version"
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-delivery" className="text-slate-300 font-semibold block mb-1">
                Delivery
              </label>
              <select
                id="edit-delivery"
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

          <div>
            <label htmlFor="edit-changelog-note" className="text-slate-300 font-semibold block mb-1">
              Release Changelog Entry (appended when version, file, or note is provided)
            </label>
            <input
              id="edit-changelog-note"
              type="text"
              value={changelogNote}
              onChange={(e) => setChangelogNote(e.target.value)}
              placeholder="e.g. Fixed auth middleware and upgraded SDK dependencies"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyBuyers}
              onChange={(e) => setNotifyBuyers(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-cyan-500"
            />
            <span>Notify existing verified buyers via email about this release update</span>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="edit-tags" className="text-slate-300 font-semibold block mb-1">
                Tags (comma-separated)
              </label>
              <input
                id="edit-tags"
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-features" className="text-slate-300 font-semibold block mb-1">
                Features (one per line)
              </label>
              <textarea
                id="edit-features"
                rows={2}
                value={featuresInput}
                onChange={(e) => setFeaturesInput(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="edit-demo-url" className="text-slate-300 font-semibold block mb-1">
                Live Demo URL
              </label>
              <input
                id="edit-demo-url"
                type="url"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://demo.yourapp.dev"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="edit-repo-url" className="text-slate-300 font-semibold block mb-1">
                Private GitHub Repo
              </label>
              <input
                id="edit-repo-url"
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
            <div>
              <label htmlFor="edit-media-url" className="text-slate-300 font-semibold block mb-1">
                Cover Media URL
              </label>
              <input
                id="edit-media-url"
                type="url"
                value={previewMediaUrl}
                onChange={(e) => setPreviewMediaUrl(e.target.value)}
                placeholder="https://..."
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white"
              />
            </div>
          </div>

          {/* License Tiers */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">License Tiers</span>
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
            <label htmlFor="edit-description" className="text-slate-300 font-semibold block mb-1">
              Description (Markdown supported)
            </label>
            <textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <details className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <summary className="cursor-pointer font-semibold text-slate-300">
              Code Snippet Preview
            </summary>
            <div className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="text"
                  aria-label="Snippet language"
                  value={snippetLanguage}
                  onChange={(e) => setSnippetLanguage(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white"
                />
                <input
                  type="text"
                  aria-label="Snippet filename"
                  value={snippetFilename}
                  onChange={(e) => setSnippetFilename(e.target.value)}
                  placeholder="src/index.ts"
                  className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-white"
                />
              </div>
              <textarea
                rows={3}
                aria-label="Snippet code"
                value={snippetCode}
                onChange={(e) => setSnippetCode(e.target.value)}
                className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-[11px] text-cyan-200"
              />
            </div>
          </details>

          {progressMsg && (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-3 text-cyan-300 font-mono">
              {progressMsg}
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
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 font-bold text-white shadow-md shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
