import type { Metadata } from "next";
import { Package, Scissors, Sparkles, Spool, Truck } from "lucide-react";
import AboutLayout, {
  AboutCard,
  AboutFooterLinks,
} from "../(components)/About/AboutLayout";

export const metadata: Metadata = {
  title: "How it is made — Crafti Nagma",
  description:
    "Follow a Crafti Nagma piece from sketch to doorstep: choosing yarn, stitching by hand, finishing, checking and wrapping.",
};

const STEPS = [
  {
    step: "01",
    icon: Sparkles,
    title: "The idea",
    body: "You pick a design from the collection or send a custom request. The size, colours and any names or messages you want stitched in are talked through before any work starts.",
  },
  {
    step: "02",
    icon: Spool,
    title: "Yarn and colours",
    body: "The yarn, thread and fabric are chosen for that one order. Shades are matched by eye in daylight, because screens never tell the whole truth about a colour.",
  },
  {
    step: "03",
    icon: Scissors,
    title: "Handwork begins",
    body: "Crochet pieces are worked stitch by stitch on a hook. Embroidery is drawn onto the cloth first, then filled in with a needle. This is the slow part — and the one done with the most care.",
  },
  {
    step: "04",
    icon: Package,
    title: "Finishing and checking",
    body: "Loose ends are woven in, shapes are blocked and stuffed, and every piece is checked for even tension, sharp edges and colour bleed before it is allowed to leave the table.",
  },
  {
    step: "05",
    icon: Truck,
    title: "Wrapped and shipped",
    body: "Your order is wrapped with care, packed to travel safely, and dispatched with tracking. Shipment updates land in your email and on the orders page.",
  },
] as const;

export default function HowItIsMadePage() {
  return (
    <AboutLayout
      eyebrow="How it is made"
      title="From your click to your doorstep, crafted at every step."
      lead="Nothing here is picked off a shelf. Each order goes through the same small, slow process — a person, a hook or a needle, and enough time to do it properly."
    >
      <div className="relative space-y-4">
        {STEPS.map((step) => (
          <div
            key={step.step}
            className="relative flex gap-4 rounded-2xl border border-white/60 bg-white/85 px-5 py-5 backdrop-blur-sm sm:rounded-3xl sm:px-6"
          >
            <div className="flex flex-col items-center">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-[11px] font-semibold text-rose-500">
                {step.step}
              </span>
              <span
                aria-hidden
                className="mt-2 hidden w-px flex-1 border-l border-dashed border-rose-200 sm:block"
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <step.icon className="h-4 w-4 shrink-0 text-rose-400" />
                <h2 className="text-sm font-semibold text-stone-900 sm:text-base">
                  {step.title}
                </h2>
              </div>
              <p className="mt-2 text-[15px] leading-7 text-stone-600">
                {step.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      <AboutCard icon="spool" title="What goes into a piece">
        <p>
          Soft cotton and acrylic yarns for crochet, cotton and linen cloth for
          embroidery, wooden hoops, hypoallergenic fibre fill for plushies, and
          metal keychain hardware. If you have a sensitivity to a material, say
          so before ordering and you will get an honest answer on whether the
          piece can be made without it.
        </p>
      </AboutCard>

      <AboutCard icon="package" title="Why it takes one to two weeks">
        <p>
          Handwork cannot be rushed. A single amigurumi can take several hours,
          and larger hoops or hampers take longer. The estimate you see at
          checkout already includes crafting time before dispatch — it is not
          just shipping.
        </p>
      </AboutCard>

      <AboutFooterLinks
        primary={{ label: "Read the care guide", href: "/care-guide" }}
        secondary={{ label: "Start a custom order", href: "/dashboard/custom-order" }}
      />
    </AboutLayout>
  );
}
