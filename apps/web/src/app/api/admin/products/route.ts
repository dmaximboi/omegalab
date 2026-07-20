import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { isAllowedUploadThingUrl } from "@/lib/uploadthing-url";
import {
  ensureProductHasSlug,
  ensureUniqueProductSlug,
  slugifyName,
} from "@/lib/product-slug";

export const dynamic = "force-dynamic";

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
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const products = await getPrisma().product.findMany({
      include: {
        images: {
          select: { id: true, url: true, order: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Backfill missing slugs so admin "View" links never fall back to raw cuid
    const withSlugs = [];
    for (const product of products) {
      const slug = await ensureProductHasSlug(getPrisma(), product);
      withSlugs.push({ ...product, slug });
    }

    return NextResponse.json(
      { products: withSlugs },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    console.error("[ADMIN] Products fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, slug: customSlug, description, price, category, images, isActive } = body;

    console.log("[ADMIN] Product create data:", { name, price, category, imageCount: images?.length });

    if (!name || !price || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prisma = getPrisma();
    const slugSource =
      typeof customSlug === "string" && customSlug.trim().length > 0
        ? slugifyName(customSlug)
        : slugifyName(name);
    const slug = await ensureUniqueProductSlug(prisma, slugSource);

    const safeImages = Array.isArray(images)
      ? images
          .filter((url: unknown) => typeof url === "string" && isAllowedUploadThingUrl(url))
          .slice(0, 5)
      : [];

    const product = await prisma.product.create({
      data: {
        slug,
        name,
        description: description || "",
        price: parseFloat(price),
        category,
        isActive: isActive ?? true,
        images: {
          create: safeImages.map((url: string, index: number) => ({
            url,
            order: index,
          })),
        },
      },
      include: { images: true },
    });

    console.log("[ADMIN] Product created successfully:", product.id, "slug:", slug);

    if (session.user.id) {
      await prisma.auditLog
        .create({
          data: {
            adminId: session.user.id,
            action: "PRODUCT_CREATED",
            entityId: product.id,
            newValue: JSON.stringify({ name, price, category, slug }),
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
            userAgent: request.headers.get("user-agent")?.slice(0, 500) || "unknown",
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN] Product create error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
