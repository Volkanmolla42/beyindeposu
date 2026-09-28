import type { Metadata } from "next";
import { createPageMetadata, SITE_NAME } from "@/lib/seo";
import ProductCatalogClient from "./ProductCatalogClient";

export const revalidate = 3600;

type ParcalarPageProps = {
  searchParams: Promise<{
    kategori?: string;
    marka?: string;
    q?: string;
  }>;
};

export async function generateMetadata({ searchParams }: ParcalarPageProps): Promise<Metadata> {
  const params = await searchParams;
  const { kategori, marka, q } = params;

  let title = `Oto Elektronik Parça Kataloğu | ${SITE_NAME}`;
  let description = "ECU motor beyinleri, ABS, airbag ve oto elektronik parçaları kataloğu.";

  if (q) {
    title = `"${q}" Parça Arama Sonuçları | ${SITE_NAME}`;
    description = `"${q}" kodlu veya isimli parçaya uygun oto elektronik parça sonuçları ve stok durumu.`;
  } else if (kategori && marka) {
    title = `${marka} ${kategori} Parçaları | ${SITE_NAME}`;
    description = `${marka} marka araçlar için ${kategori} kontrol üniteleri ve elektronik modülleri.`;
  } else if (kategori) {
    title = `${kategori} Modülleri | ${SITE_NAME}`;
    description = `${kategori} kategorisindeki tüm oto elektronik kontrol üniteleri ve yedek parçalar.`;
  } else if (marka) {
    title = `${marka} Oto Elektronik Parçaları | ${SITE_NAME}`;
    description = `${marka} uyumlu oto beyinleri, modülleri ve elektronik parçaları.`;
  }

  return createPageMetadata({
    title,
    description,
    path: "/parcalar",
  });
}

export default function ParcalarPage() {
  return <ProductCatalogClient />;
}
