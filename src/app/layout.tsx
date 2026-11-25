import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { websiteLink } from "../utils/main.util";

import HomePageHeartbeat from "../hooks/Heartbeat.hook";
import CustomLoader from "./(components)/CustomLoader";
import Navbar from "./(components)/Navbar/Navbar";
import IKProvider from "./(components)/Providers/Imagekit.Provider";
import Footer from "./(components)/Footer";
import ScrollToTop from "./(components)/utils/ScrollToTop";
import WhatsAppFloat from "./(components)/utils/WhatsappFloating";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteDescription =
  "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma";

export const metadata: Metadata = {
  metadataBase: new URL(websiteLink),
  title: {
    default: "Crafti Nagma — Handmade Crochet & Embroidery",
    template: "%s | Crafti Nagma",
  },
  description: siteDescription,
  keywords: [
    "handmade crochet",
    "embroidery hoops",
    "custom decor",
    "crochet gifts",
    "handmade gifts",
    "Crafti Nagma",
    "crochet India",
    "embroidery art",
  ],
  authors: [{ name: "Crafti Nagma", url: websiteLink }],
  creator: "Crafti Nagma",
  publisher: "Crafti Nagma",
  applicationName: "Crafti Nagma",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: websiteLink,
    siteName: "Crafti Nagma",
    title: "Crafti Nagma — Handmade Crochet & Embroidery",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Crafti Nagma — Handmade Crochet & Embroidery",
    description: siteDescription,
  },
  icons: {
    icon: "/assets/avatar_v1.png",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Suspense fallback={<CustomLoader label="Loading ..." />}>
          <IKProvider>
            <Navbar />
            <HomePageHeartbeat />
            {children}
            <ScrollToTop />

            <WhatsAppFloat />
            <Footer />
          </IKProvider>
        </Suspense>

        <Analytics />
        <SpeedInsights />

        <Toaster
          position="bottom-right"
          gutter={8}
          containerStyle={{ margin: "16px" }}
          toastOptions={{
            duration: 3000,
            style: {
              /* Matches the studio's white cards, stone borders and rose accent. */
              background: "#ffffff",
              color: "#1c1917",
              border: "1px solid #e7e5e4",
              fontSize: "13px",
              fontWeight: 500,
              lineHeight: 1.45,
              borderRadius: "14px",
              boxShadow:
                "0 10px 30px -12px rgba(244, 63, 94, 0.18), 0 8px 20px -10px rgba(28, 25, 23, 0.16)",
              padding: "11px 15px",
              maxWidth: "380px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#ffffff" },
            },
            error: {
              iconTheme: { primary: "#f43f5e", secondary: "#ffffff" },
            },
            loading: {
              iconTheme: { primary: "#fb7185", secondary: "#ffffff" },
            },
            blank: {
              iconTheme: { primary: "#fb7185", secondary: "#ffffff" },
            },
          }}
        />
      </body>
    </html>
  );
}
