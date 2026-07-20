import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { utapi } from "@/lib/uploadthing";
import {
  extractUploadThingKey,
  isAllowedUploadThingUrl,
} from "@/lib/uploadthing-url";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Delete orphaned UploadThing files (e.g. removed from new-product form before save).
 * Admin-only. Only accepts UploadThing CDN URLs.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";
    const rate = await checkRateLimit(`ut-delete:${session.user.id || ip}`, 30, 60000, 5 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await request.json();
    const urls: unknown = body?.urls ?? (body?.url ? [body.url] : []);
    if (!Array.isArray(urls) || urls.length === 0 || urls.length > 20) {
      return NextResponse.json({ error: "Provide 1–20 image URLs" }, { status: 400 });
    }

    const keys: string[] = [];
    for (const url of urls) {
      if (typeof url !== "string" || !isAllowedUploadThingUrl(url)) {
        return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
      }
      const key = extractUploadThingKey(url);
      if (key) keys.push(key);
    }

    if (keys.length === 0) {
      return NextResponse.json({ error: "Could not resolve file keys" }, { status: 400 });
    }

    await utapi.deleteFiles(keys);
    console.log("[ADMIN] Orphan UT files deleted:", keys.length);

    return NextResponse.json({ success: true, deleted: keys.length });
  } catch (error) {
    console.error("[ADMIN] Orphan UT delete error:", error);
    return NextResponse.json({ error: "Failed to delete files" }, { status: 500 });
  }
}
