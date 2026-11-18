"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  Check,
  ImagePlus,
  IndianRupee,
  Layers,
  Loader2,
  Package,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import CustomLoader from "../../CustomLoader";
import Field from "../../utils/Form/Field";
import TextInput from "../../utils/Form/TextInput";
import Textarea from "../../utils/Form/Textarea";
import PricingQuizButton from "./PricingQuizModal";
import ProductMediaManager, { MediaGallery } from "./ProductMediaManager";
import type { VariantDetailResponse } from "../../../../utils/zod/product/manager.productDetail.zod";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const inr = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

type FormState = {
  name: string;
  briefDescription: string;
  description: string;
  price: string;
  compareAtPrice: string;
  stock: string;
  weight: string;
  status: "active" | "inactive";
  isFeatured: boolean;
  mainShowcase: boolean;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function VariantDetailClient({
  productId,
  variantId,
}: {
  productId: string;
  variantId: string;
}) {
  const [data, setData] = useState<VariantDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [mediaOpen, setMediaOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<VariantDetailResponse>(
        `/api/manager/product-studio/${productId}/variants/${variantId}`,
        { withCredentials: true },
      );
      setData(res.data);
      setForm({
        name: res.data.variant.name,
        briefDescription: res.data.variant.briefDescription,
        description: res.data.variant.description,
        price: String(res.data.variant.price),
        compareAtPrice:
          res.data.variant.compareAtPrice === null
            ? ""
            : String(res.data.variant.compareAtPrice),
        stock: String(res.data.variant.stock),
        weight:
          res.data.variant.weight === null
            ? ""
            : String(res.data.variant.weight),
        status: res.data.variant.status,
        isFeatured: res.data.variant.isFeatured,
        mainShowcase: res.data.variant.mainShowcase,
      });
    } catch (err) {
      setError(getAxiosErrorMessage(err, "Failed to load the variant"));
    } finally {
      setLoading(false);
    }
  }, [productId, variantId]);

  useEffect(() => {
    const ahem = () => {
      void load();
    };
    ahem();
  }, [load]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));

  async function save() {
    if (!form || saving) return;
    setSaving(true);
    setFormError(null);
    try {
      await axios.put(
        `/api/manager/product-studio/${productId}/variants/${variantId}`,
        {
          name: form.name,
          briefDescription: form.briefDescription,
          description: form.description,
          price: Number(form.price || 0),
          compareAtPrice:
            form.compareAtPrice.trim() === ""
              ? null
              : Number(form.compareAtPrice),
          stock: Number(form.stock || 0),
          weight: form.weight.trim() === "" ? null : Number(form.weight),
          status: form.status,
          isFeatured: form.isFeatured,
          mainShowcase: form.mainShowcase,
        },
        { withCredentials: true },
      );
      toast.success("Variant updated");
      void load();
    } catch (err) {
      setFormError(getAxiosErrorMessage(err, "Could not update the variant"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="relative flex flex-col overflow-hidden text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />

        {/* Header */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
            <Link
              href={`/manager/product-studio/products/${productId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 transition-colors hover:text-rose-600"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {data ? data.variant.productName : "Back to product"}
            </Link>

            {data ? (
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <SectionEyebrow>Variant</SectionEyebrow>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                      {data.variant.name || data.variant.sku}
                    </h1>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                        data.variant.status === "active"
                          ? "border-emerald-200/70 bg-emerald-50 text-emerald-700"
                          : "border-stone-200/70 bg-stone-50 text-stone-600"
                      }`}
                    >
                      {data.variant.status}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-[11px] text-stone-400">
                    {data.variant.sku}
                  </p>

                  {data.optionValues.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.optionValues.map((value) => (
                        <span
                          key={`${value.option}-${value.value}`}
                          className="rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-600"
                        >
                          {value.option}: {value.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => void load()}
                    disabled={loading}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                  <button
                    onClick={() => setMediaOpen(true)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-rose-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600"
                  >
                    <ImagePlus className="h-3.5 w-3.5" />
                    Manage images
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-5 h-9 w-64 animate-pulse rounded-full bg-stone-200/70" />
            )}
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Body */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !data && (
              <CustomLoader fullScreen={false} label="Loading the variant…" />
            )}

            {error && !loading && (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3.5 sm:rounded-3xl sm:px-5 sm:py-4">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-rose-800">
                    Couldn&apos;t load the variant
                  </p>
                  <p className="mt-0.5 text-xs text-rose-700">{error}</p>
                </div>
                <button
                  onClick={() => void load()}
                  className="shrink-0 cursor-pointer rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            )}

            {data && form && !error && (
              <div className="space-y-5 sm:space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <StatCard
                    label="Price"
                    value={inr(data.variant.price)}
                    hint={
                      data.variant.compareAtPrice
                        ? `was ${inr(data.variant.compareAtPrice)}`
                        : "Selling price"
                    }
                    icon={<IndianRupee className="h-3.5 w-3.5" />}
                  />
                  <StatCard
                    label="Stock"
                    value={data.variant.stock.toLocaleString("en-IN")}
                    hint="Units available"
                    icon={<Boxes className="h-3.5 w-3.5" />}
                  />
                  <StatCard
                    label="Orders"
                    value={data.variant.orderStats.orders.toLocaleString("en-IN")}
                    hint="Non-cancelled"
                    icon={<Package className="h-3.5 w-3.5" />}
                  />
                  <StatCard
                    label="Units sold"
                    value={data.variant.orderStats.unitsSold.toLocaleString(
                      "en-IN",
                    )}
                    hint="Across orders"
                    icon={<TrendingUp className="h-3.5 w-3.5" />}
                  />
                  <StatCard
                    label="Revenue"
                    value={inr(data.variant.orderStats.revenue)}
                    hint="Order item totals"
                    icon={<IndianRupee className="h-3.5 w-3.5" />}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                  <section className="lg:col-span-5">
                    <div className="h-full rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div>
                          <SectionEyebrow>Media</SectionEyebrow>
                          <h2 className="mt-1 text-sm font-semibold text-stone-900">
                            Variant photos
                          </h2>
                        </div>
                        <button
                          onClick={() => setMediaOpen(true)}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
                        >
                          <ImagePlus className="h-3 w-3" />
                          Manage
                        </button>
                      </div>

                      <MediaGallery
                        images={data.media}
                        alt={data.variant.name || data.variant.sku}
                        emptyLabel="No photos for this variant yet."
                      />
                    </div>
                  </section>

                  <section className="lg:col-span-7">
                    <div className="h-full rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
                      <SectionEyebrow>Purchasable variant</SectionEyebrow>
                      <h2 className="mt-1 text-sm font-semibold text-stone-900">
                        Edit variant
                      </h2>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        Price, stock and copy are per variant. Generated SKUs do
                        not change.
                      </p>

                      <div className="mt-3 space-y-3">
                        <Field label="Name">
                          <TextInput
                            value={form.name}
                            onChange={(e) => setField("name", e.target.value)}
                            placeholder="Crochet Bouquet — Rose / Large"
                          />
                        </Field>

                        <Field label="Short description">
                          <Textarea
                            value={form.briefDescription}
                            onChange={(e) =>
                              setField("briefDescription", e.target.value)
                            }
                            rows={2}
                            maxLength={500}
                            className="min-h-16"
                          />
                        </Field>

                        <Field label="Description">
                          <Textarea
                            value={form.description}
                            onChange={(e) =>
                              setField("description", e.target.value)
                            }
                            rows={3}
                            maxLength={500}
                          />
                        </Field>

                        <div className="grid grid-cols-2 gap-3">
                          <Field
                            label="Price (₹)"
                            action={
                              <PricingQuizButton
                                onUse={(price) =>
                                  setField("price", String(price))
                                }
                              />
                            }
                          >
                            <TextInput
                              type="number"
                              min={0}
                              value={form.price}
                              onChange={(e) =>
                                setField("price", e.target.value)
                              }
                            />
                          </Field>

                          <Field label="Compare at (₹)">
                            <TextInput
                              type="number"
                              min={0}
                              value={form.compareAtPrice}
                              onChange={(e) =>
                                setField("compareAtPrice", e.target.value)
                              }
                              placeholder="Optional"
                            />
                          </Field>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Field label="Stock">
                            <TextInput
                              type="number"
                              min={0}
                              value={form.stock}
                              onChange={(e) =>
                                setField("stock", e.target.value)
                              }
                            />
                          </Field>

                          <Field label="Weight (g)">
                            <TextInput
                              type="number"
                              min={0}
                              value={form.weight}
                              onChange={(e) =>
                                setField("weight", e.target.value)
                              }
                              placeholder="Optional"
                            />
                          </Field>
                        </div>

                        <Field label="Status">
                          <select
                            value={form.status}
                            onChange={(e) =>
                              setField(
                                "status",
                                e.target.value as "active" | "inactive",
                              )
                            }
                            className="w-full cursor-pointer rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 transition-colors focus:border-rose-300 focus:ring-2 focus:ring-rose-100 focus:outline-none"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </Field>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
                            <input
                              type="checkbox"
                              checked={form.isFeatured}
                              onChange={(e) =>
                                setField("isFeatured", e.target.checked)
                              }
                              className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
                            />
                            Featured
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700">
                            <input
                              type="checkbox"
                              checked={form.mainShowcase}
                              onChange={(e) =>
                                setField("mainShowcase", e.target.checked)
                              }
                              className="h-3.5 w-3.5 cursor-pointer accent-rose-500"
                            />
                            Main showcase
                          </label>
                        </div>

                        {formError && (
                          <p className="flex items-start gap-1.5 text-xs text-rose-600">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {formError}
                          </p>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => void save()}
                            disabled={saving}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-rose-500/25 transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {saving ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            )}
                            Save variant
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/85 p-4 text-[11px] leading-relaxed text-stone-500 backdrop-blur-sm sm:rounded-3xl">
                  <p className="flex items-start gap-1.5">
                    <Layers className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" />
                    Created {new Date(data.variant.createdAt).toLocaleString("en-IN")}
                    {data.variant.updatedAt
                      ? ` · Last updated ${new Date(
                          data.variant.updatedAt,
                        ).toLocaleString("en-IN")}`
                      : ""}
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {data && (
          <ProductMediaManager
            open={mediaOpen}
            onClose={() => setMediaOpen(false)}
            productId={productId}
            variantId={variantId}
            images={data.media}
            onChange={() => void load()}
            title="Variant images"
          />
        )}
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                         */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm sm:rounded-3xl sm:px-4 sm:py-3.5">
      <div className="flex items-center gap-1.5">
        <span className="text-stone-900">{icon}</span>
        <p className="truncate text-[10px] font-semibold tracking-wider text-rose-500/80 uppercase">
          {label}
        </p>
      </div>
      <p className="mt-1.5 truncate text-sm font-semibold tabular-nums text-stone-900 sm:text-base">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[10px] text-stone-400">{hint}</p>
    </div>
  );
}
