"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ListChecks,
  Loader2,
  Palette,
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
import CustomLoader from "../../CustomLoader";
import type {
  GlobalOption,
  GlobalOptionsResponse,
  GlobalOptionValue,
} from "../../../../utils/zod/product/manager.option.zod";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BASE = "/api/manager/product-studio/options";
const VALUES = `${BASE}/values`;

type OptionModalState = { mode: "create" } | { mode: "edit"; option: GlobalOption };

type DeleteTarget =
  | { kind: "option"; option: GlobalOption }
  | { kind: "value"; option: GlobalOption; value: GlobalOptionValue };

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

export default function GlobalOptionsClient() {
  const [data, setData] = useState<GlobalOptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [optionModal, setOptionModal] = useState<OptionModalState | null>(null);
  const [valueEdit, setValueEdit] = useState<
    { option: GlobalOption; value: GlobalOptionValue } | null
  >(null);
  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOptions = useCallback(async () => {
    const res = await axios.get<GlobalOptionsResponse>(BASE, {
      withCredentials: true,
    });
    return res.data;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchOptions());
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load options"));
    } finally {
      setLoading(false);
    }
  }, [fetchOptions]);

  /* ---- initial load — state updates only after the request settles ---- */
  useEffect(() => {
    let active = true;

    fetchOptions()
      .then((d) => {
        if (active) setData(d);
      })
      .catch((e: unknown) => {
        if (active) setError(getAxiosErrorMessage(e, "Failed to load options"));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [fetchOptions]);

  /* ---- option create / update ---- */
  const saveOption = useCallback(
    async (values: {
      id?: string;
      name: string;
      description: string;
    }): Promise<boolean> => {
      if (values.id) {
        await axios.put(BASE, values, { withCredentials: true });
        toast.success("Option updated");
      } else {
        await axios.post(
          BASE,
          { name: values.name, description: values.description },
          { withCredentials: true },
        );
        toast.success("Option created");
      }
      await load();
      return true;
    },
    [load],
  );

  /* ---- value create ---- */
  const addValue = useCallback(
    async (optionId: string, value: string): Promise<boolean> => {
      await axios.post(
        VALUES,
        { optionId, value },
        { withCredentials: true },
      );
      toast.success("Value added");
      await load();
      return true;
    },
    [load],
  );

  /* ---- value rename ---- */
  const renameValue = useCallback(
    async (id: string, value: string): Promise<boolean> => {
      await axios.put(VALUES, { id, value }, { withCredentials: true });
      toast.success("Value updated");
      await load();
      return true;
    },
    [load],
  );

  /* ---- delete option or value ---- */
  const confirmDelete = useCallback(async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      if (toDelete.kind === "option") {
        await axios.delete(`${BASE}?id=${encodeURIComponent(toDelete.option.id)}`, {
          withCredentials: true,
        });
        toast.success("Option deleted");
      } else {
        await axios.delete(
          `${VALUES}?id=${encodeURIComponent(toDelete.value.id)}`,
          { withCredentials: true },
        );
        toast.success("Value deleted");
      }
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(getAxiosErrorMessage(err, "Could not delete"));
    } finally {
      setDeleting(false);
    }
  }, [toDelete, load]);

  const counts = data?.counts;
  const options = data?.options ?? [];

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
                  Global Options
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  Create the pool of options your products can have — Colour,
                  Size, Material — and fill each one with its values. Yellow, Red
                  and Blue go inside Colour; Small, Medium and Large inside Size.
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
                  onClick={() => setOptionModal({ mode: "create" })}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New option
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
                label="Gathering the option pool…"
                hint="Colours, sizes, materials and their values."
              />
            )}

            {error && !loading && (
              <ErrorState message={error} onRetry={() => void load()} />
            )}

            {data && !error && (
              <div className="space-y-6">
                {counts && <StatStrip counts={counts} />}

                {options.length === 0 ? (
                  <EmptyState
                    onCreate={() => setOptionModal({ mode: "create" })}
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="mb-1 flex items-end justify-between gap-3">
                      <div>
                        <SectionEyebrow>The pool</SectionEyebrow>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
                          Options &amp; values
                        </h2>
                      </div>
                      <p className="hidden text-xs text-stone-500 sm:block">
                        {plural(options.length, "option")}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      {options.map((option) => (
                        <OptionCard
                          key={option.id}
                          option={option}
                          onEdit={() => setOptionModal({ mode: "edit", option })}
                          onDelete={() =>
                            setToDelete({ kind: "option", option })
                          }
                          onAddValue={addValue}
                          onEditValue={(value) =>
                            setValueEdit({ option, value })
                          }
                          onDeleteValue={(value) =>
                            setToDelete({ kind: "value", option, value })
                          }
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {optionModal && (
        <OptionModal
          state={optionModal}
          onClose={() => setOptionModal(null)}
          onSubmit={saveOption}
        />
      )}

      {valueEdit && (
        <ValueModal
          optionName={valueEdit.option.name}
          value={valueEdit.value}
          onClose={() => setValueEdit(null)}
          onSubmit={renameValue}
        />
      )}

      {toDelete && (
        <ConfirmDelete
          target={toDelete}
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

function StatStrip({ counts }: { counts: GlobalOptionsResponse["counts"] }) {
  const items = [
    {
      label: "Options",
      value: counts.options,
      hint: "Colour, size, material…",
      icon: <ListChecks className="h-3.5 w-3.5" />,
    },
    {
      label: "Values",
      value: counts.values,
      hint: "The choices inside each option",
      icon: <Palette className="h-3.5 w-3.5" />,
    },
    {
      label: "In use",
      value: counts.productsUsing,
      hint: "Products using an option pool",
      icon: <Check className="h-3.5 w-3.5" />,
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
/*  Option card (option + its value chips + inline add)               */
/* ================================================================== */

function OptionCard({
  option,
  onEdit,
  onDelete,
  onAddValue,
  onEditValue,
  onDeleteValue,
}: {
  option: GlobalOption;
  onEdit: () => void;
  onDelete: () => void;
  onAddValue: (optionId: string, value: string) => Promise<boolean>;
  onEditValue: (value: GlobalOptionValue) => void;
  onDeleteValue: (value: GlobalOptionValue) => void;
}) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = draft.trim();
    if (!value) return;

    setSaving(true);
    setErr(null);
    try {
      await onAddValue(option.id, value);
      setDraft("");
    } catch (error) {
      const details = fieldErrors(error);
      setErr(
        Object.values(details).flat()[0] ??
          getAxiosErrorMessage(error, "Could not add the value"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-900">
            <ListChecks className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-stone-900">
              {option.name}
            </h3>
            <p className="truncate text-[11px] text-stone-500">
              {option.description || "No description yet"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <IconButton
            label="Edit option"
            onClick={onEdit}
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          <IconButton
            label="Delete option"
            onClick={onDelete}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            danger
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Chip>{plural(option.valueCount, "value")}</Chip>
        <Chip>{plural(option.productCount, "product")}</Chip>
      </div>

      <div className="mt-4 flex-1">
        {option.values.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-200 px-3 py-2.5 text-[11px] text-stone-400">
            No values yet — add the first one below.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {option.values.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-0.5 rounded-full border border-stone-200 bg-white py-0.5 pr-0.5 pl-2 text-[11px] text-stone-700 transition-colors hover:border-rose-200"
              >
                <button
                  type="button"
                  onClick={() => onEditValue(v)}
                  title="Rename this value"
                  className="cursor-pointer font-medium hover:text-rose-600"
                >
                  {v.value}
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteValue(v)}
                  aria-label={`Delete ${v.value}`}
                  title="Delete this value"
                  className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Add a value to ${option.name}`}
          maxLength={100}
          disabled={saving}
          className="w-full rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[11px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-100 disabled:cursor-not-allowed disabled:bg-stone-50"
        />
        <button
          type="submit"
          disabled={saving || draft.trim().length === 0}
          aria-label="Add value"
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-stone-900 text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </button>
      </form>

      {err && <p className="mt-1.5 text-[11px] text-rose-600">{err}</p>}
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
/*  Option create / edit modal                                        */
/* ================================================================== */

function OptionModal({
  state,
  onClose,
  onSubmit,
}: {
  state: OptionModalState;
  onClose: () => void;
  onSubmit: (values: {
    id?: string;
    name: string;
    description: string;
  }) => Promise<boolean>;
}) {
  const editing = state.mode === "edit" ? state.option : null;

  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setErrors({});

    try {
      const ok = await onSubmit({
        id: editing?.id,
        name: name.trim(),
        description: description.trim(),
      });
      if (ok) onClose();
    } catch (err) {
      const details = fieldErrors(err);
      setErrors(details);
      setFormError(
        Object.values(details).flat()[0] ??
          getAxiosErrorMessage(err, "Could not save the option"),
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
            <SectionEyebrow>Global option</SectionEyebrow>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              {editing ? "Edit option" : "Create option"}
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
            hint="What the option is called, e.g. “Colour”, “Size”, “Material”."
          >
            <TextInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Colour"
              maxLength={100}
              autoFocus
            />
          </Field>

          <Field
            label="Description"
            error={errors.description?.[0]}
            hint="Optional — a short note about how this pool is used."
          >
            <TextInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="The shades every crochet piece can be made in"
              maxLength={255}
            />
          </Field>

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
/*  Value rename modal                                                */
/* ================================================================== */

function ValueModal({
  optionName,
  value,
  onClose,
  onSubmit,
}: {
  optionName: string;
  value: GlobalOptionValue;
  onClose: () => void;
  onSubmit: (id: string, value: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState(value.value);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const ok = await onSubmit(value.id, draft.trim());
      if (ok) onClose();
    } catch (err) {
      const details = fieldErrors(err);
      setFormError(
        Object.values(details).flat()[0] ??
          getAxiosErrorMessage(err, "Could not save the value"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Overlay onClose={saving ? undefined : onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-stone-900/20 sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <div>
            <SectionEyebrow>{optionName}</SectionEyebrow>
            <h2 className="mt-1.5 text-lg font-semibold tracking-tight text-stone-900">
              Rename value
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

        <div className="space-y-3 px-5 py-4">
          <Field label="Value" required error={formError}>
            <TextInput
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Yellow"
              maxLength={100}
              autoFocus
            />
          </Field>
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
            disabled={saving || draft.trim().length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Save
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
  target,
  busy,
  onCancel,
  onConfirm,
}: {
  target: DeleteTarget;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isOption = target.kind === "option";
  const label = isOption ? target.option.name : target.value.value;

  const warnings: string[] = [];
  if (isOption) {
    if (target.option.valueCount > 0) {
      warnings.push(
        `${plural(target.option.valueCount, "value")} inside it will be deleted too.`,
      );
    }
    if (target.option.productCount > 0) {
      warnings.push(
        `It is used by ${plural(target.option.productCount, "product")} — deletion will be refused.`,
      );
    }
  } else if (target.option.productCount > 0) {
    warnings.push(
      `Products using ${target.option.name} may reference this value — deletion is refused while it is in use.`,
    );
  }

  const blocked = !isOption && target.option.productCount > 0;

  return (
    <Overlay onClose={busy ? undefined : onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl shadow-stone-900/20 sm:rounded-3xl">
        <div className="px-5 py-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-600">
            <Trash2 className="h-4 w-4" />
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-stone-900">
            Delete “{label}”?
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-stone-600">
            {isOption
              ? "This removes the option pool and everything inside it."
              : `This removes the value from ${target.option.name}.`}
          </p>

          {warnings.length > 0 && (
            <div className="mt-3 space-y-1 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              {warnings.map((w) => (
                <p key={w}>{w}</p>
              ))}
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

/**
 * Popup layer — white/80 wash behind the dialog, no dark tint or blur.
 * The dialog itself keeps its drop shadow.
 */
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
/*  Empty / error                                                     */
/* ================================================================== */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-12 text-center backdrop-blur-sm sm:rounded-3xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200 bg-rose-50 text-rose-500">
        <ListChecks className="h-5 w-5" />
      </div>
      <h2 className="mt-3 text-base font-semibold text-stone-900">
        The option pool is empty
      </h2>
      <p className="mt-1 max-w-sm text-sm text-stone-600">
        Start with “Colour”, then add Yellow, Red and Blue inside it. Size and
        Material work the same way.
      </p>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-stone-800"
      >
        <Plus className="h-3.5 w-3.5" />
        Create the first option
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
          Couldn&apos;t load options
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
