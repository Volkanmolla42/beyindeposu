"use client";

import { useEffect, useRef } from "react";

export function useObjectUrlPreview() {
  const urlRef = useRef<string | null>(null);

  const clear = () => {
    if (!urlRef.current) return;
    URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  };

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const create = (file: File) => {
    clear();
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    return url;
  };

  return { create, clear };
}
