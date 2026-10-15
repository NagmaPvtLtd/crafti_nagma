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
    images: [
      {
        url: "/assets/avatar_v1.png",
        width: 1200,
        height: 630,
        alt: "Crafti Nagma Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
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
            <Footer />
          </IKProvider>
        </Suspense>

        <Analytics />
        <SpeedInsights />

        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: "#171717",
              color: "#f5f5f5",
              border: "1px solid #262626",
              fontSize: "14px",
              borderRadius: "10px",
              padding: "10px 14px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#171717" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#171717" },
            },
          }}
        />
      </body>
    </html>
  );
}
