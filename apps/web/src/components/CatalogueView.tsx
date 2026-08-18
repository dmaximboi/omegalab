"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Search, Filter } from "lucide-react";
import type { CatalogueProduct } from "@/lib/catalogue-data";
import { setCatalogueCache } from "@/lib/catalogue-cache";

type Props = {
  initialProducts: CatalogueProduct[];
};

export function CatalogueView({ initialProducts }: Props) {
  const [products] = useState(initialProducts);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    setCatalogueCache(initialProducts);
  }, [initialProducts]);

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ["all", ...Array.from(new Set(products.map((p) => p.category)))];

  return (
    <main className="min-h-screen bg-light-grey dark:bg-gray-900">
      <section className="bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700">
        <div className="container py-8 md:py-12">
          <h1 className="page-title mb-2">Product Catalogue</h1>
          <p className="text-navy/60 dark:text-gray-400 mb-6">
            Browse laboratory equipment, chemical supplies, and scientific instruments available in Nigeria.
            No sign-in required to view or order.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40 dark:text-gray-500"
                size={20}
              />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10 w-full"
              />
            </div>
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-navy/40 dark:text-gray-500"
                size={20}
              />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="input pl-10 pr-8 appearance-none bg-white dark:bg-gray-800 min-w-[150px]"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "all" ? "All Categories" : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-navy/5 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-navy/30 dark:text-gray-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-navy dark:text-white mb-2">No Products Found</h3>
              <p className="text-navy/60 dark:text-gray-400 max-w-md mx-auto">
                {products.length === 0
                  ? "Products will be displayed here once they are added to the database."
                  : "No products match your search criteria. Try adjusting your filters."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
