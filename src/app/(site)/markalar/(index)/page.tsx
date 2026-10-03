import type { Metadata } from "next";
import { getPublicBrands } from "@/lib/seo-data";
import { createPageMetadata, SITE_NAME } from "@/lib/seo";
import TaxonomyIndexPage from "@/components/TaxonomyIndexPage";


export const metadata: Metadata = createPageMetadata({
  title: `Araç Markaları | ${SITE_NAME}`,
  description:
    "Tüm araç markalarına uyumlu ECU beyinleri, ABS ve elektronik kontrol ünitelerini listeleyin.",
  path: "/markalar",
});

export default async function MarkalarPage() {
  const brands = await getPublicBrands();

  return (
    <TaxonomyIndexPage
      title="Araç markaları"
      actionLabel="Parçaları bul"
      detailLabel="Marka sayfası"
      items={brands.map((brand) => ({
        id: brand._id,
        title: `${brand.name} parçaları`,
        image: brand.logoUrl || null,
        filterHref: `/parcalar?marka=${encodeURIComponent(brand.name)}`,
        detailHref: `/markalar/${encodeURIComponent(brand.slug)}`,
      }))}
    />
  );
}
