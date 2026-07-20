import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";

/** Normalize a product name or custom slug into a URL-safe slug. */
export function slugifyName(input: string): string {
  const base = String(input || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
  return base || "product";
}

/** Prisma cuid-style ids — used only for internal/admin resolution, not public links. */
export function looksLikeProductId(value: string): boolean {
  return /^c[a-z0-9]{20,32}$/i.test(value);
}

/**
 * Resolve a unique slug. Uses the requested base (from name or custom slug);
 * on collision appends a cryptographically random hex suffix (never Math.random).
 */
export async function ensureUniqueProductSlug(
  prisma: PrismaClient,
  desired: string,
  excludeProductId?: string
): Promise<string> {
  const base = slugifyName(desired);
  let candidate = base;

  for (let attempt = 0; attempt < 16; attempt++) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });

    if (!existing || (excludeProductId && existing.id === excludeProductId)) {
      return candidate;
    }

    const suffix = crypto.randomBytes(4).toString("hex");
    candidate = `${base.slice(0, 70)}-${suffix}`;
  }

  return `${base.slice(0, 60)}-${crypto.randomBytes(8).toString("hex")}`;
}

/** Ensure a product row has a slug; backfill from name if missing. */
export async function ensureProductHasSlug(
  prisma: PrismaClient,
  product: { id: string; name: string; slug: string | null }
): Promise<string> {
  if (product.slug && product.slug.trim().length > 0) {
    return product.slug;
  }

  const slug = await ensureUniqueProductSlug(prisma, product.name, product.id);
  await prisma.product.update({
    where: { id: product.id },
    data: { slug },
  });
  return slug;
}
