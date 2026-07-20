import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { utapi } from "@/lib/uploadthing";
import { extractUploadThingKeys } from "@/lib/uploadthing-url";
import { ensureUniqueProductSlug, slugifyName, looksLikeProductId, ensureProductHasSlug } from "@/lib/product-slug";

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

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!looksLikeProductId(params.id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const prisma = getPrisma();
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        images: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const slug = await ensureProductHasSlug(prisma, product);

    return NextResponse.json({
      ...product,
      slug,
      price: parseFloat(product.price.toString()),
    });
  } catch (error) {
    console.error("[ADMIN] Product fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch product" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!looksLikeProductId(params.id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const body = await request.json();
    const { name, slug, description, price, category, isActive } = body;

    if (!name || price === undefined || price === null || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const parsedPrice = parseFloat(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const prisma = getPrisma();
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, slug: true, name: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const slugSource =
      typeof slug === "string" && slug.trim().length > 0
        ? slugifyName(slug)
        : existing.slug || slugifyName(String(name));
    const uniqueSlug = await ensureUniqueProductSlug(prisma, slugSource, params.id);

    const updateData: Record<string, unknown> = {
      name: String(name).slice(0, 200),
      description: String(description ?? "").slice(0, 5000),
      price: parsedPrice,
      category: String(category).slice(0, 100),
      isActive: Boolean(isActive),
      slug: uniqueSlug,
    };

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        images: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (session.user.id) {
      await prisma.auditLog
        .create({
          data: {
            adminId: session.user.id,
            action: "PRODUCT_UPDATED",
            entityId: params.id,
            newValue: JSON.stringify({
              name,
              price: parsedPrice,
              category,
              isActive,
              slug: uniqueSlug,
            }),
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
            userAgent: request.headers.get("user-agent")?.slice(0, 500) || "unknown",
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      ...product,
      price: parseFloat(product.price.toString()),
    });
  } catch (error) {
    console.error("[ADMIN] Product update error:", error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!looksLikeProductId(params.id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const product = await getPrisma().product.findUnique({
      where: { id: params.id },
      include: { images: { select: { url: true } } },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const keys = extractUploadThingKeys(product.images.map((img) => img.url));
    if (keys.length > 0) {
      try {
        await utapi.deleteFiles(keys);
        console.log("[ADMIN] Deleted UT files for product:", params.id, keys.length);
      } catch (utError) {
        console.error("[ADMIN] UploadThing bulk delete failed:", utError);
      }
    }

    if (product.images.length > 0) {
      await getPrisma().productImage.deleteMany({ where: { productId: params.id } });
    }

    const orderItemCount = await getPrisma().orderItem.count({
      where: { productId: params.id },
    });

    if (orderItemCount > 0) {
      await getPrisma().product.update({
        where: { id: params.id },
        data: { isActive: false },
      });
    } else {
      await getPrisma().product.delete({
        where: { id: params.id },
      });
    }

    if (session.user.id) {
      await getPrisma()
        .auditLog.create({
          data: {
            adminId: session.user.id,
            action: orderItemCount > 0 ? "PRODUCT_DEACTIVATED" : "PRODUCT_DELETED",
            entityId: params.id,
            oldValue: JSON.stringify({
              imageCount: product.images.length,
              utKeysDeleted: keys.length,
            }),
            ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
            userAgent: request.headers.get("user-agent")?.slice(0, 500) || "unknown",
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      softDeleted: orderItemCount > 0,
      imagesDeleted: keys.length,
      message:
        orderItemCount > 0
          ? "Product deactivated and images removed from storage (has existing orders)"
          : "Product and images deleted",
    });
  } catch (error) {
    console.error("[ADMIN] Product delete error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
