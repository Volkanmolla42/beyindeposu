import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/app/ConvexClientProvider";

export default function ConvexAuthIsland({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider>
      <ConvexClientProvider>{children}</ConvexClientProvider>
    </ConvexAuthNextjsServerProvider>
  );
}
