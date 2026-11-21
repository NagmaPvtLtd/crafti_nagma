"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FolderTree,
  Info,
  Loader2,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import Field from "../../utils/Form/Field";
import TextInput from "../../utils/Form/TextInput";
import Textarea from "../../utils/Form/Textarea";
import { inputClass } from "../../utils/Form/fieldStyles";
import CustomLoader from "../../CustomLoader";
import { productBaseUpdateSchema } from "../../../../utils/zod/product/manager.productDetail.zod";
import type { ProductDetailResponse } from "../../../../utils/zod/product/manager.productDetail.zod";
import type {
  GlobalCategoriesResponse,
  GlobalCategory,
} from "../../../../utils/zod/product/manager.category.zod";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const CATEGORIES_URL = "/api/manager/product-studio/categories";

type FormState = {
  name: string;
  code: string;
  briefDescription: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  deliveryCharges: string;
  processingTime: string;
  status: "active" | "inactive";
  isFeatured: boolean;
  mainShowcase: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  code: "",
  briefDescription: "",
  description: "",
  metaTitle: "",
  metaDescription: "",
  deliveryCharges: "0",
  processingTime: "",
  status: "active",
  isFeatured: false,
  mainShowcase: false,
};

/** First issue per top-level field, e.g. `options.0.valueIds` → `options`. */
function topLevelErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const map: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EditProductClient({
  productId,
}: {
  productId: string;
}) {
  const router = useRouter();

  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [categories, setCategories] = useState<GlobalCategory[] | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [features, setFeatures] = useState<string[]>([]);
  const [careInstructions, setCareInstructions] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [productRes, categoryRes] = await Promise.all([
        axios.get<ProductDetailResponse>(
          `/api/manager/product-studio/${productId}`,
          { withCredentials: true },
        ),
        axios.get<GlobalCategoriesResponse>(CATEGORIES_URL, {
          withCredentials: true,
        }),
      ]);

      const data = productRes.data;
      setProduct(data);
      setCategories(categoryRes.data.categories);
      setSelectedCategoryIds(data.categories.map((c) => c.id));
      setForm({
        name: data.product.name,
        code: data.product.code,
        briefDescription: data.product.briefDescription,
        description: data.product.description,
        metaTitle: data.product.metaTitle,
        metaDescription: data.product.metaDescription,
        deliveryCharges: String(data.product.deliveryCharges),
        processingTime: data.product.processingTime,
        status: data.product.status,
        isFeatured: data.product.isFeatured,
        mainShowcase: data.product.mainShowcase,
      });
      setFeatures(data.features.map((item) => item.value));
      setCareInstructions(data.careInstructions.map((item) => item.value));
    } catch (err) {
      setLoadError(getAxiosErrorMessage(err, "Failed to load the product"));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    const run = () => {
      void load();
    };
    run();
  }, [load]);

  const reloadCategories = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axios.get<GlobalCategoriesResponse>(CATEGORIES_URL, {
        withCredentials: true,
      });
      setCategories(res.data.categories);
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Could not refresh the categories"));
    } finally {
      setRefreshing(false);
    }
  }, []);

  /* ---- derived ---- */

  /** Readable code is the public reference; the id stays a working fallback. */
  const productKey = product?.product.code || productId;

  const roots = useMemo(
    () => (categories ?? []).filter((c) => c.parentId === null),
    [categories],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, GlobalCategory[]>();
    for (const category of categories ?? []) {
      if (!category.parentId) continue;
      const list = map.get(category.parentId) ?? [];
      list.push(category);
      map.set(category.parentId, list);
    }
    return map;
  }, [categories]);

  /* ---- handlers ---- */

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
    setErrors((prev) => {
      if (!prev.categoryIds) return prev;
      const next = { ...prev };
      delete next.categoryIds;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      briefDescription: form.briefDescription.trim(),
      description: form.description.trim(),
      metaTitle: form.metaTitle.trim(),
      metaDescription: form.metaDescription.trim(),
      deliveryCharges: Number(form.deliveryCharges || 0),
      processingTime: form.processingTime.trim(),
      isFeatured: form.isFeatured,
      mainShowcase: form.mainShowcase,
      status: form.status,
      categoryIds: selectedCategoryIds,
      features: features.map((item) => item.trim()).filter(Boolean),
      careInstructions: careInstructions
        .map((item) => item.trim())
        .filter(Boolean),
    };

    const parsed = productBaseUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      const mapped = topLevelErrors(parsed.error.issues);
      setErrors(mapped);
      const first = Object.values(mapped)[0] ?? "Please check the form";
      setFormError(first);
      toast.error(first);
      return;
    }

    setSaving(true);
    setErrors({});

    try {
      const res = await axios.put<{
        ok: true;
        product: { id: string; code: string };
      }>(`/api/manager/product-studio/${productId}`, parsed.data, {
        withCredentials: true,
      });

      const saved = res.data.product;
      toast.success("Product updated");
      router.push(
        `/manager/product-studio/products/${saved?.code || saved?.id || productKey}`,
      );
    } catch (err) {
      const details = axios.isAxiosError(err)
        ? (err.response?.data?.details as Record<string, string[]> | undefined)
        : undefined;

      const mapped = details
        ? Object.fromEntries(
            Object.entries(details).map(([key, messages]) => [
              key,
              messages?.[0] ?? "Invalid value",
            ]),
          )
        : {};

      setErrors(mapped);
      const message = getAxiosErrorMessage(err, "Could not update the product");
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* ---- render ---- */

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="relative flex flex-col overflow-x-clip text-stone-800">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />

        <section className="relative">
          <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
            <Link
              href={`/manager/product-studio/products/${productKey}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to product
            </Link>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              Edit product
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
              Change the shared details of this base product. Its variants, their
              media and its slug are untouched.
            </p>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-5xl px-4 sm:px-6" />

        <section className="relative">
          <div className="mx-auto w-full max-w-5xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !product && (
              <CustomLoader
                fullScreen={false}
                label="Loading the product…"
                hint="Its details, categories and options."
              />
            )}

            {loadError && !loading && (
              <ErrorState message={loadError} onRetry={() => void load()} />
            )}

            {!loading && !loadError && product && (
              <form onSubmit={handleSubmit} noValidate className="space-y-3">
                <SectionCard
                  step="1"
                  eyebrow="The basics"
                  title="Product information"
                  hint="The shared story of this base product. Its variants start from this copy."
                >
                  <div className="space-y-4">
                    <Field
                      label="Product name"
                      required
                      error={errors.name}
                      hint="How the base is labelled in the studio and on the website."
                    >
                      <TextInput
                        value={form.name}
                        onChange={(e) => setField("name", e.target.value)}
                        placeholder="Crochet Bouquet"
                        maxLength={255}
                      />
                    </Field>

                    <Field
                      label="Product code"
                      error={errors.code}
                      hint="Internal reference. Uppercase letters, digits, dash or underscore — must be unique."
                    >
                      <TextInput
                        value={form.code}
                        onChange={(e) =>
                          setField("code", e.target.value.toUpperCase())
                        }
                        placeholder="CROCHET-BOUQUET-4F2A"
                        maxLength={50}
                        className="font-mono"
                      />
                    </Field>

                    <Field
                      label="Brief description"
                      error={errors.briefDescription}
                      hint="One or two lines for cards and listings — keep it short."
                    >
                      <Textarea
                        value={form.briefDescription}
                        onChange={(e) =>
                          setField("briefDescription", e.target.value)
                        }
                        placeholder="Hand-tied crochet flowers that never wilt."
                        maxLength={500}
                        rows={2}
                      />
                    </Field>

                    <Field
                      label="Description"
                      error={errors.description}
                      hint="The full story — materials, size, care, anything the customer should know."
                    >
                      <Textarea
                        value={form.description}
                        onChange={(e) => setField("description", e.target.value)}
                        placeholder="Made with soft cotton yarn, each bouquet is stitched by hand…"
                        rows={5}
                      />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard
                  step="2"
                  eyebrow="Search & sharing"
                  title="Meta details"
                  hint="What search engines and link previews show. Leave blank to fall back to the product name and brief."
                >
                  <div className="space-y-4">
                    <Field
                      label="Meta title"
                      error={errors.metaTitle}
                      action={
                        <CopyButton
                          label="Keep same as name"
                          disabled={!form.name.trim()}
                          onClick={() => setField("metaTitle", form.name)}
                        />
                      }
                      hint="The blue line in Google results. Around 60 characters is plenty."
                    >
                      <TextInput
                        value={form.metaTitle}
                        onChange={(e) => setField("metaTitle", e.target.value)}
                        placeholder="Crochet Bouquet — handmade flowers"
                        maxLength={255}
                      />
                    </Field>

                    <Field
                      label="Meta description"
                      error={errors.metaDescription}
                      action={
                        <CopyButton
                          label="Keep same as brief"
                          disabled={
                            !(
                              form.briefDescription.trim() ||
                              form.description.trim()
                            )
                          }
                          onClick={() =>
                            setField(
                              "metaDescription",
                              form.briefDescription.trim() ||
                                form.description.trim(),
                            )
                          }
                        />
                      }
                      hint="The grey snippet under the title in search results. Around 155 characters."
                    >
                      <Textarea
                        value={form.metaDescription}
                        onChange={(e) =>
                          setField("metaDescription", e.target.value)
                        }
                        placeholder="Hand-tied crochet flowers that never wilt."
                        maxLength={500}
                        rows={2}
                      />
                    </Field>
                  </div>
                </SectionCard>

                <SectionCard
                  step="3"
                  eyebrow="Where it lives"
                  title="Categories"
                  hint="Pick at least one category or sub category. A product can sit in many, so shoppers can find it from more than one aisle."
                  error={errors.categoryIds}
                  action={
                    <RefreshButton
                      onClick={() => void reloadCategories()}
                      busy={refreshing}
                      disabled={refreshing}
                    />
                  }
                >
                  {roots.length === 0 ? (
                    <PoolHint
                      href="/manager/product-studio/categories"
                      label="Create your first category"
                      text="No categories yet — a product needs at least one."
                    />
                  ) : (
                    <div className="space-y-2">
                      {roots.map((root) => {
                        const subcategories =
                          childrenByParent.get(root.id) ?? [];

                        return (
                          <div
                            key={root.id}
                            className={`overflow-hidden rounded-xl border bg-white transition-colors ${
                              selectedCategoryIds.includes(root.id)
                                ? "border-rose-200"
                                : "border-stone-200"
                            }`}
                          >
                            <CategoryRow
                              kind="main"
                              name={root.name}
                              childCount={subcategories.length}
                              checked={selectedCategoryIds.includes(root.id)}
                              onToggle={() => toggleCategory(root.id)}
                            />

                            {subcategories.length > 0 && (
                              <div className="border-t border-dashed border-stone-200 bg-stone-50/50 py-1 pr-2">
                                {subcategories.map((sub) => (
                                  <CategoryRow
                                    key={sub.id}
                                    kind="sub"
                                    name={sub.name}
                                    checked={selectedCategoryIds.includes(
                                      sub.id,
                                    )}
                                    onToggle={() => toggleCategory(sub.id)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <p className="pt-1 text-[11px] text-stone-500">
                        {selectedCategoryIds.length === 0
                          ? "Nothing selected yet."
                          : `${selectedCategoryIds.length} selected.`}
                      </p>
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  step="4"
                  eyebrow="Money & fulfilment"
                  title="Delivery, processing and status"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field
                      label="Delivery charges (₹)"
                      error={errors.deliveryCharges}
                      hint="Added to the order total. Enter 0 for free delivery."
                    >
                      <TextInput
                        type="number"
                        min={0}
                        step="0.01"
                        value={form.deliveryCharges}
                        onChange={(e) =>
                          setField("deliveryCharges", e.target.value)
                        }
                        className="tabular-nums"
                      />
                    </Field>

                    <Field
                      label="Processing time"
                      error={errors.processingTime}
                      hint="How long it takes to get an order ready before it ships."
                    >
                      <TextInput
                        value={form.processingTime}
                        onChange={(e) =>
                          setField("processingTime", e.target.value)
                        }
                        placeholder="3–5 business days"
                        maxLength={100}
                      />
                    </Field>

                    <div className="sm:col-span-2">
                      <div className="mb-1 flex items-center gap-1.5">
                        <label
                          htmlFor="product-status"
                          className="text-xs font-semibold tracking-wider text-stone-700 uppercase"
                        >
                          Status
                        </label>
                        <Hint text="Active products are visible on the website. Inactive ones stay in the studio but disappear from the collections." />
                      </div>
                      <select
                        id="product-status"
                        value={form.status}
                        onChange={(e) =>
                          setField(
                            "status",
                            e.target.value as FormState["status"],
                          )
                        }
                        className={`${inputClass(Boolean(errors.status))} cursor-pointer`}
                      >
                        <option value="active">Active — visible</option>
                        <option value="inactive">Inactive — hidden</option>
                      </select>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  step="5"
                  eyebrow="What shoppers read"
                  title="Features & care instructions"
                  hint="Bullet lists shared by every variant of this product — they are not set per variant."
                >
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wider text-stone-700 uppercase">
                        Features
                      </p>
                      <ListEditor
                        items={features}
                        onChange={setFeatures}
                        placeholder="Hand-stitched with soft cotton yarn"
                        addLabel="Add a feature"
                        emptyLabel="No features yet — add the highlights of this product."
                      />
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-semibold tracking-wider text-stone-700 uppercase">
                        Care instructions
                      </p>
                      <ListEditor
                        items={careInstructions}
                        onChange={setCareInstructions}
                        placeholder="Gentle hand wash, dry flat in shade"
                        addLabel="Add an instruction"
                        emptyLabel="No care instructions yet — tell shoppers how to look after it."
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  step="6"
                  eyebrow="Showcase"
                  title="Where this product is featured"
                  hint="Both are optional. They decide whether this product is pushed forward on the website."
                >
                  <div className="space-y-2">
                    <CheckboxRow
                      checked={form.isFeatured}
                      onChange={(checked) => setField("isFeatured", checked)}
                      label="Is featured"
                      hint="Ticked, this product appears in the featured picks on the home page."
                      description="Extra visibility on the home page."
                    />
                    <CheckboxRow
                      checked={form.mainShowcase}
                      onChange={(checked) => setField("mainShowcase", checked)}
                      label="Main showcase"
                      hint="Ticked, this product becomes the thumbnail of its category — the image shoppers see before they open the category."
                      description="Represent its category on the website."
                    />
                  </div>
                </SectionCard>

                {formError && (
                  <div className="flex items-start gap-2 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-xs text-rose-700 sm:rounded-3xl">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="sticky bottom-4 z-20 rounded-2xl border border-white/70 bg-white/95 px-3 py-3 shadow-lg shadow-rose-100/60 sm:rounded-3xl sm:px-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-stone-500">
                      {selectedCategoryIds.length} categor
                      {selectedCategoryIds.length === 1 ? "y" : "ies"} ·{" "}
                      {form.status}
                    </p>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/manager/product-studio/products/${productKey}`}
                        className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                      >
                        Cancel
                      </Link>
                      <button
                        type="submit"
                        disabled={saving || !form.name.trim()}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Save changes
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

/* ================================================================== */
/*  Building blocks                                                   */
/* ================================================================== */

function CopyButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="cursor-pointer rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-0.5 text-[10px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function SectionCard({
  step,
  eyebrow,
  title,
  hint,
  error,
  action,
  children,
}: {
  step: string;
  eyebrow: string;
  title: string;
  hint?: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-[11px] font-semibold text-stone-500">
            {step}
          </span>
          <div className="min-w-0">
            <SectionEyebrow>{eyebrow}</SectionEyebrow>
            <h2 className="mt-1 flex flex-wrap items-center gap-1.5 text-base font-semibold text-stone-900">
              {title}
              {hint && <Hint text={hint} />}
            </h2>
          </div>
        </div>
        {action && <div className="mt-3 shrink-0">{action}</div>}
      </header>

      {children}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}
    </section>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
  emptyLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
  emptyLabel: string;
}) {
  /* Matches the VARCHAR(255) columns behind features and care instructions. */
  const maxLength = 255;

  const replaceAt = (index: number, value: string) =>
    onChange(items.map((item, i) => (i === index ? value : item)));

  // A new line may only be added once the last one actually says something —
  // otherwise repeated clicks pile up empty inputs.
  const lastItem = items[items.length - 1] ?? "";
  const canAdd = items.length === 0 || lastItem.trim().length > 0;

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-stone-200 px-3 py-3 text-[11px] leading-relaxed text-stone-500">
          {emptyLabel}
        </p>
      ) : (
        items.map((value, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="mt-2.5 w-4 shrink-0 text-right text-[11px] font-semibold tabular-nums text-stone-400">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <TextInput
                value={value}
                onChange={(e) => replaceAt(index, e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
              />
              <p
                className={`mt-0.5 text-right text-[10px] tabular-nums ${
                  value.length >= maxLength
                    ? "font-semibold text-rose-500"
                    : "text-stone-400"
                }`}
              >
                {value.length}/{maxLength}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label="Remove this line"
              className="mt-1.5 inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-stone-200 bg-white text-stone-400 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}

      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        disabled={!canAdd}
        title={
          canAdd ? addLabel : "Fill the last line before adding another"
        }
        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium text-stone-500 transition-colors hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-stone-200 disabled:hover:bg-white disabled:hover:text-stone-500"
      >
        <Plus className="h-3 w-3" />
        {addLabel}
      </button>
    </div>
  );
}

function Hint({ text }: { text: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label="What does this mean?"
        onClick={(e) => e.preventDefault()}
        className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-stone-400 transition-colors hover:text-rose-500 focus-visible:text-rose-500 focus-visible:outline-none"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-60 max-w-[80vw] -translate-x-1/2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[11px] leading-relaxed font-normal text-stone-600 opacity-0 shadow-xl shadow-stone-900/10 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

function RefreshButton({
  onClick,
  busy,
  disabled,
}: {
  onClick: () => void;
  busy: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="Reload categories"
      aria-label="Reload categories"
      className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-stone-500 transition-colors hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      Refresh
    </button>
  );
}

function PoolHint({
  href,
  label,
  text,
}: {
  href: string;
  label: string;
  text: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-stone-200 px-3 py-3 text-[11px] text-stone-500">
      <span>{text}</span>
      <Link
        href={href}
        className="rounded-full border border-rose-200/70 bg-rose-50/60 px-3 py-1 font-semibold text-rose-600 transition-colors hover:border-rose-300"
      >
        {label}
      </Link>
    </div>
  );
}

function CategoryRow({
  kind,
  name,
  childCount = 0,
  checked,
  onToggle,
}: {
  kind: "main" | "sub";
  name: string;
  childCount?: number;
  checked: boolean;
  onToggle: () => void;
}) {
  const isMain = kind === "main";

  return (
    <div className={isMain ? "relative" : "relative pl-6"}>
      {!isMain && (
        <>
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 left-2 border-l border-dashed border-stone-300"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-2 h-1/2 w-3 rounded-bl-md border-b border-dashed border-stone-300"
          />
        </>
      )}

      <label
        className={`flex cursor-pointer items-center gap-2 py-1.5 pr-2.5 transition-colors hover:bg-rose-50/50 ${
          isMain ? "pl-2.5" : "pl-2"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-rose-500"
        />

        {isMain && (
          <FolderTree className="h-3.5 w-3.5 shrink-0 text-rose-400" />
        )}

        <span
          className={`min-w-0 flex-1 truncate ${
            isMain
              ? "text-sm font-semibold text-stone-800"
              : "text-[12.5px] font-medium text-stone-600"
          }`}
        >
          {name}
        </span>

        {isMain && childCount > 0 && (
          <span className="shrink-0 text-[10px] font-medium text-stone-400">
            {childCount}
          </span>
        )}

        <span
          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold tracking-wider uppercase ${
            isMain
              ? "bg-stone-100 text-stone-500"
              : "bg-white text-stone-400 ring-1 ring-stone-200"
          }`}
        >
          {isMain ? "Main" : "Sub"}
        </span>
      </label>
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
  hint,
  description,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-stone-200 bg-white px-3 py-2.5 transition-colors hover:border-rose-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-rose-500"
      />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-sm font-medium text-stone-800">
          {label}
          <Hint text={hint} />
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-500">
          {description}
        </span>
      </span>
    </label>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3.5 sm:rounded-3xl sm:px-5 sm:py-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-stone-900" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-800">
          Couldn&apos;t load the product
        </p>
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
