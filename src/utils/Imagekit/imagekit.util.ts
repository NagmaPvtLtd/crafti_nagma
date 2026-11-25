/**
 * ═════════════════════════════════════════════════════════════════════
 *  ImageKit upload rules — shared by the server service and the UI
 * ═════════════════════════════════════════════════════════════════════
 *
 *  Client-safe on purpose: no `server-only`, no SDK imports. Both
 *  `Imagekit.service.ts` and the zod schemas import from here, so the
 *  size limit and the conversion rules can never drift apart.
 * ═════════════════════════════════════════════════════════════════════
 */

/** Hard limit for a single uploaded file — 15 MB. */
export const IMAGEKIT_MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Human label for the limit, for messages and UI copy. */
export const IMAGEKIT_MAX_FILE_LABEL = "15 MB";

/** What an upload may be converted to. `original` leaves it untouched. */
export const IMAGEKIT_OUTPUT_FORMATS = ["webp", "avif", "original"] as const;

export type ImageKitOutputFormat = (typeof IMAGEKIT_OUTPUT_FORMATS)[number];

/** Default target format — WebP is universally supported and always available. */
export const IMAGEKIT_DEFAULT_OUTPUT_FORMAT: ImageKitOutputFormat = "webp";

/** WebP and AVIF need different quality scales to look equivalent. */
const DEFAULT_QUALITY: Record<"webp" | "avif", number> = {
  webp: 82,
  avif: 60,
};

/**
 * Raster images that get re-encoded on upload.
 * SVG is vector content, and GIF keeps its animation — both stay untouched.
 */
export const IMAGEKIT_CONVERTIBLE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "avif",
  "tif",
  "tiff",
  "bmp",
  "heic",
  "heif",
] as const;

export interface ConversionPlan {
  /** File name to store — the extension is swapped when converting. */
  fileName: string;
  /** Extension the file arrived with ("" when it had none). */
  fromExtension: string;
  /** Format it will be stored as. */
  format: ImageKitOutputFormat;
  /** ImageKit pre-transformation string, or null when nothing is applied. */
  pre: string | null;
  converted: boolean;
}

/* ------------------------------------------------------------------ */
/*  Pure helpers                                                       */
/* ------------------------------------------------------------------ */

/** `15728640` → `"15 MB"`, `2048` → `"2 KB"`. */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`;
  }
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** `true` when the byte size fits the single-file limit. */
export function isWithinUploadLimit(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > 0 && bytes <= IMAGEKIT_MAX_FILE_BYTES;
}

/** `"photo.JPG"` → `"jpg"`, `"archive"` → `""`. */
export function getFileExtension(fileName: string): string {
  const clean = fileName.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  if (dot <= 0 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1).toLowerCase();
}

/** `("photo.jpg", "webp")` → `"photo.webp"`. */
export function replaceFileExtension(
  fileName: string,
  extension: string,
): string {
  const clean = fileName.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  const base = dot > 0 ? clean.slice(0, dot) : clean;
  return `${base}.${extension.replace(/^\./, "")}`;
}

/** Is this a raster image we can safely re-encode? */
export function isConvertibleImage(fileName: string): boolean {
  return (IMAGEKIT_CONVERTIBLE_EXTENSIONS as readonly string[]).includes(
    getFileExtension(fileName),
  );
}

/**
 * Byte length of a base64 string or data URL, without decoding it.
 * Used to validate uploads that arrive as strings.
 */
export function base64ByteLength(value: string): number {
  const trimmed = value.trim();
  const payload =
    trimmed.startsWith("data:") && trimmed.includes(",")
      ? trimmed.slice(trimmed.indexOf(",") + 1)
      : trimmed;

  const clean = payload.replace(/\s+/g, "");
  if (!clean) return 0;

  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

/** `("webp")` → `"f-webp,q-82"`; `("original")` → `null`. */
export function buildPreTransformation(
  format: ImageKitOutputFormat,
  quality?: number,
): string | null {
  if (format === "original") return null;

  const fallback = DEFAULT_QUALITY[format];
  const value =
    typeof quality === "number" && Number.isFinite(quality)
      ? Math.min(100, Math.max(1, Math.round(quality)))
      : fallback;

  return `f-${format},q-${value}`;
}

/**
 * Decide how an upload should be stored: which name, which format and which
 * ImageKit pre-transformation (if any).
 */
export function planImageConversion(
  fileName: string,
  format: ImageKitOutputFormat = IMAGEKIT_DEFAULT_OUTPUT_FORMAT,
  quality?: number,
): ConversionPlan {
  const fromExtension = getFileExtension(fileName);
  const pre = buildPreTransformation(format, quality);

  if (!pre || !isConvertibleImage(fileName) || format === "original") {
    return {
      fileName,
      fromExtension,
      format: "original",
      pre: null,
      converted: false,
    };
  }

  return {
    fileName: replaceFileExtension(fileName, format),
    fromExtension,
    format,
    pre,
    converted: true,
  };
}
