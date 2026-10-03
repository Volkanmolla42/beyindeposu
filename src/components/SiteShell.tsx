import { Suspense } from "react";
import AnalyticsProvider from "@/components/AnalyticsProvider";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default function SiteShell({
  children,
  afterFooter,
}: {
  children: React.ReactNode;
  afterFooter?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-blue-700 focus:px-4 focus:py-2.5 focus:text-white focus:shadow-lg focus:outline-none"
      >
        Ana içeriğe atla
      </a>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {children}
      </main>
      <Footer />
      {afterFooter}
      <FloatingWhatsApp />
      <Suspense fallback={null}>
        <AnalyticsProvider />
      </Suspense>
    </div>
  );
}
