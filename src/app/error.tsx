"use client";

import RouteErrorState from "@/components/RouteErrorState";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return <RouteErrorState error={error} retry={retry} />;
}
