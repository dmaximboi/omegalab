import { NextRequest, NextResponse } from "next/server";

// Hardcoded public config - NOT from environment variables
// This prevents any possibility of env variable injection
const PUBLIC_CONFIG = {
  company: {
    name: "De-Omega Labaffairs Nig. Ltd.",
    email: "info@omegalabaffairs.com",
    phone: "+2348132862637",
    address: "Ilorin, Kwara State, Nigeria",
    whatsapp: "+2348132862637",
  },
} as const;

// Public company config - read-only, no user input
export async function GET(request: NextRequest) {
  // Validate request origin
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  
  // Only allow same-origin requests or no origin (direct browser access)
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

  const response = NextResponse.json(PUBLIC_CONFIG);
  
  // Security headers
  response.headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  
  return response;
}

// Block all other methods
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
