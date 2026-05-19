import { NextResponse } from "next/server";

export async function GET() {
  // Cache for 1 hour to reduce database/env lookups
  const data = {
    address: process.env.COMPANY_ADDRESS || "Ilorin, Kwara State, Nigeria",
    phone: process.env.COMPANY_PHONE || "+2348132862637",
    email: process.env.COMPANY_EMAIL || "info@omegalabaffairs.com",
    whatsapp: process.env.COMPANY_WHATSAPP || "+2348132862637",
  };

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
