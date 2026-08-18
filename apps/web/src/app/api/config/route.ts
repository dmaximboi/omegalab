import { NextRequest, NextResponse } from "next/server";
import { PUBLIC_SITE_CONFIG } from "@/lib/site-config";

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (origin) {
    try {
      const originHost = new URL(origin).hostname;
      const allowedHosts = ["localhost", "127.0.0.1", host?.split(":")[0]];
      if (!allowedHosts.includes(originHost)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid origin" }, { status: 400 });
    }
  }

  const response = NextResponse.json(PUBLIC_SITE_CONFIG);
  response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export async function POST() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function PATCH() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
