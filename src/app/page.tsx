// src/app/page.tsx
import type { Metadata } from "next";
import Landing from "./(components)/Pages/Landing";
import PageWrapper from "./(components)/utils/PageWrapper";

export const metadata: Metadata = {
  title: "Crafti Nagma — Handmade Crochet & Embroidery",
  description:
    "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Crafti Nagma — Handmade Crochet & Embroidery",
    description:
      "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Crafti Nagma — Handmade Crochet & Embroidery",
    description:
      "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma",
  },
};

export default function Home() {
  return (
    <PageWrapper variant="hero">
      <Landing />
    </PageWrapper>
  );
}
