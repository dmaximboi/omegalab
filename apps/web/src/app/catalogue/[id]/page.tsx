"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/Navbar";
import { ArrowLeft, ShoppingCart, Loader2 } from "lucide-react";
import { cart } from "@/lib/cart";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  images: { id: string; url: string; order: number }[];
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${params.id}`);
      if (!res.ok) {
        router.push("/catalogue");
        return;
      }
      const data = await res.json();
      setProduct(data.product);
    } catch {
      router.push("/catalogue");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    setAddingToCart(true);
    cart.addItem({
      id: product.id,
      name: product.name,
      price: parseFloat(product.price.toString()),
      image: product.images[0]?.url || "",
    });
    setTimeout(() => {
      setAddingToCart(false);
      alert("Added to cart!");
    }, 500);
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-light-grey dark:bg-gray-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-sky animate-spin" />
        </main>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-light-grey dark:bg-gray-900 flex items-center justify-center">
          <p className="dark:text-gray-400">Product not found</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light-grey dark:bg-gray-900">
        <div className="container py-8">
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 text-navy/60 dark:text-gray-400 hover:text-navy dark:hover:text-white mb-6"
          >
            <ArrowLeft size={18} />
            Back to Catalogue
          </Link>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Images */}
            <div className="space-y-4">
              <div className="aspect-square bg-white dark:bg-gray-800 rounded-xl overflow-hidden border dark:border-gray-700">
                {product.images[0] ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    quality={75}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                    <p className="text-gray-400 dark:text-gray-500">No image</p>
                  </div>
                )}
              </div>
              {product.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {product.images.slice(1).map((image) => (
                    <div key={image.id} className="aspect-square bg-white dark:bg-gray-800 rounded-lg overflow-hidden border dark:border-gray-700">
                      <Image
                        src={image.url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="25vw"
                        quality={60}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-navy dark:text-white mb-2">{product.name}</h1>
                <p className="text-sm text-navy/60 dark:text-gray-400">{product.category}</p>
              </div>

              <div className="text-3xl font-bold text-sky">
                ₦{parseFloat(product.price.toString()).toLocaleString()}
              </div>

              <div className="prose prose-sm dark:prose-invert max-w-none">
                <p className="text-navy/80 dark:text-gray-300 whitespace-pre-line">{product.description}</p>
              </div>

              <div className="flex gap-4">
                <button
                  disabled={addingToCart}
                  onClick={handleAddToCart}
                  className="flex-1 flex items-center justify-center gap-2 bg-sky text-white px-6 py-3 rounded-lg hover:bg-sky/90 transition disabled:opacity-50"
                >
                  {addingToCart ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <ShoppingCart size={20} />
                  )}
                  Add to Order
                </button>
              </div>

              <div className="border-t dark:border-gray-700 pt-6">
                <h3 className="font-semibold dark:text-white mb-3">Specifications</h3>
                <div className="space-y-2 text-sm text-navy/70 dark:text-gray-400">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <span className="font-medium">{product.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Availability:</span>
                    <span className="font-medium text-green-600">In Stock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
