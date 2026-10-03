import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import AdminLayoutClient from "./AdminLayoutClient";
import ConvexAuthIsland from "@/app/ConvexAuthIsland";
import SiteLoading from "@/components/SiteLoading";

export const metadata: Metadata = {
  title: { absolute: "Yönetim Paneli | Beyin Deposu" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await connection();

  return (
    <Suspense fallback={<SiteLoading />}>
      <ConvexAuthIsland>
        <AdminLayoutClient>{children}</AdminLayoutClient>
      </ConvexAuthIsland>
    </Suspense>
  );
}
