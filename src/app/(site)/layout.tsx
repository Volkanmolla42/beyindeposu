import LiveChatWidget from "@/components/LiveChatWidget";
import { Suspense } from "react";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";
import SiteShell from "@/components/SiteShell";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexClientProvider>
      <SiteShell
        afterFooter={
          <Suspense fallback={null}>
            <LiveChatWidget />
          </Suspense>
        }
      >
        {children}
      </SiteShell>
    </ConvexClientProvider>
  );
}
