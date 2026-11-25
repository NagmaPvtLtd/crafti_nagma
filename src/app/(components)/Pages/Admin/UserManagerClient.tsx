"use client";

import axios from "axios";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Globe,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCog,
  UserX,
} from "lucide-react";
import toast from "react-hot-toast";

import getApiErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import { useDebouncedValue } from "../../utils/Hooks/useDebouncedValue";
import ErrorState from "../../utils/ErrorState";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";
import { formatDateTime } from "../../../../utils/Formator/formatDateTime.util";
import { USER_ROLES } from "../../../../utils/zod/admin/userManager.zod";
import type {
  UserRole,
  UserStatus,
} from "../../../../types/User/UserRow.types";

/* ------------------------------------------------------------------ */
/*  Constants & types                                                  */
/* ------------------------------------------------------------------ */

const BASE = "/api/admin/users";
const PAGE_LIMIT = 25;

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  manager: "Manager",
  customer: "Customer (no access)",
};

const ROLE_STYLES: Record<UserRole, string> = {
  super_admin: "border-violet-200/70 bg-violet-50 text-violet-700",
  admin: "border-rose-200/70 bg-rose-50 text-rose-700",
  manager: "border-sky-200/70 bg-sky-50 text-sky-700",
  customer: "border-stone-200/70 bg-stone-50 text-stone-600",
};

const STATUS_STYLES: Record<UserStatus, string> = {
  active: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  inactive: "border-stone-200/70 bg-stone-50 text-stone-600",
  banned: "border-rose-200/70 bg-rose-50 text-rose-700",
};

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  hasGoogle: boolean;
  hasPassword: boolean;
  createdAt: string;
};

type UsersPayload = {
  ok: true;
  generatedAt: string;
  scope: "admin" | "super_admin";
  selfId: string | null;
  query: {
    search: string;
    role: UserRole | null;
    status: UserStatus | null;
    page: number;
    limit: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  users: AdminUser[];
  facets: {
    roles: { value: string; count: number }[];
    statuses: { value: string; count: number }[];
  };
};

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

const roleCount = (payload: UsersPayload | null, role: UserRole) =>
  payload?.facets.roles.find((row) => row.value === role)?.count ?? 0;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function UserManagerClient() {
  const [data, setData] = useState<UsersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput);
  const [role, setRole] = useState<UserRole | "">("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get<UsersPayload>(BASE, {
          params: {
            search: debouncedSearch.trim() || undefined,
            role: role || undefined,
            status: status || undefined,
            page,
            limit: PAGE_LIMIT,
          },
        });
        if (!cancelled) setData(res.data);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, "Could not load users right now."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, role, status, page, reloadToken]);

  const isSuperAdmin = data?.scope === "super_admin";

  function canEdit(user: AdminUser): boolean {
    if (!data || user.id === data.selfId) return false;
    if (isSuperAdmin) return true;
    return user.role !== "admin" && user.role !== "super_admin";
  }

  async function changeRole(user: AdminUser, nextRole: UserRole) {
    if (nextRole === user.role) return;

    setSavingId(user.id);
    try {
      const res = await axios.patch<{ message?: string }>(
        `${BASE}/${user.id}`,
        { role: nextRole },
      );
      toast.success(res.data?.message ?? "Role updated");
      setReloadToken((token) => token + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update the role"));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <PageWrapper variant="content" position="fixed">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-12 sm:px-6 sm:pt-10 sm:pb-16">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionEyebrow href="/admin/dashboard">Admin</SectionEyebrow>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
              User Manager
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
              Every registered account, with its role and access level.
              {isSuperAdmin
                ? " As a super admin you can assign any role."
                : " You can assign manager or remove access; admin-level roles are locked."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setReloadToken((token) => token + 1)}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-rose-200/70 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rose-600 backdrop-blur-sm transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Summary + filters */}
        <div className="mt-5 rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-rose-200/70 bg-rose-50/60 px-3 py-1 text-xs font-semibold text-rose-600">
              <UserCog className="h-3.5 w-3.5" />
              {data ? `${data.pagination.total} accounts` : "—"}
            </div>
            <div className="flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/60 px-3 py-1 text-xs font-semibold text-violet-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleCount(data, "super_admin")} super admin
              {roleCount(data, "super_admin") === 1 ? "" : "s"}
            </div>
            <span className="text-[11px] text-stone-500">
              {roleCount(data, "admin")} admin / {roleCount(data, "manager")}{" "}
              manager
            </span>
          </div>

          <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-stone-400" />
              <input
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email or phone…"
                aria-label="Search users"
                className="w-full rounded-xl border border-stone-200 bg-white py-2 pr-3 pl-9 text-xs text-stone-900 placeholder:text-stone-400 transition-colors focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300"
              />
            </div>

            <select
              value={role}
              onChange={(event) => {
                setRole(event.target.value as UserRole | "");
                setPage(1);
              }}
              aria-label="Filter by role"
              className="cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300"
            >
              <option value="">All roles</option>
              {USER_ROLES.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </select>

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as UserStatus | "");
                setPage(1);
              }}
              aria-label="Filter by status"
              className="cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-2 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        <SectionDivider className="my-6" size={11} />

        {loading && !data && <ListSkeleton />}

        {error && !loading && (
          <ErrorState
            title="Couldn't load users"
            message={error}
            onRetry={() => setReloadToken((token) => token + 1)}
          />
        )}

        {data && !error && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1 text-xs text-stone-500">
              <span>
                {data.pagination.total === 0
                  ? "No accounts"
                  : `${data.pagination.total.toLocaleString("en-IN")} account${
                      data.pagination.total === 1 ? "" : "s"
                    }`}
              </span>
              <span>
                Page {data.pagination.page} of {data.pagination.totalPages}
              </span>
            </div>

            {data.users.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/70 px-6 py-14 text-center backdrop-blur-sm sm:rounded-3xl">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-400">
                  <UserX className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-sm font-semibold text-stone-900">
                  No accounts match these filters
                </h3>
                <p className="mt-1 max-w-sm text-xs leading-relaxed text-stone-600">
                  Clear the search or pick another role and status to see more
                  people.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100 overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm sm:rounded-3xl">
                {data.users.map((user) => {
                  const editable = canEdit(user);
                  const busy = savingId === user.id;

                  return (
                    <li
                      key={user.id}
                      className="grid gap-3 px-4 py-4 sm:grid-cols-[1.5fr_1fr_auto] sm:items-center sm:gap-4 sm:px-5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-xs font-semibold text-rose-600 uppercase">
                          {user.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-stone-900">
                            {user.name}
                            {user.id === data.selfId && (
                              <span className="ml-1.5 text-[10px] font-medium text-stone-400">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-stone-500">
                            {user.email}
                          </p>
                          {user.phone && (
                            <p className="text-[11px] text-stone-400">
                              {user.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span
                          className={`rounded-full border px-2 py-0.5 font-semibold ${ROLE_STYLES[user.role]}`}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-semibold capitalize ${STATUS_STYLES[user.status]}`}
                        >
                          {user.status}
                        </span>
                        {user.hasGoogle && (
                          <span
                            title="Signed up with Google"
                            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-1.5 py-0.5 text-stone-500"
                          >
                            <Globe className="h-2.5 w-2.5" />
                            Google
                          </span>
                        )}
                        {user.hasPassword && (
                          <span
                            title="Password sign-in enabled"
                            className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-1.5 py-0.5 text-stone-500"
                          >
                            <KeyRound className="h-2.5 w-2.5" />
                            Password
                          </span>
                        )}
                        {user.emailVerified && (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Verified
                          </span>
                        )}
                        <span className="text-stone-400">
                          Joined{" "}
                          {formatDateTime(user.createdAt, { format: "date-long" })}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 sm:justify-self-end">
                        <select
                          value={user.role}
                          onChange={(event) =>
                            void changeRole(
                              user,
                              event.target.value as UserRole,
                            )
                          }
                          disabled={!editable || busy}
                          aria-label={`Role for ${user.name}`}
                          className="cursor-pointer rounded-xl border border-stone-200 bg-white px-2.5 py-1.5 text-xs text-stone-700 transition-colors focus:border-rose-300 focus:outline-none focus:ring-1 focus:ring-rose-300 disabled:cursor-not-allowed disabled:bg-stone-50 disabled:text-stone-400"
                        >
                          {USER_ROLES.filter(
                            (value) => isSuperAdmin || value !== "super_admin",
                          ).map((value) => (
                            <option key={value} value={value}>
                              {ROLE_LABELS[value]}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => void changeRole(user, "customer")}
                          disabled={
                            !editable || busy || user.role === "customer"
                          }
                          title="Remove staff access"
                          className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-rose-200/70 bg-rose-50/60 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <UserX className="h-3 w-3" />
                          Remove access
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {data.pagination.totalPages > 1 && (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page <= 1 || loading}
                  className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((value) =>
                      Math.min(data.pagination.totalPages, value + 1),
                    )
                  }
                  disabled={page >= data.pagination.totalPages || loading}
                  className="cursor-pointer rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm sm:rounded-3xl"
        />
      ))}
    </div>
  );
}
