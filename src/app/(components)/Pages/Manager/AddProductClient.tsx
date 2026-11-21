"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Check,
  FolderTree,
  Info,
  Loader2,
  RefreshCw,
  Sparkles,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import ErrorState from "../../utils/ErrorState";
import { topLevelErrors } from "../../utils/Form/formErrors";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import Field from "../../utils/Form/Field";
import TextInput from "../../utils/Form/TextInput";
import Textarea from "../../utils/Form/Textarea";
import { inputClass } from "../../utils/Form/fieldStyles";
import CustomLoader from "../../CustomLoader";
import { baseProductCreateSchema } from "../../../../utils/zod/product/manager.product.zod";
import type {
  GlobalCategoriesResponse,
  GlobalCategory,
} from "../../../../utils/zod/product/manager.category.zod";
import type {
  GlobalOption,
  GlobalOptionsResponse,
} from "../../../../utils/zod/product/manager.option.zod";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES_URL = "/api/manager/product-studio/categories";
const OPTIONS_URL = "/api/manager/product-studio/options";
const CREATE_URL = "/api/manager/product-studio";

type FormState = {
  name: string;
  briefDescription: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  deliveryCharges: string;
  isFeatured: boolean;
  mainShowcase: boolean;
  status: "active" | "inactive";
};

type CreateProductResponse = {
  ok: true;
  message: string;
  product: {
    id: string;
    code: string;
    slug: string;
    name: string;
    status: "active" | "inactive";
    categoryCount: number;
    optionCount: number;
  };
};

const EMPTY_FORM: FormState = {
  name: "",
  briefDescription: "",
  description: "",
  metaTitle: "",
  metaDescription: "",
  deliveryCharges: "0",
  isFeatured: false,
  mainShowcase: false,
  status: "active",
};

/** First issue per top-level field, e.g. `options.0.valueIds` → `options`. */

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AddProductClient() {
  const router = useRouter();

  const [categories, setCategories] = useState<GlobalCategory[] | null>(null);
  const [options, setOptions] = useState<GlobalOption[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  /** optionId → selected value ids */
  const [selectedValues, setSelectedValues] = useState<
    Record<string, string[]>
  >({});

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPools = useCallback(async () => {
    const [categoryRes, optionRes] = await Promise.all([
      axios.get<GlobalCategoriesResponse>(CATEGORIES_URL, {
        withCredentials: true,
      }),
      axios.get<GlobalOptionsResponse>(OPTIONS_URL, { withCredentials: true }),
    ]);

    return {
      categories: categoryRes.data.categories,
      options: optionRes.data.options,
    };
  }, []);

  const reloadPools = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetchPools();
      setCategories(data.categories);
      setOptions(data.options);
      setLoadError(null);
    } catch (err: unknown) {
      setLoadError(
        getAxiosErrorMessage(err, "Could not refresh the form data"),
      );
    } finally {
      setRefreshing(false);
    }
  }, [fetchPools]);

  useEffect(() => {
    let active = true;

    fetchPools()
      .then((data) => {
        if (!active) return;
        setCategories(data.categories);
        setOptions(data.options);
      })
      .catch((err: unknown) => {
        if (active) {
          setLoadError(
            getAxiosErrorMessage(err, "Could not load the form data"),
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchPools]);

  /* ---- derived ---- */

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

  const availableOptions = options ?? [];
  const includedOptions = availableOptions.filter(
    (option) => option.id in selectedValues,
  );

  const canSubmit =
    !saving &&
    !loading &&
    (categories?.length ?? 0) > 0 &&
    availableOptions.length > 0;

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
    /* Picking a sub category also picks its parent main category. */
    const parentId =
      (categories ?? []).find((c) => c.id === id)?.parentId ?? null;

    setSelectedCategoryIds((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);

      const next = [...prev];
      if (parentId && !next.includes(parentId)) next.push(parentId);
      if (!next.includes(id)) next.push(id);
      return next;
    });
    setErrors((prev) => {
      if (!prev.categoryIds) return prev;
      const next = { ...prev };
      delete next.categoryIds;
      return next;
    });
  };

  const toggleOption = (option: GlobalOption) => {
    setSelectedValues((prev) => {
      if (option.id in prev) {
        const next = { ...prev };
        delete next[option.id];
        return next;
      }
      // Fallback: the first value of the pool is the default selection.
      return {
        ...prev,
        [option.id]: option.values[0] ? [option.values[0].id] : [],
      };
    });
  };

  const toggleValue = (optionId: string, valueId: string) => {
    setSelectedValues((prev) => {
      const current = prev[optionId] ?? [];
      return {
        ...prev,
        [optionId]: current.includes(valueId)
          ? current.filter((v) => v !== valueId)
          : [...current, valueId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      name: form.name.trim(),
      briefDescription: form.briefDescription.trim(),
      description: form.description.trim(),
      metaTitle: form.metaTitle.trim(),
      metaDescription: form.metaDescription.trim(),
      deliveryCharges: Number(form.deliveryCharges || 0),
      isFeatured: form.isFeatured,
      mainShowcase: form.mainShowcase,
      status: form.status,
      categoryIds: selectedCategoryIds,
      options: Object.entries(selectedValues).map(([optionId, valueIds]) => ({
        optionId,
        valueIds,
      })),
    };

    const parsed = baseProductCreateSchema.safeParse(payload);
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
      const res = await axios.post<CreateProductResponse>(
        CREATE_URL,
        parsed.data,
        { withCredentials: true },
      );
      const created = res.data.product;
      toast.success("Base product created");
      router.push(
        created?.code || created?.id
          ? `/manager/product-studio/products/${created.code || created.id}`
          : "/manager/product-studio/products",
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
      const message = getAxiosErrorMessage(err, "Could not create the product");
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* ---- render ---- */

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <SectionEyebrow href="/manager/product-studio">
          PRODUCT STUDIO
        </SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
          Add a product
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
          Set up the base product once — its categories, options and copy — and
          every variant you make from it inherits them.
        </p>

        <SectionDivider className="my-6" size={11} />

        {loading && !categories && (
          <CustomLoader
            fullScreen={false}
            label="Laying out the product form…"
            hint="Categories, options and their values."
          />
        )}

        {loadError && !loading && (
          <ErrorState
            title="Couldn't load the form"
            message={loadError}
            onRetry={() => window.location.reload()}
          />
        )}

        {!loading && !loadError && (
          <form onSubmit={handleSubmit} noValidate className="space-y-3">
            <BaseNotice />

            <PoolWarnings
              categories={categories ?? []}
              options={availableOptions}
            />

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
                  onClick={reloadPools}
                  busy={refreshing}
                  disabled={loading || refreshing}
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
                    const subcategories = childrenByParent.get(root.id) ?? [];

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
                                checked={selectedCategoryIds.includes(sub.id)}
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
              eyebrow="Choices"
              title="Options & values"
              hint="Options are the pools a variant is built from — Colour, Size, Material. Tick a pool, then pick its values. The first value is selected for you as the default."
              error={errors.options}
            >
              {availableOptions.length === 0 ? (
                <PoolHint
                  href="/manager/product-studio/options"
                  label="Create an option pool"
                  text="No options yet — a base product needs at least one option with a value."
                />
              ) : (
                <div className="space-y-2">
                  {availableOptions.map((option) => {
                    const chosen = selectedValues[option.id];
                    const included = chosen !== undefined;

                    return (
                      <div
                        key={option.id}
                        className="rounded-xl border border-stone-200 bg-white p-3"
                      >
                        <label className="flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={included}
                            onChange={() => toggleOption(option)}
                            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-rose-500"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-stone-800">
                              {option.name}
                              <span className="text-[10px] font-normal text-stone-400">
                                {option.valueCount} value
                                {option.valueCount === 1 ? "" : "s"}
                              </span>
                            </span>
                            <span className="mt-0.5 block text-[11px] text-stone-500">
                              {option.description || "No description yet"}
                            </span>
                          </span>
                          {included && (
                            <span className="shrink-0 rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                              {chosen.length} picked
                            </span>
                          )}
                        </label>

                        {included && (
                          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-dashed border-stone-100 pt-2">
                            {option.values.length === 0 ? (
                              <p className="text-[11px] text-amber-700">
                                This pool has no values yet — add them in Global
                                Options.
                              </p>
                            ) : (
                              option.values.map((value) => (
                                <SelectChip
                                  key={value.id}
                                  selected={chosen.includes(value.id)}
                                  onClick={() =>
                                    toggleValue(option.id, value.id)
                                  }
                                >
                                  {value.value}
                                </SelectChip>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <p className="pt-1 text-[11px] text-stone-500">
                    {includedOptions.length === 0
                      ? "No option selected yet."
                      : `${includedOptions.length} option${
                          includedOptions.length === 1 ? "" : "s"
                        } selected.`}
                  </p>
                </div>
              )}
            </SectionCard>

            <SectionCard
              step="5"
              eyebrow="Money & visibility"
              title="Delivery and status"
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

                <div>
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
                      setField("status", e.target.value as FormState["status"])
                    }
                    className={`${inputClass(false)} cursor-pointer`}
                  >
                    <option value="active">Active — visible</option>
                    <option value="inactive">Inactive — hidden</option>
                  </select>
                  <p className="mt-1 text-xs text-stone-500">
                    You can flip this later from the product.
                  </p>
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
                  {includedOptions.length} option
                  {includedOptions.length === 1 ? "" : "s"} · {form.status}
                </p>

                <div className="flex items-center gap-2">
                  <Link
                    href="/manager/product-studio"
                    className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    Create base product
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </PageWrapper>
  );
}

/* ================================================================== */
/*  Notice / warnings                                                 */
/* ================================================================== */

function BaseNotice() {
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-white text-amber-600">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-amber-900">
            This is a base product
          </h2>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-amber-800">
            <li>
              A base product is <strong>never purchased</strong> — it has no
              price or stock of its own.
            </li>
            <li>
              It holds what every variant shares: categories, options, copy and
              delivery.
            </li>
            <li>
              The variants you build from it are what actually appear on the
              website.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function PoolWarnings({
  categories,
  options,
}: {
  categories: GlobalCategory[];
  options: GlobalOption[];
}) {
  const missing: { href: string; label: string; text: string }[] = [];

  if (categories.length === 0) {
    missing.push({
      href: "/manager/product-studio/categories",
      label: "Create a category",
      text: "No categories exist yet — every product needs at least one.",
    });
  }
  if (options.length === 0) {
    missing.push({
      href: "/manager/product-studio/options",
      label: "Create an option",
      text: "No option pools exist yet — every base product needs at least one option with a value.",
    });
  }

  if (missing.length === 0) return null;

  return (
    <div className="space-y-2">
      {missing.map((item) => (
        <div
          key={item.href}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-3 text-xs text-rose-700 backdrop-blur-sm sm:rounded-3xl"
        >
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {item.text}
          </span>
          <Link
            href={item.href}
            className="shrink-0 rounded-full border border-rose-300 bg-white px-3 py-1 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-100"
          >
            {item.label}
          </Link>
        </div>
      ))}
    </div>
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

/* ================================================================== */
/*  Building blocks                                                   */
/* ================================================================== */

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

/**
 * Hover/focus tooltip with a floating chip. CSS-only so it works with
 * hover, keyboard focus and a tap on touch screens.
 */
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

/**
 * One row of the category tree. Main categories carry the folder icon and
 * bold text; sub categories hang off a dashed rail with an elbow connector,
 * so the two levels are obvious at a glance.
 */
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

/**
 * Small chip-style refresh control for a section header — matches the
 * muted, bordered chips used elsewhere in the studio.
 */
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
      title="Reload categories and options"
      aria-label="Reload categories and options"
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

function SelectChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
        selected
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : "border-stone-200 bg-white text-stone-600 hover:border-rose-200 hover:text-stone-900"
      }`}
    >
      {selected && <Check className="h-3 w-3" />}
      {children}
    </button>
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
