"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Wand2 } from "lucide-react";

import StudioModal from "./StudioModal";
import {
  hourlyLabourRate,
  productiveHoursPerMonth,
  quizCost,
  quizPrice,
  roundQuizPrice,
  type QuizRounding,
} from "../../../../utils/Pricing/pricing.util";
import { formatCurrency } from "../../../../utils/Formator/formatCurrency.util";
import { inputClass } from "../../utils/Form/fieldStyles";

/** Money with up to two decimals — the quiz deals in paise-accurate rates. */
const money = (value: number) =>
  formatCurrency(value, { maximumFractionDigits: 2 });

/** Empty or invalid input reads as 0 instead of NaN. */
const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

/** 487.34 stays "487.34", 499 becomes "499". */
const asInputValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

/** No month is longer than 31 days, so the field cannot hold more. */
const MAX_DAYS_PER_MONTH = 31;

/** Digits only, capped at 31 — pasting or typing 45 lands on 31. */
const clampDaysPerMonth = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return String(Math.min(Number(digits), MAX_DAYS_PER_MONTH));
};

/** The making-time field can be read in minutes or in hours. */
type TimeUnit = "min" | "hr";

/** Step 1 answers — the same numbers for every product, so they are remembered. */
type LabourAnswers = {
  monthlySalary: string;
  hoursPerDay: string;
  daysPerMonth: string;
};

const LABOUR_DEFAULTS: LabourAnswers = {
  monthlySalary: "15000",
  hoursPerDay: "8",
  daysPerMonth: "26",
};

/**
 * Session storage key for the step 1 answers. They live in the tab session, like
 * the other remembered UI state (`WhatsappFloating`, `Heartbeat.hook`), so the
 * quiz opens where the manager left it instead of starting from scratch.
 */
const LABOUR_SESSION_KEY = "crafti:pricing-quiz:labour";

/** Reads the saved answers, falling back to the defaults for anything missing. */
function readLabourAnswers(): LabourAnswers {
  try {
    const raw = window.sessionStorage.getItem(LABOUR_SESSION_KEY);
    if (!raw) return LABOUR_DEFAULTS;

    const saved = JSON.parse(raw) as Partial<LabourAnswers> | null;
    return {
      monthlySalary:
        typeof saved?.monthlySalary === "string"
          ? saved.monthlySalary
          : LABOUR_DEFAULTS.monthlySalary,
      hoursPerDay:
        typeof saved?.hoursPerDay === "string"
          ? saved.hoursPerDay
          : LABOUR_DEFAULTS.hoursPerDay,
      daysPerMonth:
        typeof saved?.daysPerMonth === "string"
          ? clampDaysPerMonth(saved.daysPerMonth)
          : LABOUR_DEFAULTS.daysPerMonth,
    };
  } catch {
    /* storage blocked (private mode) — the defaults still work */
    return LABOUR_DEFAULTS;
  }
}

/** Saves a copy of the answers; a failed write must never break the quiz. */
function writeLabourAnswers(answers: LabourAnswers) {
  try {
    window.sessionStorage.setItem(LABOUR_SESSION_KEY, JSON.stringify(answers));
  } catch {
    /* storage full or blocked — the quiz keeps working without it */
  }
}

/** Only the legible decimals matter when minutes become hours (45 → 0.75). */
const asTimeValue = (value: number) =>
  Number.isInteger(value) ? String(value) : value.toFixed(2);

const SUBTITLES = [
  "Start with what one month of this work costs you.",
  "Now the cost of making one piece.",
  "Pick a price ending, or type your own.",
];

const ROUNDING_LABELS: Record<QuizRounding, string> = {
  floor: "Floor",
  ceil: "Ceil",
  original: "Original",
};

/**
 * Small "quiz" pill that sits above a price field. It opens a dialog that
 * builds a price from labour rate, material and margin, then hands the chosen
 * amount back to the caller.
 *
 * Step 1 — monthly salary + working hours → hourly labour rate.
 * Step 2 — material, making time, packaging, margin → price.
 * Step 3 — floor / ceil / original ending, or a typed amount.
 */
export default function PricingQuizButton({
  onUse,
  label = "Suggest price",
}: {
  onUse: (price: number) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  /* Starts on the defaults so the server HTML and the first client render
     agree; the saved answers are read when the quiz is opened. */
  const [labour, setLabour] = useState<LabourAnswers>(LABOUR_DEFAULTS);
  const { monthlySalary, hoursPerDay, daysPerMonth } = labour;

  const [materialCost, setMaterialCost] = useState("");
  const [makingTime, setMakingTime] = useState("");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("min");
  const [packagingCost, setPackagingCost] = useState("");
  const [marginPercent, setMarginPercent] = useState("30");

  const [rounding, setRounding] = useState<QuizRounding | "custom">("original");
  const [typedPrice, setTypedPrice] = useState("");

  const productiveHours = productiveHoursPerMonth(
    toNumber(hoursPerDay),
    toNumber(daysPerMonth),
  );
  const hourlyRate = hourlyLabourRate(
    toNumber(monthlySalary),
    productiveHours,
  );

  /** The cost model always works in minutes, whatever unit is on screen. */
  const makingMinutes =
    timeUnit === "hr" ? toNumber(makingTime) * 60 : toNumber(makingTime);

  /** Switching the unit rewrites the value so the same time is still shown. */
  const changeTimeUnit = (next: TimeUnit) => {
    if (next === timeUnit) return;
    const current = toNumber(makingTime);
    if (current > 0) {
      setMakingTime(
        asTimeValue(next === "hr" ? current / 60 : current * 60),
      );
    }
    setTimeUnit(next);
  };

  const priceInput = {
    materialCost: toNumber(materialCost),
    minutes: makingMinutes,
    hourlyRate,
    packagingCost: toNumber(packagingCost),
    marginPercent: toNumber(marginPercent),
  };
  const cost = quizCost(priceInput);
  const suggested = quizPrice(priceInput);

  const roundedPrice = roundQuizPrice(
    suggested,
    rounding === "custom" ? "original" : rounding,
  );
  const chosenPrice =
    rounding === "custom" ? toNumber(typedPrice) : roundedPrice;
  const chosenInput =
    rounding === "custom" ? typedPrice : asInputValue(roundedPrice);

  const canContinue = step === 0 ? hourlyRate > 0 : cost > 0;

  /** Any edit to a step 1 answer is remembered for the next opening. */
  const updateLabour = (patch: Partial<LabourAnswers>) => {
    const next = { ...labour, ...patch };
    setLabour(next);
    writeLabourAnswers(next);
  };

  const openQuiz = () => {
    setLabour(readLabourAnswers());
    setStep(0);
    setOpen(true);
  };

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        onClick={openQuiz}
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-0.5 text-[10px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
      >
        <Wand2 className="h-3 w-3" />
        {label}
      </button>

      <StudioModal
        open={open}
        onClose={close}
        title="Pricing quiz"
        subtitle={SUBTITLES[step]}
        footer={
          <>
            {step === 0 ? (
              <button
                type="button"
                onClick={close}
                className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canContinue}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                disabled={!(chosenPrice > 0)}
                onClick={() => {
                  onUse(Math.round(chosenPrice * 100) / 100);
                  close();
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Use {money(chosenPrice)}
              </button>
            )}
          </>
        }
      >
        {step === 0 && (
          <div className="space-y-3">
            <QuizField
              label="Monthly salary (₹)"
              hint="What you would pay someone to do this work."
            >
              <input
                inputMode="decimal"
                value={monthlySalary}
                onChange={(e) =>
                  updateLabour({ monthlySalary: e.target.value })
                }
                className={inputClass()}
              />
            </QuizField>

            <div className="grid grid-cols-2 gap-3">
              <QuizField label="Hours per day">
                <input
                  inputMode="decimal"
                  value={hoursPerDay}
                  onChange={(e) => updateLabour({ hoursPerDay: e.target.value })}
                  className={inputClass()}
                />
              </QuizField>
              <QuizField
                label="Working days / month"
                hint={`Maximum ${MAX_DAYS_PER_MONTH} days.`}
              >
                <input
                  inputMode="numeric"
                  value={daysPerMonth}
                  onChange={(e) =>
                    updateLabour({
                      daysPerMonth: clampDaysPerMonth(e.target.value),
                    })
                  }
                  maxLength={2}
                  className={inputClass()}
                />
              </QuizField>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500">
                    Hourly rate
                  </p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-stone-900">
                    {money(hourlyRate)}
                    <span className="text-sm font-normal text-stone-500">
                      {" "}
                      / hour
                    </span>
                  </p>
                </div>
                <p className="text-right text-[10px] leading-tight text-stone-500">
                  {productiveHours} productive hours
                  <br />
                  a month
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <QuizField label="Material (₹)">
                <input
                  inputMode="decimal"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(e.target.value)}
                  className={inputClass()}
                />
              </QuizField>
              <QuizField label="Making time">
                <div className="flex items-center gap-1.5">
                  <input
                    inputMode="decimal"
                    value={makingTime}
                    onChange={(e) => setMakingTime(e.target.value)}
                    className={inputClass()}
                  />
                  {/* Same shared input styling (and therefore the same height)
                      as the field next to it — only the width is fixed. */}
                  <div className="w-20 shrink-0">
                    <select
                      value={timeUnit}
                      onChange={(e) =>
                        changeTimeUnit(e.target.value as TimeUnit)
                      }
                      aria-label="Making time unit"
                      className={`${inputClass(false)} cursor-pointer`}
                    >
                      <option value="min">min</option>
                      <option value="hr">hr</option>
                    </select>
                  </div>
                </div>
              </QuizField>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <QuizField label="Packaging (₹)">
                <input
                  inputMode="decimal"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  className={inputClass()}
                />
              </QuizField>
              <QuizField label="Margin (%)">
                <input
                  inputMode="decimal"
                  value={marginPercent}
                  onChange={(e) => setMarginPercent(e.target.value)}
                  className={inputClass()}
                />
              </QuizField>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50/70 px-4 py-3 text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-stone-500">
                  Cost per piece
                </span>
                <span className="font-semibold tabular-nums text-stone-900">
                  {money(cost)}
                </span>
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <span className="text-[11px] text-stone-500">
                  Price at {money(hourlyRate)}/hour
                </span>
                <span className="font-semibold tabular-nums text-stone-900">
                  {money(suggested)}
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-rose-100 bg-rose-50/60 px-4 py-4 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-rose-500">
                Suggested price
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-stone-900">
                {money(suggested)}
              </p>
              <p className="mt-0.5 text-[11px] text-stone-500">
                per piece, before delivery
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(ROUNDING_LABELS) as QuizRounding[]).map((mode) => {
                const active = rounding === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setRounding(mode)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors ${
                      active
                        ? "border-rose-300 bg-rose-50/80"
                        : "border-stone-200 bg-white hover:border-rose-200 hover:bg-rose-50/40"
                    }`}
                  >
                    <span
                      className={`block text-[10px] font-semibold uppercase tracking-wider ${
                        active ? "text-rose-500" : "text-stone-400"
                      }`}
                    >
                      {ROUNDING_LABELS[mode]}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold tabular-nums text-stone-900">
                      {money(roundQuizPrice(suggested, mode))}
                    </span>
                  </button>
                );
              })}
            </div>

            <QuizField label="Final price (₹)">
              <input
                inputMode="decimal"
                value={chosenInput}
                onChange={(e) => {
                  setRounding("custom");
                  setTypedPrice(e.target.value);
                }}
                className={inputClass()}
              />
            </QuizField>
          </div>
        )}
      </StudioModal>
    </>
  );
}

function QuizField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        {label}
      </span>
      <div className="mt-1">{children}</div>
      {hint && (
        <span className="mt-1 block text-[10px] leading-relaxed text-stone-400">
          {hint}
        </span>
      )}
    </label>
  );
}
