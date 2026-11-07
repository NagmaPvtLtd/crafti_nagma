"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ScrollText,
  Search,
  X,
} from "lucide-react";

import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const BASE = "/api/admin/audit-logs";
const PAGE_LIMIT = 25;

type RangeType = "30d" | "90d" | "365d" | "lifetime";

const RANGES: { value: RangeType; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "365d", label: "1y" },
  { value: "lifetime", label: "All" },
];

const ACTION_STYLES: Record<string, string> = {
  CREATE: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  UPDATE: "border-blue-200/70 bg-blue-50 text-blue-700",
  DELETE: "border-rose-200/70 bg-rose-50 text-rose-700",
  LOGIN: "border-sky-200/70 bg-sky-50 text-sky-700",
  LOGOUT: "border-stone-200/70 bg-stone-50 text-stone-600",
  ROLE_CHANGED: "border-violet-200/70 bg-violet-50 text-violet-700",
  STATUS_CHANGED: "border-indigo-200/70 bg-indigo-50 text-indigo-700",
  ORDER_CREATED: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  ORDER_STATUS_CHANGED: "border-indigo-200/70 bg-indigo-50 text-indigo-700",
  ORDER_CANCELLED: "border-rose-200/70 bg-rose-50 text-rose-700",
  PAYMENT_CAPTURED: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  PAYMENT_FAILED: "border-rose-200/70 bg-rose-50 text-rose-700",
  PAYMENT_REFUNDED: "border-amber-200/70 bg-amber-50 text-amber-700",
  CART_CONVERTED: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  FILE_UPLOADED: "border-sky-200/70 bg-sky-50 text-sky-700",
  FILE_DELETED: "border-rose-200/70 bg-rose-50 text-rose-700",
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type AuditLogEntry = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

type Facets = {
  actions: { action: string; count: number }[];
  entityTypes: { entityType: string; count: number }[];
};

type AuditLogsPayload = {
  scope: "admin" | "super_admin";
  generatedAt: string;
  range: RangeType;
  requestedRange: RangeType;
  bypassedRange: boolean;
  query: {
    search: string | null;
    action: string | null;
    entityType: string | null;
    page: number;
    limit: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  logs: AuditLogEntry[];
  facets: Facets;
};

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
};

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminAuditLogsClient() {
  const [range, setRange] = useState<RangeType>("30d");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<AuditLogsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<AuditLogsPayload>(BASE, {
        params: {
          range,
          search: search || undefined,
          action: action || undefined,
          entity_type: entityType || undefined,
          page,
          limit: PAGE_LIMIT,
        },
        withCredentials: true,
      });
      setData(res.data);
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load audit logs"));
    } finally {
      setLoading(false);
    }
  }, [range, search, action, entityType, page]);

  useEffect(() => {
    const ahem = () => {
      load();
    };
    ahem();
  }, [load]);

  const isSuperAdmin = data?.scope === "super_admin";
  const hasActiveFilters =
    searchInput.length > 0 || action !== "" || entityType !== "";

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setAction("");
    setEntityType("");
    setPage(1);
  };

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="relative flex flex-col overflow-hidden text-stone-800">
        {/* Decorative rose blobs — matches landing */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/3 -left-32 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl"
        />

        {/* --------------------------------------------------------- */}
        {/* Header + filters                                          */}
        {/* --------------------------------------------------------- */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
            <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionEyebrow>Admin</SectionEyebrow>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                  Audit Logs
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  {isSuperAdmin
                    ? "Every action across the platform. Filter by range, action, entity, or search by log id."
                    : "Activity from the last 30 days. You can lookup through log id."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isSuperAdmin && (
                  <div className="inline-flex items-center rounded-full border border-rose-200/70 bg-white/70 p-0.5 backdrop-blur-sm">
                    {RANGES.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => {
                          setRange(r.value);
                          setPage(1);
                        }}
                        disabled={loading}
                        className={`cursor-pointer rounded-full px-2.5 py-1 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          range === r.value
                            ? "bg-rose-500 text-white shadow-sm shadow-rose-500/25"
                            : "text-stone-600 hover:bg-rose-50 hover:text-rose-600"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                )}

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
              </div>
            </div>

            {/* Filters card */}
            <div className="mt-5 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search description, entity, user… or paste a full 40-char log id"
                    className="w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-9 text-xs text-stone-900 placeholder:text-stone-400 transition-colors focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => setSearchInput("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-stone-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                  className="cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300"
                >
                  <option value="">All actions</option>
                  {(data?.facets.actions ?? []).map((a) => (
                    <option key={a.action} value={a.action}>
                      {a.action} ({a.count})
                    </option>
                  ))}
                </select>

                <select
                  value={entityType}
                  onChange={(e) => {
                    setEntityType(e.target.value);
                    setPage(1);
                  }}
                  className="cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300"
                >
                  <option value="">All entities</option>
                  {(data?.facets.entityTypes ?? []).map((e) => (
                    <option key={e.entityType} value={e.entityType}>
                      {e.entityType} ({e.count})
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="cursor-pointer rounded-xl border border-rose-200/70 bg-rose-50/60 px-2.5 py-2 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-100"
                  >
                    Clear
                  </button>
                )}
              </div>

              {data?.bypassedRange && (
                <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200/70 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Log id lookup bypassed the 30-day window. This entry is
                    normally hidden from admin scope.
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* --------------------------------------------------------- */}
        {/* Body                                                      */}
        {/* --------------------------------------------------------- */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !data && <LogsSkeleton />}

            {error && !loading && (
              <ErrorState message={error} onRetry={() => void load()} />
            )}

            {data && !error && (
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 text-xs text-stone-500">
                  <span>
                    {data.pagination.total === 0
                      ? "No entries"
                      : `${data.pagination.total.toLocaleString("en-IN")} entr${
                          data.pagination.total === 1 ? "y" : "ies"
                        }`}
                    {hasActiveFilters && " (filtered)"}
                  </span>
                  {data.pagination.total > 0 && (
                    <span>
                      Page {data.pagination.page} of{" "}
                      {data.pagination.totalPages}
                    </span>
                  )}
                </div>

                {data.logs.length === 0 ? (
                  <EmptyState filtered={hasActiveFilters} />
                ) : (
                  <ul className="space-y-2.5">
                    {data.logs.map((log) => (
                      <LogRow key={log.id} log={log} />
                    ))}
                  </ul>
                )}

                {data.pagination.totalPages > 1 && (
                  <Pagination
                    page={data.pagination.page}
                    totalPages={data.pagination.totalPages}
                    loading={loading}
                    onPrev={() => setPage((p) => Math.max(1, p - 1))}
                    onNext={() =>
                      setPage((p) =>
                        Math.min(data.pagination.totalPages, p + 1),
                      )
                    }
                  />
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

/* ================================================================== */
/*  Log row                                                            */
/* ================================================================== */

function LogRow({ log }: { log: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <li className="group overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm transition-all hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl">
      <button
        type="button"
        onClick={() => hasMeta && setOpen((v) => !v)}
        className={`flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5 ${
          hasMeta ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-stone-400">
          {hasMeta ? (
            open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-stone-200" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                ACTION_STYLES[log.action] ??
                "border-stone-200/70 bg-stone-50 text-stone-600"
              }`}
            >
              {log.action.replace(/_/g, " ")}
            </span>
            <span className="rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-500">
              {log.entityType}
            </span>
            <span className="text-[11px] text-stone-400">
              {fmtRelative(log.createdAt)} · {fmtDateTime(log.createdAt)}
            </span>
          </div>

          <p className="mt-1.5 truncate text-sm font-medium text-stone-800">
            {log.description}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-stone-500">
            <span>
              <span className="text-stone-400">by </span>
              {log.userName || log.userEmail || log.userId ? (
                <>
                  <span className="font-medium text-stone-700">
                    {log.userName ?? "—"}
                  </span>
                  {log.userEmail && (
                    <span className="ml-1 text-stone-400">
                      ({log.userEmail})
                    </span>
                  )}
                </>
              ) : (
                <span className="italic text-stone-400">System</span>
              )}
            </span>
            {log.entityId && (
              <span className="font-mono text-[10px] text-stone-400">
                {log.entityType}:{log.entityId}
              </span>
            )}
          </div>

          <p className="mt-1 font-mono text-[10px] text-stone-400">
            ID: {log.id}
          </p>
        </div>

        {hasMeta && (
          <span className="shrink-0 rounded-full border border-rose-200/70 bg-rose-50/60 px-2 py-0.5 text-[10px] font-medium text-rose-500">
            {open ? "hide" : "json"}
          </span>
        )}
      </button>

      {open && hasMeta && (
        <div className="border-t border-stone-100 bg-stone-50/60 px-4 py-3.5 sm:px-5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-rose-400">
            <ScrollText className="h-3 w-3" />
            metadata
          </div>
          <pre className="max-h-80 overflow-auto rounded-xl border border-stone-800 bg-stone-900 p-3 font-mono text-[11px] leading-relaxed text-stone-100">
            {JSON.stringify(log.metadata, null, 2)}
          </pre>
        </div>
      )}
    </li>
  );
}

/* ================================================================== */
/*  Pagination                                                         */
/* ================================================================== */

function Pagination({
  page,
  totalPages,
  loading,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pt-3">
      <button
        onClick={onPrev}
        disabled={page <= 1 || loading}
        className="cursor-pointer rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ← Prev
      </button>
      <span className="text-xs text-stone-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages || loading}
        className="cursor-pointer rounded-full border border-rose-200/70 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next →
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Empty / error / skeleton                                           */
/* ================================================================== */

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-rose-200/70 bg-white/70 py-12 text-center backdrop-blur-sm sm:rounded-3xl">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-500">
        <ScrollText className="h-5 w-5" />
      </div>
      <p className="mt-1 text-sm font-semibold text-stone-800">
        {filtered ? "No logs match your filters" : "No audit logs yet"}
      </p>
      <p className="text-xs text-stone-500">
        {filtered
          ? "Try adjusting the search or clearing filters."
          : "Activity will appear here as it happens."}
      </p>
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
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-rose-800">
          Couldn&apos;t load audit logs
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

function LogsSkeleton() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm sm:rounded-3xl"
        />
      ))}
    </div>
  );
}
