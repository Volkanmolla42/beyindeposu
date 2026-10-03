import SiteShell from "@/components/SiteShell";

export default function StaticSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
