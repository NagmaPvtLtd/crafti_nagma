"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";

import StudioModal from "./StudioModal";
import { QUIZ_SUGGESTED_PRICE } from "../../../../utils/Pricing/pricing.util";

const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

/**
 * Small "quiz" pill that sits above a price field. It opens a dialog that
 * suggests a price and, when accepted, hands it back to the caller.
 *
 * TODO(pricing): the quiz does not ask anything yet — it always suggests
 * ₹100. Wire it to real questions (yarn cost, crafting hours, packaging,
 * margin) and let `suggestPrice()` do the maths.
 */
export default function PricingQuizButton({
  onUse,
  label = "Suggest price",
}: {
  onUse: (price: number) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-0.5 text-[10px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
      >
        <Wand2 className="h-3 w-3" />
        {label}
      </button>

      <StudioModal
        open={open}
        onClose={() => setOpen(false)}
        title="Pricing quiz"
        subtitle="A few quick answers normally drive the suggestion — this is a placeholder for now."
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onUse(QUIZ_SUGGESTED_PRICE);
                setOpen(false);
              }}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Use {inr(QUIZ_SUGGESTED_PRICE)}
            </button>
          </>
        }
      >
        <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500">
            Suggested price
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-stone-900">
            {inr(QUIZ_SUGGESTED_PRICE)}
          </p>
          <p className="mt-1 text-[11px] text-stone-500">
            per variant, before delivery
          </p>
        </div>

        <p className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/70 px-3 py-2 text-[11px] leading-relaxed text-amber-800">
          <strong>TODO:</strong> the quiz questions and the cost model are not
          built yet, so every suggestion is the flat ₹100 placeholder. See{" "}
          <code className="font-mono text-[10px]">
            src/utils/Pricing/pricing.util.ts
          </code>
          .
        </p>
      </StudioModal>
    </>
  );
}
