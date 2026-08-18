import { NextResponse } from "next/server";
import { getCatalogueProducts } from "@/lib/catalogue-data";

export const revalidate = 300;

export async function GET() {
  try {
    const products = await getCatalogueProducts();

    return NextResponse.json(
      { products },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (error) {
    console.error("[PRODUCTS] Fetch error:", error);
    return NextResponse.json({ products: [] }, { status: 200 });
  }
}
