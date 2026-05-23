"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  ArrowLeft, Plus, Search, Edit, Trash2, 
  Package, Eye, EyeOff, Loader2 
} from "lucide-react";

export const dynamic = "force-dynamic";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isActive: boolean;
  images: { url: string }[];
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/admin" 
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Products</h1>
                <p className="text-sm text-gray-500">Manage your product catalog</p>
              </div>
            </div>
            <Link
              href="/admin/products/new"
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Add Product
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={32} />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products yet</h3>
            <p className="text-gray-500 mb-4">Get started by adding your first product</p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              <Plus size={18} />
              Add Product
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <div key={product.id} className="bg-white rounded-lg border overflow-hidden">
                <div className="aspect-video bg-gray-100 relative">
                  {product.images[0] ? (
                    <Image
                      src={product.images[0].url}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="text-gray-300" size={48} />
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                    product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {product.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">{product.category}</p>
                  <p className="text-lg font-bold text-blue-600">
                    ₦{product.price.toLocaleString()}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/product/${product.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                      <Eye size={16} />
                      View
                    </Link>
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 border rounded-lg hover:bg-gray-50 transition text-sm"
                    >
                      <Edit size={16} />
                      Edit
                    </Link>
                    <button className="p-2 border rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
