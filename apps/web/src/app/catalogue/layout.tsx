import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Laboratory Equipment Catalogue",
  description: "Browse our comprehensive catalogue of laboratory, medical, scientific, and factory equipment. Quality instruments from trusted manufacturers at competitive prices. Ships across Nigeria.",
  keywords: ["lab equipment catalogue", "buy lab equipment Nigeria", "medical instruments online", "scientific equipment store"],
  openGraph: {
    title: "Equipment Catalogue | De-Omega Labaffairs",
    description: "Browse laboratory, medical & scientific equipment at competitive prices.",
  },
};

export default function CatalogueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
