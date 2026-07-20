import { MetadataRoute } from "next";
import { PrismaClient } from "@prisma/client";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://omegalabaffairs.com";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/catalogue`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Dynamic product pages from database
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await getPrisma().product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, updatedAt: true },
    });

    const { ensureProductHasSlug } = await import("@/lib/product-slug");
    productPages = [];
    for (const product of products) {
      const slug = await ensureProductHasSlug(getPrisma(), product);
      productPages.push({
        url: `${BASE_URL}/product/${slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("[SITEMAP] Failed to fetch products:", error);
  }

  return [...staticPages, ...productPages];
}
