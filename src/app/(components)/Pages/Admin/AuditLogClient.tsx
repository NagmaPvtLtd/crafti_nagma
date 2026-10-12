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
import GoBack from "../../GoBack";

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
  CREATE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  UPDATE: "border-blue-200 bg-blue-50 text-blue-700",
  DELETE: "border-rose-200 bg-rose-50 text-rose-700",
  LOGIN: "border-sky-200 bg-sky-50 text-sky-700",
  LOGOUT: "border-neutral-200 bg-neutral-50 text-neutral-600",
  ROLE_CHANGED: "border-violet-200 bg-violet-50 text-violet-700",
  STATUS_CHANGED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  ORDER_CREATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ORDER_STATUS_CHANGED: "border-indigo-200 bg-indigo-50 text-indigo-700",
  ORDER_CANCELLED: "border-rose-200 bg-rose-50 text-rose-700",
  PAYMENT_CAPTURED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PAYMENT_FAILED: "border-rose-200 bg-rose-50 text-rose-700",
  PAYMENT_REFUNDED: "border-amber-200 bg-amber-50 text-amber-700",
  CART_CONVERTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  FILE_UPLOADED: "border-sky-200 bg-sky-50 text-sky-700",
  FILE_DELETED: "border-rose-200 bg-rose-50 text-rose-700",
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

  // Debounced search input → committed `search` value
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
    <div className="min-h-screen bg-neutral-50">
      {/* ------------------------------------------------------------- */}
      {/* Header                                                        */}
      {/* ------------------------------------------------------------- */}
      <div className="border-b border-neutral-200 bg-white">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-6">
          <GoBack href="/admin/dashboard" label="Dashboard" />

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight text-neutral-900 sm:text-2xl">
                  Audit Logs
                </h1>
              </div>
              <p className="mt-1 max-w-2xl text-xs text-neutral-500 sm:text-sm">
                {isSuperAdmin
                  ? "Every action across the platform. Filter by range, action, entity, or search by log id."
                  : "Activity from the last 30 days. You can lookup through log id"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Range selector — super_admin only */}
              {isSuperAdmin && (
                <div className="inline-flex items-center rounded-lg border border-neutral-200 bg-white p-0.5">
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        setRange(r.value);
                        setPage(1);
                      }}
                      disabled={loading}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        range === r.value
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-600 hover:bg-neutral-100"
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
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* Search + filters                                        */}
          {/* ------------------------------------------------------- */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search description, entity, user… or paste a full 40-char log id"
                className="w-full rounded-lg border border-neutral-300 bg-white py-2 pl-9 pr-9 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
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
              className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs text-neutral-700 focus:border-neutral-900 focus:outline-none"
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
              className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs text-neutral-700 focus:border-neutral-900 focus:outline-none"
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
                className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2.5 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Clear
              </button>
            )}
          </div>

          {/* Bypass banner — admin viewed something older than 30d */}
          {data?.bypassedRange && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Log id lookup bypassed the 30-day window. This entry is normally
                hidden from admin scope.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Body                                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-6 sm:py-8">
        {loading && !data && <LogsSkeleton />}

        {error && !loading && (
          <ErrorState message={error} onRetry={() => void load()} />
        )}

        {data && !error && (
          <div className="space-y-3">
            {/* Result count */}
            <div className="flex items-center justify-between text-xs text-neutral-500">
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
                  Page {data.pagination.page} of {data.pagination.totalPages}
                </span>
              )}
            </div>

            {data.logs.length === 0 ? (
              <EmptyState filtered={hasActiveFilters} />
            ) : (
              <ul className="space-y-2">
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
                  setPage((p) => Math.min(data.pagination.totalPages, p + 1))
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Log row (expandable metadata)                                      */
/* ================================================================== */

function LogRow({ log }: { log: AuditLogEntry }) {
  const [open, setOpen] = useState(false);
  const hasMeta = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <li className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      {/* Header line — clickable to expand */}
      <button
        type="button"
        onClick={() => hasMeta && setOpen((v) => !v)}
        className={`flex w-full items-start gap-3 px-3 py-3 text-left sm:px-4 ${
          hasMeta ? "cursor-pointer hover:bg-neutral-50" : "cursor-default"
        }`}
      >
        {/* Chevron */}
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-neutral-400">
          {hasMeta ? (
            open ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-200" />
          )}
        </span>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                ACTION_STYLES[log.action] ??
                "border-neutral-200 bg-neutral-50 text-neutral-600"
              }`}
            >
              {log.action.replace(/_/g, " ")}
            </span>
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-600">
              {log.entityType}
            </span>
            <span className="text-[11px] text-neutral-400">
              {fmtRelative(log.createdAt)} · {fmtDateTime(log.createdAt)}
            </span>
          </div>

          <p className="mt-1.5 truncate text-xs font-medium text-neutral-800">
            {log.description}
          </p>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
            <span>
              <span className="text-neutral-400">by </span>
              {log.userName || log.userEmail || log.userId ? (
                <>
                  <span className="font-medium text-neutral-700">
                    {log.userName ?? "—"}
                  </span>
                  {log.userEmail && (
                    <span className="ml-1 text-neutral-400">
                      ({log.userEmail})
                    </span>
                  )}
                </>
              ) : (
                <span className="italic text-neutral-400">System</span>
              )}
            </span>
            {log.entityId && (
              <span className="font-mono text-[10px] text-neutral-400">
                {log.entityType}:{log.entityId}
              </span>
            )}
          </div>

          {/* Log id, always visible for copy-paste */}
          <p className="mt-1 font-mono text-[10px] text-neutral-400">
            ID: {log.id}
          </p>
        </div>

        {/* Metadata presence pill */}
        {hasMeta && (
          <span className="shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
            {open ? "hide" : "json"}
          </span>
        )}
      </button>

      {/* Expanded metadata — raw JSON, curly braces included */}
      {open && hasMeta && (
        <div className="border-t border-neutral-100 bg-neutral-50/60 px-3 py-3 sm:px-4">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
            <ScrollText className="h-3 w-3" />
            metadata
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg border border-neutral-200 bg-neutral-900 p-3 font-mono text-[11px] leading-relaxed text-neutral-100">
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
    <div className="flex items-center justify-between gap-3 pt-2">
      <button
        onClick={onPrev}
        disabled={page <= 1 || loading}
        className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        ← Prev
      </button>
      <span className="text-xs text-neutral-500">
        Page {page} of {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages || loading}
        className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-white py-12 text-center">
      <ScrollText className="h-6 w-6 text-neutral-300" />
      <p className="text-sm font-medium text-neutral-700">
        {filtered ? "No logs match your filters" : "No audit logs yet"}
      </p>
      <p className="text-xs text-neutral-500">
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
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3.5 sm:px-5 sm:py-4">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">
          Couldn&apos;t load audit logs
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

function LogsSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-white"
        />
      ))}
    </div>
  );
}
