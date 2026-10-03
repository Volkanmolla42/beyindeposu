import type { Metadata } from "next";
import { Suspense } from "react";
import ConvexAuthIsland from "@/app/ConvexAuthIsland";
import SiteLoading from "@/components/SiteLoading";

export const metadata: Metadata = {
  title: { absolute: "Giriş | Beyin Deposu" },
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<SiteLoading />}>
      <ConvexAuthIsland>{children}</ConvexAuthIsland>
    </Suspense>
  );
}
