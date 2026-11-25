"use client";

import Image from "next/image";

import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import toast from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Maximize2,
  Trash2,
} from "lucide-react";

import StudioModal from "./StudioModal";
import PhotoViewer from "../../utils/PhotoViewer";
import ConfirmDialog from "../../utils/ConfirmDialog";
import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import type { ProductMediaItem } from "../../../../utils/zod/product/manager.productDetail.zod";
import axios from "axios";

const MEDIA_URL = "/api/manager/product-studio/media";

/* ------------------------------------------------------------------ */
/*  Slider                                                            */
/* ------------------------------------------------------------------ */

export function MediaGallery({
  images,
  alt,
  emptyLabel = "No images yet",
  className = "",
}: {
  images: ProductMediaItem[];
  alt: string;
  emptyLabel?: string;
  className?: string;
}) {
  const [index, setIndex] = useState(0);
  const safeIndex =
    images.length === 0 ? 0 : Math.min(index, images.length - 1);

  /* ---- Full-screen viewer ---------------------------------------- */
  const [viewerOpen, setViewerOpen] = useState(false);

  /* ---- Slider + thumbnails (Embla) -------------------------------- */
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: images.length > 1,
    align: "start",
  });
  const [thumbsRef, thumbsApi] = useEmblaCarousel({
    containScroll: "keepSnaps",
    dragFree: true,
    align: "start",
  });

  useEffect(() => {
    if (!emblaApi) return;

    const onSelect = () => {
      const next = emblaApi.selectedScrollSnap();
      setIndex(next);
      thumbsApi?.scrollTo(next);
    };

    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, thumbsApi]);

  /* Photos are replaced after an upload, delete or reorder — re-measure and
     start again from the cover. */
  useEffect(() => {
    const reset = () => {
      emblaApi?.reInit();
      thumbsApi?.reInit();
      emblaApi?.scrollTo(0, true);
    };
    reset();
  }, [images, emblaApi, thumbsApi]);

  if (images.length === 0) {
    return (
      <div
        className={`flex aspect-4/3 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 text-center ${className}`}
      >
        <ImagePlus className="h-5 w-5 text-stone-300" />
        <p className="text-xs text-stone-500">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y select-none">
            {images.map((image, i) => (
              <div
                key={image.id}
                className="relative aspect-4/3 min-w-0 shrink-0 grow-0 basis-full"
              >
                <button
                  type="button"
                  onClick={() => setViewerOpen(true)}
                  aria-label={`View photo ${i + 1} full screen`}
                  className="absolute inset-0 cursor-zoom-in"
                >
                  <Image
                    src={image.url}
                    alt={image.altText || alt}
                    fill
                    loading={"eager"}
                    sizes="(max-width: 640px) 100vw, 50vw"
                    className="object-cover"
                    draggable={false}
                    priority={i === 0}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          aria-label="View photo full screen"
          className="absolute top-2 right-2 z-10 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md ring-1 ring-stone-200/60 transition-colors hover:bg-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute top-1/2 left-2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute top-1/2 right-2 z-10 -translate-y-1/2 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md transition-colors hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute right-2 bottom-2 z-10 rounded-full bg-stone-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">
              {safeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2 overflow-hidden" ref={thumbsRef}>
          <div className="flex touch-pan-y gap-2 pb-1">
            {images.map((image, i) => (
              <button
                key={image.id}
                type="button"
                onClick={() => {
                  emblaApi?.scrollTo(i);
                  thumbsApi?.scrollTo(i);
                }}
                aria-pressed={i === safeIndex}
                aria-label={`Show photo ${i + 1}`}
                className={`relative h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
                  i === safeIndex ? "border-rose-400" : "border-transparent"
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.altText || alt}
                  fill
                  loading={"eager"}
                  sizes="48px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      <PhotoViewer
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={images}
        index={safeIndex}
        onIndexChange={(next) => {
          setIndex(next);
          emblaApi?.scrollTo(next);
        }}
        title={alt}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Manager                                                           */
/* ------------------------------------------------------------------ */

export default function ProductMediaManager({
  open,
  onClose,
  productId,
  variantId,
  images,
  onChange,
  title = "Product images",
}: {
  open: boolean;
  onClose: () => void;
  productId: string;
  variantId?: string | null;
  images: ProductMediaItem[];
  onChange: () => void;
  title?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<ProductMediaItem | null>(
    null,
  );

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        form.append("productId", productId);
        if (variantId) form.append("variantId", variantId);
        form.append("altText", title);
        await axios.post(MEDIA_URL, form, { withCredentials: true });
      }
      toast.success(
        files.length === 1
          ? "Image uploaded"
          : `${files.length} images uploaded`,
      );
      onChange();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Could not upload the image"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(media: ProductMediaItem) {
    setDeletingId(media.id);
    try {
      if (media.isLinked) {
        if (!variantId) {
          throw new Error("Missing variant id");
        }
        await axios.delete(
          `/api/manager/product-studio/${productId}/variants/${variantId}/linked-images?id=${encodeURIComponent(media.id)}`,
          { withCredentials: true },
        );
        toast.success("Photo removed from this variant");
      } else {
        await axios.delete(`${MEDIA_URL}?id=${encodeURIComponent(media.id)}`, {
          withCredentials: true,
        });
        toast.success("Image deleted");
      }
      onChange();
    } catch (err) {
      toast.error(
        getAxiosErrorMessage(
          err,
          media.isLinked
            ? "Could not remove the linked photo"
            : "Could not delete the image",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  }

  /** Swap this photo with its neighbour and persist the whole order. */
  async function move(media: ProductMediaItem, direction: -1 | 1) {
    if (!variantId || movingId) return;

    const index = images.findIndex((image) => image.id === media.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= images.length) return;

    setMovingId(media.id);
    try {
      await axios.put(
        MEDIA_URL,
        {
          productId,
          variantId,
          imageId: media.id,
          direction: direction === -1 ? "earlier" : "later",
        },
        { withCredentials: true },
      );
      onChange();
    } catch (err) {
      toast.error(
        getAxiosErrorMessage(err, "Could not update the photo order"),
      );
    } finally {
      setMovingId(null);
    }
  }

  return (
    <>
      <StudioModal
        open={open}
        onClose={onClose}
        title={title}
        subtitle="Photos you upload here are public — shoppers will see them on the product page."
        wide
        footer={
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            Done
          </button>
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-500">
            {images.length} image{images.length === 1 ? "" : "s"}
            {images.some((image) => image.isLinked)
              ? ` · ${images.filter((image) => image.isLinked).length} linked`
              : ""}
            {" · "}First photo is the cover — use ← → to reorder
          </p>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600">
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading ? "Uploading…" : "Add images"}
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={(e) => void uploadFiles(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        <p className="mt-2 text-[11px] text-stone-500">
          For the best look, upload photos in a 1:1 ratio (square).
        </p>

        {images.length === 0 ? (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 py-10 text-center">
            <ImagePlus className="h-5 w-5 text-stone-300" />
            <p className="text-xs font-medium text-stone-600">No images yet</p>
            <p className="text-[11px] text-stone-500">
              Add the shots the customer should see first.
            </p>
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image, index) => (
              <li
                key={image.id}
                className={`group relative aspect-square overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 transition-opacity ${
                  movingId === image.id ? "opacity-60" : ""
                }`}
              >
                <Image
                  src={image.url}
                  alt={image.altText || title}
                  fill
                  loading={"eager"}
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
                {image.isLinked && (
                  <span className="absolute top-1.5 left-1.5 rounded-full bg-stone-900/75 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                    Linked
                  </span>
                )}
                {image.isLinked && image.ownerSku && (
                  <span className="absolute bottom-1.5 left-1.5 max-w-[80%] truncate rounded bg-white/90 px-1.5 py-0.5 font-mono text-[9px] text-stone-600">
                    {image.ownerSku}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setPendingRemoval(image)}
                  disabled={deletingId === image.id}
                  aria-label={
                    image.isLinked ? "Remove linked photo" : "Delete image"
                  }
                  className="absolute top-1.5 right-1.5 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-500 shadow-md transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === image.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </button>

                {images.length > 1 && (
                  <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void move(image, -1)}
                      disabled={index === 0 || movingId !== null}
                      aria-label="Move photo earlier"
                      title="Move earlier"
                      className="cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-600 shadow-md transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {movingId === image.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ChevronLeft className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(image, 1)}
                      disabled={
                        index === images.length - 1 || movingId !== null
                      }
                      aria-label="Move photo later"
                      title="Move later"
                      className="cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-600 shadow-md transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </StudioModal>
      <ConfirmDialog
        open={pendingRemoval !== null}
        title={
          pendingRemoval?.isLinked ? "Remove linked photo?" : "Delete photo?"
        }
        description={
          pendingRemoval?.isLinked
            ? "This removes the photo from this variant only. The original upload stays on the variant it belongs to."
            : pendingRemoval && pendingRemoval.linkedVariantCount > 0
              ? `This photo is shared with ${pendingRemoval.linkedVariantCount} other variant${
                  pendingRemoval.linkedVariantCount === 1 ? "" : "s"
                }. Deleting it removes it from all of them.`
              : "This permanently deletes the photo from ImageKit and cannot be undone."
        }
        confirmLabel={pendingRemoval?.isLinked ? "Remove" : "Delete"}
        loading={pendingRemoval !== null && deletingId === pendingRemoval.id}
        onConfirm={() => {
          const media = pendingRemoval;
          setPendingRemoval(null);
          if (media) void remove(media);
        }}
        onClose={() => setPendingRemoval(null)}
      />
    </>
  );
}
