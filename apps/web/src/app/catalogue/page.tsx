import { Navbar } from "@/components/Navbar";
import { CatalogueView } from "@/components/CatalogueView";
import { getCatalogueProducts } from "@/lib/catalogue-data";

export const revalidate = 300;

export default async function CataloguePage() {
  const products = await getCatalogueProducts();

  return (
    <>
      <Navbar />
      <CatalogueView initialProducts={products} />
    </>
  );
}
