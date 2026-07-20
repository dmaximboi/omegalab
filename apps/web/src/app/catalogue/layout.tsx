import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://omegalabaffairs.com";

export const metadata: Metadata = {
  title: "Product Catalogue | Lab & Chemical Supplies Nigeria",
  description:
    "Browse and buy laboratory equipment, chemical lab supplies, medical instruments, and scientific apparatus in Nigeria. De-Omega Labaffairs — no account required to shop.",
  keywords: [
    "laboratory equipment catalogue Nigeria",
    "buy lab chemicals Nigeria",
    "scientific supplies Nigeria",
    "chemical laboratory equipment",
    "De-Omega Labaffairs catalogue",
  ],
  alternates: { canonical: `${BASE_URL}/catalogue` },
  openGraph: {
    title: "Product Catalogue | De-Omega Labaffairs Nigeria",
    description:
      "Shop laboratory equipment and chemical supplies in Nigeria. Browse our catalogue — no sign-in required.",
    url: `${BASE_URL}/catalogue`,
    siteName: "De-Omega Labaffairs",
    locale: "en_NG",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return children;
}
