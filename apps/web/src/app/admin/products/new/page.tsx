"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { ProductImageUploader } from "@/components/admin/ProductImageUploader";

export const dynamic = "force-dynamic";

function slugifyPreview(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 80) || ""
  );
}

export default function NewProductPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    category: "",
    images: [] as string[],
  });

  const deleteOrphanUrls = async (urls: string[]) => {
    if (urls.length === 0) return;
    await fetch("/api/admin/uploads/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
  };

  const handleUploaded = async (urls: string[]) => {
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...urls].slice(0, 5),
    }));
  };

  const handleRemovePending = async (url: string) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((u) => u !== url),
    }));
    try {
      await deleteOrphanUrls([url]);
    } catch {
      setError("Image removed from form, but storage cleanup failed. Try again later.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          slug: formData.slug || undefined,
          price: parseFloat(formData.price),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to create product");
      }

      window.location.href = "/admin/products";
    } catch (err: any) {
      setError(err.message || "Could not create product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "w-full px-4 py-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft size={18} />
            Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Add New Product</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-6 space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name,
                  // Auto-suggest slug from name while creating (admin can still edit)
                  slug: prev.slug && prev.slug !== slugifyPreview(prev.name)
                    ? prev.slug
                    : slugifyPreview(name),
                }));
              }}
              required
              className={fieldClass}
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Slug (URL-friendly identifier)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                })
              }
              className={fieldClass}
              placeholder="e.g. digital-microscope-x200 (auto-generated if empty)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className={fieldClass}
            >
              <option value="">Select category</option>
              <option value="Laboratory Equipment">Laboratory Equipment</option>
              <option value="Medical Equipment">Medical Equipment</option>
              <option value="Scientific Instruments">Scientific Instruments</option>
              <option value="Factory Equipment">Factory Equipment</option>
              <option value="Consumables">Consumables</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Price (₦) *
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              min="0"
              step="0.01"
              className={fieldClass}
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className={`${fieldClass} resize-none`}
              placeholder="Product description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Product Images
            </label>
            <ProductImageUploader
              pendingUrls={formData.images}
              onUploaded={handleUploaded}
              onRemovePending={handleRemovePending}
              maxFiles={5}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : "Create Product"}
            </button>
            <Link
              href="/admin/products"
              className="px-6 py-3 border dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition dark:text-gray-300"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
