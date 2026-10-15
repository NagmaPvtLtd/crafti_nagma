import { Heart, Sparkles } from "lucide-react";

type DividerProps = {
  className?: string;
  size?: number;
};

type EyebrowProps = {
  children: React.ReactNode;
  className?: string;
};

export function SectionDivider({ className = "", size = 12 }: DividerProps) {
  return (
    <div
      aria-hidden
      className={`flex items-center justify-center gap-2 text-rose-300 ${className}`}
    >
      <Sparkles size={size} />
      <span className="h-px flex-1 border-t border-dashed border-rose-200" />
      <Heart size={size} className="fill-rose-300" />
      <span className="h-px flex-1 border-t border-dashed border-rose-200" />
      <Sparkles size={size} />
    </div>
  );
}

export function SectionEyebrow({ children, className = "" }: EyebrowProps) {
  return (
    <p
      className={`text-[10px] font-semibold uppercase tracking-widest text-rose-500 sm:text-[11px] ${className}`}
    >
      {children}
    </p>
  );
}
