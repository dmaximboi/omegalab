import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const product = await getPrisma().product.findUnique({
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

    return NextResponse.json(product);
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

    const body = await request.json();
    const { name, slug, description, price, category, isActive } = body;

    // Build update data
    const updateData: any = {
      name,
      description,
      price: parseFloat(price),
      category,
      isActive,
    };

    // Only update slug if provided
    if (slug) {
      updateData.slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/(^-|-$)/g, "");
    }

    const product = await getPrisma().product.update({
      where: { id: params.id },
      data: updateData,
      include: {
        images: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (session.user.id) {
      await getPrisma().auditLog.create({
        data: {
          adminId: session.user.id,
          action: "PRODUCT_UPDATED",
          entityId: params.id,
          newValue: JSON.stringify({ name, price, category, isActive }),
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          userAgent: request.headers.get("user-agent")?.slice(0, 500) || "unknown",
        },
      }).catch(() => {});
    }

    return NextResponse.json(product);
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

    // Check if product has associated orders — if so, soft-delete (deactivate)
    // to preserve order history integrity
    const orderItemCount = await getPrisma().orderItem.count({
      where: { productId: params.id },
    });

    if (orderItemCount > 0) {
      // Soft delete: deactivate the product instead of hard-deleting
      await getPrisma().product.update({
        where: { id: params.id },
        data: { isActive: false },
      });
    } else {
      // No orders reference this product — safe to hard-delete
      await getPrisma().product.delete({
        where: { id: params.id },
      });
    }

    // Audit log
    if (session.user.id) {
      await getPrisma().auditLog.create({
        data: {
          adminId: session.user.id,
          action: orderItemCount > 0 ? "PRODUCT_DEACTIVATED" : "PRODUCT_DELETED",
          entityId: params.id,
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          userAgent: request.headers.get("user-agent")?.slice(0, 500) || "unknown",
        },
      }).catch(() => {});
    }

    return NextResponse.json({ 
      success: true,
      softDeleted: orderItemCount > 0,
      message: orderItemCount > 0 
        ? "Product deactivated (has existing orders)" 
        : "Product deleted"
    });
  } catch (error) {
    console.error("[ADMIN] Product delete error:", error);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
