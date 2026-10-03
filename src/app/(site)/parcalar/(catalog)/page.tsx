import { Suspense } from "react";
import type { Metadata } from "next";
import { createPageMetadata, SITE_NAME } from "@/lib/seo";
import ProductCatalogClient from "@/app/(site)/parcalar/ProductCatalogClient";
import ConvexAuthIsland from "@/app/ConvexAuthIsland";
import { CatalogSkeleton } from "@/components/RouteSkeletons";


type ParcalarPageProps = {
  searchParams: Promise<{
    kategori?: string;
    marka?: string;
    model?: string;
    q?: string;
    durum?: string;
    stok?: string;
  }>;
};

export async function generateMetadata({ searchParams }: ParcalarPageProps): Promise<Metadata> {
  const params = await searchParams;
  const { kategori, marka, model, q, durum, stok } = params;
  const hasCatalogQuery = Boolean(kategori || marka || model || q || durum || stok);

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
  } else if (model) {
    title = `${model} Uyumlu Parçalar | ${SITE_NAME}`;
    description = `${model} araç modeliyle eşleşen oto elektronik parçaları.`;
  }

  const metadata = createPageMetadata({
    title,
    description,
    path: "/parcalar",
  });

  return hasCatalogQuery
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
}

export default function ParcalarPage() {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <ConvexAuthIsland>
        <ProductCatalogClient />
      </ConvexAuthIsland>
    </Suspense>
  );
}
