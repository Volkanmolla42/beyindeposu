import Header from "@/components/Header";
import Footer from "@/components/Footer";
import LiveChatWidget from "@/components/LiveChatWidget";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <LiveChatWidget />
      <FloatingWhatsApp />
    </div>
  );
}
