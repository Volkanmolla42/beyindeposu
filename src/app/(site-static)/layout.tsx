import SiteShell from "@/components/SiteShell";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";

export const revalidate = 300;

export default function StaticSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <SiteShell>{children}</SiteShell>
    </ConvexClientProvider>
  );
}
