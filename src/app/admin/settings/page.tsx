"use client";

import axios from "axios";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  createSettingSchema,
  type Setting,
  type SettingsListResponse,
  type SettingResponse,
} from "../../../utils/zod/setting.validator.zod";
import getAxiosErrorMessage from "../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../(components)/utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../(components)/utils/SectionDiv";

const BASE = "/api/admin/settings";

export default function SettingsClient() {
  const [rows, setRows] = useState<Setting[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const [newName, setNewName] = useState<string>("");
  const [newActive, setNewActive] = useState<boolean>(true);
  const [newRedis, setNewRedis] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [newNameError, setNewNameError] = useState<string | null>(null);

  const [editing, setEditing] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("");

  const [query, setQuery] = useState<string>("");

  const markBusy = (key: string, value: boolean) =>
    setBusy((prev) => ({ ...prev, [key]: value }));

  const sortRows = (list: Setting[]) =>
    [...list].sort((a, b) => a.field_name.localeCompare(b.field_name));

  const filtered = useMemo<Setting[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.field_name.toLowerCase().includes(q));
  }, [rows, query]);

  const stats = useMemo(
    () => ({
      total: rows.length,
      active: rows.filter((r) => r.active).length,
      cached: rows.filter((r) => r.save_in_redis).length,
    }),
    [rows],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<SettingsListResponse>(BASE, {
        withCredentials: true,
      });
      setRows(sortRows(data.settings));
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load settings"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ahem = () => {
      load();
    };
    ahem();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  /* ------------------------------------------------------------------ */
  /*  Create                                                             */
  /* ------------------------------------------------------------------ */

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setNewNameError(null);

    const parsed = createSettingSchema.safeParse({
      field_name: newName,
      active: newActive,
      save_in_redis: newRedis,
    });

    if (!parsed.success) {
      const fieldErrs = parsed.error.flatten().fieldErrors;
      setNewNameError(
        fieldErrs.field_name?.[0] ??
          "Must be lowercase, start with a letter, only a-z, 0-9, '_' or ':', 3–100 chars",
      );
      return;
    }

    setCreating(true);
    try {
      const { data } = await axios.post<SettingResponse>(BASE, parsed.data, {
        withCredentials: true,
      });

      setRows((prev) => sortRows([...prev, data.setting]));
      setNewName("");
      setNewActive(true);
      setNewRedis(true);
      setToast(`Created "${data.setting.field_name}"`);
    } catch (e) {
      setToast(getAxiosErrorMessage(e, "Create failed"));
    } finally {
      setCreating(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Update (optimistic)                                                */
  /* ------------------------------------------------------------------ */

  async function patchRow(
    fieldName: string,
    patch: Partial<Pick<Setting, "active" | "save_in_redis">>,
    newFieldName?: string,
  ) {
    const previous = rows;
    const target = previous.find((r) => r.field_name === fieldName);
    if (!target) return;

    markBusy(fieldName, true);

    setRows((prev) =>
      sortRows(
        prev.map((r) =>
          r.field_name === fieldName
            ? { ...r, ...patch, field_name: newFieldName ?? r.field_name }
            : r,
        ),
      ),
    );

    try {
      const { data } = await axios.put<SettingResponse>(
        `${BASE}/${encodeURIComponent(fieldName)}`,
        { ...patch, new_field_name: newFieldName },
        { withCredentials: true },
      );

      setRows((prev) =>
        sortRows(
          prev.map((r) =>
            r.field_name === (newFieldName ?? fieldName) ? data.setting : r,
          ),
        ),
      );
    } catch (e) {
      setRows(previous);
      setToast(getAxiosErrorMessage(e, "Update failed"));
    } finally {
      markBusy(fieldName, false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Delete                                                             */
  /* ------------------------------------------------------------------ */

  async function handleDelete(fieldName: string) {
    if (
      !window.confirm(`Delete setting "${fieldName}"? This cannot be undone.`)
    )
      return;

    const previous = rows;
    markBusy(fieldName, true);
    setRows((prev) => prev.filter((r) => r.field_name !== fieldName));

    try {
      await axios.delete(`${BASE}/${encodeURIComponent(fieldName)}`, {
        withCredentials: true,
      });
      setToast(`Deleted "${fieldName}"`);
    } catch (e) {
      setRows(previous);
      setToast(getAxiosErrorMessage(e, "Delete failed"));
    } finally {
      markBusy(fieldName, false);
    }
  }

  /* ------------------------------------------------------------------ */
  /*  Rename                                                             */
  /* ------------------------------------------------------------------ */

  function startRename(row: Setting) {
    setEditing(row.field_name);
    setDraftName(row.field_name);
  }

  async function commitRename(original: string) {
    const next = draftName.trim().toLowerCase();
    setEditing(null);
    if (!next || next === original) return;
    await patchRow(original, {}, next);
  }

  return (
    <PageWrapper variant="content">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div>
          {/* Header */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <SectionEyebrow>SUPER ADMIN</SectionEyebrow>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                Feature Toggles
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                Control runtime behaviour without a deploy. Every change is
                written to the audit log.
              </p>
            </div>
          </div>

          <SectionDivider className="my-6" size={11} />

            {/* Stats */}
            <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
                <span className="font-semibold tabular-nums text-stone-900">
                  {stats.total}
                </span>
                total
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-semibold tabular-nums text-emerald-700">
                  {stats.active}
                </span>
                active
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                <span className="font-semibold tabular-nums text-rose-600">
                  {stats.cached}
                </span>
                cached
              </span>
            </div>

            {/* Create section */}
            <section className="mb-6 sm:mb-8">
              <header className="flex items-start gap-3 pb-3 sm:items-center">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm shadow-rose-500/25">
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-stone-900">
                    Add new toggle
                  </h2>
                  <p className="text-[11px] text-stone-500 sm:text-xs">
                    Names are lowercased automatically. Use{" "}
                    <code className="bg-stone-100 px-1 text-[10px] text-stone-700 sm:text-[11px]">
                      :
                    </code>{" "}
                    to namespace — e.g.{" "}
                    <code className="bg-stone-100 px-1 text-[10px] text-stone-700 sm:text-[11px]">
                      backend:nobody_can_login
                    </code>
                  </p>
                </div>
              </header>

              <form
                onSubmit={handleCreate}
                className="space-y-3 py-2 sm:space-y-5"
              >
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[2fr_auto_auto_auto] md:items-end md:gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold tracking-wider text-stone-700 uppercase">
                      Field name
                    </label>
                    <input
                      value={newName}
                      onChange={(e) => {
                        setNewName(e.target.value);
                        if (newNameError) setNewNameError(null);
                      }}
                      placeholder="backend:nobody_can_login"
                      spellCheck={false}
                      autoComplete="off"
                      className={`w-full cursor-text rounded-2xl border bg-white px-3.5 py-2.5 font-mono text-sm text-stone-900 outline-none transition placeholder:font-sans placeholder:text-stone-400 ${
                        newNameError
                          ? "border-rose-300 focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                          : "border-stone-200 focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                      }`}
                    />
                    {newNameError && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-rose-600">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {newNameError}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 md:contents">
                    <TogglePill
                      label="Active"
                      hint="On immediately"
                      checked={newActive}
                      onChange={setNewActive}
                    />

                    <TogglePill
                      label="Redis"
                      hint="Cache for 1h"
                      checked={newRedis}
                      onChange={setNewRedis}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={creating || !newName.trim()}
                    className="inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-rose-500 px-5 text-sm font-medium text-white shadow-sm shadow-rose-500/25 transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                  >
                    {creating ? "Creating…" : "Add field"}
                  </button>
                </div>
              </form>
            </section>

            {/* Search + Refresh */}
            <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div className="relative w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search toggles…"
                  className="w-full cursor-text rounded-full border border-stone-200 bg-white py-2 pl-10 pr-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                />
              </div>
              <button
                onClick={() => void load()}
                className="inline-flex cursor-pointer items-center justify-center gap-2 self-stretch rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-2 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 sm:self-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>

            {loading && <LoadingState />}

            {error && !loading && (
              <ErrorState message={error} onRetry={() => void load()} />
            )}

            {!loading && !error && (
              <>
                {/* Empty state */}
                {filtered.length === 0 && (
                  <div className="px-4 py-12 sm:py-16">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                      <div className="flex h-12 w-12 items-center justify-center bg-rose-50 text-rose-400">
                        <SlidersHorizontal className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-medium text-stone-700">
                        {rows.length === 0
                          ? "No toggles yet"
                          : "No matches found"}
                      </p>
                      <p className="text-center text-xs text-stone-500">
                        {rows.length === 0
                          ? "Create your first feature toggle above."
                          : "Try a different search term."}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mobile: card list */}
                {filtered.length > 0 && (
                  <div className="space-y-2 md:hidden">
                    {filtered.map((row) => {
                      const isBusy = Boolean(busy[row.field_name]);
                      return (
                        <div
                          key={row.field_name}
                          className={`border-b border-stone-100 py-3 transition ${
                            isBusy ? "opacity-50" : ""
                          }`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-2">
                            {editing === row.field_name ? (
                              <input
                                autoFocus
                                value={draftName}
                                onChange={(e) => setDraftName(e.target.value)}
                                onBlur={() => void commitRename(row.field_name)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter")
                                    void commitRename(row.field_name);
                                  if (e.key === "Escape") setEditing(null);
                                }}
                                className="w-full cursor-text rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 font-mono text-[12px] text-stone-900 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                              />
                            ) : (
                              <button
                                onClick={() => startRename(row)}
                                className="group/name flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-1 py-0.5 text-left transition hover:text-rose-600"
                              >
                                <code className="break-all font-mono text-[12px] leading-tight text-stone-800">
                                  {row.field_name}
                                </code>
                                <Pencil className="h-3 w-3 shrink-0 text-stone-400 opacity-0 transition group-hover/name:opacity-100" />
                              </button>
                            )}

                            <button
                              onClick={() => void handleDelete(row.field_name)}
                              disabled={isBusy}
                              title="Delete toggle"
                              className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-stone-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <MobileToggleRow
                              label="Active"
                              checked={row.active}
                              disabled={isBusy}
                              onChange={(v) =>
                                void patchRow(row.field_name, { active: v })
                              }
                            />
                            <MobileToggleRow
                              label="Redis"
                              checked={row.save_in_redis}
                              disabled={isBusy}
                              onChange={(v) =>
                                void patchRow(row.field_name, {
                                  save_in_redis: v,
                                })
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Desktop: table */}
                {filtered.length > 0 && (
                  <div className="hidden md:block">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-stone-100 bg-stone-50/70 text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                          <th className="px-5 py-3">Toggle</th>
                          <th className="w-32 px-5 py-3">Active</th>
                          <th className="w-32 px-5 py-3">Redis</th>
                          <th className="w-24 px-5 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {filtered.map((row) => {
                          const isBusy = Boolean(busy[row.field_name]);
                          return (
                            <tr
                              key={row.field_name}
                              className={`group transition ${
                                isBusy
                                  ? "opacity-50"
                                  : "hover:bg-stone-50/60"
                              }`}
                            >
                              <td className="px-5 py-4">
                                {editing === row.field_name ? (
                                  <input
                                    autoFocus
                                    value={draftName}
                                    onChange={(e) =>
                                      setDraftName(e.target.value)
                                    }
                                    onBlur={() =>
                                      void commitRename(row.field_name)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        void commitRename(row.field_name);
                                      if (e.key === "Escape") setEditing(null);
                                    }}
                                    className="w-full max-w-xs cursor-text rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 font-mono text-[13px] text-stone-900 outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-300"
                                  />
                                ) : (
                                  <button
                                    onClick={() => startRename(row)}
                                    title="Click to rename"
                                    className="group/name inline-flex cursor-pointer items-center gap-2 px-1 py-0.5 text-left transition hover:text-rose-600"
                                  >
                                    <code className="font-mono text-[13px] text-stone-800">
                                      {row.field_name}
                                    </code>
                                    <Pencil className="h-3 w-3 text-stone-400 opacity-0 transition group-hover/name:opacity-100" />
                                  </button>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <Toggle
                                  checked={row.active}
                                  disabled={isBusy}
                                  onChange={(v) =>
                                    void patchRow(row.field_name, {
                                      active: v,
                                    })
                                  }
                                />
                              </td>

                              <td className="px-5 py-4">
                                <Toggle
                                  checked={row.save_in_redis}
                                  disabled={isBusy}
                                  onChange={(v) =>
                                    void patchRow(row.field_name, {
                                      save_in_redis: v,
                                    })
                                  }
                                />
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  onClick={() =>
                                    void handleDelete(row.field_name)
                                  }
                                  disabled={isBusy}
                                  title="Delete toggle"
                                  className="inline-flex h-8 w-8 cursor-pointer items-center justify-center text-stone-400 transition hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      {toast && (
        <div className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end">
          <div className="bg-stone-900 px-4 py-2.5 text-sm text-white shadow-lg">
            {toast}
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

function TogglePill({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex h-10 w-full cursor-pointer items-center gap-2.5 px-1 text-left transition sm:gap-3 ${
        checked ? "text-stone-900" : "text-stone-700 hover:text-stone-900"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition ${
          checked ? "bg-rose-500" : "bg-stone-300"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-semibold leading-tight">
          {label}
        </span>
        <span className="truncate text-[10px] leading-tight text-stone-500">
          {hint}
        </span>
      </span>
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        checked ? "bg-rose-500" : "bg-stone-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition ${
          checked ? "translate-x-4.5" : "translate-x-0.75"
        }`}
      />
    </button>
  );
}

function MobileToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center justify-between gap-2 py-2 transition disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          checked ? "text-rose-600" : "text-stone-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-rose-500" : "bg-stone-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition ${
            checked ? "translate-x-4.5" : "translate-x-0.75"
          }`}
        />
      </span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-0">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-stone-100 py-4 md:gap-4 md:px-1 md:py-5"
        >
          <div className="h-3.5 w-32 animate-pulse bg-stone-200 sm:w-48" />
          <div className="ml-auto h-5 w-9 animate-pulse rounded-full bg-stone-200" />
          <div className="h-5 w-9 animate-pulse rounded-full bg-stone-200" />
          <div className="hidden h-4 w-4 animate-pulse bg-stone-200 md:block" />
        </div>
      ))}
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
    <div className="flex items-start gap-3 bg-rose-50 px-3 py-3.5 sm:px-4 sm:py-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-rose-800">
          Couldn&apos;t load settings
        </p>
        <p className="mt-0.5 text-xs text-rose-700">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 cursor-pointer bg-white px-3.5 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}
