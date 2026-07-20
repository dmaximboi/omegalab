import { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://omegalabaffairs.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/catalogue", "/product/", "/contact", "/privacy", "/terms"],
        disallow: [
          "/admin",
          "/api",
          "/payment",
          "/orders",
          "/order/success",
          "/order/failed",
          "/login",
          "/register",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/catalogue", "/product/", "/contact"],
        disallow: ["/admin", "/api", "/payment", "/orders", "/login", "/register"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
