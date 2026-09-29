"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface AdminHeaderContextType {
  headerAction: React.ReactNode | null;
  setHeaderAction: (action: React.ReactNode | null) => void;
}

const AdminHeaderContext = createContext<AdminHeaderContextType | undefined>(undefined);

export function AdminHeaderProvider({ children }: { children: React.ReactNode }) {
  const [headerAction, setHeaderAction] = useState<React.ReactNode | null>(null);

  return (
    <AdminHeaderContext.Provider value={{ headerAction, setHeaderAction }}>
      {children}
    </AdminHeaderContext.Provider>
  );
}

export function useAdminHeader() {
  const context = useContext(AdminHeaderContext);
  if (!context) {
    throw new Error("useAdminHeader must be used within an AdminHeaderProvider");
  }
  return context;
}

/**
 * Sayfa içinde deklaratif olarak header aksiyonu tanımlamak için bileşen.
 * Sayfa mount olduğunda içeriği header'a aktarır, unmount olduğunda temizler.
 */
export function AdminHeaderAction({ children }: { children: React.ReactNode }) {
  const { setHeaderAction } = useAdminHeader();

  useEffect(() => {
    setHeaderAction(children);
    return () => {
      setHeaderAction(null);
    };
  }, [children, setHeaderAction]);

  return null;
}
