import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import {
  ensureProductHasSlug,
  looksLikeProductId,
} from "@/lib/product-slug";

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

/**
 * Public product lookup by slug (preferred).
 * Legacy cuid URLs still resolve, but responses always include the canonical slug
 * so clients can switch to /product/{slug}.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const key = decodeURIComponent(params.id || "").trim();
    if (!key || key.length > 120) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 });
    }

    const prisma = getPrisma();

    let product = await prisma.product.findFirst({
      where: {
        isActive: true,
        slug: key,
      },
      include: {
        images: { orderBy: { order: "asc" } },
      },
    });

    // Legacy support: resolve cuid once, then prefer slug going forward
    if (!product && looksLikeProductId(key)) {
      product = await prisma.product.findFirst({
        where: { id: key, isActive: true },
        include: {
          images: { orderBy: { order: "asc" } },
        },
      });
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const slug = await ensureProductHasSlug(prisma, product);

    return NextResponse.json(
      {
        // id kept for cart/order internals only — public links should use slug
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
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600",
        },
      }
    );
  } catch (error) {
    console.error("[PRODUCT] Fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}
