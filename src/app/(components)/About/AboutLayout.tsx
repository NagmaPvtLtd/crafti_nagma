"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  Droplets,
  Heart,
  MessageCircle,
  Package,
  Scissors,
  Shirt,
  Sparkles,
  Spool,
  Star,
  Sun,
  Wind,
} from "lucide-react";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../utils/SectionDiv";

/* -------------------------------------------------------------------------- */
/*  AboutLayout — shared shell for the three footer "About" pages.            */
/*  Frontend only: no API, no data fetching.                                  */
/* -------------------------------------------------------------------------- */

const ABOUT_NAV = [
  { label: "Our story", href: "/about" },
  { label: "How it is made", href: "/how-it-is-made" },
  { label: "Care guide", href: "/care-guide" },
] as const;

type Props = {
  eyebrow: string;
  title: string;
  lead: string;
  children: ReactNode;
};

export default function AboutLayout({ eyebrow, title, lead, children }: Props) {
  const pathname = usePathname();

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="relative min-h-screen overflow-hidden text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-rose-100/40 blur-3xl"
        />

        <header className="relative z-10 px-4 pt-6">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-white/60 bg-white/85 px-5 py-3.5 backdrop-blur-sm sm:gap-1 sm:rounded-3xl sm:px-6">
            {ABOUT_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative px-2.5 text-sm leading-5 transition-colors ${
                    active
                      ? "font-medium text-rose-600"
                      : "text-stone-600 hover:text-rose-600"
                  }`}
                >
                  {item.label}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -bottom-0.5 left-1/2 h-px -translate-x-1/2 border-t border-dashed border-rose-300 transition-all duration-300 ${
                      active ? "w-full opacity-100" : "w-0 opacity-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
          <SectionEyebrow>{eyebrow}</SectionEyebrow>
          <h1 className="mt-2 max-w-3xl text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            {lead}
          </p>

          <SectionDivider className="my-6" size={11} />

          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </PageWrapper>
  );
}

/* -------------------------------------------------------------------------- */
/*  Shared pieces used by the three pages                                     */
/* -------------------------------------------------------------------------- */

/* Icons travel as names, not components: this file is a Client Component, so a
   server page cannot hand it a lucide component value. */
const CARD_ICONS = {
  droplets: Droplets,
  heart: Heart,
  message: MessageCircle,
  package: Package,
  scissors: Scissors,
  shirt: Shirt,
  sparkles: Sparkles,
  spool: Spool,
  star: Star,
  sun: Sun,
  wind: Wind,
} as const;

export type AboutIcon = keyof typeof CARD_ICONS;

export function AboutCard({
  icon,
  title,
  children,
}: {
  icon: AboutIcon;
  title: string;
  children: ReactNode;
}) {
  const Icon = CARD_ICONS[icon];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 px-5 py-5 backdrop-blur-sm sm:rounded-3xl sm:px-6 sm:py-6">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-stone-900 sm:text-base">
          {title}
        </h2>
      </div>
      <div className="mt-3 pl-0 text-[15px] leading-7 text-stone-600 sm:pl-10.5">
        {children}
      </div>
    </div>
  );
}

export function AboutFooterLinks({
  primary,
  secondary,
}: {
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-[11px] text-stone-500 backdrop-blur-sm sm:rounded-3xl">
      <Link
        href={primary.href}
        className="font-semibold text-rose-600 transition-colors hover:text-rose-700"
      >
        {primary.label}
      </Link>
      <Link
        href={secondary.href}
        className="font-medium text-stone-600 transition-colors hover:text-rose-600"
      >
        {secondary.label}
      </Link>
    </div>
  );
}
