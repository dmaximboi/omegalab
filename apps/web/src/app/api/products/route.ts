import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

// Lazy Prisma client - only instantiated when first accessed
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
    const products = await getPrisma().product.findMany({
      where: { isActive: true },
      include: {
        images: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match frontend expected format
    const transformedProducts = products.map((product: typeof products[number]) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      price: parseFloat(product.price.toString()),
      category: product.category,
      image: product.images[0]?.url || "", // Use first image as main image
      images: product.images.map((img: typeof product.images[number]) => img.url),
    }));

    return NextResponse.json({ products: transformedProducts }, {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("[PRODUCTS] Fetch error:", error);
    // Return empty products array instead of 500 to avoid breaking the UI
    return NextResponse.json({ products: [] }, { status: 200 });
  }
}
