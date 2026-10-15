import type { Metadata } from "next";
import Landing from "./(components)/Pages/Landing";
import PageWrapper from "./(components)/utils/PageWrapper";

export const metadata: Metadata = {
  title: "Crafti Nagma — Handmade Crochet & Embroidery",
  description:
    "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma ",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Crafti Nagma — Handmade Crochet & Embroidery",
    description:
      "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma ",
    url: "/",
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
    card: "summary_large_image",
    title: "Crafti Nagma — Handmade Crochet & Embroidery",
    description:
      "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma ",
  },
};

export default function Home() {
  return (
    <PageWrapper variant="hero">
      <Landing />
    </PageWrapper>
  );
}
