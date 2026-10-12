import Image, { type StaticImageData } from "next/image";
import type { ReactNode } from "react";

/* ============================================================================
 * PageWrapper — full-page background image + content layer
 * ============================================================================
 * Presets (`variant`):
 *   hero    → rich image, balanced soften         (landing, home)
 *   content → medium image, soft white wash       (about, blog, gallery)
 *   form    → very light texture, heavy wash      (auth, checkout, dashboard)
 *   plain   → no image, transparent               (dialogs, minimal pages)
 *
 * Position:
 *   fixed    → background stays while content scrolls (default)
 *   absolute → background scrolls with content
 * ========================================================================== */

export type PageWrapperVariant = "hero" | "content" | "form" | "plain";

type Props = {
  children: ReactNode;
  bgImage?: string | StaticImageData;
  variant?: PageWrapperVariant;
  bgOpacity?: number;
  soften?: boolean;
  /** Gradient intensity when `soften` is true. */
  softenStrength?: "light" | "medium" | "heavy";
  position?: "fixed" | "absolute";
  className?: string;
};

const VARIANT_DEFAULTS: Record<
  PageWrapperVariant,
  { opacity: number; softenStrength: "light" | "medium" | "heavy" | null }
> = {
  hero: { opacity: 0.2, softenStrength: "light" },
  content: { opacity: 0.15, softenStrength: "medium" },
  form: { opacity: 0.1, softenStrength: "heavy" },
  plain: { opacity: 0, softenStrength: null },
};

const SOFTEN_GRADIENTS: Record<"light" | "medium" | "heavy", string> = {
  light: "from-white/30 via-white/10 to-white/40",
  medium: "from-white/55 via-white/35 to-white/60",
  heavy: "from-white/80 via-white/65 to-white/85",
};

export default function PageWrapper({
  children,
  bgImage = "/assets/bg_white.jpg",
  variant = "content",
  bgOpacity,
  soften = true,
  softenStrength,
  position = "fixed",
  className = "",
}: Props) {
  const preset = VARIANT_DEFAULTS[variant];
  const finalOpacity = bgOpacity ?? preset.opacity;
  const gradientKey = softenStrength ?? preset.softenStrength ?? "medium";
  const showImage = bgImage && finalOpacity > 0;

  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* ---- Background layer ------------------------------------ */}
      {showImage && (
        <div
          aria-hidden
          className={`pointer-events-none inset-0 z-0 overflow-hidden ${
            position === "fixed" ? "fixed" : "absolute"
          }`}
          style={{ opacity: finalOpacity }}
        >
          <Image
            src={bgImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {soften && (
            <div
              className={`absolute inset-0 bg-linear-to-b ${SOFTEN_GRADIENTS[gradientKey]}`}
            />
          )}
        </div>
      )}

      {/* ---- Content layer --------------------------------------- */}
      <div className="relative z-10 max-w-7xls">{children}</div>
    </div>
  );
}
