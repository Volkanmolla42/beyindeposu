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
import {
  ORGANIZATION_JSON_LD,
  SEO_IMAGE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  serializeJsonLd,
} from "@/lib/seo";

const GA_MEASUREMENT_ID = "G-K1QH76J0XM";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: "Beyin Deposu | Oto Elektronik Parça Merkezi",
    template: "%s | Beyin Deposu",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  creator: SITE_NAME,
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Beyin Deposu | Oto Elektronik Parça Merkezi",
    description: SITE_DESCRIPTION,
    images: [{ url: SEO_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beyin Deposu | Oto Elektronik Parça Merkezi",
    description: SITE_DESCRIPTION,
    images: [SEO_IMAGE],
  },
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
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: serializeJsonLd(ORGANIZATION_JSON_LD) }}
          />
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
