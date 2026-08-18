import { revalidateTag } from "next/cache";
import { CATALOGUE_CACHE_TAG } from "@/lib/catalogue-data";

export function revalidateCatalogueCache() {
  revalidateTag(CATALOGUE_CACHE_TAG);
}
