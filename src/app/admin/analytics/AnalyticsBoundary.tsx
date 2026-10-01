"use client";

import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export default class AnalyticsBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="rounded-2xl border border-slate-200 bg-white p-6"><h1 className="text-xl font-medium">Analitik kullanılamıyor</h1><p className="my-3 text-sm text-slate-600">Backend bağlantısını ve analitik fonksiyonlarının dağıtımını kontrol edin.</p><Button variant="outline" onClick={() => window.location.reload()}>Tekrar dene</Button></div>;
    return this.props.children;
  }
}
