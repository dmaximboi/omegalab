"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, X, Loader2, Upload } from "lucide-react";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

export const dynamic = "force-dynamic";

export default function NewProductPage() {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    images: [] as string[],
  });

  const handleUploadBegin = () => {
    setUploading(true);
    setError("");
  };

  const handleUploadComplete = (res: any) => {
    setUploading(false);
    // Handle multiple file uploads
    const uploadedUrls = res.map((file: any) => file.url);
    if (uploadedUrls.length > 0) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls],
      }));
    }
  };

  const handleUploadError = (error: Error) => {
    setUploading(false);
    setError(`Upload failed: ${error.message}`);
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
          price: parseFloat(formData.price),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create product");
      }

      // Redirect to products list
      window.location.href = "/admin/products";
    } catch {
      setError("Could not create product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={18} />
            Back to Products
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter product name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              required
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (₦) *
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Product description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Product Images
            </label>
            <UploadButton<OurFileRouter, "productImage">
              endpoint="productImage"
              onUploadBegin={handleUploadBegin}
              onClientUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              className="ut-button:bg-blue-600 ut-button:hover:bg-blue-700 ut-button:rounded-lg"
              appearance={{
                button: "ut-uploading:cursor-not-allowed",
                container: "w-full",
              }}
            />
            
            {uploading && (
              <div className="flex items-center gap-2 mt-3 text-sm text-blue-600">
                <Loader2 className="animate-spin" size={16} />
                <span>Uploading images...</span>
              </div>
            )}
            
            {formData.images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-4">
                {formData.images.map((url, index) => (
                  <div key={`${url}-${index}`} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index),
                        }));
                      }}
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">
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
              className="px-6 py-3 border rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
