import Image from "next/image";
import Link from "next/link";
import { Heart, Gift, ArrowRight, Sparkles } from "lucide-react";
import CraftiNagma from "../../../assets/images/avatar_v1.png";

export default function Landing() {
  return (
    <div className="flex flex-col bg-white text-stone-800">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-16 px-6 py-24 md:flex-row md:py-32">
          <div className="flex-1 text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-rose-50 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-rose-500">
              Handmade with love
            </span>

            <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight text-stone-900 sm:text-5xl md:text-6xl">
              Crochet & embroidery
              <span className="mt-2 block font-normal text-stone-500">
                made just for you.
              </span>
            </h1>

            <p className="mt-8 max-w-lg text-lg leading-relaxed text-stone-600">
              Cozy handmade crochet gifts, embroidery hoops, and custom decor —
              each piece crafted with care by Crafti Nagma.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center md:justify-start">
              <Link
                href="/shop"
                className="group inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-rose-600"
              >
                Shop collection
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/custom"
                className="inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white px-7 py-3 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:bg-stone-50"
              >
                Custom order
              </Link>
            </div>
          </div>

          <div className="flex-1">
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl border border-rose-100 bg-rose-50/50">
              <Image
                src={CraftiNagma}
                alt="Crafti Nagma handmade crochet and embroidery"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="border-t border-stone-100">
        <div className="mx-auto w-full max-w-2xl px-6 py-24 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Made by hand, made with heart
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-stone-600">
            Every stitch tells a story. From amigurumi cuties to embroidered
            wall art, Crafti Nagma brings warmth and personality into your home
            — one handmade piece at a time.
          </p>
        </div>
      </section>

      {/* HIGHLIGHTS */}
      <section className="border-t border-stone-100">
        <div className="mx-auto w-full max-w-5xl px-6 py-20">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="rounded-2xl border border-stone-100 bg-white p-8 text-center transition-colors hover:border-rose-200">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Heart className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-stone-900">
                Handmade
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Crafted stitch by stitch, never mass-produced.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-8 text-center transition-colors hover:border-rose-200">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Gift className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-stone-900">
                Gift-ready
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Thoughtful pieces that feel personal and warm.
              </p>
            </div>

            <div className="rounded-2xl border border-stone-100 bg-white p-8 text-center transition-colors hover:border-rose-200">
              <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-base font-semibold text-stone-900">
                Made to order
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                Have an idea in mind? Let&apos;s make it together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-100">
        <div className="mx-auto w-full max-w-5xl px-6 py-24">
          <div className="rounded-3xl border border-rose-100 bg-rose-50/60 px-8 py-16 text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
              Ready to bring handmade home?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-stone-600">
              Browse the collection or reach out for a custom piece made just
              for you.
            </p>
            <Link
              href="/shop"
              className="group mt-10 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-700 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-rose-600"
            >
              Explore collection
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
