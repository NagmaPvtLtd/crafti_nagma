import type { Metadata } from "next";
import Landing from "./(components)/Pages/Landing";

export const metadata: Metadata = {
  title: "Crafti Nagma — Handmade Crochet & Embroidery",
  description:
    "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma 💛",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Crafti Nagma — Handmade Crochet & Embroidery",
    description:
      "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma 💛",
    url: "/",
    images: [
      {
        url: "/Logo/website-logo.png",
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
      "Shop handmade crochet gifts, embroidery hoops, and custom decor. Made with love by Crafti Nagma 💛",
  },
};

export default function Home() {
  return <Landing />;
}
