"use client";

import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  IndianRupee,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import getAxiosErrorMessage from "../../../../utils/Auth/Auth.axiosErrorHelper.util";
import MetricChartCard from "../../MetricChartCard";
import PageWrapper from "../../utils/PageWrapper";
import { SectionDivider, SectionEyebrow } from "../../utils/SectionDiv";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

const BASE = "/api/admin/dashboard";

type RangeType = "30d" | "90d" | "365d" | "lifetime";

type Summary = {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  totalCustomers: number;
  activeProducts: number;
  lowStockCount: number;
};

type RecentOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
};

type LowStockItem = {
  id: string;
  sku: string;
  stock: number;
  productName: string;
  variantName: string | null;
};

type TrendDatum = { label: string; count: number };

type BasePayload = {
  generatedAt: string;
  range: RangeType;
  summary: Summary;
  recentOrders: RecentOrder[];
  lowStock: LowStockItem[];
};

type AdminPayload = BasePayload & { scope: "admin" };

type SuperAdminPayload = BasePayload & {
  scope: "super_admin";
  analytics: {
    revenueTrend: TrendDatum[];
    ordersTrend: TrendDatum[];
    customersTrend: TrendDatum[];
    orderStatusMix: TrendDatum[];
    paymentMethodMix: { label: string; count: number; revenue: number }[];
    topProducts: {
      sku: string;
      name: string;
      units: number;
      revenue: number;
    }[];
    topCategories: { name: string; orders: number; revenue: number }[];
    cartMetrics: {
      total: number;
      active: number;
      converted: number;
      abandoned: number;
      conversionRate: number;
      abandonmentRate: number;
    };
    customerMetrics: {
      total: number;
      newInRange: number;
      buyers: number;
      repeatBuyers: number;
      repeatRate: number;
    };
    settingsOverview: { total: number; active: number; cached: number };
    auditSummary: { action: string; count: number }[];
  };
};

type DashboardPayload = AdminPayload | SuperAdminPayload;

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const count = (n: number) => n.toLocaleString("en-IN");
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const ORDER_STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-200/70 bg-amber-50 text-amber-700",
  accepted: "border-blue-200/70 bg-blue-50 text-blue-700",
  crafting_in_progress: "border-indigo-200/70 bg-indigo-50 text-indigo-700",
  slight_delay: "border-orange-200/70 bg-orange-50 text-orange-700",
  almost_done: "border-cyan-200/70 bg-cyan-50 text-cyan-700",
  shipped: "border-violet-200/70 bg-violet-50 text-violet-700",
  delivered: "border-emerald-200/70 bg-emerald-50 text-emerald-700",
  cancelled: "border-rose-200/70 bg-rose-50 text-rose-700",
};

const RANGES: { value: RangeType; label: string }[] = [
  { value: "30d", label: "30d" },
  { value: "90d", label: "90d" },
  { value: "365d", label: "1y" },
  { value: "lifetime", label: "All" },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminDashboardClient() {
  const [range, setRange] = useState<RangeType>("90d");
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get<DashboardPayload>(BASE, {
        params: { range },
        withCredentials: true,
      });
      setData(res.data);
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load dashboard"));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    const ahem = () => {
      load();
    };
    ahem();
  }, [load]);

  const isSuper = data?.scope === "super_admin";

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
        {/* Header                                                    */}
        {/* --------------------------------------------------------- */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6 sm:pt-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionEyebrow>Admin</SectionEyebrow>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl md:text-4xl">
                    Dashboard
                  </h1>
                  {isSuper && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/70 bg-violet-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-700">
                      Super Admin
                    </span>
                  )}
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600 sm:text-base">
                  {isSuper
                    ? "Full analytical view — trends, breakdowns and operational health."
                    : "Operational snapshot of orders, revenue and inventory."}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="inline-flex items-center rounded-full border border-rose-200/70 bg-white/70 p-0.5 backdrop-blur-sm">
                  {RANGES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRange(r.value)}
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
          </div>
        </section>

        <SectionDivider className="mx-auto max-w-7xl px-4 sm:px-6" />

        {/* --------------------------------------------------------- */}
        {/* Body                                                      */}
        {/* --------------------------------------------------------- */}
        <section className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 sm:pb-16">
            {loading && !data && <DashboardSkeleton />}

            {error && !loading && (
              <ErrorState message={error} onRetry={() => void load()} />
            )}

            {data && !error && (
              <div className="space-y-6 sm:space-y-8">
                {/* KPI strip */}
                <KpiStrip summary={data.summary} />

                {/* Super-admin charts */}
                {data.scope === "super_admin" && (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <ChartCard>
                      <MetricChartCard
                        title="Revenue"
                        data={data.analytics.revenueTrend}
                        range={range}
                        color="#10b981"
                        metricLabel="revenue"
                      />
                    </ChartCard>
                    <ChartCard>
                      <MetricChartCard
                        title="Orders"
                        data={data.analytics.ordersTrend}
                        range={range}
                        color="#0ea5e9"
                        metricLabel="orders"
                      />
                    </ChartCard>
                    <ChartCard>
                      <MetricChartCard
                        title="New customers"
                        data={data.analytics.customersTrend}
                        range={range}
                        color="#8b5cf6"
                        metricLabel="signups"
                      />
                    </ChartCard>
                  </div>
                )}

                {/* Recent orders + low stock */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <SectionCard
                    title="Recent orders"
                    subtitle="Latest 8 orders across the store"
                    icon={<ShoppingCart className="h-4 w-4" />}
                  >
                    {data.recentOrders.length === 0 ? (
                      <EmptyRow text="No orders yet" />
                    ) : (
                      <ul className="divide-y divide-stone-100">
                        {data.recentOrders.map((o) => (
                          <li
                            key={o.id}
                            className="flex items-center justify-between gap-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-stone-800">
                                {o.orderNumber}
                              </p>
                              <p className="truncate text-[11px] text-stone-500">
                                {o.customerName}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                                ORDER_STATUS_STYLES[o.orderStatus] ??
                                "border-stone-200/70 bg-stone-50 text-stone-600"
                              }`}
                            >
                              {o.orderStatus.replace(/_/g, " ")}
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-900">
                              {inr(o.total)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>

                  <SectionCard
                    title="Low stock"
                    subtitle="Variants with 5 or fewer units"
                    icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                  >
                    {data.lowStock.length === 0 ? (
                      <EmptyRow text="Everything is well-stocked" />
                    ) : (
                      <ul className="divide-y divide-stone-100">
                        {data.lowStock.map((v) => (
                          <li
                            key={v.id}
                            className="flex items-center justify-between gap-3 py-2.5"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-semibold text-stone-800">
                                {v.productName}
                              </p>
                              <p className="truncate text-[11px] text-stone-500">
                                {v.variantName ?? "—"} · {v.sku}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums ${
                                v.stock === 0
                                  ? "border-rose-200/70 bg-rose-50 text-rose-700"
                                  : "border-amber-200/70 bg-amber-50 text-amber-700"
                              }`}
                            >
                              {v.stock} left
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </SectionCard>
                </div>

                {/* Super-admin breakdowns */}
                {data.scope === "super_admin" && (
                  <SuperAdminBreakdowns data={data} />
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
/*  Super-admin-only block                                             */
/* ================================================================== */

function SuperAdminBreakdowns({ data }: { data: SuperAdminPayload }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Order status"
          subtitle="Distribution across all orders"
          icon={<BarChart3 className="h-4 w-4" />}
        >
          <BarList
            items={data.analytics.orderStatusMix.map((s) => ({
              label: s.label.replace(/_/g, " "),
              value: s.count,
              format: count,
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Payment methods"
          subtitle="Captured payments by method"
          icon={<IndianRupee className="h-4 w-4" />}
        >
          <BarList
            items={data.analytics.paymentMethodMix.map((p) => ({
              label: p.label,
              value: p.count,
              format: count,
              trailing: inr(p.revenue),
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Top products"
          subtitle="By revenue, all time"
          icon={<Package className="h-4 w-4" />}
        >
          <BarList
            items={data.analytics.topProducts.map((p) => ({
              label: p.name,
              sub: p.sku,
              value: p.revenue,
              format: inr,
              trailing: `${count(p.units)} units`,
            }))}
          />
        </SectionCard>

        <SectionCard
          title="Top categories"
          subtitle="By revenue, all time"
          icon={<TrendingUp className="h-4 w-4" />}
        >
          <BarList
            items={data.analytics.topCategories.map((c) => ({
              label: c.name,
              value: c.revenue,
              format: inr,
              trailing: `${count(c.orders)} orders`,
            }))}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MiniStats
          title="Cart funnel"
          icon={<ShoppingCart className="h-4 w-4" />}
          rows={[
            ["Total", count(data.analytics.cartMetrics.total)],
            ["Active", count(data.analytics.cartMetrics.active)],
            [
              "Converted",
              `${count(data.analytics.cartMetrics.converted)} · ${pct(
                data.analytics.cartMetrics.conversionRate,
              )}`,
            ],
            [
              "Abandoned",
              `${count(data.analytics.cartMetrics.abandoned)} · ${pct(
                data.analytics.cartMetrics.abandonmentRate,
              )}`,
            ],
          ]}
        />
        <MiniStats
          title="Customers"
          icon={<Users className="h-4 w-4" />}
          rows={[
            ["Total", count(data.analytics.customerMetrics.total)],
            ["New (range)", count(data.analytics.customerMetrics.newInRange)],
            ["Buyers", count(data.analytics.customerMetrics.buyers)],
            [
              "Repeat",
              `${count(data.analytics.customerMetrics.repeatBuyers)} · ${pct(
                data.analytics.customerMetrics.repeatRate,
              )}`,
            ],
          ]}
        />
        <MiniStats
          title="Feature toggles"
          icon={<BadgeCheck className="h-4 w-4" />}
          rows={[
            ["Total", count(data.analytics.settingsOverview.total)],
            ["Active", count(data.analytics.settingsOverview.active)],
            ["Redis-cached", count(data.analytics.settingsOverview.cached)],
          ]}
        />
      </div>
    </>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function KpiStrip({ summary }: { summary: Summary }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Kpi
        label="Revenue"
        value={inr(summary.totalRevenue)}
        icon={<IndianRupee className="h-3.5 w-3.5" />}
        tone="emerald"
      />
      <Kpi
        label="Orders"
        value={count(summary.totalOrders)}
        hint={`${summary.pendingOrders} pending`}
        icon={<ShoppingCart className="h-3.5 w-3.5" />}
        tone="sky"
      />
      <Kpi
        label="AOV"
        value={inr(summary.averageOrderValue)}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
        tone="violet"
      />
      <Kpi
        label="Customers"
        value={count(summary.totalCustomers)}
        icon={<Users className="h-3.5 w-3.5" />}
        tone="neutral"
      />
      <Kpi
        label="Low stock"
        value={count(summary.lowStockCount)}
        hint={`${summary.activeProducts} active products`}
        icon={<AlertTriangle className="h-3.5 w-3.5" />}
        tone={summary.lowStockCount > 0 ? "amber" : "neutral"}
      />
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  tone: "neutral" | "emerald" | "sky" | "violet" | "amber";
}) {
  const tones: Record<typeof tone, string> = {
    neutral: "text-stone-500",
    emerald: "text-emerald-600",
    sky: "text-sky-600",
    violet: "text-violet-600",
    amber: "text-amber-600",
  };

  return (
    <div className="group rounded-2xl border border-white/60 bg-white/85 px-3 py-3 backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:bg-white hover:shadow-lg hover:shadow-rose-100/60 sm:rounded-3xl sm:px-4 sm:py-3.5">
      <div className="flex items-center gap-1.5">
        <span className={tones[tone]}>{icon}</span>
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-rose-500/80">
          {label}
        </p>
      </div>
      <p className="mt-1.5 truncate text-base font-semibold tabular-nums text-stone-900 sm:text-lg">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[10px] text-stone-400">{hint}</p>
      )}
    </div>
  );
}

function ChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl sm:p-5">
      {children}
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-white/60 bg-white/85 backdrop-blur-sm sm:rounded-3xl">
      <header className="flex items-start gap-3 border-b border-stone-100 px-4 py-3.5 sm:px-5">
        {icon && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-500">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-stone-900">{title}</h2>
          {subtitle && <p className="text-[11px] text-stone-500">{subtitle}</p>}
        </div>
      </header>
      <div className="px-4 py-3 sm:px-5 sm:py-4">{children}</div>
    </section>
  );
}

function BarList({
  items,
}: {
  items: {
    label: string;
    sub?: string;
    value: number;
    format: (n: number) => string;
    trailing?: string;
  }[];
}) {
  if (items.length === 0) return <EmptyRow text="No data" />;
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => {
        const width = Math.max((it.value / max) * 100, 4);
        return (
          <li key={`${it.label}-${i}`}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium capitalize text-stone-800">
                  {it.label}
                </p>
                {it.sub && (
                  <p className="truncate font-mono text-[10px] text-stone-400">
                    {it.sub}
                  </p>
                )}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xs font-semibold tabular-nums text-stone-900">
                  {it.format(it.value)}
                </p>
                {it.trailing && (
                  <p className="text-[10px] tabular-nums text-stone-500">
                    {it.trailing}
                  </p>
                )}
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-rose-50">
              <div
                className="h-full rounded-full bg-rose-400/80 transition-all"
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function MiniStats({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: React.ReactNode;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 backdrop-blur-sm sm:rounded-3xl">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-500">
          {icon}
        </span>
        <h3 className="text-sm font-semibold text-stone-900">{title}</h3>
      </div>
      <dl className="space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3">
            <dt className="truncate text-[11px] font-medium uppercase tracking-wider text-rose-500/80">
              {k}
            </dt>
            <dd className="shrink-0 text-xs font-semibold tabular-nums text-stone-900">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-6 text-xs text-stone-500">
      <AlertCircle className="h-3.5 w-3.5" />
      {text}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm sm:rounded-3xl"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm sm:rounded-3xl"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-56 animate-pulse rounded-2xl border border-white/60 bg-white/70 backdrop-blur-sm sm:rounded-3xl"
          />
        ))}
      </div>
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
          Couldn&apos;t load dashboard
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
