import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
};

export default function PolicyLayout({ title, lastUpdated, children }: Props) {
  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#2b2b2b]">
      {/* Header */}
      <header className="border-b border-[#eae5df] bg-white">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center gap-5 px-5 py-4">
          <Link
            href="/"
            className="mr-auto text-[17px] font-semibold text-[#8b5e3c]"
          >
            Crafti Nagma
          </Link>
          <Link
            href="/policy/privacy"
            className="text-sm text-[#6b6b6b] transition-colors hover:text-[#8b5e3c]"
          >
            Privacy
          </Link>
          <Link
            href="/policy/terms-of-service"
            className="text-sm text-[#6b6b6b] transition-colors hover:text-[#8b5e3c]"
          >
            Terms of Service
          </Link>
          <Link
            href="/policy/cancellation-refund"
            className="text-sm text-[#6b6b6b] transition-colors hover:text-[#8b5e3c]"
          >
            Cancellation &amp; Refund
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-3xl px-5 pt-10 pb-16">
        <h1 className="mb-1.5 text-[28px] leading-tight font-semibold text-[#1f1f1f]">
          {title}
        </h1>
        {lastUpdated && (
          <p className="mb-8 text-[13px] text-[#8a8a8a]">
            Last updated: {lastUpdated}
          </p>
        )}
        <div className="space-y-4">{children}</div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#eae5df] bg-white">
        <div className="mx-auto max-w-3xl px-5 py-6 text-[13px] text-[#8a8a8a]">
          © {new Date().getFullYear()} Crafti Nagma. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
