import { PrismaClient } from "@prisma/client";
import {
  ensureProductHasSlug,
  looksLikeProductId,
} from "@/lib/product-slug";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return globalForPrisma.prisma;
}

export type PublicProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  category: string;
  isActive: boolean;
  images: { id: string; url: string; order: number }[];
};

/** Server-side product lookup by slug (or legacy cuid). */
export async function getPublicProductByKey(key: string): Promise<PublicProduct | null> {
  const trimmed = decodeURIComponent(key || "").trim();
  if (!trimmed || trimmed.length > 120) return null;

  const prisma = getPrisma();

  let product = await prisma.product.findFirst({
    where: { isActive: true, slug: trimmed },
    include: { images: { orderBy: { order: "asc" } } },
  });

  if (!product && looksLikeProductId(trimmed)) {
    product = await prisma.product.findFirst({
      where: { id: trimmed, isActive: true },
      include: { images: { orderBy: { order: "asc" } } },
    });
  }

  if (!product) return null;

  const slug = await ensureProductHasSlug(prisma, product);

  return {
    id: product.id,
    slug,
    name: product.name,
    description: product.description,
    price: parseFloat(product.price.toString()),
    category: product.category,
    isActive: product.isActive,
    images: product.images.map((img) => ({
      id: img.id,
      url: img.url,
      order: img.order,
    })),
  };
}
