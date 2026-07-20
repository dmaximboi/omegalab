import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { isAllowedUploadThingUrl } from "@/lib/uploadthing-url";

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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const products = await getPrisma().product.findMany({
      include: {
        images: {
          select: { url: true, order: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ products }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[ADMIN] Products fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug: customSlug, description, price, category, images, isActive } = body;

    console.log("[ADMIN] Product create data:", { name, price, category, imageCount: images?.length });

    if (!name || !price || !category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Use custom slug if provided, otherwise generate from name
    const slug = customSlug
      ? customSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/(^-|-$)/g, "")
      : name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          + "-" + crypto.randomBytes(4).toString("hex");

    // Only accept UploadThing CDN URLs (prevent arbitrary remote URLs)
    const safeImages = Array.isArray(images)
      ? images.filter((url: unknown) => typeof url === "string" && isAllowedUploadThingUrl(url)).slice(0, 5)
      : [];

    const product = await getPrisma().product.create({
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

    console.log("[ADMIN] Product created successfully:", product.id);

    if (session.user.id) {
      await getPrisma().auditLog.create({
        data: {
          adminId: session.user.id,
          action: "PRODUCT_CREATED",
          entityId: product.id,
          newValue: JSON.stringify({ name, price, category }),
          ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
          userAgent: request.headers.get("user-agent")?.slice(0, 500) || "unknown",
        },
      }).catch(() => {});
    }

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("[ADMIN] Product create error:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
