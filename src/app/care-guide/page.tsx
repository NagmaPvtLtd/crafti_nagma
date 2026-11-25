import type { Metadata } from "next";
import { Droplets, Scissors, Sun, Wind } from "lucide-react";
import AboutLayout, {
  AboutCard,
  AboutFooterLinks,
} from "../(components)/About/AboutLayout";
import { supportMail } from "../../utils/main.util";

export const metadata: Metadata = {
  title: "Care guide — Crafti Nagma",
  description:
    "Simple washing, drying and storing instructions so your handmade crochet, embroidery and decor last for years.",
};

const QUICK_RULES = [
  {
    icon: Droplets,
    label: "Gentle wash only",
    body: "Cold water, mild detergent, hands only. No bleach, no dryer.",
  },
  {
    icon: Wind,
    label: "Air dry flat",
    body: "Press gently in a towel and dry flat in shade so the shape holds.",
  },
  {
    icon: Sun,
    label: "Keep out of direct sun",
    body: "Long sunlight fades yarn and thread colours.",
  },
  {
    icon: Scissors,
    label: "Snip, do not pull",
    body: "Trim any loose thread with scissors instead of tugging at it.",
  },
] as const;

export default function CareGuidePage() {
  return (
    <AboutLayout
      eyebrow="Care guide"
      title="A little care keeps handmade looking new."
      lead="Everything here is made from yarn, thread and cloth — soft materials that simply ask to be treated gently. These are the instructions followed here, every day."
    >
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {QUICK_RULES.map((rule) => (
          <div
            key={rule.label}
            className="rounded-2xl border border-white/60 bg-white/85 px-5 py-4 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2">
              <rule.icon className="h-4 w-4 shrink-0 text-rose-400" />
              <h2 className="text-sm font-semibold text-stone-900">
                {rule.label}
              </h2>
            </div>
            <p className="mt-1.5 text-[13px] leading-6 text-stone-600">
              {rule.body}
            </p>
          </div>
        ))}
      </section>

      <AboutCard icon="heart" title="Crochet plushies and amigurumi">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-rose-300">
          <li>
            Spot clean with a damp cloth and a drop of mild soap for small marks.
          </li>
          <li>
            For a deeper clean, hand wash in cold water, squeeze — never twist —
            and reshape while still damp.
          </li>
          <li>Dry flat, away from radiators, direct sun and the dryer.</li>
          <li>
            Keep away from pets: the yarn loops are easy to catch on claws and
            teeth.
          </li>
          <li>Store in a dry place; a cotton bag is better than a sealed plastic one.</li>
        </ul>
      </AboutCard>

      <AboutCard icon="shirt" title="Embroidery hoops and wall art">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-rose-300">
          <li>
            Do not soak or machine wash hoop pieces — the fabric can pucker and
            the thread colours can bleed.
          </li>
          <li>
            Dust with a soft dry brush or a low-suction vacuum held a little away
            from the cloth.
          </li>
          <li>
            Hang out of direct sunlight and away from damp walls, kitchens and
            bathrooms.
          </li>
          <li>
            If the cloth loosens over the years, the hoop screw can be tightened
            gently.
          </li>
        </ul>
      </AboutCard>

      <AboutCard icon="scissors" title="Keychains, bookmarks and small accessories">
        <ul className="list-disc space-y-1.5 pl-5 marker:text-rose-300">
          <li>Wipe the metal hardware with a dry cloth if it dulls.</li>
          <li>
            Do not pull on the charm to remove a key — hold the ring instead, so
            the yarn loop keeps its shape.
          </li>
          <li>
            Keep paper bookmarks away from water; the stitched edge softens when
            wet.
          </li>
        </ul>
      </AboutCard>

      <AboutCard icon="droplets" title="If something goes wrong">
        <p>
          Snags, loose stitches, colour transfer or a piece that lost its shape
          after a wash — write to us at{" "}
          <a
            href={`mailto:${supportMail}`}
            className="font-medium text-rose-500 underline decoration-rose-300 decoration-dashed underline-offset-4 transition-colors hover:text-rose-600"
          >
            {supportMail}
          </a>{" "}
          with a photo. Most small repairs are simple to talk through, and help
          is always better than a piece being pushed aside unused.
        </p>
      </AboutCard>

      <AboutFooterLinks
        primary={{ label: "Back to our story", href: "/about" }}
        secondary={{ label: "Browse the collection", href: "/collections" }}
      />
    </AboutLayout>
  );
}
