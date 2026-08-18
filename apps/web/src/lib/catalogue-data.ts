import { unstable_cache } from "next/cache";
import { db } from "@omega/database";

export type CatalogueProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
};

export const CATALOGUE_CACHE_TAG = "catalogue";

async function queryCatalogueProducts(): Promise<CatalogueProduct[]> {
  const products = await db.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      price: true,
      category: true,
      images: {
        orderBy: { order: "asc" },
        take: 1,
        select: { url: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return products.map((product) => ({
    id: product.id,
    slug: product.slug || product.id,
    name: product.name,
    description: product.description,
    price: parseFloat(product.price.toString()),
    category: product.category,
    image: product.images[0]?.url || "",
  }));
}

export const getCatalogueProducts = unstable_cache(
  queryCatalogueProducts,
  ["catalogue-products-v1"],
  { revalidate: 300, tags: [CATALOGUE_CACHE_TAG] }
);
