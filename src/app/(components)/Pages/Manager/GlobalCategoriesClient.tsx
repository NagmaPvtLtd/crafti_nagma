"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FolderPlus,
  FolderTree,
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import Field from "../../utils/Form/Field";
import TextInput from "../../utils/Form/TextInput";
import { inputClass } from "../../utils/Form/fieldStyles";
import CustomLoader from "../../CustomLoader";
import type {
  GlobalCategoriesResponse,
  GlobalCategory,
} from "../../../../utils/zod/product/manager.category.zod";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BASE = "/api/manager/product-studio/categories";

type ModalState =
  | { mode: "create"; parentId: string | null }
  | { mode: "edit"; category: GlobalCategory };

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fieldErrors(err: unknown): Record<string, string[]> {
  if (axios.isAxiosError(err)) {
    const details = err.response?.data?.details;
    if (details && typeof details === "object") {
      return details as Record<string, string[]>;
    }
  }
  return {};
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export default function GlobalCategoriesClient() {
  const [data, setData] = useState<GlobalCategoriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modal, setModal] = useState<ModalState | null>(null);
  const [toDelete, setToDelete] = useState<GlobalCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchCategories = useCallback(async () => {
    const res = await axios.get<GlobalCategoriesResponse>(BASE, {
      withCredentials: true,
    });
    return res.data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchCategories());
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load categories"));
    } finally {
      setLoading(false);
    }
  }, [fetchCategories]);

  /* ---- initial load — state updates only after the request settles ---- */
  useEffect(() => {
    let active = true;

    fetchCategories()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e: unknown) => {
        if (active) setError(getAxiosErrorMessage(e, "Failed to load categories"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchCategories]);

  const categories = useMemo(() => data?.categories ?? [], [data]);

  const roots = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, GlobalCategory[]>();
    for (const c of categories) {
      if (!c.parentId) continue;
      const list = map.get(c.parentId) ?? [];
      list.push(c);
      map.set(c.parentId, list);
    }
    return map;
  }, [categories]);

  const orphanSubs = useMemo(
    () =>
      categories.filter(
        (c) => c.parentId !== null && !roots.some((r) => r.id === c.parentId),
      ),
    [categories, roots],
  );

  /* ---- create / update ---- */
  const submit = useCallback(
    async (values: {
      id?: string;
      name: string;
      slug: string;
      parentId: string | null;
    }): Promise<boolean> => {
      if (values.id) {
        await axios.put(
          BASE,
          {
            id: values.id,
            name: values.name,
            slug: values.slug,
            parentId: values.parentId,
          },
          { withCredentials: true },
        );
        toast.success("Category updated");
      } else {
        await axios.post(
          BASE,
          { name: values.name, slug: values.slug, parentId: values.parentId },
          { withCredentials: true },
        );
        toast.success(
          values.parentId ? "Sub category created" : "Category created",
        );
      }
      await load();
      return true;
    },
    [load],
  );

  /* ---- delete ---- */
  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`${BASE}?id=${encodeURIComponent(toDelete.id)}`, {
        withCredentials: true,
      });
      toast.success("Category deleted");
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Could not delete category"));
    } finally {
      setDeleting(false);
    }
  }, [toDelete, load]);

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
              href="/manager/product-studio"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 transition-colors hover:text-rose-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Product Studio
            </Link>

            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  Global Categories
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Create categories &amp; sub categories to assign to your
                  products. Two levels — a main category and the sub categories
                  that sit under it.
                </p>
              </div>

              <div className="flex items-center gap-2">
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
                  onClick={() => setModal({ mode: "create", parentId: null })}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New category
                </button>
              </div>
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* Body */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !data && (
              <CustomLoader
                fullScreen={false}
                label="Untangling the category tree…"
                hint="Main categories and their sub categories."
              />
            )}

            {error && !loading && (
              <ErrorState message={error} onRetry={() => void load()} />
            )}

            {data && !error && (
              <div className="space-y-6">
                <StatStrip counts={data.counts} />

                {roots.length === 0 && orphanSubs.length === 0 ? (
                  <EmptyState
                    onCreate={() => setModal({ mode: "create", parentId: null })}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="mb-1 flex items-end justify-between gap-3">
                      <div>
                        <SectionEyebrow>Your tree</SectionEyebrow>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                          Categories
                        </h2>
                      </div>
                      <p className="hidden text-xs text-stone-500 sm:block">
                        {plural(categories.length, "entry", "entries")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {roots.map((root) => (
                        <CategoryCard
                          key={root.id}
                          category={root}
                          subcategories={childrenByParent.get(root.id) ?? []}
                          onEdit={(c) => setModal({ mode: "edit", category: c })}
                          onDelete={(c) => setToDelete(c)}
                          onAddSub={(parentId) =>
                            setModal({ mode: "create", parentId })
                          }
                        />
                      ))}
                    </div>

                    {orphanSubs.length > 0 && (
                      <div className="rounded-2xl border border-amber-200/70 bg-amber-50/70 p-4 text-xs text-amber-800 backdrop-blur-sm sm:rounded-3xl">
                        <p className="font-semibold">
                          {plural(orphanSubs.length, "sub category", "sub categories")} without a parent
                        </p>
                        <ul className="mt-2 space-y-1">
                          {orphanSubs.map((c) => (
                            <li key={c.id} className="flex items-center gap-2">
                              <span className="font-mono text-[11px]">
                                {c.slug}
                              </span>
                              <button
                                onClick={() =>
                                  setModal({ mode: "edit", category: c })
                                }
                                className="cursor-pointer font-semibold underline decoration-amber-400 underline-offset-2"
                              >
                                Fix parent
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {modal && (
        <CategoryModal
          state={modal}
          roots={roots.filter(
            (r) =>
              !(
                modal.mode === "edit" &&
                (r.id === modal.category.id || modal.category.subcategoryCount > 0)
              ),
          )}
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}

      {toDelete && (
        <ConfirmDelete
          category={toDelete}
          busy={deleting}
          onCancel={() => setToDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
    </PageWrapper>
  );
}

/* ================================================================== */
/*  Stat strip                                                        */
/* ================================================================== */

function StatStrip({ counts }: { counts: GlobalCategoriesResponse["counts"] }) {
  const items = [
    {
      label: "Categories",
      value: counts.total,
      hint: `${counts.root} main · ${counts.sub} sub`,
      icon: <FolderTree className="h-3.5 w-3.5" />,
    },
    {
      label: "Sub categories",
      value: counts.sub,
      hint: "Second level under a main category",
      icon: <FolderPlus className="h-3.5 w-3.5" />,
    },
    {
      label: "Assigned",
      value: counts.productsAssigned,
      hint: "Product ↔ category links",
      icon: <Package className="h-3.5 w-3.5" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:px-4 sm:py-3.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-stone-900">{it.icon}</span>
            <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-rose-500/80">
              {it.label}
            </p>
          </div>
          <p className="mt-1.5 truncate text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
            {it.value.toLocaleString("en-IN")}
          </p>
          <p className="mt-0.5 truncate text-[10px] text-stone-400">{it.hint}</p>
        </div>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Category card (root + its sub categories)                         */
/* ================================================================== */

function CategoryCard({
  category,
  subcategories,
  onEdit,
  onDelete,
  onAddSub,
}: {
  category: GlobalCategory;
  subcategories: GlobalCategory[];
  onEdit: (c: GlobalCategory) => void;
  onDelete: (c: GlobalCategory) => void;
  onAddSub: (parentId: string) => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-900">
            <FolderTree className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-stone-900">
              {category.name}
            </h3>
            <p className="truncate font-mono text-[10px] text-stone-400">
              /{category.slug}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Edit category"
            onClick={() => onEdit(category)}
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconButton
            label="Delete category"
            onClick={() => onDelete(category)}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            danger
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip>
          {plural(category.subcategoryCount, "sub category", "sub categories")}
        </Chip>
        <Chip>{plural(category.productCount, "product")}</Chip>
      </div>

      <div className="mt-4 flex-1 space-y-1.5">
        {subcategories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-200 px-3 py-2.5 text-[11px] text-stone-400">
            No sub categories yet.
          </p>
        ) : (
          subcategories.map((sub) => (
            <div
              key={sub.id}
              className="group flex items-center justify-between gap-2 rounded-xl border border-stone-100 bg-white px-3 py-2 transition-colors hover:border-rose-200"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-stone-800">
                  {sub.name}
                </p>
                <p className="truncate font-mono text-[10px] text-stone-400">
                  /{sub.slug} · {plural(sub.productCount, "product")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                <IconButton
                  label="Edit sub category"
                  onClick={() => onEdit(sub)}
                  icon={<Pencil className="h-3 w-3" />}
                />
                <IconButton
                  label="Delete sub category"
                  onClick={() => onDelete(sub)}
                  icon={<Trash2 className="h-3 w-3" />}
                  danger
                />
              </div>
            </div>
          ))
        )}
      </div>

      <button
        onClick={() => onAddSub(category.id)}
        className="mt-3 inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-rose-200/70 bg-rose-50/60 px-3 py-1.5 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
      >
        <Plus className="h-3 w-3" />
        Add sub category
      </button>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-600">
      {children}
    </span>
  );
}

function IconButton({
  label,
  onClick,
  icon,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border bg-white transition-colors ${
        danger
          ? "border-stone-200 text-stone-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          : "border-stone-200 text-stone-500 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900"
      }`}
    >
      {icon}
    </button>
  );
}

/* ================================================================== */
/*  Create / edit modal                                               */
/* ================================================================== */

function CategoryModal({
  state,
  roots,
  onClose,
  onSubmit,
}: {
  state: ModalState;
  roots: GlobalCategory[];
  onClose: () => void;
  onSubmit: (values: {
    id?: string;
    name: string;
    slug: string;
    parentId: string | null;
  }) => Promise<boolean>;
}) {
  const editing = state.mode === "edit" ? state.category : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [slug, setSlug] = useState(editing?.slug ?? "");
  const [parentId, setParentId] = useState<string>(
    editing?.parentId ??
      (state.mode === "create" ? (state.parentId ?? "") : ""),
  );

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const parentLocked = Boolean(editing && editing.subcategoryCount > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setErrors({});

    try {
      const ok = await onSubmit({
        id: editing?.id,
        name: name.trim(),
        slug: slug.trim(),
        parentId: parentId || null,
      });
      if (ok) onClose();
    } catch (err) {
      const details = fieldErrors(err);
      setErrors(details);
      const first = Object.values(details).flat()[0];
      setFormError(
        first ?? getAxiosErrorMessage(err, "Could not save the category"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={saving ? undefined : onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-stone-900/20 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <SectionEyebrow>
              {editing
                ? editing.parentId
                  ? "Sub category"
                  : "Main category"
                : state.mode === "create" && state.parentId
                  ? "New sub category"
                  : "New category"}
            </SectionEyebrow>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              {editing ? "Edit category" : "Create category"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-stone-200 text-stone-500 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <Field
            label="Name"
            required
            error={errors.name?.[0]}
            hint="Shown to customers, e.g. “Crochet Bouquets”."
          >
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Crochet Bouquets"
              maxLength={100}
              autoFocus
            />
          </Field>

          <Field
            label="Slug"
            error={errors.slug?.[0]}
            hint="Leave blank to generate it from the name."
          >
            <TextInput
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="crochet-bouquets"
              maxLength={120}
              className="font-mono"
            />
          </Field>

          <div>
            <label
              htmlFor="category-parent"
              className="mb-1 block text-xs font-semibold tracking-wider text-stone-700 uppercase"
            >
              Parent category
            </label>
            <select
              id="category-parent"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              disabled={parentLocked}
              className={`${inputClass(false)} cursor-pointer disabled:cursor-not-allowed`}
            >
              <option value="">None — this is a main category</option>
              {roots.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-500">
              {parentLocked
                ? "This category has sub categories, so it must stay at the top level."
                : "Pick a main category to make this a sub category. Only two levels are allowed."}
            </p>
          </div>

          {formError && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200/70 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{formError}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-100 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || name.trim().length < 2}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {editing ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </Overlay>
  );
}

/* ================================================================== */
/*  Delete confirmation                                               */
/* ================================================================== */

function ConfirmDelete({
  category,
  busy,
  onCancel,
  onConfirm,
}: {
  category: GlobalCategory;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const blocked = category.subcategoryCount > 0 || category.productCount > 0;

  return (
    <Overlay onClose={busy ? undefined : onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-stone-900/20 sm:rounded-3xl">
        <div className="px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600">
            <Trash2 className="h-4 w-4" />
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-stone-900">
            Delete “{category.name}”?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            This permanently removes the category. Products keep their other
            categories.
          </p>

          {(category.subcategoryCount > 0 || category.productCount > 0) && (
            <div className="mt-3 space-y-1 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {category.subcategoryCount > 0 && (
                <p>
                  It still has{" "}
                  {plural(category.subcategoryCount, "sub category", "sub categories")}.
                </p>
              )}
              {category.productCount > 0 && (
                <p>
                  It is assigned to {plural(category.productCount, "product")}.
                </p>
              )}
              <p className="pt-0.5 font-semibold">
                Move them first — deletion will be refused.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-stone-100 px-5 py-3.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="cursor-pointer rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 transition-colors hover:bg-stone-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || blocked}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Delete
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 px-4 py-8">
      <div
        aria-hidden
        className="absolute inset-0"
        onClick={onClose}
        role="presentation"
      />
      <div className="relative flex w-full max-w-lg justify-center">{children}</div>
    </div>
  );
}

/* ================================================================== */
/*  Empty / skeleton / error                                          */
/* ================================================================== */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-12 text-center backdrop-blur-sm sm:rounded-3xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
        <FolderTree className="h-5 w-5" />
      </div>
      <h2 className="mt-3 text-base font-semibold text-stone-900">
        No categories yet
      </h2>
      <p className="mt-1 max-w-sm text-sm text-stone-600">
        Start with a main category like “Crochet Bouquets”, then add sub
        categories under it.
      </p>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Create the first category
      </button>
    </div>
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
          Couldn&apos;t load categories
        </p>
        <p className="mt-0.5 text-xs text-rose-700">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 cursor-pointer rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 transition-colors hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}
