/* eslint-disable @next/next/no-img-element -- ImageKit already serves sized, converted images */
"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2 } from "lucide-react";

import StudioModal from "./StudioModal";
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
  const safeIndex = Math.min(index, Math.max(images.length - 1, 0));
  const active = images[safeIndex];

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
        <img
          src={active.url}
          alt={active.altText || alt}
          className="aspect-4/3 w-full object-cover"
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() =>
                setIndex((i) => (i - 1 + images.length) % images.length)
              }
              className="absolute top-1/2 left-2 -translate-y-1/2 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md transition-colors hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-700 shadow-md transition-colors hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <span className="absolute right-2 bottom-2 rounded-full bg-stone-900/70 px-2 py-0.5 text-[10px] font-semibold text-white">
              {safeIndex + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-pressed={i === safeIndex}
              className={`h-12 w-12 shrink-0 cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
                i === safeIndex ? "border-rose-400" : "border-transparent"
              }`}
            >
              <img
                src={image.url}
                alt={image.altText || alt}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
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
        files.length === 1 ? "Image uploaded" : `${files.length} images uploaded`,
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

  return (
    <>
      <StudioModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Uploaded to ImageKit as public media, under this environment's folder."
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
            : ""}{" "}
          · first image is the cover
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
          {images.map((image) => (
            <li
              key={image.id}
              className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"
            >
              <img
                src={image.url}
                alt={image.altText || title}
                className="aspect-square w-full object-cover"
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
                aria-label={image.isLinked ? "Remove linked photo" : "Delete image"}
                className="absolute top-1.5 right-1.5 cursor-pointer rounded-full bg-white/90 p-1.5 text-stone-500 shadow-md transition-colors hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === image.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      </StudioModal>
      <ConfirmDialog
        open={pendingRemoval !== null}
        title={pendingRemoval?.isLinked ? "Remove linked photo?" : "Delete photo?"}
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
