"use client";

import "./globals.css";
import RouteErrorState from "@/components/RouteErrorState";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-slate-50 font-sans antialiased">
        <title>Bir hata oluştu | Beyin Deposu</title>
        <RouteErrorState error={error} retry={retry} />
      </body>
    </html>
  );
}
