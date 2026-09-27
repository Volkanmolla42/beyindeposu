import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Araç Markaları",
  description:
    "BMW, Mercedes-Benz, Renault, Volkswagen ve diğer araç markalarına uygun oto elektronik parçalarını inceleyin.",
  path: "/markalar",
});

export default function BrandsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
