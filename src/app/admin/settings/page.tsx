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
} from "../../../utils/Validators/setting.validator.zod";
import getAxiosErrorMessage from "../../../utils/Auth/Auth.axiosErrorHelper.util";
import GoBack from "../../(components)/GoBack";

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
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
          <GoBack href="/admin" label="Back to Admin" />
          <h1 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-2xl">
            Feature Toggles
          </h1>
          <p className="mt-1 max-w-2xl text-xs text-neutral-500 sm:text-sm">
            Control runtime behaviour without a deploy. Every change is written
            to the audit log.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        {/* Stat tiles */}
        <div className="mb-4 grid grid-cols-3 gap-2 sm:mb-8 sm:gap-4">
          <StatTile
            label="Total toggles"
            shortLabel="Total"
            value={stats.total}
            tone="neutral"
          />
          <StatTile
            label="Active"
            shortLabel="Active"
            value={stats.active}
            tone="emerald"
          />
          <StatTile
            label="Redis-cached"
            shortLabel="Cached"
            value={stats.cached}
            tone="violet"
          />
        </div>

        {/* Create section */}
        <section className="mb-4 overflow-hidden rounded-xl border border-neutral-200 bg-white sm:mb-8">
          <header className="flex items-start gap-3 border-b border-neutral-100 px-3 py-3 sm:items-center sm:px-6 sm:py-4">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-white">
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-neutral-900">
                Add new toggle
              </h2>
              <p className="text-[11px] text-neutral-500 sm:text-xs">
                Names are lowercased automatically. Use{" "}
                <code className="rounded bg-neutral-100 px-1 text-[10px] sm:text-[11px]">
                  :
                </code>{" "}
                to namespace — e.g.{" "}
                <code className="rounded bg-neutral-100 px-1 text-[10px] sm:text-[11px]">
                  backend:nobody_can_login
                </code>
              </p>
            </div>
          </header>

          <form
            onSubmit={handleCreate}
            className="space-y-3 px-3 py-3 sm:space-y-5 sm:px-6 sm:py-5"
          >
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-[2fr_auto_auto_auto] md:items-end md:gap-5">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-neutral-700">
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
                  className={`w-full cursor-text rounded-lg border bg-white px-3 py-2.5 font-mono text-sm outline-none transition placeholder:font-sans placeholder:text-neutral-400 sm:px-3.5 ${
                    newNameError
                      ? "border-red-400 focus:border-red-500 focus:ring-4 focus:ring-red-100"
                      : "border-neutral-300 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100"
                  }`}
                />
                {newNameError && (
                  <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
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
                className="h-10 cursor-pointer rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {creating ? "Creating…" : "Add field"}
              </button>
            </div>
          </form>
        </section>

        {/* Search + Refresh */}
        <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search toggles…"
              className="w-full cursor-text rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100"
            />
          </div>
          <button
            onClick={() => void load()}
            className="inline-flex cursor-pointer items-center justify-center gap-2 self-stretch rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 sm:self-auto"
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
              <div className="rounded-xl border border-neutral-200 bg-white px-4 py-12 sm:py-16">
                <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                    <SlidersHorizontal className="h-5 w-5 text-neutral-400" />
                  </div>
                  <p className="text-sm font-medium text-neutral-700">
                    {rows.length === 0 ? "No toggles yet" : "No matches found"}
                  </p>
                  <p className="text-center text-xs text-neutral-500">
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
                      className={`rounded-xl border border-neutral-200 bg-white p-3 transition ${
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
                            className="w-full cursor-text rounded-md border border-neutral-300 bg-white px-2 py-1 font-mono text-[12px] outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-100"
                          />
                        ) : (
                          <button
                            onClick={() => startRename(row)}
                            className="group/name flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-left transition hover:bg-neutral-100"
                          >
                            <code className="break-all font-mono text-[12px] leading-tight text-neutral-800">
                              {row.field_name}
                            </code>
                            <Pencil className="h-3 w-3 shrink-0 text-neutral-400 opacity-0 transition group-hover/name:opacity-100" />
                          </button>
                        )}

                        <button
                          onClick={() => void handleDelete(row.field_name)}
                          disabled={isBusy}
                          title="Delete toggle"
                          className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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
                            void patchRow(row.field_name, { save_in_redis: v })
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
              <div className="hidden overflow-hidden rounded-xl border border-neutral-200 bg-white md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100 bg-neutral-50/60 text-[11px] uppercase tracking-wider text-neutral-500">
                      <th className="px-6 py-3 font-medium">Toggle</th>
                      <th className="w-32 px-6 py-3 font-medium">Active</th>
                      <th className="w-32 px-6 py-3 font-medium">Redis</th>
                      <th className="w-24 px-6 py-3 text-right font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {filtered.map((row) => {
                      const isBusy = Boolean(busy[row.field_name]);
                      return (
                        <tr
                          key={row.field_name}
                          className={`group transition ${
                            isBusy ? "opacity-50" : "hover:bg-neutral-50/60"
                          }`}
                        >
                          <td className="px-6 py-4">
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
                                className="w-full max-w-xs cursor-text rounded-md border border-neutral-300 bg-white px-2 py-1 font-mono text-[13px] outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-100"
                              />
                            ) : (
                              <button
                                onClick={() => startRename(row)}
                                title="Click to rename"
                                className="group/name inline-flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 transition hover:bg-neutral-100"
                              >
                                <code className="font-mono text-[13px] text-neutral-800">
                                  {row.field_name}
                                </code>
                                <Pencil className="h-3 w-3 text-neutral-400 opacity-0 transition group-hover/name:opacity-100" />
                              </button>
                            )}
                          </td>

                          <td className="px-6 py-4">
                            <Toggle
                              checked={row.active}
                              disabled={isBusy}
                              onChange={(v) =>
                                void patchRow(row.field_name, { active: v })
                              }
                            />
                          </td>

                          <td className="px-6 py-4">
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

                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => void handleDelete(row.field_name)}
                              disabled={isBusy}
                              title="Delete toggle"
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
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

      {toast && (
        <div className="pointer-events-none fixed inset-x-3 bottom-4 z-50 flex justify-center sm:inset-x-auto sm:right-6 sm:justify-end">
          <div className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm text-white">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

/* =============================================================================
 *  Sub-components
 * ========================================================================== */

function StatTile({
  label,
  shortLabel,
  value,
  tone,
}: {
  label: string;
  shortLabel?: string;
  value: number;
  tone: "neutral" | "emerald" | "violet";
}) {
  const tones = {
    neutral: { dot: "bg-neutral-400", value: "text-neutral-900" },
    emerald: { dot: "bg-emerald-500", value: "text-emerald-700" },
    violet: { dot: "bg-violet-500", value: "text-violet-700" },
  }[tone];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-2.5 py-2.5 sm:px-5 sm:py-4">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tones.dot}`} />
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-neutral-500 sm:text-xs">
          <span className="sm:hidden">{shortLabel ?? label}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
      </div>
      <p
        className={`mt-1.5 text-lg font-semibold tabular-nums sm:mt-2 sm:text-2xl ${tones.value}`}
      >
        {value}
      </p>
    </div>
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
      className={`flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-lg border px-3 text-left transition sm:gap-3 sm:px-3.5 ${
        checked
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-400"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition ${
          checked ? "bg-white/30" : "bg-neutral-200"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
            checked ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-xs font-semibold leading-tight">
          {label}
        </span>
        <span
          className={`truncate text-[10px] leading-tight ${
            checked ? "text-white/70" : "text-neutral-500"
          }`}
        >
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
        checked ? "bg-emerald-500" : "bg-neutral-300"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
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
      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition disabled:cursor-not-allowed disabled:opacity-40 ${
        checked
          ? "border-emerald-200 bg-emerald-50"
          : "border-neutral-200 bg-neutral-50"
      }`}
    >
      <span
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          checked ? "text-emerald-700" : "text-neutral-600"
        }`}
      >
        {label}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-emerald-500" : "bg-neutral-300"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
            checked ? "translate-x-4.5" : "translate-x-0.75"
          }`}
        />
      </span>
    </button>
  );
}

function LoadingState() {
  return (
    <div className="space-y-2 md:space-y-0 md:overflow-hidden md:rounded-xl md:border md:border-neutral-200 md:bg-white">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-4 md:gap-4 md:rounded-none md:border-0 md:border-b md:border-neutral-100 md:px-6 md:py-5 md:last:border-b-0"
        >
          <div className="h-3.5 w-32 animate-pulse rounded bg-neutral-200 sm:w-48" />
          <div className="ml-auto h-5 w-9 animate-pulse rounded-full bg-neutral-200" />
          <div className="h-5 w-9 animate-pulse rounded-full bg-neutral-200" />
          <div className="hidden h-4 w-4 animate-pulse rounded bg-neutral-200 md:block" />
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
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3.5 sm:px-5 sm:py-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          Couldn&apos;t load settings
        </p>
        <p className="mt-0.5 text-xs text-red-700">{message}</p>
      </div>
      <button
        onClick={onRetry}
        className="shrink-0 cursor-pointer rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}
