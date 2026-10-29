/** Base input styling used by every form control in the app. */
export const inputBaseClass =
  "w-full rounded-xl border bg-white px-3 py-2.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400";

/** Focus + border variants for valid vs invalid states. */
export const inputStateClass = {
  normal:
    "border-stone-200 focus:border-rose-300 focus:ring-2 focus:ring-rose-100",
  invalid:
    "border-rose-300 focus:border-rose-400 focus:ring-2 focus:ring-rose-100",
} as const;

/** Compose the final input class from base + state. */
export function inputClass(invalid = false): string {
  return `${inputBaseClass} ${invalid ? inputStateClass.invalid : inputStateClass.normal}`;
}
