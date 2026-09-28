"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@convex/_generated/api";

export default function AdminRedirectGuard() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const isAdmin = useQuery(api.users.isAdmin, isAuthenticated ? {} : "skip");

  useEffect(() => {
    if (!authLoading && isAuthenticated && isAdmin === true) {
      router.replace("/admin");
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  return null;
}
