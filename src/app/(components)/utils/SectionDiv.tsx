import Link from "next/link";
import { ArrowLeft, Heart, Sparkles } from "lucide-react";

type DividerProps = {
  className?: string;
  size?: number;
};

type EyebrowProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
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

export function SectionEyebrow({
  children,
  className = "",
  href,
}: EyebrowProps) {
  if (href) {
    return (
      <Link
        href={href}
        className={`py-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-rose-500 sm:text-[11px] ${className}`}
      >
        <ArrowLeft className="h-3.5  w-3.5" />
        {children}
      </Link>
    );
  }

  return (
    <p
      className={`py-2 text-[10px] font-semibold uppercase tracking-widest text-rose-500 sm:text-[11px] ${className}`}
    >
      {children}
    </p>
  );
}
