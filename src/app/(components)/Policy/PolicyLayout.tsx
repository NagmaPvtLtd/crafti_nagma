"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import PageWrapper from "../utils/PageWrapper";
import { SectionDivider } from "../utils/SectionDiv";

type Props = {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
};

const NAV_LINKS = [
  { label: "Privacy", href: "/policy/privacy" },
  { label: "Terms of Service", href: "/policy/terms-of-service" },
  { label: "Cancellation & Refund", href: "/policy/cancellation-refund" },
] as const;

export default function PolicyLayout({ title, lastUpdated, children }: Props) {
  const pathname = usePathname();

  return (
    <PageWrapper variant="form" position="fixed">
      <div className="relative min-h-screen overflow-hidden text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-1/3 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-1/4 h-72 w-72 rounded-full bg-rose-100/40 blur-3xl"
        />

        <header className="relative z-10 px-4 pt-6">
          <nav className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-white/60 bg-white/85 px-5 py-3.5 backdrop-blur-sm sm:gap-5 sm:rounded-3xl sm:px-6">
            {NAV_LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative text-sm transition-colors ${
                    active
                      ? "font-medium text-rose-600"
                      : "text-stone-600 hover:text-rose-600"
                  }`}
                >
                  {l.label}
                  <span
                    aria-hidden
                    className={`pointer-events-none absolute -bottom-1.5 left-1/2 h-px -translate-x-1/2 border-t border-dashed border-rose-300 transition-all duration-300 ${
                      active ? "w-full opacity-100" : "w-0 opacity-0"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-5">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <SectionDivider className="max-w-xs" />
            <h1 className="text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">
              {title}
            </h1>
            {lastUpdated && (
              <p className="text-xs text-stone-500">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
          <div className="space-y-6">{children}</div>
        </main>
      </div>
    </PageWrapper>
  );
}
