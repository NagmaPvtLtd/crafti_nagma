import type { Metadata } from "next";
import AboutLayout, {
  AboutCard,
  AboutFooterLinks,
} from "../(components)/About/AboutLayout";

export const metadata: Metadata = {
  title: "Our Story — Crafti Nagma",
  description:
    "How Crafti Nagma grew from a quiet hobby in a small room into a tiny handmade studio making crochet, embroidery and custom decor to order.",
};

const STATS = [
  { value: "120+", label: "Happy customers" },
  { value: "100%", label: "Handmade" },
  { value: "1-2 week", label: "Avg. craft time" },
  { value: "India-wide", label: "Shipping" },
] as const;

const VALUES = [
  {
    icon: "heart",
    title: "Made by hand, made with heart",
    body: "Every stitch is placed by hand, not by a machine. There are no factories, no shortcuts and no mass-produced copies — just one pair of hands, a hook, and a whole lot of love.",
  },
  {
    icon: "package",
    title: "Made to order, made slowly",
    body: "Nothing sits in a warehouse waiting to be picked. Your piece starts after you order it, which is why it takes about one to two weeks to craft before it ships.",
  },
  {
    icon: "sparkles",
    title: "Small batches, small footprint",
    body: "Yarn and fabric are bought only for the orders already placed, so very little goes to waste. Leftover yarn becomes keychains, scrunchies and tiny gift extras.",
  },
] as const;

const MAKES = [
  "Crochet plushies and amigurumi cuties",
  "Keychains, bookmarks and bag charms",
  "Embroidery hoops and wall art",
  "Custom name and couple pieces",
  "Gift hampers for birthdays and baby showers",
  "Seasonal decor and festive sets",
] as const;

export default function AboutPage() {
  return (
    <AboutLayout
      eyebrow="About Crafti Nagma"
      title="A small handmade studio, built one stitch at a time."
      lead="Crafti Nagma started as a quiet hobby in a small room in India — and grew into a tiny homegrown startup. From amigurumi cuties to embroidered wall art, every piece is made to order, made slowly, and made to last."
    >
      <section className="grid grid-cols-2 gap-x-3 gap-y-5 rounded-2xl border border-white/60 bg-white/85 px-5 py-6 backdrop-blur-sm sm:grid-cols-4 sm:rounded-3xl sm:px-6 sm:py-8">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-lg font-semibold text-stone-900 sm:text-xl">
              {stat.value}
            </p>
            <p className="mt-1 text-[11px] text-stone-500 sm:text-xs">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {VALUES.map((value) => (
        <AboutCard key={value.title} icon={value.icon} title={value.title}>
          <p>{value.body}</p>
        </AboutCard>
      ))}

      <AboutCard icon="star" title="What we make">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-rose-300">
          {MAKES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p className="mt-3">
          Have something else in mind? Custom orders are always welcome — send
          the idea across and the details can be worked out from there.
        </p>
      </AboutCard>

      <AboutCard icon="message" title="A personal note">
        <p>
          When you order from Crafti Nagma, you are not buying from a warehouse.
          You are buying from one person who will remember your order, pick the
          yarn, stitch it and wrap it. Thank you for keeping handmade alive.
        </p>
      </AboutCard>

      <AboutFooterLinks
        primary={{ label: "See how a piece is made", href: "/how-it-is-made" }}
        secondary={{ label: "Browse the collection", href: "/collections" }}
      />
    </AboutLayout>
  );
}
