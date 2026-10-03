"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type RouteErrorStateProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function RouteErrorState({ error, retry }: RouteErrorStateProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section
      role="alert"
      className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 py-12 text-center"
    >
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Sayfa açılamadı
      </h1>
      <Button onClick={retry}>Yeniden dene</Button>
    </section>
  );
}
