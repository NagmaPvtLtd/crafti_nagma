import Link from "next/link";
import { Home, ArrowLeft, Heart, Sparkles, Search } from "lucide-react";
import PageWrapper from "./(components)/utils/PageWrapper";

export default function NotFound() {
  return (
    <PageWrapper variant="content" position="fixed">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12 text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />

        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-2 text-center">
            <div className="flex items-center gap-2 text-rose-300" aria-hidden>
              <Sparkles size={12} />
              <span className="h-px w-10 border-t border-dashed border-rose-200" />
              <Heart size={12} className="fill-rose-300" />
              <span className="h-px w-10 border-t border-dashed border-rose-200" />
              <Sparkles size={12} />
            </div>

            <div className="relative mt-2 flex h-16 w-16 items-center justify-center">
              <div
                aria-hidden
                className="absolute inset-1 animate-pulse rounded-full bg-rose-300/35 blur-md"
              />
              <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50">
                <Search className="h-5 w-5 text-rose-500" />
              </div>
            </div>

            <h1 className="mt-2 text-5xl font-semibold tracking-tight text-stone-900">
              404
            </h1>
            <p className="text-sm text-stone-500">
              This page got lost in the yarn basket.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/85 p-6 shadow-lg shadow-rose-200/20 backdrop-blur-sm sm:rounded-3xl">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-10 left-1/2 h-24 w-48 -translate-x-1/2 rounded-full bg-rose-200/40 blur-3xl"
            />

            <div className="relative flex flex-col gap-2">
              <Link
                href="/"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-rose-600"
              >
                <Home className="h-4 w-4" />
                Go home
              </Link>

              <Link
                href="/shop"
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/60 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100"
              >
                <ArrowLeft className="h-4 w-4" />
                Shop
              </Link>
            </div>
          </div>

          <div
            className="mt-8 flex items-center justify-center gap-2 text-rose-300"
            aria-hidden
          >
            <Sparkles size={12} />
            <span className="h-px flex-1 border-t border-dashed border-rose-200" />
            <Heart size={12} className="fill-rose-300" />
            <span className="h-px flex-1 border-t border-dashed border-rose-200" />
            <Sparkles size={12} />
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
