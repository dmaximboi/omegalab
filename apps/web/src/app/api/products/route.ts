import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { backfillProductSlugs } from "@/lib/product-slug";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return globalForPrisma.prisma;
}

export async function GET() {
  try {
    const prisma = getPrisma();
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const slugsById = await backfillProductSlugs(
      prisma,
      products.map((product) => ({ id: product.id, name: product.name, slug: product.slug }))
    );

    const transformedProducts = products.map((product) => ({
        id: product.id,
        slug: slugsById.get(product.id) || product.id,
        name: product.name,
        description: product.description,
        price: parseFloat(product.price.toString()),
        category: product.category,
        image: product.images[0]?.url || "",
        images: product.images.map((img) => img.url),
      }));

    return NextResponse.json(
      { products: transformedProducts },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("[PRODUCTS] Fetch error:", error);
    return NextResponse.json({ products: [] }, { status: 200 });
  }
}
