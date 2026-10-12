import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Gift,
  Heart,
  MessageCircle,
  Package,
  Star,
  Truck,
} from "lucide-react";
import CraftiNagma from "../../../assets/images/avatar_v1.png";

/* ============================================================================
 * LANDING CONTENT — edit everything here, nothing below
 * ========================================================================== */

const LANDING_CONTENT = {
  /* ---- Hero -------------------------------------------------------- */
  hero: {
    badge: "Handmade in India",
    brand: "Crafti Nagma",
    tagline: "Stitch by stitch, made just for you.",
    description:
      "Cozy crochet gifts, embroidery hoops, and custom decor — every piece handcrafted in small batches by a tiny homegrown team, never mass-produced.",
    imageBadge: "Handmade craft!",
    rating: 5,
    ratingCount: "50+",
    ratingCopy: "Happy {count} handcraft lovers!",
  },

  /* ---- Trust strip ------------------------------------------------- */
  stats: [
    { value: "50+", label: "Happy customers" },
    { value: "100%", label: "Handmade" },
    { value: "1-2 week", label: "Avg. craft time" },
    { value: "India-Wide", label: "Shipping to you!" },
  ] as const,

  /* ---- Story ------------------------------------------------------- */
  story: {
    eyebrow: "Crafti Nagma story",
    heading: "Made by hand, made with heart.",
    body: "Crafti Nagma started as a quiet hobby in a small room in India — and grew into a tiny homegrown startup. From amigurumi cuties to embroidered wall art, every piece is made to order, made slowly, and made to last.",
    footnote:
      "No factories. No shortcuts. Just a small team, a hook, and a whole lot of love.",
  },

  /* ---- Offerings --------------------------------------------------- */
  offerings: [
    {
      icon: "heart" as const,
      title: "Catalogue is ready!",
      description:
        "Browse our current collection — crochet plushies, keychains, hoops, and more.",
      cta: "Shop collection",
      href: "/products",
    },
    {
      icon: "message" as const,
      title: "Made to order",
      description:
        "Pick a base design and customise colours, size, or a name. Crafted just for you!",
      cta: "Order custom",
      href: "/custom",
    },
    {
      icon: "gift" as const,
      title: "Gift hampers",
      description:
        "Curated gift sets for birthdays, anniversaries, and baby showers — beautifully wrapped and ready to give.",
      cta: "Explore gifts",
      href: "/products?category=gifts",
    },
  ] as const,

  /* ---- Process ----------------------------------------------------- */
  /* Steps map 1:1 to the `orders.order_status` enum:
   *   pending → accepted → crafting_in_progress → shipped → delivered
   *
   * The `status` field keeps the DB enum value alongside the marketing copy,
   * so future code can link a step to live order tracking without a rename.
   */
  process: {
    eyebrow: "How an order flows",
    heading: "From your click to your doorstep",
    subheading: "Simple, transparent, and crafted at every step.",
    steps: [
      {
        step: "01",
        status: "pending",
        icon: "package" as const,
        title: "Order placed",
        description:
          "You pick a piece or send a custom request. Payment is captured securely online.",
      },
      {
        step: "02",
        status: "accepted",
        icon: "check" as const,
        title: "Order accepted",
        description:
          "We review your order and add it to the crafting queue with a big smile.",
      },
      {
        step: "03",
        status: "crafting_in_progress",
        icon: "heart" as const,
        title: "Crafting begins",
        description:
          "Your piece is being handmade. Progress updates land in your inbox.",
      },
      {
        step: "04",
        status: "shipped",
        icon: "truck" as const,
        title: "Shipped to you",
        description:
          "Packed with care and dispatched. Tracking details sent via email & WhatsApp.",
      },
      {
        step: "05",
        status: "delivered",
        icon: "sparkle" as const,
        title: "Delivered",
        description:
          "Check your order status anytime in the dashboard, or reach out directly.",
      },
    ] as const,
    footerNote: {
      before: "Track your order anytime from your",
      linkText: "account dashboard",
      linkHref: "/account/orders",
      after: "— or reach out to us directly.",
    },
  },

  /* ---- Testimonials ------------------------------------------------ */
  testimonials: {
    eyebrow: "Kind words",
    heading: "Loved by homes across India",
  },

  /* ---- Final CTA --------------------------------------------------- */
  finalCta: {
    heading: "Ready to bring handmade home?",
    body: "Browse the collection or tell us your idea — either way, something special is about to begin.",
    primaryCta: { label: "Shop the collection", href: "/products" },
    secondaryCta: { label: "Start a custom order", href: "/custom" },
    footnote: "Free shipping on special occassions! · Ships India-wide",
  },
} as const;

/* ============================================================================
 * Icon maps — keep data serializable while letting components use lucide icons
 * ========================================================================== */

const OFFERING_ICONS = {
  heart: Heart,
  message: MessageCircle,
  gift: Gift,
} as const;

const PROCESS_ICONS = {
  package: Package,
  check: CheckCircle2,
  heart: Heart,
  truck: Truck,
  sparkle: Star,
} as const;

/* ============================================================================
 * Landing — public marketing page (mobile-first)
 * ========================================================================== */

export default function Landing() {
  const { hero, stats, story, offerings, process, testimonials, finalCta } =
    LANDING_CONTENT;

  return (
    <div className="flex flex-col text-stone-800">
      {/* ============================================================= */}
      {/* 1. HERO                                                       */}
      {/* ============================================================= */}
      <section className="relative overflow-hidden">
        {/* decorative glows — scaled for mobile */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-rose-100/40 blur-3xl sm:-top-32 sm:-right-32 sm:h-104 sm:w-104"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-44 w-44 rounded-full bg-amber-100/40 blur-3xl sm:-bottom-32 sm:-left-32 sm:h-88 sm:w-88"
        />

        <div className="relative mx-auto flex max-w-6xl flex-col-reverse items-center gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-20 md:flex-row md:gap-16 md:py-28">
          {/* Copy */}
          <div className="w-full flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-white/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-rose-500 backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-[11px]">
              <Heart className="h-2.5 w-2.5 fill-current sm:h-3 sm:w-3" />
              {hero.badge}
            </span>

            <h1 className="mt-5 text-[2rem] font-bold leading-[1.05] tracking-tight text-stone-900 sm:mt-7 sm:text-5xl md:text-6xl lg:text-7xl">
              {hero.brand}
              <span className="mt-2 block text-lg font-normal leading-snug tracking-normal text-stone-600 sm:mt-3 sm:text-2xl md:text-3xl">
                {hero.tagline}
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-stone-700 sm:mt-7 sm:text-base md:mx-0 md:text-lg">
              {hero.description}
            </p>

            {/* CTA */}
            <div className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:justify-center md:justify-start">
              <Link
                href="/products"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 transition-all hover:bg-rose-700 hover:shadow-md hover:shadow-rose-600/25 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-rose-600 active:scale-[0.98] sm:px-7"
              >
                Shop the collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/custom"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300/80 bg-white/80 px-5 py-3.5 text-sm font-semibold text-stone-700 backdrop-blur-sm transition-colors hover:border-stone-400 hover:bg-white active:scale-[0.98] sm:px-7"
              >
                <MessageCircle className="h-4 w-4 text-stone-500" />
                Request a custom piece
              </Link>
            </div>

            {/* Micro trust line */}
            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-stone-600 sm:mt-5 sm:text-xs md:justify-start">
              <span className="flex items-center gap-0.5 text-amber-500">
                {Array.from({ length: hero.rating }).map((_, i) => (
                  <Star key={i} className="h-3 w-3 fill-current" />
                ))}
              </span>
              <span>
                {hero.ratingCopy.replace("{count}", hero.ratingCount)}
              </span>
            </p>
          </div>

          {/* Hero image */}
          <div className="w-full flex-1">
            <div className="relative mx-auto aspect-square w-full max-w-55 overflow-hidden rounded-3xl border border-rose-100/80 bg-rose-50/50 shadow-xl shadow-rose-100/40 sm:max-w-xs md:max-w-sm">
              <Image
                src={CraftiNagma}
                alt="Crafti Nagma handmade crochet and embroidery"
                fill
                sizes="(max-width: 640px) 220px, (max-width: 768px) 320px, 384px"
                className="object-cover"
                priority
              />
              <div className="absolute bottom-3 left-3 rounded-full border border-white/40 bg-white/90 px-2.5 py-1 text-[10px] font-semibold text-stone-700 shadow-sm backdrop-blur sm:bottom-4 sm:left-4 sm:px-3 sm:py-1.5 sm:text-[11px]">
                {hero.imageBadge}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 2. TRUST STRIP                                                */}
      {/* ============================================================= */}
      <section className="border-y border-stone-200/60">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-x-3 gap-y-5 px-4 py-7 sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 sm:px-6 sm:py-10">
          {stats.map((s) => (
            <Stat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </section>

      {/* ============================================================= */}
      {/* 3. STORY                                                      */}
      {/* ============================================================= */}
      <section className="border-t border-stone-200/60">
        <div className="mx-auto w-full max-w-2xl px-4 py-12 text-center sm:px-6 sm:py-20 md:py-24">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 sm:text-[11px]">
            {story.eyebrow}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:mt-4 sm:text-3xl md:text-4xl">
            {story.heading}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-stone-700 sm:mt-6 sm:text-base md:text-lg">
            {story.body}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-stone-600 sm:mt-4 sm:text-sm">
            {story.footnote}
          </p>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 4. OFFERINGS                                                  */}
      {/* ============================================================= */}
      <section className="border-t border-stone-200/60">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
            <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              What you can shop
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:mt-4 sm:text-base">
              Three ways to bring a little handmade warmth into your home.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
            {offerings.map((o) => {
              const Icon = OFFERING_ICONS[o.icon];
              return (
                <OfferingCard
                  key={o.title}
                  icon={<Icon className="h-5 w-5" />}
                  title={o.title}
                  description={o.description}
                  cta={o.cta}
                  href={o.href}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 5. PROCESS                                                    */}
      {/* ============================================================= */}
      <section className="border-t border-stone-200/60">
        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          {/* Section header */}
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 sm:text-[11px]">
              {process.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              {process.heading}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:mt-4 sm:text-base">
              {process.subheading}
            </p>
          </div>

          {/* Steps grid — 1 / 2 / 3 / 5 columns */}
          <ol className="grid list-none grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {process.steps.map((p) => {
              const Icon = PROCESS_ICONS[p.icon];
              return (
                <ProcessStep
                  key={p.step}
                  step={p.step}
                  status={p.status}
                  icon={<Icon className="h-5 w-5" />}
                  title={p.title}
                  description={p.description}
                />
              );
            })}
          </ol>

          {/* Footer note — track / contact */}
          <p className="mt-8 text-center text-xs text-stone-600 sm:mt-10 sm:text-sm">
            {process.footerNote.before}{" "}
            <Link
              href={process.footerNote.linkHref}
              className="font-semibold text-rose-600 underline-offset-2 hover:underline"
            >
              {process.footerNote.linkText}
            </Link>{" "}
            {process.footerNote.after}
          </p>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 6. TESTIMONIALS                                               */}
      {/* ============================================================= */}
      <section className="border-t border-stone-200/60">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500 sm:text-[11px]">
              {testimonials.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              {testimonials.heading}
            </h2>
          </div>

          <div className="flex items-center justify-center text-xs animate-pulse">
            Reviews Soon!
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* 7. FINAL CTA                                                  */}
      {/* ============================================================= */}
      <section className="border-t border-stone-200/60">
        <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 sm:py-20 md:py-24">
          <div className="relative overflow-hidden rounded-2xl border border-rose-200/70 bg-linear-to-br from-rose-50/80 via-rose-50/60 to-amber-50/50 px-5 py-10 text-center backdrop-blur-sm sm:rounded-3xl sm:px-10 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 h-36 w-36 rounded-full bg-rose-200/40 blur-3xl sm:h-48 sm:w-48"
            />

            <div className="relative">
              <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                {finalCta.heading}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-700 sm:mt-4 sm:text-base">
                {finalCta.body}
              </p>

              <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                <Link
                  href={finalCta.primaryCta.href}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-rose-600/20 transition-all hover:bg-rose-700 hover:shadow-md hover:shadow-rose-600/25 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-rose-600 active:scale-[0.98] sm:w-auto sm:px-7"
                >
                  {finalCta.primaryCta.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={finalCta.secondaryCta.href}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-stone-300/80 bg-white/80 px-5 py-3.5 text-sm font-semibold text-stone-700 backdrop-blur-sm transition-colors hover:border-stone-400 hover:bg-white active:scale-[0.98] sm:w-auto sm:px-7"
                >
                  <MessageCircle className="h-4 w-4 text-stone-500" />
                  {finalCta.secondaryCta.label}
                </Link>
              </div>

              <p className="mt-5 text-[11px] text-stone-600 sm:mt-6 sm:text-xs">
                {finalCta.footnote}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ============================================================================
 * Sub-components
 * ========================================================================== */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-base font-semibold tracking-tight text-stone-900 sm:text-xl md:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-stone-600 sm:text-[11px]">
        {label}
      </p>
    </div>
  );
}

function OfferingCard({
  icon,
  title,
  description,
  cta,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-white/60 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:p-7">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 sm:h-11 sm:w-11">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-stone-900 sm:mt-5">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-stone-600">
        {description}
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 transition-colors hover:text-rose-700 sm:mt-5"
      >
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function ProcessStep({
  step,
  status,
  icon,
  title,
  description,
}: {
  step: string;
  status: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  // Human-friendly label from the DB enum: "crafting_in_progress" → "crafting in progress"
  const statusLabel = status.replace(/_/g, " ");

  return (
    <li className="relative flex flex-col rounded-2xl border border-white/60 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:p-6">
      {/* Step number — decorative background accent */}
      <span
        aria-hidden
        className="absolute top-4 right-4 text-3xl font-bold tracking-tight text-stone-200/80 sm:text-4xl"
      >
        {step}
      </span>

      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 sm:h-11 sm:w-11">
        {icon}
      </div>

      {/* Title */}
      <h3 className="mt-4 text-base font-semibold text-stone-900">{title}</h3>

      {/* Status badge — real DB enum value, mono for code-likeness */}
      <span className="mt-2 inline-flex w-fit items-center rounded-full border border-stone-200/70 bg-stone-50/70 px-2 py-0.5 font-mono text-[10px] tracking-tight text-stone-600 capitalize">
        {statusLabel}
      </span>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {description}
      </p>
    </li>
  );
}
