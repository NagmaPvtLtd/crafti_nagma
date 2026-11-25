"use client";

import Image from "next/image";

import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Check, ImagePlus, Link2, Loader2 } from "lucide-react";

import StudioModal from "./StudioModal";
import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import type {
  AvailableImageGroup,
  AvailableImagesResponse,
} from "../../../../utils/zod/product/manager.productDetail.zod";

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string;
  variantId: string;
  onLinked: () => void;
};

export default function ExistingPhotosModal({
  open,
  onClose,
  productId,
  variantId,
  onLinked,
}: Props) {
  const [groups, setGroups] = useState<AvailableImageGroup[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const run = async () => {
      setLoading(true);
      setError(null);
      setSelected([]);
      try {
        const res = await axios.get<AvailableImagesResponse>(
          `/api/manager/product-studio/${productId}/variants/${variantId}/available-images`,
          { withCredentials: true },
        );
        setGroups(res.data.groups);
      } catch (err) {
        setError(getAxiosErrorMessage(err, "Could not load existing photos"));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [open, productId, variantId]);

  const photoCount = useMemo(
    () => groups.reduce((total, group) => total + group.images.length, 0),
    [groups],
  );

  function toggle(imageId: string, alreadyLinked: boolean) {
    if (alreadyLinked) return;
    setSelected((prev) =>
      prev.includes(imageId)
        ? prev.filter((id) => id !== imageId)
        : [...prev, imageId],
    );
  }

  async function linkSelected() {
    if (selected.length === 0 || linking) return;

    setLinking(true);
    setError(null);
    try {
      const res = await axios.post<{ linkedCount: number }>(
        `/api/manager/product-studio/${productId}/variants/${variantId}/linked-images`,
        { imageIds: selected },
        { withCredentials: true },
      );
      const linked = res.data.linkedCount;
      toast.success(
        linked === 1
          ? "Photo linked to this variant"
          : `${linked} photos linked`,
      );
      onLinked();
      onClose();
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Could not link the selected photos"));
    } finally {
      setLinking(false);
    }
  }

  return (
    <StudioModal
      open={open}
      onClose={onClose}
      title="Choose existing photos"
      subtitle="Pick photos another variant already uploaded — they will show on this variant too."
      wide
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void linkSelected()}
            disabled={selected.length === 0 || linking}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {linking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5" />
            )}
            {selected.length > 0
              ? `Link ${selected.length} photo${selected.length === 1 ? "" : "s"}`
              : "Link photos"}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-xs text-stone-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading photos from this product…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-rose-200/70 bg-rose-50 py-9 text-center">
          <p className="text-xs font-medium text-rose-700">{error}</p>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            Close
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60 py-12 text-center">
          <ImagePlus className="h-5 w-5 text-stone-300" />
          <p className="text-sm font-semibold text-stone-800">
            No other variant has photos yet
          </p>
          <p className="max-w-sm text-[11px] leading-relaxed text-stone-500">
            Upload photos on any variant first, then reuse them here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-stone-500">
            {photoCount} photo{photoCount === 1 ? "" : "s"} across{" "}
            {groups.length} variant{groups.length === 1 ? "" : "s"} · select the
            ones this variant should show
          </p>

          {groups.map((group) => (
            <section key={group.variantId}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-stone-800">
                  {group.variantName || group.sku}
                </p>
                <p className="font-mono text-[10px] text-stone-400">
                  {group.sku}
                </p>
              </div>

              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {group.images.map((image) => {
                  const isSelected = selected.includes(image.id);
                  return (
                    <li key={image.id}>
                      <button
                        type="button"
                        onClick={() => toggle(image.id, image.alreadyLinked)}
                        aria-pressed={isSelected || image.alreadyLinked}
                        className={`group relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl border-2 transition-colors ${
                          image.alreadyLinked
                            ? "cursor-not-allowed border-emerald-300"
                            : isSelected
                              ? "border-rose-400"
                              : "border-transparent hover:border-rose-200"
                        }`}
                      >
                        <Image
                          src={image.url}
                          alt={image.altText || group.sku}
                          fill
                          loading={"eager"}
                          sizes="(max-width: 640px) 50vw, 25vw"
                          className="object-cover"
                        />

                        {image.alreadyLinked ? (
                          <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-semibold text-white">
                            <Check className="h-2.5 w-2.5" />
                            Linked
                          </span>
                        ) : (
                          <span
                            className={`absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors ${
                              isSelected
                                ? "border-rose-500 bg-rose-500 text-white"
                                : "border-white/90 bg-white/70 text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </StudioModal>
  );
}
