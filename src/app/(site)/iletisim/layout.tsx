import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "İletişim",
  description:
    "Ürün uyumluluğu, stok ve sipariş bilgisi için Beyin Deposu iletişim kanallarına ulaşın.",
  path: "/iletisim",
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
