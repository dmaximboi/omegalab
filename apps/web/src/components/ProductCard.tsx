"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Eye, Check } from "lucide-react";
import { cart } from "@/lib/cart";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
}

export function ProductCard({ product }: { product: Product }) {
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [added, setAdded] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleAddToCart = async () => {
    setIsLoading(true);
    cart.addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
    });
    
    // Trigger storage event to update navbar
    window.dispatchEvent(new Event("storage"));
    
    setIsLoading(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="card card-hover group">
      {/* Image */}
      <div className="relative aspect-[4/3] bg-light-grey dark:bg-gray-700 rounded-lg overflow-hidden mb-4">
        {!imageError ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-light-grey dark:bg-gray-700">
            <div className="text-center text-navy/40 dark:text-gray-500">
              <div className="w-12 h-12 mx-auto mb-2 bg-navy/10 rounded-lg" />
              <span className="text-xs">No image</span>
            </div>
          </div>
        )}
        
        {/* Category Badge */}
        <span className="absolute top-3 left-3 badge badge-info">
          {product.category}
        </span>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <h3 className="font-semibold text-navy dark:text-white line-clamp-1">{product.name}</h3>
        <p className="text-sm text-navy/60 dark:text-gray-400 line-clamp-2">{product.description}</p>
        <p className="text-lg font-bold text-sky">{formatPrice(product.price)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Link
          href={`/product/${product.id}`}
          className="btn btn-outline flex-1 text-sm"
        >
          <Eye size={16} />
          View
        </Link>
        <button
          onClick={handleAddToCart}
          disabled={isLoading}
          className={`btn flex-1 text-sm ${added ? "bg-green-600 hover:bg-green-700" : "btn-primary"}`}
        >
          {added ? (
            <>
              <Check size={16} />
              Added
            </>
          ) : isLoading ? (
            <span className="loading-spinner" />
          ) : (
            <>
              <ShoppingCart size={16} />
              Add
            </>
          )}
        </button>
      </div>
    </div>
  );
}
