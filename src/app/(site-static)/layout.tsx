import SiteShell from "@/components/SiteShell";

export const revalidate = 300;

export default function StaticSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SiteShell>{children}</SiteShell>;
}
