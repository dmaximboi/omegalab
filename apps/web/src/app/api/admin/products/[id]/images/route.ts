import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { utapi } from "@/lib/uploadthing";

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

// DELETE: Remove a product image and delete from UploadThing
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const imageId = searchParams.get("imageId");

    if (!imageId) {
      return NextResponse.json({ error: "Image ID required" }, { status: 400 });
    }

    // Find the image in DB
    const image = await getPrisma().productImage.findFirst({
      where: { id: imageId, productId: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // Extract the file key from the UploadThing URL
    // UploadThing URLs: https://utfs.io/f/<fileKey> or https://<app>.ufs.sh/f/<fileKey>
    const url = image.url;
    let fileKey: string | null = null;

    // Try to extract file key from URL
    const utfsMatch = url.match(/utfs\.io\/f\/(.+?)(\?|$)/);
    const ufsMatch = url.match(/ufs\.sh\/f\/(.+?)(\?|$)/);
    
    if (utfsMatch) {
      fileKey = utfsMatch[1];
    } else if (ufsMatch) {
      fileKey = ufsMatch[1];
    }

    // Delete from UploadThing if we could extract the key
    if (fileKey) {
      try {
        await utapi.deleteFiles([fileKey]);
        console.log("[ADMIN] Deleted file from UploadThing:", fileKey);
      } catch (utError) {
        console.error("[ADMIN] UploadThing delete failed:", utError);
        // Continue with DB deletion even if UploadThing fails
      }
    }

    // Delete from database
    await getPrisma().productImage.delete({
      where: { id: imageId },
    });

    console.log("[ADMIN] Deleted product image:", imageId, "from product:", params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN] Image delete error:", error);
    return NextResponse.json({ error: "Failed to delete image" }, { status: 500 });
  }
}
