import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { utapi } from "@/lib/uploadthing";
import {
  extractUploadThingKey,
  isAllowedUploadThingUrl,
} from "@/lib/uploadthing-url";
import { looksLikeProductId } from "@/lib/product-slug";
import { revalidateCatalogueCache } from "@/lib/revalidate-catalogue";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
  }
  return globalForPrisma.prisma;
}

const MAX_IMAGES_PER_PRODUCT = 5;

/** POST: Attach newly uploaded UploadThing URLs to a product */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!looksLikeProductId(params.id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const product = await getPrisma().product.findUnique({
      where: { id: params.id },
      include: { images: { select: { id: true } } },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const urls: unknown = body?.urls;
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > MAX_IMAGES_PER_PRODUCT) {
      return NextResponse.json({ error: "Provide 1–5 image URLs" }, { status: 400 });
    }

    for (const url of urls) {
      if (typeof url !== "string" || !isAllowedUploadThingUrl(url)) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
    }

    const remaining = MAX_IMAGES_PER_PRODUCT - product.images.length;
    if (remaining <= 0) {
      return NextResponse.json({ error: "Image limit reached" }, { status: 400 });
    }

    const toAdd = (urls as string[]).slice(0, remaining);
    const startOrder = product.images.length;

    await getPrisma().productImage.createMany({
      data: toAdd.map((url, index) => ({
        productId: params.id,
        url,
        order: startOrder + index,
      })),
    });

    const images = await getPrisma().productImage.findMany({
      where: { productId: params.id },
      orderBy: { order: "asc" },
    });

    revalidateCatalogueCache();

    return NextResponse.json({ success: true, images });
  } catch (error) {
    console.error("[ADMIN] Image add error:", error);
    return NextResponse.json({ error: "Failed to add images" }, { status: 500 });
  }
}

/** DELETE: Remove a product image from DB and UploadThing storage */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!looksLikeProductId(params.id)) {
      return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId || imageId.length > 100) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 });
    }

    const image = await getPrisma().productImage.findFirst({
      where: { id: imageId, productId: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const fileKey = extractUploadThingKey(image.url);
    if (fileKey) {
      try {
        await utapi.deleteFiles([fileKey]);
        console.log("[ADMIN] Deleted file from UploadThing:", fileKey);
      } catch (utError) {
        console.error("[ADMIN] UploadThing delete failed:", utError);
        // Still remove DB row so UI stays consistent; log for manual cleanup
      }
    }

    await getPrisma().productImage.delete({
      where: { id: imageId },
    });

    revalidateCatalogueCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN] Image delete error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
