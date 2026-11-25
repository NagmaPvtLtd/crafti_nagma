import { MessageCircle, Sparkles } from "lucide-react";

import PageWrapper from "../../(components)/utils/PageWrapper";
import {
  SectionDivider,
  SectionEyebrow,
} from "../../(components)/utils/SectionDiv";

export const metadata = { title: "Custom Order · Crafti Nagma" };

export default function CustomOrderPage() {
  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="min-w-0">
          <SectionEyebrow>Made to order</SectionEyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
            Custom order
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
            Pick a base design and customise the colours, size or a name — crafted
            just for you.
          </p>
        </div>

        <SectionDivider className="my-6" size={11} />

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-500">
            <Sparkles aria-hidden className="h-6 w-6" strokeWidth={1.5} />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
            Coming soon
          </h2>
          <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-stone-600">
            The custom order form is being stitched together. Until then, message
            in with your idea and it will be taken from there.
          </p>
          <span className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-rose-200/70 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600">
            <MessageCircle className="h-3.5 w-3.5" />
            Custom requests open soon
          </span>
        </div>
      </div>
    </PageWrapper>
  );
}
