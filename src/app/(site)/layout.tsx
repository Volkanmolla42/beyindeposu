import LiveChatWidget from "@/components/LiveChatWidget";
import { Suspense } from "react";
import ConvexAuthIsland from "@/app/ConvexAuthIsland";
import SiteShell from "@/components/SiteShell";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteShell
      afterFooter={
        <Suspense fallback={null}>
          <ConvexAuthIsland>
            <LiveChatWidget />
          </ConvexAuthIsland>
        </Suspense>
      }
    >
      {children}
    </SiteShell>
  );
}
