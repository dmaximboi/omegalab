import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { Package } from "lucide-react";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { getPublicProductByKey } from "@/lib/public-product";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://omegalabaffairs.com";

type PageProps = { params: { id: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const product = await getPublicProductByKey(params.id);
  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }

  const title = `${product.name} | Buy in Nigeria`;
  const description =
    product.description?.slice(0, 160) ||
    `Buy ${product.name} — ${product.category} from De-Omega Labaffairs. Laboratory, medical & chemical supplies in Nigeria.`;
  const canonical = `${BASE_URL}/product/${product.slug}`;
  const image = product.images[0]?.url || `${BASE_URL}/logo.png`;

  return {
    title,
    description,
    keywords: [
      product.name,
      product.category,
      "buy laboratory equipment Nigeria",
      "chemical laboratory supplies Nigeria",
      "scientific instruments Nigeria",
      "De-Omega Labaffairs",
      "lab equipment Ilorin",
    ],
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "en_NG",
      url: canonical,
      siteName: "De-Omega Labaffairs",
      title: `${product.name} | De-Omega Labaffairs Nigeria`,
      description,
      images: [{ url: image, alt: product.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${product.name} | De-Omega Labaffairs`,
      description,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const key = params.id;
  const product = await getPublicProductByKey(key);

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Product not found</p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Catalogue
          </Link>
        </div>
      </div>
    );
  }

  // Canonicalise legacy cuid URLs to slug for crawlers and shared links
  if (product.slug && product.slug !== key) {
    permanentRedirect(`/product/${product.slug}`);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((img) => img.url),
    sku: product.slug,
    category: product.category,
    brand: {
      "@type": "Brand",
      name: "De-Omega Labaffairs",
    },
    offers: {
      "@type": "Offer",
      url: `${BASE_URL}/product/${product.slug}`,
      priceCurrency: "NGN",
      price: product.price.toFixed(2),
      availability: product.isActive
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: "De-Omega Labaffairs Nig. Ltd.",
        url: BASE_URL,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Crawlable SSR summary for bots that skip JS */}
      <noscript>
        <article>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <p>
            Price: ₦{product.price.toLocaleString()} · {product.category}
          </p>
        </article>
      </noscript>
      <ProductDetailClient product={product} siteOrigin={BASE_URL} />
    </>
  );
}
