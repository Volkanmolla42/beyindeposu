import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Hakkımızda",
  description:
    "Beyin Deposu'nun oto elektronik parça tedariği, ürün kontrolü ve satış hizmetleri hakkında bilgi alın.",
  path: "/kurumsal",
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
