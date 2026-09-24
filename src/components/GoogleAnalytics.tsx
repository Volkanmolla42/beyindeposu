"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const queryString = searchParams.toString();
    const pagePath = `${pathname}${queryString ? `?${queryString}` : ""}`;

    window.gtag?.("event", "page_view", {
      page_path: pagePath,
    });
  }, [pathname, searchParams]);

  return null;
}
