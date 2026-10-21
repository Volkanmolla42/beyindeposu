"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ReactNode, useState } from "react";

export function ConvexClientProvider({
  children,
  auth = false,
}: {
  children: ReactNode;
  auth?: boolean;
}) {
  const [convex] = useState(
    () =>
      new ConvexReactClient(
        process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud",
      ),
  );

  if (auth) {
    return (
      <ConvexAuthNextjsProvider client={convex}>
        {children}
      </ConvexAuthNextjsProvider>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
