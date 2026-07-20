"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Loader2 } from "lucide-react";

/**
 * Legacy /catalogue/{slug|id} routes redirect to the canonical /product/{slug} page.
 */
export default function CatalogueProductRedirect() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const key = String(params.id || "").trim();
    if (!key) {
      router.replace("/catalogue");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(key)}`);
        if (!res.ok) {
          if (!cancelled) router.replace("/catalogue");
          return;
        }
        const data = await res.json();
        const slug = data.slug || key;
        if (!cancelled) router.replace(`/product/${slug}`);
      } catch {
        if (!cancelled) router.replace("/catalogue");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light-grey dark:bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-sky animate-spin" />
      </main>
    </>
  );
}
