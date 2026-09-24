import type { Metadata } from "next";
import Script from "next/script";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import LiveChatWidget from "@/components/LiveChatWidget";
import FloatingWhatsApp from "@/components/FloatingWhatsApp";
import GoogleAnalytics from "@/components/GoogleAnalytics";

const GA_MEASUREMENT_ID = "G-TM4CBE5R5V";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BEYINDEPOSU | Türkiye'nin Oto Elektronik Parça Merkezi",
  description: "ECU (Motor Beyinleri), ABS, Airbag, BCM, BSI, SAM ve binlerce orijinal oto elektronik kontrol modülleri. Orijinal, garantili ve aynı gün kargo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html
        lang="tr"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <Script id="google-analytics-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });`}
          </Script>
          <Script
            id="google-analytics"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Suspense fallback={null}>
            <GoogleAnalytics />
          </Suspense>
          <ConvexClientProvider>
            {children}
            <LiveChatWidget />
            <FloatingWhatsApp />
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
