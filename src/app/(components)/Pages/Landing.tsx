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
  Sparkles,
  Truck,
} from "lucide-react";
import CraftiNagma from "../../../assets/images/avatar_v1.png";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";

const LANDING_CONTENT = {
  hero: {
    badge: "Handmade in India",
    brand: "Crafti Nagma",
    tagline: "Stitch by stitch, made just for you.",
    description:
      "Cozy crochet gifts, embroidery hoops, and custom decor — every piece handcrafted in small batches by a tiny homegrown team, never mass-produced.",
    rating: 5,
    ratingCount: "120+",
    ratingCopy: "Happy {count} handcraft lovers!",
  },

  stats: [
    { value: "120+", label: "Happy customers" },
    { value: "100%", label: "Handmade" },
    { value: "1-2 week", label: "Avg. craft time" },
    { value: "India-Wide", label: "Shipping to you!" },
  ] as const,

  story: {
    eyebrow: "Crafti Nagma story",
    heading: "Made by hand, made with heart.",
    body: "Crafti Nagma started as a quiet hobby in a small room in India — and grew into a tiny homegrown startup. From amigurumi cuties to embroidered wall art, every piece is made to order, made slowly, and made to last.",
    footnote:
      "No factories. No shortcuts. Just a small team, a hook, and a whole lot of love.",
  },

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

  testimonials: {
    eyebrow: "Kind words",
    heading: "Loved by homes across India",
  },

  finalCta: {
    heading: "Ready to bring handmade home?",
    body: "Browse the collection or tell us your idea — either way, something special is about to begin.",
    primaryCta: { label: "Shop the collection", href: "/products" },
    secondaryCta: { label: "Start a custom order", href: "/custom" },
    footnote: "Free shipping on special occassions! · Ships India-wide",
  },
} as const;

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

const HERO_CSS = `
@keyframes hero-spin { to { transform: rotate(360deg); } }
@keyframes hero-glow {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50%      { opacity: 0.85; transform: scale(1.06); }
}
@keyframes hero-float {
  0%, 100% { transform: translateY(0) rotate(-4deg); }
  50%      { transform: translateY(-7px) rotate(6deg); }
}
@keyframes hero-badge {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}
@media (prefers-reduced-motion: reduce) {
  .hero-anim-spin, .hero-anim-glow, .hero-anim-float, .hero-anim-badge {
    animation: none !important;
  }
}
`;

export default function Landing() {
  const { hero, stats, story, offerings, process, testimonials, finalCta } =
    LANDING_CONTENT;

  return (
    <PageWrapper variant="content" position="fixed">
      <style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />

      <div className="relative flex flex-col overflow-hidden text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 rounded-full bg-rose-100/40 blur-3xl"
        />

        <section className="relative">
          <div className="relative mx-auto flex max-w-7xl flex-col-reverse items-center gap-8 px-4 py-12 sm:gap-10 sm:px-6 sm:py-20 md:flex-row md:gap-16 md:py-24">
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

              <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-stone-600 sm:mt-7 sm:text-base md:mx-0 md:text-lg">
                {hero.description}
              </p>

              <div className="mt-7 flex flex-col gap-2.5 sm:mt-9 sm:flex-row sm:justify-center md:justify-start">
                <Link
                  href="/products"
                  className="group inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-rose-500/25 transition-all hover:bg-rose-600 hover:shadow-md hover:shadow-rose-500/30 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:scale-[0.98] sm:px-7"
                >
                  Shop the collection
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/custom"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-5 py-3.5 text-sm font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98] sm:px-7"
                >
                  <MessageCircle className="h-4 w-4" />
                  Request a custom piece
                </Link>
              </div>

              <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-stone-500 sm:mt-5 sm:text-xs md:justify-start">
                <span className="flex items-center gap-0.5 text-rose-400">
                  {Array.from({ length: hero.rating }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-current" />
                  ))}
                </span>
                <span>
                  {hero.ratingCopy.replace("{count}", hero.ratingCount)}
                </span>
              </p>
            </div>

            <div className="w-full flex-1">
              <div className="relative mx-auto aspect-square w-full max-w-55 sm:max-w-xs md:max-w-sm">
                <svg
                  aria-hidden
                  viewBox="0 0 100 100"
                  fill="none"
                  className="hero-anim-spin pointer-events-none absolute -inset-5 h-[calc(100%+2.5rem)] w-[calc(100%+2.5rem)] text-rose-300/70"
                  style={{ animation: "hero-spin 22s linear infinite" }}
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="0.6"
                    strokeLinecap="round"
                    strokeDasharray="1 3"
                  />
                </svg>

                <div
                  aria-hidden
                  className="hero-anim-glow pointer-events-none absolute inset-3 rounded-full bg-rose-200/55 blur-2xl"
                  style={{ animation: "hero-glow 4s ease-in-out infinite" }}
                />

                <Heart
                  aria-hidden
                  className="hero-anim-float pointer-events-none absolute -top-2 -left-2 h-5 w-5 fill-rose-300 text-rose-300 drop-shadow-sm"
                  style={{ animation: "hero-float 3.2s ease-in-out infinite" }}
                />
                <Sparkles
                  aria-hidden
                  className="hero-anim-float pointer-events-none absolute -right-2 -bottom-2 h-5 w-5 text-rose-400 drop-shadow-sm"
                  style={{
                    animation: "hero-float 3.8s ease-in-out infinite",
                    animationDelay: "1.2s",
                  }}
                />

                <div className="relative aspect-square w-full -rotate-1 overflow-hidden rounded-3xl border border-white/60 bg-white/85 p-2 shadow-xl shadow-rose-100/40 backdrop-blur-sm transition-transform duration-500 hover:rotate-0 sm:rounded-4xl">
                  <div className="relative h-full w-full overflow-hidden rounded-2xl border border-dashed border-rose-200/70 sm:rounded-[1.6rem]">
                    <Image
                      src={CraftiNagma}
                      alt="Crafti Nagma handmade crochet and embroidery"
                      fill
                      sizes="(max-width: 640px) 220px, (max-width: 768px) 320px, 384px"
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        <section className="relative">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
            <div className="grid grid-cols-2 gap-x-3 gap-y-5 rounded-2xl border border-white/60 bg-white/85 px-5 py-6 backdrop-blur-sm sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 sm:rounded-3xl sm:px-6 sm:py-8">
              {stats.map((s) => (
                <Stat key={s.label} value={s.value} label={s.label} />
              ))}
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        <section className="relative">
          <div className="mx-auto w-full max-w-3xl px-4 py-12 text-center sm:px-6 sm:py-16 md:py-20">
            <SectionEyebrow>{story.eyebrow}</SectionEyebrow>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:mt-4 sm:text-3xl md:text-4xl">
              {story.heading}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-stone-600 sm:mt-6 sm:text-base md:text-lg">
              {story.body}
            </p>
            <p className="mt-3 text-xs leading-relaxed text-stone-500 sm:mt-4 sm:text-sm">
              {story.footnote}
            </p>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
              <SectionEyebrow>What you can shop</SectionEyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                Three ways to bring handmade home
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:mt-4 sm:text-base">
                A little warmth, stitched into every corner.
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

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-12">
              <SectionEyebrow>{process.eyebrow}</SectionEyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                {process.heading}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:mt-4 sm:text-base">
                {process.subheading}
              </p>
            </div>

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

            <p className="mt-8 text-center text-xs text-stone-500 sm:mt-10 sm:text-sm">
              {process.footerNote.before}{" "}
              <Link
                href={process.footerNote.linkHref}
                className="font-medium text-rose-500 underline decoration-rose-300 decoration-dashed underline-offset-4 transition-colors hover:text-rose-600"
              >
                {process.footerNote.linkText}
              </Link>{" "}
              {process.footerNote.after}
            </p>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
            <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
              <SectionEyebrow>{testimonials.eyebrow}</SectionEyebrow>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                {testimonials.heading}
              </h2>
            </div>

            <div className="mx-auto flex max-w-md items-center justify-center gap-2 rounded-2xl border border-white/60 bg-white/85 px-6 py-8 text-center backdrop-blur-sm sm:rounded-3xl">
              <Heart className="h-4 w-4 animate-pulse fill-rose-400 text-rose-400" />
              <span className="text-sm font-medium text-stone-600">
                Reviews coming soon…
              </span>
              <Sparkles className="h-4 w-4 animate-pulse text-rose-300" />
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 md:py-20">
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 px-5 py-10 text-center backdrop-blur-sm sm:rounded-3xl sm:px-10 sm:py-14">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-rose-200/50 blur-3xl sm:h-56 sm:w-56"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-rose-100/60 blur-3xl sm:h-52 sm:w-52"
              />

              <div className="relative">
                <SectionDivider className="mx-auto mb-4 max-w-xs" />

                <h2 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  {finalCta.heading}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-stone-600 sm:mt-4 sm:text-base">
                  {finalCta.body}
                </p>

                <div className="mt-7 flex flex-col items-center justify-center gap-2.5 sm:mt-9 sm:flex-row sm:gap-3">
                  <Link
                    href={finalCta.primaryCta.href}
                    className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 px-5 py-3.5 text-sm font-semibold text-white shadow-sm shadow-rose-500/25 transition-all hover:bg-rose-600 hover:shadow-md hover:shadow-rose-500/30 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-rose-500 active:scale-[0.98] sm:w-auto sm:px-7"
                  >
                    {finalCta.primaryCta.label}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link
                    href={finalCta.secondaryCta.href}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-5 py-3.5 text-sm font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-100 active:scale-[0.98] sm:w-auto sm:px-7"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {finalCta.secondaryCta.label}
                  </Link>
                </div>

                <p className="mt-5 text-[11px] text-stone-500 sm:mt-6 sm:text-xs">
                  {finalCta.footnote}
                </p>
              </div>
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 pb-8 sm:px-6" />
      </div>
    </PageWrapper>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-base font-semibold tracking-tight text-stone-900 sm:text-xl md:text-2xl">
        {value}
      </p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-rose-500/80 sm:text-[11px]">
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
    <div className="group flex flex-col rounded-2xl border border-white/60 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:p-7">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-500 sm:h-11 sm:w-11">
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
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-rose-500 transition-colors hover:text-rose-600 sm:mt-5"
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
  const statusLabel = status.replace(/_/g, " ");

  return (
    <li className="relative flex flex-col rounded-2xl border border-white/60 bg-white/85 p-5 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:p-6">
      <span
        aria-hidden
        className="absolute top-4 right-4 text-3xl font-bold tracking-tight text-rose-100 sm:text-4xl"
      >
        {step}
      </span>

      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-500 sm:h-11 sm:w-11">
        {icon}
      </div>

      <h3 className="mt-4 text-base font-semibold text-stone-900">{title}</h3>

      <span className="mt-2 inline-flex w-fit items-center rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 font-mono text-[10px] tracking-tight text-rose-500 capitalize">
        {statusLabel}
      </span>

      <p className="mt-2 text-sm leading-relaxed text-stone-600">
        {description}
      </p>
    </li>
  );
}
