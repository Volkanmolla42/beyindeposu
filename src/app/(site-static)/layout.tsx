import SiteShell from "@/components/SiteShell";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";

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
