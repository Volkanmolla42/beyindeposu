import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Oto Elektronik Ürünler",
  description:
    "ECU, ABS, airbag, BCM, BSI ve diğer oto elektronik parçalarını kategori, araç markası veya OEM numarasıyla bulun.",
  path: "/urunler",
});

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
