import { AlertCircle } from "lucide-react";

type Props = {
  title: string;
  message: string;
  onRetry: () => void;
};

/** Inline load failure with a retry action — the shared four-state error view. */
export default function ErrorState({ title, message, onRetry }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3.5 sm:rounded-3xl sm:px-5 sm:py-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-800">{title}</p>
        <p className="mt-0.5 text-xs text-rose-700">{message}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="shrink-0 cursor-pointer rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}
