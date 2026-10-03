"use client";

import { ConvexAuthNextjsProvider } from "@convex-dev/auth/nextjs";
import { ConvexReactClient } from "convex/react";
import { ReactNode, useState } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const [convex] = useState(
    () => new ConvexReactClient(
      process.env.NEXT_PUBLIC_CONVEX_URL || "https://placeholder-url.convex.cloud",
    ),
  );

  return (
    <ConvexAuthNextjsProvider client={convex}>
      {children}
    </ConvexAuthNextjsProvider>
  );
}
